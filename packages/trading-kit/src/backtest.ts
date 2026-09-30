/**
 * Bounded deterministic backtest runner (G3).
 *
 * Runs a sandboxed script over a pinned range of a clock-capped data
 * session. Determinism: every money/position computation happens HERE (kit
 * code), never in the guest; the guest only produces plots, signals and
 * order intents. The run consumes data ONLY through the kit's R1-capped
 * queries — the runner's clock sits at each bar's close before onBar fires,
 * and there is no host function through which a script could observe a bar
 * whose close is beyond the current one (the cursor is host state).
 *
 * Bar lifecycle (per run-timeframe bar i):
 *   PRE  — mark the PREVIOUS bar's equity at its close; set the clock to
 *          bar i's close (the R1 cap point); fill any pending order at
 *          bar i's OPEN (next-bar-open model).
 *   CALL — the guest's onBar(bar_i, api) runs (plots/signals/orders only).
 *   POST — happens implicitly as the next bar's PRE (equity marking); the
 *          final bar's equity is marked at completion, and an order still
 *          pending there is recorded as an honest unfilled order.
 *
 * Fill math (all price units): buy fill = open + spread/2 + slippage;
 * sell fill = open − spread/2 − slippage; flat commission per fill.
 */
import { createDataSession, type DataSession } from './data.js';
import { createReplayClock, type ReplayClock } from './clock.js';
import { dataRevision, runIdentity, type RunIdentity } from './identity.js';
import { DEFAULT_RUNTIME_LIMITS, DRIVER_SOURCE, deriveGuestSeed, type RuntimeLimits, type ScriptRuntime } from './script.js';
import type {
	Bar,
	FillAssumptions,
	Granularity,
	MissingInterval,
	SimulatedFill,
	UnfilledOrder
} from './types.js';
import { TF_SECONDS } from './types.js';

export interface BacktestConfig {
	symbol: string;
	baseTimeframe: Granularity;
	timeframe: Granularity;
	/** first run-timeframe bucket (inclusive, unix seconds, bucket start) */
	fromTime: number;
	/** last allowed bar CLOSE (inclusive, unix seconds) */
	toTime: number;
	scriptSource: string;
	inputs: Record<string, number | string | boolean>;
	fill: FillAssumptions;
	/** FULL base-granularity source history; the run pins its revision */
	sourceBars: Bar[];
	runtime: ScriptRuntime;
	limits?: Partial<RuntimeLimits>;
	/** defaults to the kit runner identity */
	engine?: { kind: string; version: string };
}

export interface BacktestStats {
	finalEquity: number;
	netProfit: number;
	tradeCount: number;
	maxDrawdown: number;
	maxDrawdownPct: number;
}

export interface BacktestAssumptions {
	symbol: string;
	baseTimeframe: Granularity;
	timeframe: Granularity;
	range: { fromTime: number; toTime: number };
	inputs: Record<string, number | string | boolean>;
	fill: FillAssumptions;
	engine: { kind: string; version: string };
	runtime: { kind: string; version: string };
	clockPolicy: 'bar-close-driven';
	barsInRun: number;
}

export interface BacktestResult {
	status: 'succeeded' | 'failed';
	identity: RunIdentity;
	assumptions: BacktestAssumptions;
	trades: SimulatedFill[];
	unfilledOrders: UnfilledOrder[];
	plots: Record<string, (number | null)[]>;
	signals: Record<string, number[]>;
	equity: number[];
	stats: BacktestStats;
	/** availability (honest gaps) at the final clock instant of the range */
	unavailable: MissingInterval[];
	/** R1 evidence: how many queries the guest triggered; how many were capped */
	queryRecordCount: number;
	cappedQueryCount: number;
	error?: { code: string; message: string };
}

export const RUNNER_KIND = 'trading-kit-backtest-runner';
export const RUNNER_VERSION = '0.1.0';
export const MAX_RUN_BARS = 100_000;

interface PendingOrder {
	side: 'buy' | 'sell';
	size: number;
	signalBarTime: number;
}

const kitFatalJson = (code: string, message: string): string =>
	JSON.stringify({ kitFatal: code, message });

const canonicalOfInputs = (inputs: Record<string, number | string | boolean>): string =>
	JSON.stringify(Object.keys(inputs).sort().map((k) => [k, inputs[k]]));

