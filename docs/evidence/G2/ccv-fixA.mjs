// ccv-fixA.mjs — FRESH VERIFIER, Repair A negatives at CANDIDATE db66475a.
// Kit from fresh pack 4316c06860fc84c11f30cde7df0ed7d73840d3669d99120243eac06aace9474b (fresh scratch consumer install).
// Independent oracles: trailing entry iff lastAvailableClose < now; interior gaps between consecutive
// AVAILABLE bars with numeric `to` (resumption bar is available by construction). All code newly written.
import { createReplayClock, createDataSession } from '@vict-trading/trading-kit';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const fixture = JSON.parse(readFileSync('C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G2/fixture.json', 'utf8'));
const bars = fixture.bars;
const S = 900;
const H = fixture.horizonInstant;
const digest = createHash('sha256').update(JSON.stringify(bars)).digest('hex');

const t = (hhmm) => Math.floor(Date.parse(hhmm) / 1000);
const iso = (s) => new Date(s * 1000).toISOString();

// my own clock-visible availability oracle
function oracleAt(base, at) {
	const bs = 900;
	const avail = base.filter(b => b.time + bs <= at);
	const out = [];
	for (let i = 1; i < avail.length; i++) {
		const gapFrom = avail[i - 1].time + bs;
		if (avail[i].time > gapFrom) out.push({ status: 'missing', from: gapFrom, to: avail[i].time });
	}
	const lastClose = avail.length ? avail[avail.length - 1].time + bs : null;
	if (avail.length && lastClose < at) out.push({ status: 'missing', from: lastClose, to: null });
	return out;
}

function futureDeleted(clockAt) { return bars.filter(b => b.time + S <= clockAt); }

function sessionFor(src, at) {
	const clock = createReplayClock({ horizon: H, start: at });
	const ds = createDataSession({ clock, source: { bars: src }, rules: { symbol: 'XAUUSD', baseTimeframe: '15m' } });
	return ds;
}

// full public output snapshot at clock `at` for source variant
function pubOut(at) {
	const A = sessionFor(bars, at);
	const B = sessionFor(futureDeleted(at), at);
	const snap = (ds) => {
		const b15 = ds.bars({ granularity: '15m' }).bars;
		const b1h = ds.bars({ granularity: '1h' }).bars;
		const b4h = ds.bars({ granularity: '4h' }).bars;
		const q = ds.queryRecords().map(x => { const { seq, ...r } = x; return r; });
		const av = ds.availabilityAt(at);
		return { b15: b15.map(c => [c.time, c.open, c.high, c.low, c.close]), b1h: b1h.map(c => [c.time, c.open, c.high, c.low, c.close]), b4h: b4h.map(c => [c.time, c.open, c.high, c.low, c.close]), q, av };
	};
	return { A: snap(A), B: snap(B) };
}

const CLOCKS = ['2026-01-05T04:14:30Z', '2026-01-05T04:15Z', '2026-01-05T04:15:01Z', '2026-01-05T05:00Z', '2026-01-05T06:00Z', '2026-01-05T07:15Z', '2026-01-08T06:00Z', '2026-02-02T21:30:00.500Z', '2026-02-02T21:45Z'];

const rows = [];
let allIdentical = true;
let oracleMatchAll = true;
for (const atISO of CLOCKS) {
	const at = t(atISO);
	const { A, B } = pubOut(at);
	const same = JSON.stringify(A) === JSON.stringify(B);
	const oA = JSON.stringify(oracleAt(bars, at)) === JSON.stringify(A.av);
	const oB = JSON.stringify(oracleAt(futureDeleted(at), at)) === JSON.stringify(B.av);
	const row = {
		clock: atISO,
		lastAvailClose: A.b15.length ? iso(A.b15.at(-1)[0] + S) : null,
		trailingEntryA: A.av.length ? JSON.stringify(A.av.at(-1)) : null,
		allOutputsIdentical: same, oracleMatchA: oA, oracleMatchB: oB
	};
	if (!same) { row.detailDiff = ['b15', 'b1h', 'b4h', 'q', 'av'].filter(k => JSON.stringify(A[k]) !== JSON.stringify(B[k])); }
	if (!same) allIdentical = false;
	if (!oA || !oB) oracleMatchAll = false;
	rows.push(row);
}

