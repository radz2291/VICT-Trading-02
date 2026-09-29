// avc-fixA.mjs — FALSIFICATION ATTEMPT 4b: FIX A REGRESSION
// (clock-visible-only availability; owner correction-cycle-2 ruling)
// Claims: (1) two sources identical on clock-visible prefix (full fixture vs
// post-clock-remainder-deleted) produce IDENTICAL public outputs at every
// probed clock — including the EQUALITY EDGE in both directions (clock ==
// lastAvailableClose -> NO open-ended entry; clock < lastAvailableClose ->
// open-ended entry); (2) an independent oracle matches availabilityAt();
// (3) POTENCY: naive full-history calcs differ across the compared sources
// (the identity test is not a null test) — incl. baseline vs committed poison
// alternate; (4) post-clock-only mutation sweep: identity holds everywhere.
import { writeFileSync, readFileSync } from 'node:fs';
import { createReplayClock, createDataSession, TF_SECONDS } from '@vict-trading/trading-kit';
import { T0, BASE, loadFixture, same } from './avc-harness.mjs';

const fixture = loadFixture();
const full = fixture.bars.map((b) => ({ ...b }));
const altFixture = JSON.parse(readFileSync('./g2-fixture-alternate.json', 'utf8'));
const HORIZON = fixture.horizonInstant;

const iso = (t) => new Date(t * 1000).toISOString().replace('.000Z', 'Z');
const prefixAt = (bars, t) => bars.filter((b) => b.time + BASE <= t);

// clocks: mid-gap, equality edge (== a bar close), one tick below that close,
// mid-session, horizon
const EQUALITY_CLOSE = T0 + 3600; // bar index 3 close (fixture bars are consecutive from T0)
const CLOCKS = [
	{ label: 'mid-gap 04:15Z', t: T0 + 16500 },
	{ label: 'equality edge ==close(T0+3600)', t: EQUALITY_CLOSE },
	{ label: 'one tick below that close', t: EQUALITY_CLOSE - 1 },
	{ label: 'mid-session 06:00Z', t: T0 + 21600 },
	{ label: 'horizon', t: HORIZON }
].filter((c) => c.t <= HORIZON);

function collect(barsArr, t) {
	const clock = createReplayClock({ horizon: HORIZON, start: t });
	const data = createDataSession({ clock, source: { bars: barsArr }, rules: { symbol: fixture.symbol, baseTimeframe: fixture.timeframe } });
	const bars = {};
	for (const g of ['15m', '1h', '4h']) bars[g] = data.bars({ granularity: g }).bars;
	const stats = {};
	for (const g of ['15m', '1h', '4h']) {
		const s = bars[g];
		const mx = s.length ? Math.max(...s.map((b) => b.high)) : NaN;
		const c = s.slice(-20).map((b) => b.close);
		stats[g] = { max: mx, sma20: c.length ? c.reduce((a, b) => a + b, 0) / c.length : NaN };
	}
	return {
		bars15: bars['15m'], bars1h: bars['1h'], bars4h: bars['4h'],
		availability: data.availabilityAt(),
		availabilityAtT: data.availabilityAt(t),
		queryRecords: data.queryRecords().map((q) => ({ ...q, seq: 0 })),
		clockRecords: data.clockRecords(),
		stats
	};
}

// independent oracle (clock-visible info only)
function oracle(bars, t) {
	const avail = prefixAt(bars, t);
	const out = [];
	for (let i = 1; i < avail.length; i++) {
		const gapFrom = avail[i - 1].time + BASE;
		if (avail[i].time > gapFrom) out.push({ status: 'missing', from: gapFrom, to: avail[i].time });
	}
	if (avail.length) {
		const lastClose = avail[avail.length - 1].time + BASE;
		if (lastClose < t) out.push({ status: 'missing', from: lastClose, to: null });
	}
	return out;
}

const results = { probe: 'avc-fixA', clocks: [], identity: true, oracleOk: true, equalityEdge: {}, potency: {}, sweep: [], sweepAllOk: true, unhandledRejections: [] };
process.on('unhandledRejection', (r) => { results.unhandledRejections.push(String(r)); });