export async function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
	const limits: RuntimeLimits = { ...DEFAULT_RUNTIME_LIMITS, ...config.limits };
	const engine = config.engine ?? { kind: RUNNER_KIND, version: RUNNER_VERSION };
	const runtime = { kind: config.runtime.kind, version: config.runtime.version };
	const dRev = await dataRevision(config.sourceBars);
	const identity = await runIdentity({
		scriptSource: config.scriptSource,
		dataRev: dRev,
		symbol: config.symbol,
		timeframe: config.timeframe,
		range: { fromTime: config.fromTime, toTime: config.toTime },
		inputs: config.inputs,
		fill: config.fill,
		engine,
		runtime,
		clockPolicy: 'bar-close-driven'
	});

	const assumptions: BacktestAssumptions = {
		symbol: config.symbol,
		baseTimeframe: config.baseTimeframe,
		timeframe: config.timeframe,
		range: { fromTime: config.fromTime, toTime: config.toTime },
		inputs: { ...config.inputs },
		fill: { ...config.fill },
		engine,
		runtime,
		clockPolicy: 'bar-close-driven',
		barsInRun: 0
	};

	const base = (): BacktestResult => ({
		status: 'failed' as const,
		identity,
		assumptions,
		trades: [],
		unfilledOrders: [],
		plots: {},
		signals: {},
		equity: [],
		stats: { finalEquity: config.fill.startingCash, netProfit: 0, tradeCount: 0, maxDrawdown: 0, maxDrawdownPct: 0 },
		unavailable: [],
		queryRecordCount: 0,
		cappedQueryCount: 0
	});

	// ---- validation ---------------------------------------------------------
	const fail = (code: string, message: string): BacktestResult => ({ ...base(), status: 'failed', error: { code, message } });
	if (!Array.isArray(config.sourceBars) || config.sourceBars.length === 0) {
		return fail('DATA_EMPTY', 'sourceBars must be a non-empty ascending array');
	}
	for (let i = 1; i < config.sourceBars.length; i++) {
		if (config.sourceBars[i].time <= config.sourceBars[i - 1].time) {
			return fail('DATA_NOT_ASCENDING', `sourceBars must be strictly ascending by time (violation at index ${i})`);
		}
	}
	const tfSeconds = TF_SECONDS[config.timeframe];
	const baseSeconds = TF_SECONDS[config.baseTimeframe];
	if (!tfSeconds || !baseSeconds || tfSeconds < baseSeconds || tfSeconds % baseSeconds !== 0) {
		return fail('TIMEFRAME_INVALID', `timeframe ${config.timeframe} is not a whole multiple of base ${config.baseTimeframe}`);
	}
	if (!(config.fill.spread >= 0) || !(config.fill.slippage >= 0) || !(config.fill.commission >= 0) || !(config.fill.startingCash > 0)) {
		return fail('FILL_ASSUMPTIONS_INVALID', 'spread/slippage/commission must be ≥ 0 and startingCash > 0');
	}
	for (const v of Object.values(config.inputs)) {
		if (typeof v === 'number' && !Number.isFinite(v)) return fail('INPUTS_INVALID', 'input numbers must be finite');
	}

	// ---- run bars (complete buckets only, R2 — never bridged) ---------------
	const setupClock: ReplayClock = createReplayClock({ horizon: config.toTime, start: Math.min(config.fromTime, config.toTime) });
	const setupSession: DataSession = createDataSession({
		clock: setupClock,
		source: { bars: config.sourceBars },
		rules: { symbol: config.symbol, baseTimeframe: config.baseTimeframe }
	});
	setupClock.setFrame(config.toTime);
	const runBars = setupSession
		.bars({ granularity: config.timeframe, until: config.toTime })
		.bars.filter((b) => b.time >= config.fromTime);
	assumptions.barsInRun = runBars.length;
	if (runBars.length === 0) {
		return fail('RANGE_EMPTY', 'no complete bars in range (R2: missing intervals are never bridged)');
	}
	if (runBars.length > MAX_RUN_BARS) {
		return fail('RUN_RANGE_TOO_LARGE', `range spans ${runBars.length} bars; the bounded backtest cap is ${MAX_RUN_BARS}`);
	}

	// ---- runner state (kit-owned; the guest never touches money math) -------
	let cash = config.fill.startingCash;
	let position = 0;
	let avgPrice = 0;
	let pending: PendingOrder | null = null;
	let fillSeq = 0;
	let currentIndex = -1;
	const trades: SimulatedFill[] = [];
	const unfilled: UnfilledOrder[] = [];
	const equity: number[] = new Array(runBars.length).fill(0);
	let peakEquity = config.fill.startingCash;
	let maxDd = 0;
	let maxDdPct = 0;
	const plots: Record<string, (number | null)[]> = {};
	const signals: Record<string, number[]> = {};

	const runClock: ReplayClock = createReplayClock({
		horizon: config.toTime,
		start: Math.min(runBars[0].time, config.toTime)
	});
	const ds: DataSession = createDataSession({
		clock: runClock,
		source: { bars: config.sourceBars },
		rules: { symbol: config.symbol, baseTimeframe: config.baseTimeframe }
	});

	const markEquity = (i: number): void => {
		const eq = cash + position * runBars[i].close;
		equity[i] = eq;
		if (eq > peakEquity) peakEquity = eq;
		const dd = peakEquity - eq;
		if (dd > maxDd) {
			maxDd = dd;
			maxDdPct = peakEquity > 0 ? dd / peakEquity : 0;
		}
	};

	const processFill = (bar: Bar): void => {
		if (!pending) return;
		const o = pending;
		pending = null;
		const sign = o.side === 'buy' ? 1 : -1;
		const spreadCost = config.fill.spread / 2;
		const slippageCost = config.fill.slippage;
		const fillPrice = bar.open + sign * (spreadCost + slippageCost);
		const commission = config.fill.commission;
		cash -= sign * o.size * fillPrice;
		cash -= commission;
		const prevPosition = position;
		position = prevPosition + sign * o.size;
		if (prevPosition === 0 || Math.sign(prevPosition) !== sign) {
			avgPrice = fillPrice;
		} else {
			avgPrice = (avgPrice * Math.abs(prevPosition) + fillPrice * o.size) / (Math.abs(prevPosition) + o.size);
		}
		fillSeq += 1;
		trades.push({
			id: `${identity.id.slice(0, 12)}-fill-${String(fillSeq).padStart(4, '0')}`,
			runId: identity.id,
			side: o.side,
			size: o.size,
			signalBarTime: o.signalBarTime,
			fillBarTime: bar.time,
			basePrice: bar.open,
			fillPrice,
			spreadCost,
			slippageCost,
			commission,
			positionAfter: position,
			cashAfter: cash,
			simulated: true
		});
	};

	// PRE step for bar i — runs before the guest sees bar i
	const stepPre = (i: number): string | null => {
		const bar = runBars[i];
		if (!bar) return `bar index ${i} out of range`;
		if (i > 0) markEquity(i - 1); // previous bar's close (its onBar has run)
		currentIndex = i;
		runClock.setFrame(bar.time + tfSeconds); // R1 cap point = this bar's close
		processFill(bar); // pending order fills at this bar's open
		return null;
	};

	const hostFns: Record<string, (argsJson: string) => string> = {
		bars: (argsJson) => {
			try {
				const req = JSON.parse(argsJson) as { until: number | null; granularity: string };
				const granularity = (req.granularity && req.granularity.length ? req.granularity : config.timeframe) as Granularity;
				const until = req.until === null || req.until === undefined ? null : Number(req.until);
				const res = ds.bars({ until, granularity });
				return JSON.stringify({
					bars: res.bars,
					servedUntil: res.servedUntil,
					requestedUntil: res.requestedUntil,
					capped: res.capped
				});
			} catch (e) {
				return kitFatalJson('SCRIPT_ERROR', `api.bars failed: ${(e as Error).message}`);
			}
		},
		// monotonic cache extension: everything beyond `since`, still capped at
		// the current cursor by the data session (the guest cache can never
		// observe a bar beyond the current bar's close through this)
		barsSince: (argsJson) => {
			try {
				const req = JSON.parse(argsJson) as { granularity: string; since: number };
				const granularity = (req.granularity && req.granularity.length ? req.granularity : config.timeframe) as Granularity;
				const since = Number(req.since);
				const res = ds.bars({ until: null, granularity });
				const fresh = res.bars.filter((b) => b.time > since);
				return JSON.stringify({ bars: fresh, servedUntil: res.servedUntil });
			} catch (e) {
				return kitFatalJson('SCRIPT_ERROR', `api.barsSince failed: ${(e as Error).message}`);
			}
		},
		availability: () => {
			try {
				return JSON.stringify({ missing: ds.availabilityAt() });
			} catch (e) {
				return kitFatalJson('SCRIPT_ERROR', `api.availability failed: ${(e as Error).message}`);
			}
		},
		barAt: (argsJson) => {
			try {
				const req = JSON.parse(argsJson) as { index: number };
				const err = stepPre(Number(req.index));
				if (err) return kitFatalJson('SCRIPT_ERROR', err);
				return JSON.stringify(runBars[Number(req.index)]);
			} catch (e) {
				return kitFatalJson('SCRIPT_ERROR', `barAt failed: ${(e as Error).message}`);
			}
		},
		barCount: () => JSON.stringify({ count: runBars.length }),
		inputs: () => JSON.stringify({ inputs: config.inputs }),
		plot: (argsJson) => {
			try {
				const req = JSON.parse(argsJson) as { name: string; value: number | null };
				const name = String(req.name);
				if (!(name in plots)) plots[name] = new Array<number | null>(runBars.length).fill(null);
				if (currentIndex >= 0 && currentIndex < runBars.length) {
					plots[name][currentIndex] = req.value === null ? null : Number(req.value);
				}
				return '{}';
			} catch (e) {
				return kitFatalJson('SCRIPT_ERROR', `api.plot failed: ${(e as Error).message}`);
			}
		},
		signal: (argsJson) => {
			try {
				const req = JSON.parse(argsJson) as { name: string; active: boolean };
				const name = String(req.name);
				if (!(name in signals)) signals[name] = new Array<number>(runBars.length).fill(0);
				if (currentIndex >= 0 && currentIndex < runBars.length) {
					signals[name][currentIndex] = req.active ? 1 : 0;
				}
				return '{}';
			} catch (e) {
				return kitFatalJson('SCRIPT_ERROR', `api.plotSignal failed: ${(e as Error).message}`);
			}
		},
		order: (argsJson) => {
			try {
				const req = JSON.parse(argsJson) as { side: string; size: number };
				if (req.side !== 'buy' && req.side !== 'sell') {
					return JSON.stringify({ accepted: false, reason: 'side must be "buy" or "sell"' });
				}
				if (!Number.isFinite(req.size) || req.size <= 0) {
					return JSON.stringify({ accepted: false, reason: 'size must be a positive finite number' });
				}
				if (pending) return JSON.stringify({ accepted: false, reason: 'an order is already pending for the next bar open' });
				pending = { side: req.side, size: req.size, signalBarTime: runBars[currentIndex].time };
				return JSON.stringify({ accepted: true });
			} catch (e) {
				return kitFatalJson('SCRIPT_ERROR', `api.order failed: ${(e as Error).message}`);
			}
		},
		state: () =>
			JSON.stringify({
				position,
				avgPrice,
				cash,
				equity: currentIndex >= 0 ? cash + position * runBars[currentIndex].close : cash,
				barIndex: currentIndex,
				barTime: currentIndex >= 0 ? runBars[currentIndex].time : null
			}),
		complete: () => {
			if (runBars.length > 0) markEquity(runBars.length - 1); // last bar's close
			if (pending) {
				unfilled.push({ side: pending.side, size: pending.size, signalBarTime: pending.signalBarTime, reason: 'range-ended' });
				pending = null;
			}
			return '{}';
		}
	};

	// ---- drive the run ------------------------------------------------------
	const sand = await config.runtime.run({
		scriptSource: config.scriptSource,
		driverSource: DRIVER_SOURCE,
		limits,
		prngSeed: deriveGuestSeed([config.scriptSource, canonicalOfInputs(config.inputs)]),
		hostFunctions: {
			...hostFns,
			// per-bar Date.now pin target = the current bar's market close (ms)
			pinTime: () => JSON.stringify({ pinnedMs: (currentIndex >= 0 ? (runBars[currentIndex].time + tfSeconds) : runBars[0].time) * 1000 })
		}
	});

	if (sand.status !== 'completed') {
		return {
			...base(),
			status: 'failed',
			error: { code: sand.error?.code ?? 'SCRIPT_ERROR', message: sand.error?.message ?? 'sandbox failure' }
		};
	}

	const records = ds.queryRecords();
	const unavailable = ds.availabilityAt(config.toTime);
	const finalEquity = equity.length > 0 ? equity[equity.length - 1] : config.fill.startingCash;
	return {
		...base(),
		status: 'succeeded',
		trades,
		unfilledOrders: unfilled,
		plots,
		signals,
		equity,
		stats: {
			finalEquity,
			netProfit: finalEquity - config.fill.startingCash,
			tradeCount: trades.length,
			maxDrawdown: maxDd,
			maxDrawdownPct: maxDdPct
		},
		unavailable,
		queryRecordCount: records.length,
		cappedQueryCount: records.filter((r) => r.capped).length
	};
}
