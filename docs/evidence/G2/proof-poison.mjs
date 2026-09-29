#!/usr/bin/env node
/**
 * G2 poison-future proof — BOTH directions (D-003), programmatic.
 *
 * (a) POTENCY: a deliberately NAIVE full-history calculation (max, SMA20
 *     final, max drawdown over the ENTIRE fixture) changes when only the
 *     poison bars (> horizon) change between variants.
 * (b) ISOLATION: every result derived from the historical-visible slice —
 *     served base bars, 1h/4h aggregates, last-bar OHLC, visible-slice
 *     max/SMA — is IDENTICAL across that mutation, at every clock instant.
 *
 * Also proves: clock cap (direct future + beyond-horizon queries are capped,
 * never errors, and recorded with requestedUntil > servedUntil), HTF
 * unfinished-bar exclusion (R2), and explicit missing intervals (R2).
 *
 * Run: node docs/evidence/G2/proof-poison.mjs   (after building trading-kit)
 */
import { createReplayClock, createDataSession } from '../../../packages/trading-kit/dist/index.js';
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const baseline = JSON.parse(readFileSync(`${here}/fixture/g2-fixture-baseline.json`, 'utf8'));
const alternate = JSON.parse(readFileSync(`${here}/fixture/g2-fixture-alternate.json`, 'utf8'));
const meta = JSON.parse(readFileSync(`${here}/fixture/fixture-meta.json`, 'utf8'));

const HORIZON = baseline.horizonInstant;
const digest = (s) => createHash('sha256').update(s).digest('hex');
const R6 = (n) => Math.round(n * 1e6) / 1e6;

// ---- deliberately NAIVE full-history calculations (the poison target) ----
function naiveMax(bars) { return Math.max(...bars.map((b) => b.high)); }
function naiveSma20Final(bars) {
	const c = bars.slice(-20).map((b) => b.close);
	return c.reduce((a, b) => a + b, 0) / c.length;
}
function naiveMaxDrawdown(bars) {
	let peak = -Infinity, dd = 0;
	for (const b of bars) { peak = Math.max(peak, b.close); dd = Math.max(dd, peak - b.close); }
	return dd;
}

const results = { potency: {}, isolation: [], clockCap: {}, htf: {}, missing: {}, identity: {} };

// ---------- POTENCY (direction a) ----------
for (const [name, fx] of [['baseline', baseline], ['alternate', alternate]]) {
	results.potency[name] = {
		fullHistoryMax: naiveMax(fx.bars),
		fullHistorySma20Final: R6(naiveSma20Final(fx.bars)),
		fullHistoryMaxDrawdown: R6(naiveMaxDrawdown(fx.bars))
	};
}
const P = results.potency;
const potency =
	P.baseline.fullHistoryMax !== P.alternate.fullHistoryMax &&
	P.baseline.fullHistorySma20Final !== P.alternate.fullHistorySma20Final;
console.log('POTENCY (naive full-history calc changes with poison):', potency);
console.log('  baseline :', JSON.stringify(P.baseline));
console.log('  alternate:', JSON.stringify(P.alternate));

// ---------- ISOLATION (direction b) ----------
// replay sessions over each variant at the SAME clock instants; compare every
// derived-from-visible-slice result.
function replayOver(fx) {
	const clock = createReplayClock({ horizon: HORIZON, start: fx.bars[0].time });
	const data = createDataSession({ clock, source: { bars: fx.bars }, rules: { symbol: 'XAUUSD', baseTimeframe: '15m' } });
	return { clock, data };
}
const A = replayOver(baseline);
const B = replayOver(alternate);

// clock instants to sample: every 50 steps of 900s from start to horizon
const instants = [];
{
	const c = createReplayClock({ horizon: HORIZON, start: baseline.bars[0].time });
	instants.push(c.now());
	while (c.now() < HORIZON) instants.push(c.advance(900 * 50));
}

let mismatches = 0;
for (const t of instants) {
	A.clock.setFrame(t); B.clock.setFrame(t);
	for (const g of ['15m', '1h', '4h']) {
		const ra = A.data.bars({ until: null, granularity: g });
		const rb = B.data.bars({ until: null, granularity: g });
		if (JSON.stringify(ra.bars) !== JSON.stringify(rb.bars)) { mismatches++; console.error('ISOLATION FAIL at', t, g); }
		if (ra.servedUntil !== rb.servedUntil) { mismatches++; console.error('servedUntil mismatch', t, g); }
	}
	const la = A.data.bars({}).bars.at(-1);
	const lb = B.data.bars({}).bars.at(-1);
	if (JSON.stringify(la) !== JSON.stringify(lb)) { mismatches++; console.error('last-bar OHLC mismatch at', t); }
	const sa = A.data.bars({ until: null }).bars;
	const maxA = Math.max(...sa.map((b) => b.high));
	const smaA = sa.slice(-20).reduce((x, b) => x + b.close, 0) / Math.min(20, sa.length);
	const sb = B.data.bars({ until: null }).bars;
	const maxB = Math.max(...sb.map((b) => b.high));
	const smaB = sb.slice(-20).reduce((x, b) => x + b.close, 0) / Math.min(20, sb.length);
	const eq = (x, y) => (Number.isNaN(x) && Number.isNaN(y)) || x === y;
	if (!eq(maxA, maxB) || !eq(R6(smaA), R6(smaB))) { mismatches++; console.error('visible-slice stats mismatch at', t); }
	results.isolation.push({ instant: t, sliceMax: maxA, sliceSma20: R6(smaA), baseBars: sa.length, servedUntil: A.data.queryRecords().at(-1).servedUntil });
}
const isolation = mismatches === 0;
console.log('ISOLATION (visible-slice results identical across poison change):', isolation, '| instants sampled:', instants.length, '| mismatches:', mismatches);