for (const { label, t } of CLOCKS) {
	const a = collect(full, t);
	const b = collect(prefixAt(full, t), t); // post-clock remainder deleted
	const cmp = {
		clock: label, instant: t,
		bars15: same(a.bars15, b.bars15),
		bars1h: same(a.bars1h, b.bars1h),
		bars4h: same(a.bars4h, b.bars4h),
		availabilityAt: same(a.availability, b.availability),
		availabilityAtT: same(a.availabilityAtT, b.availabilityAtT),
		queryRecords: same(a.queryRecords, b.queryRecords),
		stats: same(a.stats, b.stats),
		matchesOracle: same(a.availability, oracle(full, t)) && same(b.availability, oracle(prefixAt(full, t), t))
	};
	cmp.ok = cmp.bars15 && cmp.bars1h && cmp.bars4h && cmp.availabilityAt && cmp.availabilityAtT && cmp.queryRecords && cmp.stats && cmp.matchesOracle;
	if (!cmp.bars15 || !cmp.bars1h || !cmp.bars4h || !cmp.availabilityAt || !cmp.availabilityAtT || !cmp.queryRecords || !cmp.stats) results.identity = false;
	if (!cmp.matchesOracle) results.oracleOk = false;
	// committed poison alternate must ALSO be identical on the visible prefix
	if (label !== 'horizon' || true) {
		const c = collect(altFixture.bars, t);
		cmp.altBars15 = same(a.bars15, c.bars15);
		cmp.altBars1h = same(a.bars1h, c.bars1h);
		cmp.altAvailability = same(a.availability, c.availability);
		if (!cmp.altBars15 || !cmp.altBars1h || !cmp.altAvailability) results.identity = false;
	}
	results.clocks.push(cmp);
}

// equality edge, both directions, explicit
{
	const atClose = collect(full, EQUALITY_CLOSE).availability;
	const below = collect(full, EQUALITY_CLOSE - 1).availability;
	const expectedBelow = [{ status: 'missing', from: T0 + 2700, to: null }];
	results.equalityEdge = {
		clockEqualsLastClose: iso(EQUALITY_CLOSE),
		entryAtClose: atClose.filter((g) => g.from === T0 + 2700 && g.to === null),
		noOpenEndedAtClose: !atClose.some((g) => g.from === T0 + 2700 && g.to === null),
		openEndedJustBelow: same(below.filter((g) => g.to === null), expectedBelow),
		justBelowEntry: below.filter((g) => g.to === null)
	};
	results.equalityEdge.ok = results.equalityEdge.noOpenEndedAtClose && results.equalityEdge.openEndedJustBelow;
	if (!results.equalityEdge.ok) results.identity = false;
}

// POTENCY — naive FULL-HISTORY calcs must differ across the compared sources
{
	const mx = (bars) => Math.max(...bars.map((b) => b.high));
	const sma = (bars, n) => { const c = bars.slice(-n).map((b) => b.close); return c.reduce((a, b) => a + b, 0) / c.length; };
	const prefixH = prefixAt(full, HORIZON);
	results.potency = {
		note: 'naive full-history max-high / SMA20 across each compared pair — they must DIFFER or the identity test is a null test',
		max_fullBaseline: mx(full),
		max_prefixAtHorizon: mx(prefixH),
		max_fullVsPrefix_differ: mx(full) !== mx(prefixH),
		sma_fullBaseline: sma(full, 20),
		sma_prefixAtHorizon: sma(prefixH, 20),
		sma_fullVsPrefix_differ: Math.abs(sma(full, 20) - sma(prefixH, 20)) > 1e-12,
		max_fullBaselineVsPoisonAlt: { baseline: mx(full), alternate: mx(altFixture.bars), differ: mx(full) !== mx(altFixture.bars) },
		sma_fullBaselineVsPoisonAlt: { baseline: sma(full, 20), alternate: sma(altFixture.bars, 20), differ: Math.abs(sma(full, 20) - sma(altFixture.bars, 20)) > 1e-12 },
		max_fullVsPrefixAt0600: (() => { const t = T0 + 21600; return { full: mx(full), prefix: mx(prefixAt(full, t)), differ: mx(full) !== mx(prefixAt(full, t)) }; })()
	};
	const p = results.potency;
	results.potency.ok = p.max_fullVsPrefix_differ && p.sma_fullVsPrefix_differ && p.max_fullBaselineVsPoisonAlt.differ && p.sma_fullBaselineVsPoisonAlt.differ && p.max_fullVsPrefixAt0600.differ;
	if (!results.potency.ok) results.identity = false; // null test => proof void
}

