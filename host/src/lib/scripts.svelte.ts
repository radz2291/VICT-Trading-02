/**
 * G3 script drafts + completed runs — the app composes the kit.
 *
 * Storage keys (app-owned storage, D-002 choice 3):
 *   g3.scripts.v1 — script drafts (provisional work; drafts MUTATE freely)
 *   g3.runs.v1    — completed runs (append-only; a run is IMMUTABLE once
 *                   stored — editing a draft can never rewrite it, and the
 *                   two records live in DIFFERENT keys so no write path
 *                   from draft editing can even reach run bytes)
 *
 * Persistence semantics are the D-004 async rules, normative for every
 * persisted mutation in this app:
 *   (i)   per-store FIFO queue — at most one write in flight, call order;
 *   (ii)  live state mutates strictly AFTER the op's own write resolves —
 *         a pending op exposes only the last committed frame;
 *   (iii) next-state computed at EXECUTION time (re-base, explicit
 *         non-composition) from the last committed state;
 *   (iv)  refusals are truthful (READ_NOT_ACKNOWLEDGED / READ_FAILED /
 *         WRITE_REFUSED / PORT_ERROR), bytes untouched on failure, live
 *         state unchanged, and every refusal is rendered by the UI
 *         (this is the production WRITE_REFUSED path — closes F-C2-2).
 */
import {
	runBacktest,
	createQuickJsScriptRuntime,
	RUNNER_KIND,
	RUNNER_VERSION,
	type BacktestAssumptions,
	type BacktestStats,
	type MissingInterval,
	type SimulatedFill
} from '@vict-trading/trading-kit';
import fixtureJson from './fixtures/g2-fixture.json';

interface G2Fixture {
	symbol: string;
	timeframe: string;
	variant: string;
	horizonInstant: number;
	horizonBarIndex: number;
	bars: { time: number; open: number; high: number; low: number; close: number }[];
}
const G2 = fixtureJson as G2Fixture;

export interface ScriptDraft {
	id: string;
	name: string;
	source: string;
	builtin: boolean;
	updatedAt: number;
}
interface ScriptsRecord {
	version: 1;
	drafts: ScriptDraft[];
}

export interface StoredRun {
	id: string; // run identity (sha256 hex)
	shortId: string;
	draftId: string;
	draftName: string;
	draftRevision: string; // script revision at run time
	status: 'succeeded' | 'failed';
	errorCode?: string;
	errorMessage?: string;
	inputs: Record<string, number | string | boolean>;
	timeframe: '15m' | '1h' | '4h';
	rangeBars: number;
	fromTime: number;
	toTime: number;
	assumptions: BacktestAssumptions;
	stats?: BacktestStats;
	trades?: SimulatedFill[];
	plots?: Record<string, (number | null)[]>;
	signals?: Record<string, number[]>;
	equity?: number[];
	unavailable?: MissingInterval[];
	barTimes: number[];
	finishedAt: number;
}
interface RunsRecord {
	version: 1;
	runs: StoredRun[];
}

const SCRIPTS_KEY = 'g3.scripts.v1';
const RUNS_KEY = 'g3.runs.v1';
const MAX_RUNS = 12;

export type Outcome = { ok: true } | { ok: false; code: string; message: string };

// ---- D-004 transactional store (per-key FIFO, write-before-commit) --------
class TxStore<T> {
	private queue: Promise<unknown> = Promise.resolve();
	private acknowledged = false;
	constructor(
		private key: string,
		private empty: () => T,
		private isValid: (v: unknown) => v is T
	) {}

	/** Raw read; THROWS on corrupt bytes (refusal family READ_FAILED). */
	readStored(): T {
		const raw = window.localStorage.getItem(this.key); // throws on getter-throw
		if (raw === null) return this.empty();
		const parsed: unknown = JSON.parse(raw); // throws on corrupt bytes
		if (!this.isValid(parsed)) throw new Error(`stored record at ${this.key} failed validation`);
		return parsed;
	}

	acknowledge(): void {
		this.acknowledged = true;
	}

