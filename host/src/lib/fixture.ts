/**
 * Deterministic OHLC fixtures — fixture-only data, never a clock, never a feed.
 *
 * Contract (documented in docs/evidence/G0/spike-host.md, extended for G1):
 *  - XAUUSD: seed 20260927, start 2026-01-05T00:00:00Z (Monday), step 900s,
 *    candidate slots 2800, weekend slots + deliberate gap block [300..307]
 *    and singles [17, 499, 1200] dropped, walk around 2650.00 USD, 2 decimals.
 *    BYTE-IDENTICAL to the G0 fixture (same seed, same consumption order).
 *  - EURUSD: seed 20260928 (derived the same way, documented here), same
 *    structure, walk around 1.0850 with EURUSD-scale drift/wicks, 4 decimals.
 *  - Timeframes: 15m is the base series; 1h and 4h are honest aggregations
 *    of EXISTING base bars into UTC-aligned buckets (1h = 4 slots, 4h = 16
 *    slots). No bars are invented: a bucket containing only some of its
 *    slots (because of deliberate gaps) aggregates the bars that exist and
 *    is labelled by its bucket start time. Bucket boundaries never merge
 *    across a weekend boundary in wall-clock terms because buckets are
 *    pure UTC epoch arithmetic.
 */

export interface Bar {
	/** unix seconds (UTC) */
	time: number;
	open: number;
	high: number;
	low: number;
	close: number;
}

export type InstrumentSymbol = 'XAUUSD' | 'EURUSD';
export type Timeframe = '15m' | '1h' | '4h';

export const SYMBOLS: InstrumentSymbol[] = ['XAUUSD', 'EURUSD'];
export const TIMEFRAMES: Timeframe[] = ['15m', '1h', '4h'];

interface InstrumentSpec {
	seed: number;
	base: number;
	driftScale: number;
	wickScale: number;
	decimals: number;
}

const INSTRUMENTS: Record<InstrumentSymbol, InstrumentSpec> = {
	XAUUSD: { seed: 20260927, base: 2650, driftScale: 0.6, wickScale: 0.55, decimals: 2 },
	EURUSD: { seed: 20260928, base: 1.085, driftScale: 0.0003, wickScale: 0.00027, decimals: 4 }
};

function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return function () {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function roundTo(n: number, decimals: number): number {
	const f = Math.pow(10, decimals);
	return Math.round(n * f) / f;
}

function buildWalk(sym: InstrumentSymbol): Bar[] {
	const spec = INSTRUMENTS[sym];
	const rnd = mulberry32(spec.seed);
	const bars: Bar[] = [];
	let price = spec.base;
	for (let i = 0; i < CANDIDATE_SLOTS; i++) {
		const time = START + i * STEP;
		const day = new Date(time * 1000).getUTCDay();
		const isWeekend = day === 0 || day === 6;
		const isDeliberateGap = BLOCK_DROP.has(i) || SINGLE_DROPS.has(i);
		// consume the same randomness regardless of drop, keeping the walk
		// deterministic independent of the drop policy
		const drift = (rnd() - 0.5) * 2 * spec.driftScale;
		const wickUp = rnd() * spec.wickScale;
		const wickDown = rnd() * spec.wickScale;
		if (isWeekend || isDeliberateGap) continue;
		const open = price;
		const close = roundTo(open + drift, spec.decimals);
		const high = roundTo(Math.max(open, close) + wickUp, spec.decimals);
		const low = roundTo(Math.min(open, close) - wickDown, spec.decimals);
		bars.push({ time, open: roundTo(open, spec.decimals), high, low, close });
		price = close;
	}
	return bars;
}

const STEP = 900; // 15m in seconds
const START = Date.UTC(2026, 0, 5, 0, 0, 0) / 1000; // Monday 2026-01-05T00:00:00Z
const CANDIDATE_SLOTS = 2800;
const BLOCK_DROP = new Set(Array.from({ length: 8 }, (_, i) => 300 + i));
const SINGLE_DROPS = new Set([17, 499, 1200]);

/** XAUUSD 15m base series — byte-identical to the G0 fixture. */
export function buildFixture(): Bar[] {
	return buildWalk('XAUUSD');
}

export function buildInstrument(sym: InstrumentSymbol): Bar[] {
	return buildWalk(sym);
}

const TF_FACTOR: Record<Timeframe, number> = { '15m': 1, '1h': 4, '4h': 16 };

/**
 * Aggregate base 15m bars into UTC-aligned buckets. Only existing bars are
 * combined (never invented). A bucket missing some of its slots (deliberate
 * gap) aggregates what exists — the result is a partial-coverage bucket,
 * which is the honest representation of the fixture's gap.
 */
export function aggregate(bars: Bar[], tf: Timeframe): Bar[] {
	const factor = TF_FACTOR[tf];
	if (factor === 1) return bars;
	const bucketSeconds = STEP * factor;
	const out: Bar[] = [];
	let current: { time: number; open: number; high: number; low: number; close: number } | null = null;
	for (const b of bars) {
		const bucket = Math.floor(b.time / bucketSeconds) * bucketSeconds;
		if (current === null || bucket !== current.time) {
			if (current !== null) out.push(current);
			current = { time: bucket, open: b.open, high: b.high, low: b.low, close: b.close };
		} else {
			current.high = Math.max(current.high, b.high);
			current.low = Math.min(current.low, b.low);
			current.close = b.close;
		}
	}
	if (current !== null) out.push(current);
	return out;
}

export function buildSeries(sym: InstrumentSymbol, tf: Timeframe): Bar[] {
	return aggregate(buildInstrument(sym), tf);
}

export const FIXTURE_META = {
	seed: INSTRUMENTS.XAUUSD.seed,
	eurusdSeed: INSTRUMENTS.EURUSD.seed,
	stepSeconds: STEP,
	startIso: new Date(START * 1000).toISOString(),
	candidateSlots: CANDIDATE_SLOTS,
	deliberateGaps: {
		block: 'candidate slots 300..307 (8 consecutive 15m intervals)',
		singles: [17, 499, 1200]
	},
	aggregation: '1h = 4 existing 15m bars per UTC bucket; 4h = 16; partial buckets aggregate existing bars only'
};