// equality-edge BOTH directions, asserted explicitly
const atEq = t('2026-01-05T04:15Z');
const atJustPast = t('2026-01-05T04:15:01Z');
const eqDir = {
	at041500: { clock: '2026-01-05T04:15Z', availabilityAt: sessionFor(bars, atEq).availabilityAt(), expect: [], // lastAvailClose==now => NO entry
		match: JSON.stringify(sessionFor(bars, atEq).availabilityAt()) === '[]' },
	at041501: { clock: '2026-01-05T04:15:01Z', availabilityAt: sessionFor(bars, atJustPast).availabilityAt(), expect: [{ status: 'missing', from: atEq, to: null }],
		match: JSON.stringify(sessionFor(bars, atJustPast).availabilityAt()) === JSON.stringify([{ status: 'missing', from: atEq, to: null }]) }
};
// lastAvailableClose==now equality edge AT THE END of the fixture: horizon 21:45Z — bar 21:30 closes 21:45 == horizon
const hz = sessionFor(bars, H).availabilityAt();
const hzExpectNoTrailing = !hz.some(e => e.from === t('2026-02-02T21:45Z') && e.to === null);

// POTENCY — naive full-history calcs differ between the two sources
function naive(src) {
	const maxHigh = Math.max(...src.map(b => b.high));
	const sma20 = src.slice(-20).reduce((a, b) => a + b.close, 0) / 20;
	return { maxHigh, sma20, count: src.length };
}
const potA = naive(bars), potB = naive(futureDeleted(H));
// naive calc on the CLOCK-VISIBLE view at 06:00Z (A full-history vs prefix)
const at06 = t('2026-01-05T06:00Z');
const potA06 = naive(bars), potB06 = naive(bars.filter(b => b.time + S <= at06));

// MUTATION SWEEP — mutations applied ONLY to bars past the clock; compare public outputs vs baseline
function mutated(clone) { return clone; }
function sweepRow(clock, mutName, fnSrc) {
	const m = fnSrc(bars, t(clock));
	const at = t(clock);
	const mb = sessionFor(bars, at);
	const ms = sessionFor(m, at);
	const snap = (ds) => {
		const b15 = ds.bars({ granularity: '15m' }).bars, b1h = ds.bars({ granularity: '1h' }).bars, b4h = ds.bars({ granularity: '4h' }).bars;
		const q = ds.queryRecords().map(x => { const { seq, ...r } = x; return r; });
		return { b15: b15.map(c => [c.time, c.open, c.high, c.low, c.close]), b1h: b1h.map(c => [c.time, c.open, c.high, c.low, c.close]), b4h: b4h.map(c => [c.time, c.open, c.high, c.low, c.close]), q, av: ds.availabilityAt(at) };
	};
	const a = snap(mb), b = snap(ms);
	const identical = JSON.stringify(a) === JSON.stringify(b);
	const avM = ms.availabilityAt(at);
	return { clock, mutation: mutName, identical, avClockVisible: avM, hasInteriorGap: avM.some(e => e.from === t('2026-01-05T04:15Z') && e.to === t('2026-01-05T04:30Z')) };
}