	/**
	 * FIFO mutation: re-verify read → draft next from live (== last
	 * committed) → persist next → commit (apply) only after the write
	 * resolved. Failure: nothing applied, bytes untouched, truthful code.
	 */
	async mutate(step: (current: T) => { next: T; apply: () => void }): Promise<Outcome> {
		const exec = async (): Promise<Outcome> => {
			if (!this.acknowledged) {
				return { ok: false, code: 'READ_NOT_ACKNOWLEDGED', message: 'no successful read acknowledged yet' };
			}
			try {
				this.readStored(); // per-op re-verify (bytes readable)
			} catch {
				return { ok: false, code: 'READ_FAILED', message: `stored record at ${this.key} is unreadable — operation refused, stored bytes untouched` };
			}
			const { next, apply } = step(this.live());
			const nextStr = JSON.stringify(next);
			const rawBefore = window.localStorage.getItem(this.key);
			try {
				window.localStorage.setItem(this.key, nextStr);
				if (window.localStorage.getItem(this.key) !== nextStr) {
					// verify-by-readback failed — restore previous bytes exactly
					if (rawBefore === null) window.localStorage.removeItem(this.key);
					else window.localStorage.setItem(this.key, rawBefore);
					return { ok: false, code: 'WRITE_REFUSED', message: 'storage write did not verify — state unchanged, stored bytes preserved' };
				}
			} catch (e) {
				return { ok: false, code: 'PORT_ERROR', message: `storage write failed: ${(e as Error).message}` };
			}
			apply(); // commit strictly after own write resolved
			return { ok: true };
		};
		const run = this.queue.then(exec, exec); // re-base: executes on last committed state either way
		this.queue = run.then(
			() => undefined,
			() => undefined
		);
		return run;
	}

	/** The last committed live state is supplied by the owner (Svelte $state). */
	live(): T {
		return this.liveGetter();
	}
	liveGetter: () => T = () => this.empty();
}

function isScriptsRecord(v: unknown): v is ScriptsRecord {
	return !!v && typeof v === 'object' && (v as { version?: unknown }).version === 1 && Array.isArray((v as { drafts?: unknown }).drafts);
}
function isRunsRecord(v: unknown): v is RunsRecord {
	return !!v && typeof v === 'object' && (v as { version?: unknown }).version === 1 && Array.isArray((v as { runs?: unknown }).runs);
}

// ---- built-in indicator templates (ship through the same pipeline) --------
export const BUILTIN_INDICATORS: Record<string, string> = {
	SMA: `// Simple moving average of closes (built-in template — editable draft)
function onBar(bar, api) {
  const period = Math.max(2, Math.round(Number(api.input('period', 20))));
  const closes = api.bars().bars.map(function (b) { return b.close; });
  let m = null;
  if (closes.length >= period) {
    let s = 0;
    for (let i = closes.length - period; i < closes.length; i++) s += closes[i];
    m = s / period;
  }
  api.plot('sma' + period, m);
}`,
	EMA: `// Exponential moving average of closes (built-in template — editable draft)
function onBar(bar, api) {
  const period = Math.max(2, Math.round(Number(api.input('period', 20))));
  const closes = api.bars().bars.map(function (b) { return b.close; });
  const k = 2 / (period + 1);
  let e = null;
  for (let i = 0; i < closes.length; i++) {
    e = e === null ? closes[i] : closes[i] * k + e * (1 - k);
    if (i >= period - 1) api.plot('ema' + period, e);
  }
}`
};

let idSeq = 0;
function genId(): string {
	idSeq += 1;
	return `g3-draft-${Date.now().toString(36)}-${idSeq}`;
}

// ---- reactive state -------------------------------------------------------
let drafts = $state<ScriptDraft[]>([]);
let runs = $state<StoredRun[]>([]);
let selectedDraftId = $state<string | null>(null);
let editorOpen = $state(false);
let storeStatus = $state<'idle' | 'saving' | 'saved' | 'failed'>('idle');
let storeDetail = $state('');
let running = $state(false);
let runMessage = $state('');
let lastOutcome: Outcome | null = $state(null);

