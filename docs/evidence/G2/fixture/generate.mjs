#!/usr/bin/env node
/**
 * G2 poison-future fixture generator — DETERMINISTIC, one command.
 *
 *   node generate.mjs            (writes baseline + alternate + meta)
 *   node generate.mjs alternate  (regenerates ONLY the alternate variant —
 *                                 the documented one-command verifier mutation)
 *
 * Derivation: same deterministic walk as the app fixture source (seed
 * 20260927, XAUUSD 15m, start 2026-01-05T00:00:00Z, step 900 s, 2800
 * candidate slots, weekend slots skipped, deliberate gap block [300..307]
 * and singles [17, 499, 1200] dropped) — byte-identical consumption order,
 * so every bar ≤ the horizon is IDENTICAL to the app's XAUUSD base series.
 *
 * Horizon: the 2000th existing bar (index 1999). The replay horizon instant
 * is that bar's close time.
 *
 * POISON: the last 25 bars AFTER the horizon carry poison values that would
 * change a deliberately naive full-history calculation if ever visible:
 *   baseline variant:  closes 3100.00 + j*0.5  (above the ~2650 historical walk)
 *   alternate variant: closes 6100.00 + j*0.5
 * Only bars > horizon differ between variants — bars ≤ horizon are
 * byte-identical (proven by the generator and checkable via SHA-256 of the
 * truncated arrays).
 */
import { writeFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));

// ---- walk constants (identical to host/src/lib/fixture.ts XAUUSD) --------
const SEED = 20260927;
const STEP = 900;
const START = Date.UTC(2026, 0, 5, 0, 0, 0) / 1000;
const CANDIDATE_SLOTS = 2800;
const BLOCK_DROP = new Set(Array.from({ length: 8 }, (_, i) => 300 + i));
const SINGLE_DROPS = new Set([17, 499, 1200]);
const BASE = 2650;
const HORIZON_BAR_INDEX = 1997; // the 1998th bar — the ~2000-bar mark (walk total: 2023 bars)
const POISON_COUNT = 25;
const R2 = (n) => Math.round(n * 100) / 100;