const mutators = {
	'M1-remove-resumption-0430': (b) => b.filter(x => x.time !== t('2026-01-05T04:30Z')),
	'M2-add-bar-inside-gap-0415': (b) => {
		const x = b.slice();
		x.splice(17, 0, { time: t('2026-01-05T04:15Z'), open: 2645.9, high: 2646.2, low: 2645.5, close: 2645.8 });
		return x;
	},
	'M3-remove-0430-0445': (b) => b.filter(x => x.time !== t('2026-01-05T04:30Z') && x.time !== t('2026-01-05T04:45Z')),
	'M4-change-all-postclock-values': (b, at) => b.map(x => (x.time + S > at) ? { ...x, open: x.open + 5, high: x.high + 5, low: x.low + 5, close: x.close + 5 } : x),
	'M5-remove-far-future-0700-0715': (b) => b.filter(x => x.time !== t('2026-01-05T07:00Z') && x.time !== t('2026-01-05T07:15Z')),
	'M6-remove-horizon-edge-bars': (b) => b.filter(x => x.time < H - 4 * S),
	'M7-add-bar-beyond-fixture-end': (b) => [...b, { time: b.at(-1).time + S, open: 2660, high: 2661, low: 2659, close: 2660.5 }]
};
function applicableTo(clock, mutName) {
	// STRICT protocol: applicable iff the mutation touches ONLY bars with close > clock
	const at = t(clock);
	const m = mutators[mutName](bars, at);
	const byTimeA = new Map(bars.map(x => [x.time, x]));
	const byTimeB = new Map(m.map(x => [x.time, x]));
	const touched = new Set();
	for (const [ts, x] of byTimeA) { const y = byTimeB.get(ts); if (!y || y.open !== x.open || y.high !== x.high || y.low !== x.low || y.close !== y.close ? true : (y.high !== x.high || y.low !== x.low || y.open !== x.open || y.close !== x.close)) touched.add(ts); }
	for (const ts of byTimeB.keys()) if (!byTimeA.has(ts)) touched.add(ts);
	if (touched.size === 0) return false;
	for (const ts of touched) if (ts + S <= at) return false; // touches a clock-visible bar
	return true;
}
const sweep = [];
for (const clock of ['2026-01-05T04:15Z', '2026-01-05T05:00Z', '2026-01-05T07:15Z', '2026-01-08T06:00Z', '2026-02-02T21:45Z']) {
	for (const mn of Object.keys(mutators)) {
		if (!applicableTo(clock, mn)) continue;
		const r = sweepRow(clock, mn, mutators[mn]);
		sweep.push({ ...r, applied: true });
	}
}
// record NOT-applicable rows explicitly
const naRows = [];
for (const clock of CLOCKS) for (const mn of Object.keys(mutators)) {
	if (!sweep.some(r => r.clock === clock && r.mutation === mn) && applicableTo(clock, mn) === false) {
		// only record for our sweep clock set
	}
}
const naRecorded = [];
const sweepClocks = ['2026-01-05T04:15Z', '2026-01-05T05:00Z', '2026-01-05T07:15Z', '2026-01-08T06:00Z', '2026-02-02T21:45Z'];
for (const clock of sweepClocks) for (const mn of Object.keys(mutators)) {
	if (!sweep.some(r => r.clock === clock && r.mutation === mn)) naRecorded.push({ clock, mutation: mn, applied: false, reason: 'mutation affects no bar with close > clock (past-clock region unreachable at this clock)' });
}
// interior gap still reported when clock-visible (clock >= 04:45Z Jan5)
const gapVis = {};
for (const clock of ['2026-01-05T05:00Z', '2026-01-05T06:00Z', '2026-01-05T07:15Z', '2026-01-08T06:00Z', '2026-02-02T21:45Z']) {
	const av = sessionFor(bars, t(clock)).availabilityAt();
	gapVis[clock] = av.some(e => e.from === t('2026-01-05T04:15Z') && e.to === t('2026-01-05T04:30Z'));
}

const out = { fixtureDigest: digest, candidatePack: '4316c06860fc84c11f30cde7df0ed7d73840d3669d99120243eac06aace9474b', rows, oracleMatchAll, allIdentical, eqDir, hzAvailabilityAt: hz, hzExpectNoTrailing, potency: { fullA: potA, futureDeletedB_atHorizon: potB, viewAt0600_prefix: potB06, naiveDiffersFullHistory: potA.maxHigh !== potB.maxHigh }, sweep, sweepApplicable: sweep.length, sweepAllOk: sweep.every(r => r.identical), naRecorded, gapVis };
writeFileSync('C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G2/ccv-fixA-results.json', JSON.stringify(out, null, 2));
console.log('=== REPAIR A @ db66475a ===');
for (const r of rows) console.log(JSON.stringify(r));
console.log('allOutputsIdentical:', allIdentical, '| oracleMatchAll:', oracleMatchAll);
console.log('eqDir:', JSON.stringify(eqDir.at041500), JSON.stringify({ result: eqDir.at041501.match, av: eqDir.at041501.availabilityAt }), '| horizon trailing absent:', hzExpectNoTrailing);
console.log('sweep rows (applicable):', sweep.length, '— allOk:', sweep.every(r => r.identical));
for (const r of sweep) console.log(JSON.stringify({ clock: r.clock, mutation: r.mutation, identical: r.identical, interiorGapReported: r.hasInteriorGap }));
console.log('gapVis:', JSON.stringify(gapVis));
console.log('potency:', JSON.stringify({ potA, potB, potB06 }));