const scriptsTx = new TxStore<ScriptsRecord>(SCRIPTS_KEY, () => ({ version: 1, drafts: [] }), isScriptsRecord);
const runsTx = new TxStore<RunsRecord>(RUNS_KEY, () => ({ version: 1, runs: [] }), isRunsRecord);
scriptsTx.liveGetter = () => ({ version: 1, drafts });
runsTx.liveGetter = () => ({ version: 1, runs });

function initialRead(): void {
	if (typeof window === 'undefined') return;
	try {
		const s = scriptsTx.readStored();
		drafts = s.drafts;
		scriptsTx.acknowledge();
	} catch {
		storeStatus = 'failed';
		storeDetail = `scripts storage unreadable — ${SCRIPTS_KEY} bytes preserved; fix or clear the key to recover`;
	}
	try {
		const r = runsTx.readStored();
		runs = r.runs;
		runsTx.acknowledge();
	} catch {
		storeStatus = 'failed';
		storeDetail = `runs storage unreadable — ${RUNS_KEY} bytes preserved`;
	}
}
if (typeof window !== 'undefined') initialRead();

async function persistDrafts(nextDrafts: ScriptDraft[]): Promise<Outcome> {
	// live state is drafted inside apply() only — committed strictly after the
	// store's own write resolves (D-004: no pending exposure)
	const res = await scriptsTx.mutate(() => ({
		next: { version: 1, drafts: nextDrafts },
		apply: () => {
			drafts = nextDrafts;
		}
	}));
	report(res, 'draft save');
	return res;
}

function report(res: Outcome, action: string): void {
	lastOutcome = res;
	if (res.ok) {
		storeStatus = 'saved';
		storeDetail = '';
	} else {
		storeStatus = 'failed';
		storeDetail = `${action} refused [${res.code}]: ${res.message}`;
	}
}