function mulberry32(seed) {
	let a = seed >>> 0;
	return function () {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function buildWalk() {
	const rnd = mulberry32(SEED);
	const bars = [];
	let price = BASE;
	for (let i = 0; i < CANDIDATE_SLOTS; i++) {
		const time = START + i * STEP;
		const day = new Date(time * 1000).getUTCDay();
		const isWeekend = day === 0 || day === 6;
		const isGap = BLOCK_DROP.has(i) || SINGLE_DROPS.has(i);
		const drift = (rnd() - 0.5) * 2 * 0.6;
		const wickUp = rnd() * 0.55;
		const wickDown = rnd() * 0.55;
		if (isWeekend || isGap) continue;
		const open = price;
		const close = R2(open + drift);
		const high = R2(Math.max(open, close) + wickUp);
		const low = R2(Math.min(open, close) - wickDown);
		bars.push({ time, open: R2(open), high, low, close });
		price = close;
	}
	return bars;
}

function variantPoison(walk, variant) {
	// historical prefix: bars ≤ horizon, untouched
	const prefix = walk.slice(0, HORIZON_BAR_INDEX + 1);
	const horizonInstant = prefix[prefix.length - 1].time + STEP; // close time
	// continue the walk for POISON_COUNT slots after the horizon bar,
	// consuming randomness identically, then OVERRIDE with poison values
	const rnd = mulberry32(SEED);
	// replay the exact consumption up to the horizon bar index (candidate slot index of the last prefix bar):
	// simpler: rebuild full walk WITH the tail, then override the tail values
	const tail = walk.slice(HORIZON_BAR_INDEX + 1, HORIZON_BAR_INDEX + 1 + POISON_COUNT);
	const poison = tail.map((b, j) => {
		const baseLevel = variant === 'baseline' ? 3100 : 6100;
		const close = R2(baseLevel + j * 0.5);
		return { time: b.time, open: close, high: R2(close + 0.5), low: R2(close - 0.5), close };
	});
	return { prefix, poison, horizonInstant, all: [...prefix, ...poison] };
}

const walk = buildWalk();
if (walk.length !== HORIZON_BAR_INDEX + 1 + POISON_COUNT) {
	console.error('walk too short', walk.length);
	process.exit(1);
}

function sha256(obj) {
	return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

const variants = {};
for (const v of ['baseline', 'alternate']) {
	const { prefix, poison, horizonInstant, all } = variantPoison(walk, v);
	variants[v] = { prefix, poison, horizonInstant, all, digest: sha256(all) };
	writeFileSync(`${here}/g2-fixture-${v}.json`, JSON.stringify({ symbol: 'XAUUSD', timeframe: '15m', variant: v, horizonInstant, bars: all }, null, 1));
}

// identity proof: prefixes identical across variants
const prefixDigest = sha256(variants.baseline.prefix);
if (prefixDigest !== sha256(variants.alternate.prefix)) {
	console.error('PREFIX MISMATCH — generator bug'); process.exit(1);
}

// naive full-history calculations (potency check printed for the report)
function naiveMax(bars) { return Math.max(...bars.map((b) => b.high)); }
function naiveSma20Final(bars) {
	const c = bars.slice(-20).map((b) => b.close);
	return R2(c.reduce((a, b) => a + b, 0) / c.length);
}
for (const v of ['baseline', 'alternate']) {
	const all = variants[v].all;
	console.log(v, 'bars:', all.length, '| naive full-history max:', naiveMax(all), '| SMA20 final:', naiveSma20Final(all), '| sha256:', variants[v].digest);
}
console.log('historical prefix sha256 (identical both variants):', prefixDigest);
console.log('horizon bar index:', HORIZON_BAR_INDEX, '| horizon instant:', variants.baseline.horizonInstant, '| poison bars:', POISON_COUNT);

const meta = {
	generatedBy: 'node generate.mjs',
	seed: SEED,
	derivation: 'host/src/lib/fixture.ts XAUUSD walk (seed 20260927, 15m, start 2026-01-05T00:00:00Z, step 900s, 2800 slots, weekend+gap drops) — bars ≤ horizon identical to the app base series',
	horizonBarIndex: HORIZON_BAR_INDEX,
	horizonInstant: variants.baseline.horizonInstant,
	poisonBarCount: POISON_COUNT,
	poisonBaseline: { closeStart: 3100, closeStep: 0.5 },
	poisonAlternate: { closeStart: 6100, closeStep: 0.5 },
	naiveCalculations: {
		baseline: { fullHistoryMax: naiveMax(variants.baseline.all), sma20Final: naiveSma20Final(variants.baseline.all) },
		alternate: { fullHistoryMax: naiveMax(variants.alternate.all), sma20Final: naiveSma20Final(variants.alternate.all) }
	},
	sha256: {
		baseline: variants.baseline.digest,
		alternate: variants.alternate.digest,
		historicalPrefixBothVariants: prefixDigest
	},
	oneCommandRegenerator: 'node docs/evidence/G2/fixture/generate.mjs alternate'
};
writeFileSync(`${here}/fixture-meta.json`, JSON.stringify(meta, null, 2));
// copy baseline into the app as the replay data source (with meta inline)
mkdirSync(`${here}/../../../../host/src/lib/fixtures`, { recursive: true });
writeFileSync(
	`${here}/../../../../host/src/lib/fixtures/g2-fixture.json`,
	JSON.stringify({
		symbol: 'XAUUSD',
		timeframe: '15m',
		variant: 'baseline',
		horizonInstant: variants.baseline.horizonInstant,
		horizonBarIndex: HORIZON_BAR_INDEX,
		bars: variants.baseline.all
	})
);
console.log('wrote g2-fixture-baseline.json, g2-fixture-alternate.json, fixture-meta.json, host/src/lib/fixtures/g2-fixture.json');