// mutation sweep: post-clock-only mutations at several clocks -> identity
{
	const tMid = T0 + 16500; // inside the recorded fixture gap region
	const muts = [
		['remove resumption bar 04:30Z', (bs) => bs.filter((b) => b.time !== T0 + 18000)],
		['add bar inside gap @04:15Z', (bs) => [...bs.filter((b) => b.time < tMid), { time: tMid, open: 2600, high: 2601, low: 2599, close: 2600.5 }, ...bs.filter((b) => b.time > tMid)]],
		['values +500 for bars closing after clock', (bs, clock) => bs.map((b) => (b.time + BASE > clock ? { ...b, high: b.high + 500, close: b.close + 500 } : b))],
		['remove far-future 07:00Z+07:15Z', (bs) => bs.filter((b) => ![T0 + 25200, T0 + 26100].includes(b.time))],
		['committed poison alternate source', (bs) => altFixture.bars.map((b) => ({ ...b }))]
	];
	for (const [name, m] of muts) {
		for (const { label, t } of CLOCKS) {
			const before = new Map(full.map((b) => [b.time, JSON.stringify(b)]));
			const mutated = m(full.map((b) => ({ ...b })), t);
			const after = new Map(mutated.map((b) => [b.time, JSON.stringify(b)]));
			let touchesVisible = false;
			for (const b of full) if (b.time + BASE <= t && (!after.has(b.time) || after.get(b.time) !== before.get(b.time))) touchesVisible = true;
			for (const b of mutated) if (!before.has(b.time) && b.time + BASE <= t) touchesVisible = true;
			if (touchesVisible) {
				results.sweep.push({ name, clock: label, notApplicable: true, note: 'mutation reaches clock-visible region at this clock — excluded from future-only sweep' });
				continue;
			}
			const a = collect(full, t);
			const c = collect(mutated, t);
			const row = {
				name, clock: label,
				bars15: same(a.bars15, c.bars15),
				bars1h: same(a.bars1h, c.bars1h),
				bars4h: same(a.bars4h, c.bars4h),
				availabilityAt: same(a.availability, c.availability),
				stats: same(a.stats, c.stats)
			};
			row.ok = row.bars15 && row.bars1h && row.bars4h && row.availabilityAt && row.stats;
			if (!row.ok) results.sweepAllOk = false;
			results.sweep.push(row);
		}
	}
}

results.ok = results.identity && results.oracleOk && results.equalityEdge.ok && results.potency.ok && results.sweepAllOk && results.unhandledRejections.length === 0;
writeFileSync('avc-fixA-results.json', JSON.stringify(results, null, 2));
console.log('avc-fixA ok:', results.ok,
	'| identity:', results.identity,
	'| oracle:', results.oracleOk,
	'| equalityEdge:', results.equalityEdge.ok,
	'| potency:', results.potency.ok,
	'| sweep:', results.sweepAllOk, `(${results.sweep.filter((r) => !r.notApplicable).length} applicable rows)`);
if (!results.ok) {
	for (const c of results.clocks) if (!c.ok) console.log('CLOCK FAIL:', JSON.stringify(c).slice(0, 500));
	for (const s of results.sweep) if (!s.ok && !s.notApplicable) console.log('SWEEP FAIL:', JSON.stringify(s).slice(0, 400));
	console.log('potency:', JSON.stringify(results.potency));
}