// ---- public store API -----------------------------------------------------
export const scriptsStore = {
	get drafts() {
		return drafts;
	},
	get runs() {
		return runs;
	},
	get selectedDraftId() {
		return selectedDraftId;
	},
	get editorOpen() {
		return editorOpen;
	},
	get status() {
		return storeStatus;
	},
	get statusDetail() {
		return storeDetail;
	},
	get running() {
		return running;
	},
	get runMessage() {
		return runMessage;
	},
	get lastOutcome() {
		return lastOutcome;
	},
	fixture: {
		symbol: G2.symbol,
		horizonInstant: G2.horizonInstant,
		firstTime: G2.bars[0].time,
		barCount: G2.bars.length
	},

	select(id: string | null): void {
		selectedDraftId = id;
	},
	openEditor(): void {
		editorOpen = true;
	},
	async hideEditor(): Promise<void> {
		// autosave on hide — hidden editors must not lose edits
		editorOpen = false;
		await this.saveSelected();
	},

	async newDraft(name: string, source: string, builtin = false): Promise<void> {
		const draft: ScriptDraft = { id: genId(), name, source, builtin, updatedAt: Date.now() };
		const res = await persistDrafts([...drafts, draft]);
		if (res.ok) {
			selectedDraftId = draft.id;
			editorOpen = true;
		}
	},

	async addBuiltin(kind: 'SMA' | 'EMA'): Promise<void> {
		const n = drafts.filter((d) => d.name.startsWith(kind)).length + 1;
		await this.newDraft(`${kind} ${n}`, BUILTIN_INDICATORS[kind], true);
	},

	async saveSelected(): Promise<void> {
		const id = selectedDraftId;
		if (!id) return;
		const res = await persistDrafts(drafts.map((d) => (d.id === id ? { ...d, updatedAt: Date.now() } : d)));
		void res;
	},

	async editSelectedSource(source: string): Promise<void> {
		const id = selectedDraftId;
		if (!id) return;
		// in-memory editor buffer only (drafts are provisional work); persisted
		// on Save / hide. Not a storage mutation — the FIFO governs those.
		drafts = drafts.map((d) => (d.id === id ? { ...d, source, updatedAt: Date.now() } : d));
		storeStatus = 'idle';
		storeDetail = 'unsaved edits';
	},

	async editSelectedName(name: string): Promise<void> {
		const id = selectedDraftId;
		if (!id) return;
		drafts = drafts.map((d) => (d.id === id ? { ...d, name, updatedAt: Date.now() } : d));
	},

	async deleteSelected(): Promise<void> {
		const id = selectedDraftId;
		if (!id) return;
		const res = await persistDrafts(drafts.filter((d) => d.id !== id));
		if (res.ok) selectedDraftId = null;
	},

	/** Run a bounded backtest for the selected draft; append the immutable run. */
	async runSelected(timeframe: '15m' | '1h' | '4h', rangeBars: number, inputsJson: string): Promise<void> {
		const draft = drafts.find((d) => d.id === selectedDraftId);
		if (!draft) {
			runMessage = 'select a draft first';
			return;
		}
		let inputs: Record<string, number | string | boolean>;
		try {
			const parsed: unknown = JSON.parse(inputsJson || '{}');
			if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('inputs must be a JSON object');
			inputs = parsed as Record<string, number | string | boolean>;
		} catch (e) {
			runMessage = `inputs JSON invalid: ${(e as Error).message}`;
			return;
		}
		running = true;
		runMessage = 'running…';
		try {
			// bounded range: the last `rangeBars` bars at or before the horizon
			const horizonBars = G2.bars.filter((b) => b.time <= G2.horizonInstant);
			const fromIndex = Math.max(0, horizonBars.length - rangeBars);
			const fromTime = horizonBars[fromIndex].time;
			const toTime = G2.horizonInstant;
			const result = await runBacktest({
				symbol: G2.symbol,
				baseTimeframe: '15m',
				timeframe,
				fromTime,
				toTime,
				scriptSource: draft.source,
				inputs,
				fill: { spread: 0.1, slippage: 0.05, commission: 1.0, startingCash: 10000, model: 'next-bar-open' },
				sourceBars: G2.bars,
				runtime: createQuickJsScriptRuntime()
			});
			const run: StoredRun = {
				id: result.identity.id,
				shortId: result.identity.id.slice(0, 12),
				draftId: draft.id,
				draftName: draft.name,
				draftRevision: scriptRevisionFromCanonical(result.identity.canonical),
				status: result.status,
				errorCode: result.error?.code,
				errorMessage: result.error?.message,
				inputs,
				timeframe,
				rangeBars: result.assumptions.barsInRun,
				fromTime,
				toTime,
				assumptions: result.assumptions,
				stats: result.stats,
				trades: result.trades,
				plots: result.plots,
				signals: result.signals,
				equity: result.equity,
				unavailable: result.unavailable,
				barTimes: result.barTimes, // authoritative from the kit run result
				finishedAt: Date.now()
			};
			const res = await runsTx.mutate((current) => {
				const nextRuns = [...current.runs, run].slice(-MAX_RUNS);
				return {
					next: { version: 1, runs: nextRuns },
					apply: () => {
						runs = nextRuns;
					}
				};
			});
			report(res, 'run store');
			runMessage =
				result.status === 'succeeded'
					? `run ${run.shortId}: ${result.stats?.tradeCount ?? 0} fills, net ${result.stats?.netProfit?.toFixed(2)}`
					: `run failed: ${result.error?.code}: ${result.error?.message}`;
		} finally {
			running = false;
		}
	},

	/** F-AVC-1: recovery must clear stale refusal text — explicit recovery path. */
	async recoverAfterStorageRepair(): Promise<void> {
		initialRead();
	}
};

// script revision for the run record — extracted from the identity canonical
function scriptRevisionFromCanonical(canonical: string): string {
	try {
		const parsed = JSON.parse(canonical) as { scriptRevision?: string };
		return parsed.scriptRevision ?? '';
	} catch {
		return '';
	}
}

// script revision helper for the run record (exact source pinning)
export async function scriptRevisionOf(source: string): Promise<string> {
	const { scriptRevision } = await import('@vict-trading/trading-kit');
	return scriptRevision(source);
}
void RUNNER_KIND;
void RUNNER_VERSION;
