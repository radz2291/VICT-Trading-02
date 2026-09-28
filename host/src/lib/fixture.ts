/**
 * Deterministic OHLC fixture — XAUUSD 15m, seeded PRNG (mulberry32).
 *
 * Contract (documented in docs/evidence/G0/spike-host.md):
 *  - seed: 20260927
 *  - start: 2026-01-05T00:00:00Z (Monday), step 900s, 2100 candidate slots
 *  - drops: weekends (Sat/Sun slots) + deliberate gap block candidate slots
 *    [300..307] and singles [17, 499, 1200] → 2000-bar-class series with
 *    deliberate missing intervals
 *  - price walk around 2650.00 USD: open = prev close; close = open + drift;
 *    high/low = max/min(open, close) ± symmetric noise
 *
 * The generator must never touch a clock: all values derive from the seed.
 */

export interface Bar {
	/** unix seconds (UTC) */
	time: number;
	open: number;
	high: number;
	low: number;
	close: number;
}

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

const SEED = 20260927;
const STEP = 900; // 15m
const START = Date.UTC(2026, 0, 5, 0, 0, 0) / 1000; // Monday 2026-01-05T00:00:00Z
const CANDIDATE_SLOTS = 2800;
const BLOCK_DROP = new Set(Array.from({ length: 8 }, (_, i) => 300 + i));
const SINGLE_DROPS = new Set([17, 499, 1200]);

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

export function buildFixture(): Bar[] {
	const rnd = mulberry32(SEED);
	const bars: Bar[] = [];
	let price = 2650;
	let slot = 0;
	for (let i = 0; i < CANDIDATE_SLOTS; i++) {
		const time = START + i * STEP;
		const day = new Date(time * 1000).getUTCDay();
		const isWeekend = day === 0 || day === 6;
		const isDeliberateGap = BLOCK_DROP.has(i) || SINGLE_DROPS.has(i);
		// consume the same randomness regardless of drop, keeping the walk
		// deterministic independent of the drop policy
		const drift = (rnd() - 0.5) * 1.2;
		const wickUp = rnd() * 0.55;
		const wickDown = rnd() * 0.55;
		if (isWeekend || isDeliberateGap) {
			slot++;
			continue;
		}
		const open = price;
		const close = round2(open + drift);
		const high = round2(Math.max(open, close) + wickUp);
		const low = round2(Math.min(open, close) - wickDown);
		bars.push({ time, open: round2(open), high, low, close });
		price = close;
		slot++;
	}
	return bars;
}

export const FIXTURE_META = {
	seed: SEED,
	stepSeconds: STEP,
	startIso: new Date(START * 1000).toISOString(),
	candidateSlots: CANDIDATE_SLOTS,
	deliberateGaps: {
		block: 'candidate slots 300..307 (8 consecutive 15m intervals)',
		singles: [17, 499, 1200]
	}
};
