// ROUND-3 FINAL VERIFIER — criterion-5 determinism, OWN evidence (not reusing v1/v10).
// Runs runBacktest twice with identical inputs for FOUR entropy forms:
//   MR  guest Math.random (several draws, several bars)
//   DN  guest Date.now()
//   DT  guest new Date().getTime()
//   DS  guest Date() string form (hashed + Date.parse round-trip)
// Every time form must equal the CURRENT BAR's pinned market close (ms) per bar.
import { createRequire } from 'node:module';
const req = createRequire(process.cwd() + '/packages/trading-kit/package.json');
const { runBacktest, createQuickJsScriptRuntime } = req('@vict-trading/trading-kit');
const { readFileSync } = await import('node:fs');

const fixture = JSON.parse(readFileSync('docs/evidence/G3/fixtures/hand-calculated-fixture.json', 'utf8'));
const bars = fixture.bars;
const tfMs = { '1m': 60000, '5m': 300000, '10m': 600000, '15m': 900000, '1h': 3600000, '4h': 14400000 }[fixture.timeframe];
if (!tfMs) throw new Error('unknown tf ' + fixture.timeframe);
// expected per-bar pinned Date.now = current bar CLOSE in ms (bar.time + tf seconds)
const expectedPinned = bars.map((b) => (b.time + tfMs / 1000) * 1000);

const cfg = (scriptSource, plotsExpectedCount) => ({
	symbol: fixture.symbol,
	baseTimeframe: fixture.baseTimeframe,
	timeframe: fixture.timeframe,
	fromTime: fixture.fromTime,
	toTime: fixture.toTime,
	scriptSource,
	inputs: { period: 3 },
	fill: fixture.fill,
	sourceBars: bars,
	runtime: createQuickJsScriptRuntime()
});

const caseName = process.argv[2];
const scripts = {
	MR: `function onBar(bar, api){
		api.plot('rndA', Math.random());
		api.plot('rndB', Math.random());
		if (bar.index >= 3 && bar.index <= 8) api.order('buy', 1 + Math.random());
	}`,
	DN: `function onBar(bar, api){ api.plot('nowMs', Date.now()); }`,
	DT: `function onBar(bar, api){ api.plot('newDateGetTime', new Date().getTime()); }`,
	DS: `function onBar(bar, api){
		var s = String(Date());
		var h = 0x811c9dc5;
		for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
		h = h >>> 0;
		api.plot('dateStrHash', h % 1000000007); // exact small int
		api.plot('dateStrParseMs', Date.parse(s));
		api.plot('isoOfNewDate', Date.parse(new Date().toISOString()));
	}`
};
const src = scripts[caseName];
if (!src) throw new Error('case must be MR|DN|DT|DS');

const a = await runBacktest(cfg(src));
const b = await runBacktest(cfg(src));
const out = { case: caseName, statusA: a.status, statusB: b.status };
if (a.status !== 'succeeded') { console.log(JSON.stringify(out, null, 2)); process.exit(2); }

out.identityEqual = a.identity.id === b.identity.id;
out.plotsBitIdentical = JSON.stringify(a.plots) === JSON.stringify(b.plots);
out.tradesBitIdentical = JSON.stringify(a.trades) === JSON.stringify(b.trades);
out.equityBitIdentical = JSON.stringify(a.equity) === JSON.stringify(b.equity);
out.barTimesLen = a.barTimes.length;
out.plotLen = (a.plots[Object.keys(a.plots)[0]] || []).length;

const plot0 = Object.keys(a.plots)[0];
const series = a.plots[plot0];
out.pinnedCloseChecks = [];
if (caseName === 'DN' || caseName === 'DT') {
	const mism = [];
	for (let i = 0; i < bars.length; i++) if (series[i] !== expectedPinned[i]) mism.push([i, series[i], expectedPinned[i]]);
	out.pinnedCloseChecks.push({ plot: plot0, form: 'all bars must equal (bar.time+tf)*1000', ok: mism.length === 0, mismatches: mism.slice(0, 5) });
} else if (caseName === 'DS') {
	// dsParseMs must equal the pinned close ms for every bar; isoOfNewDate too
	const parseSeries = a.plots['dateStrParseMs'];
	const isoSeries = a.plots['isoOfNewDate'];
	const m1 = [], m2 = [];
	for (let i = 0; i < bars.length; i++) {
		if (parseSeries[i] !== expectedPinned[i]) m1.push([i, parseSeries[i], expectedPinned[i]]);
		if (isoSeries[i] !== expectedPinned[i]) m2.push([i, isoSeries[i], expectedPinned[i]]);
	}
	out.pinnedCloseChecks.push({ plot: 'dateStrParseMs', meaning: 'Date.parse(String(Date())) == pinned close ms', ok: m1.length === 0, mismatches: m1.slice(0, 5) });
	out.pinnedCloseChecks.push({ plot: 'isoOfNewDate', meaning: 'Date.parse(new Date().toISOString()) == pinned close ms', ok: m2.length === 0, mismatches: m2.slice(0, 5) });
	out.dateStrHashSample = series.slice(0, 3);
} else if (caseName === 'MR') {
	out.rndSampleRunA = a.plots['rndA'].slice(0, 5);
	// trades exist? (random sizes create orders)
	out.tradesRunA = a.trades.map((t) => [t.side, t.fillPrice, t.size]);
}

const allOk = out.identityEqual && out.plotsBitIdentical && out.tradesBitIdentical && out.equityBitIdentical && out.pinnedCloseChecks.every((c) => c.ok);
out.ALL_OK = allOk;
console.log(JSON.stringify(out, null, 2));
process.exit(allOk ? 0 : 1);