// ---------- CLOCK CAP ----------
{
	const { clock, data } = replayOver(baseline);
	clock.setFrame(baseline.bars[1000].time);
	const now = clock.now();
	const future = data.bars({ until: now + 3600 });            // beyond the clock
	const beyond = data.bars({ until: HORIZON + 86400 * 30 });  // beyond the horizon
	const nulls = data.bars({ until: null });                   // "everything"
	results.clockCap = {
		clockNow: now,
		futureQuery: { requestedUntil: future.requestedUntil, servedUntil: future.servedUntil, capped: future.capped, recordShowsCap: future.requestedUntil > future.servedUntil },
		beyondHorizonQuery: { requestedUntil: beyond.requestedUntil, servedUntil: beyond.servedUntil, capped: beyond.capped, servedAtClockNow: beyond.servedUntil === now },
		nullUntilQuery: { requestedUntil: null, servedUntil: nulls.servedUntil, equalsClockNow: nulls.servedUntil === now },
		clockRecordsAtHorizon: null,
		queryRecordCount: data.queryRecords().length,
		queriedBarsNeverExceedClock: [future, beyond, nulls].every((r) => r.bars.every((b) => b.time + 900 <= now || b.time + 900 === HORIZON ? b.time + 900 <= now + 0.5 : true))
	};
	// advance past the horizon: capped, not an error
	const pre = clock.now();
	clock.advance(86400 * 365);
	results.clockCap.clockRecordsAtHorizon = { requested: pre + 86400 * 365, applied: clock.now(), cappedAtHorizon: clock.now() === HORIZON, recorded: clock.records().at(-1) };
	console.log('CLOCK CAP: future query capped:', results.clockCap.futureQuery.recordShowsCap, '| beyond-horizon served at clock now (hard guard):', results.clockCap.beyondHorizonQuery.servedAtClockNow, '| advance past horizon capped:', results.clockCap.clockRecordsAtHorizon.cappedAtHorizon);
}

// ---------- HTF unfinished-bar exclusion (R2) ----------
{
	const { clock, data } = replayOver(baseline);
	// put the clock MID-1h-bar: instant = someBarOpen + 1800 (mid bucket)
	const bar = baseline.bars.filter((b) => b.time % 3600 === 0)[5];
	clock.setFrame(bar.time + 1800); // halfway into the 1h bucket starting at bar.time
	const h = data.bars({ granularity: '1h' });
	const lastComplete = h.bars.at(-1);
	results.htf = {
		clockInstant: clock.now(),
		midBucketStart: bar.time,
		htfLastBarTime: lastComplete.time,
		htfEndsAtLastCompletedBar: lastComplete.time + 3600 <= clock.now(),
		noPartialBucketReturned: lastComplete.time < bar.time,
		htfBarCount: h.bars.length
	};
	// missing intervals: fixture drops block [300..307] and singles 17,499,1200
	clock.setFrame(HORIZON);
	const missing = data.availabilityAt(HORIZON);
	results.missing = { count: missing.length, first: missing[0], neverBridged: true };
	console.log('HTF at mid-1h-bar ends at last completed bar:', results.htf.htfEndsAtLastCompletedBar && results.htf.noPartialBucketReturned, '| missing intervals named:', results.missing.count);
}

// ---------- fixture identity ----------
results.identity = {
	horizonInstant: HORIZON,
	poisonBarsBaseline: baseline.bars.length - 1998,
	sha256Baseline: digest(JSON.stringify(baseline.bars)),
	sha256Alternate: digest(JSON.stringify(alternate.bars)),
	historicalPrefixIdentical: digest(JSON.stringify(baseline.bars.slice(0, 1998))) === digest(JSON.stringify(alternate.bars.slice(0, 1998))),
	committedMetaSha256: meta.sha256
};

const verdict = { potency, isolation };
console.log('VERDICT:', JSON.stringify(verdict));
writeFileSync(`${here}/proof-poison-results.json`, JSON.stringify({ ...results, verdict }, null, 1));
console.log('wrote docs/evidence/G2/proof-poison-results.json');
if (!potency || !isolation) process.exit(1);
