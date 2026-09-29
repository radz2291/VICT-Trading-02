/**
 * Replay state (G2) — the app composes @vict-trading/trading-kit with the
 * existing Chart Workspace. The chart and the OHLC readout receive bar data
 * ONLY through the kit's capped `bars()` queries (R1); the kit's clock is
 * the ONLY source of replay market time (no wall clock). Replay sessions
 * persist ONLY through the app-supplied SessionPersistence adapter below
 * (storage key `g2.replay.v1` — deliberately different from `g1.levels.v1`).
 */
import {
	createReplayClock,
	createDataSession,
	ReplaySession,
	visibilityAt,
	type MissingInterval,
	type QueryRecord,
	type ReplayLevel,
	type SessionEvent,
	type SessionRecord
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
const BASE_SECONDS = 900;
const REPLAY_KEY = 'g2.replay.v1';

export type ReplayMode = 'current' | 'replay';

// ---- app-supplied SessionPersistence adapter (app owns storage) ----------
// Read-before-write acknowledgment: the adapter READS first; only a
// SUCCESSFUL read result is acknowledged to the kit, which then opens its
// write gate (READ_NOT_ACKNOWLEDGED before that). Every write is verified by
// read-back compare (G1-PKG pattern).
function readReplayRecord(): SessionRecord | null {
	const raw = window.localStorage.getItem(REPLAY_KEY);
	const parsed = raw ? (JSON.parse(raw) as SessionRecord) : null;
	return parsed && typeof parsed === 'object' ? parsed : null;
}

function makePersistence() {
	return {
		read: (): SessionRecord | null => {
			const raw = window.localStorage.getItem(REPLAY_KEY); // throws on getter-throw
			return raw ? (JSON.parse(raw) as SessionRecord) : null; // throws on corrupt bytes
		},
		write: async (record: SessionRecord) => {
			const rawBefore = window.localStorage.getItem(REPLAY_KEY);
			const next = JSON.stringify(record);
			window.localStorage.setItem(REPLAY_KEY, next);
			if (window.localStorage.getItem(REPLAY_KEY) !== next) {
				if (rawBefore === null) window.localStorage.removeItem(REPLAY_KEY);
				else window.localStorage.setItem(REPLAY_KEY, rawBefore);
				return { ok: false as const, code: 'STORAGE_VERIFY_FAILED', message: 'write verification failed — original restored' };
			}
			return { ok: true as const };
		},
		remove: () => {
			window.localStorage.removeItem(REPLAY_KEY);
		}
	};
}

export interface ReplayStartOption {
	index: number;
	time: number;
	label: string;
}

export function createReplayState() {
	// kit wiring — clock guards the fixture horizon; data session caps queries
	const clock = createReplayClock({ horizon: G2.horizonInstant, start: G2.bars[0].time });
	const data = createDataSession({
		clock,
		source: { bars: G2.bars },
		rules: { symbol: G2.symbol, baseTimeframe: '15m' }
	});
	const evidence: SessionEvent[] = [];
	const persistence = makePersistence();
	const session = new ReplaySession(
		{ clock, persistence },
		{ onEvent: (e) => { if (evidence.length < 500) evidence.push(e); } }
	);

	let active = $state(false);
	let mode: ReplayMode = $state('current');
	let timeframe: '15m' | '1h' | '4h' = $state('15m');
	let now = $state(clock.now());
	let stepIdx = $state(0);
	let playing = $state(false);
	let status = $state('idle');
	let bars: typeof G2.bars = $state([]);
	let missing: MissingInterval[] = $state([]);
	let levels: ReplayLevel[] = $state([]);
	let lastQuery: QueryRecord | null = $state(null);
	let queryCount = $state(0);
	let timer: ReturnType<typeof setInterval> | undefined;

	// acknowledge ONLY after a successful read (opens the kit's write gate)
	if (typeof window !== 'undefined') {
		try {
			session.acknowledgeState(readReplayRecord());
			status = 'ready';
		} catch {
			status = 'unavailable: storage read failed — replay persistence refused';
		}
	}

	function refresh(): void {
		// R1: the ONLY path bars take to the chart / OHLC readout
		const r = data.bars({ until: null, granularity: timeframe });
		bars = r.bars;
		lastQuery = data.queryRecords().at(-1) ?? null;
		queryCount = data.queryRecords().length;
		missing = data.availabilityAt();
		now = clock.now();
		stepIdx = session.currentStep();
		levels = session.levelsAll()
			.map((l) => ({ ...l, provenance: 'replay-stamped' as const }))
			.filter((l) => visibilityAt(l, { mode: 'replay', currentStep: stepIdx, now }).visible);
	}

	// level derived readout over the CAPPED slice only (naive full-history
	// calc over the whole fixture would see the poison — never done here)
	function visibleSliceStats(): { max: number; sma20: number } {
		let max = -Infinity;
		for (const b of bars) max = Math.max(max, b.high);
		const c = bars.slice(-20).map((b) => b.close);
		const sma20 = c.length ? c.reduce((a, b) => a + b, 0) / c.length : NaN;
		return { max: Number.isFinite(max) ? max : NaN, sma20 };
	}

	const startOptions: ReplayStartOption[] = G2.bars
		.map((b, i) => ({ index: i, time: b.time, label: new Date(b.time * 1000).toISOString().slice(0, 16).replace('T', ' ') + 'Z' }))
		.filter((o) => o.index % 100 === 0 || o.index === 1997);

	async function start(index: number): Promise<void> {
		const instant = G2.bars[index].time;
		const r = await session.start(instant);
		if (!r.ok) { status = r.code + ': ' + r.message; return; }
		active = true;
		mode = 'replay';
		timeframe = '15m';
		playing = false;
		status = 'replaying';
		refresh();
	}

	async function step(): Promise<void> {
		const r = await session.step(BASE_SECONDS);
		if (!r.ok) { status = r.code + ': ' + r.message; return; }
		refresh();
	}

	async function play(): Promise<void> {
		const r = await session.play();
		if (!r.ok) { status = r.code + ': ' + r.message; return; }
		playing = true;
		if (timer) clearInterval(timer);
		timer = setInterval(() => {
			if (clock.now() >= clock.horizon()) {
				void pause();
				return;
			}
			void step();
		}, 400);
	}

	async function pause(): Promise<void> {
		if (timer) clearInterval(timer);
		timer = undefined;
		const r = await session.pause();
		if (!r.ok) { status = r.code + ': ' + r.message; return; }
		playing = false;
	}

	function setTimeframe(tf: '15m' | '1h' | '4h'): void {
		timeframe = tf;
		refresh();
	}

	async function restore(): Promise<void> {
		// fresh read, then acknowledge, then restore (read-before-write gate)
		try {
			session.acknowledgeState(readReplayRecord());
			const r = await session.restore();
			if (!r.ok) { status = r.code + ': ' + r.message; return; }
			active = true;
			mode = 'replay';
			refresh();
			status = 'restored';
		} catch {
			status = 'unavailable: stored session unreadable';
		}
	}

	async function resetSession(): Promise<void> {
		if (!window.confirm('Deliberately reset the replay session? The stored replay session record will be removed.')) return;
		const r = await session.reset();
		if (!r.ok) { status = r.code + ': ' + r.message; return; }
		active = false;
		mode = 'current';
		playing = false;
		if (timer) clearInterval(timer);
		status = 'session reset';
		// reset the clock to the beginning of history for a clean next start
		clock.setFrame(G2.bars[0].time);
		now = clock.now();
		stepIdx = 0;
		bars = [];
		levels = [];
	}

	async function returnToCurrent(): Promise<void> {
		if (timer) clearInterval(timer);
		const r = await session.returnToCurrent();
		if (!r.ok) { status = r.code + ': ' + r.message; return; }
		active = false;
		mode = 'current';
		playing = false;
		status = 'returned to current';
	}

	async function createLevel(price: number): Promise<void> {
		// replay-stamped with clock.now() + current step (R3 class b)
		const r = await session.createLevel(price, 'replay level');
		if (!r.ok) { status = r.code + ': ' + r.message; return; }
		refresh();
	}

	async function removeLevel(id: string): Promise<void> {
		const r = await session.removeLevel(id);
		if (!r.ok) { status = r.code + ': ' + r.message; return; }
		refresh();
	}

	return {
		get active() { return active; },
		get mode() { return mode; },
		get timeframe() { return timeframe; },
		get now() { return now; },
		get stepIndex() { return stepIdx; },
		get playing() { return playing; },
		get status() { return status; },
		get bars() { return bars; },
		get missing() { return missing; },
		get levels() { return levels; },
		get lastQuery() { return lastQuery; },
		get queryCount() { return queryCount; },
		get evidence() { return evidence; },
		get horizon() { return G2.horizonInstant; },
		get fixtureVariant() { return G2.variant; },
		get allLevels() { return session.levelsAll(); },
		stats: visibleSliceStats,
		startOptions,
		start,
		step,
		play,
		pause,
		setTimeframe,
		restore,
		resetSession,
		returnToCurrent,
		createLevel,
		removeLevel
	};
}

export type ReplayState = ReturnType<typeof createReplayState>;

export function fmtInstant(t: number): string {
	return new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ') + 'Z';
}
