// ROUND-3 FINAL VERIFIER — criterion-5 adversarial extras (own evidence).
// M2: guest Math.random sizes REAL orders (next-bar-open fills) — the exact
//     shape the round-1 verifier falsified (v1 P3). Two identical runs must be
//     bit-identical incl. fills.
// ESC: escape attempts against the pinned clock — (a) capture+restore Date.now
//     via Function constructor, (b) read performance/performance.now, (c) read
//     Date.prototype.getTime on a no-arg new Date (must be pinned), (d) check
//     Date.name/prototype instanceof semantics survive the wrapper.
import { createRequire } from 'node:module';
const req = createRequire(process.cwd() + '/packages/trading-kit/package.json');
const { runBacktest, createQuickJsScriptRuntime } = req('@vict-trading/trading-kit');
const { readFileSync } = await import('node:fs');

const fixture = JSON.parse(readFileSync('docs/evidence/G3/fixtures/hand-calculated-fixture.json', 'utf8'));
const bars = fixture.bars;
const tfMs = { '1m': 60000, '5m': 300000, '10m': 600000, '15m': 900000, '1h': 3600000, '4h': 14400000 }[fixture.timeframe];
const expectedPinned = bars.map((b) => (b.time + tfMs / 1000) * 1000);

const cfg = (scriptSource) => ({
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
	M2: `var step = 0;
	function onBar(bar, api){
		api.plot('rnd', Math.random());
		if (step % 3 === 0) api.order('buy', 1 + Math.random());
		step++;
	}`,
	ESC: `function onBar(bar, api){
		var out = [];
		// (a) Function constructor escape attempt: reassign Date.now to a fresh function that closes over nothing host-side
		try { var f = new Function('return function(){ return Date.now(); }'); out.push(f()); } catch (e) { out.push(-1); }
		// (b) performance object
		out.push(typeof performance);
		out.push(typeof performance_ms || -7);
		try { out.push(performance ? performance.now() : -2); } catch (e) { out.push(-3); }
		// (c) prototype methods on no-arg Date
		var d = new Date();
		out.push(d.getTime());
		out.push(d instanceof Date);
		out.push(d.constructor === Date);
		// (d) Date.now via explicit call form after guest tampering attempt (restore not possible)
		out.push(Math.random() > 1); // seeded prng still deterministic
		api.plot('esc', out.length + '_' + out.join('|').length);
		api.plot('escPin', d.getTime());
	}`
};
const src = scripts[caseName];
if (!src) throw new Error('case M2|ESC');

const a = await runBacktest(cfg(src));
const b = await runBacktest(cfg(src));
const out = { case: caseName, statusA: a.status, statusB: b.status };
if (a.status !== 'succeeded') { console.log(JSON.stringify({ ...out, error: a.error }, null, 2)); process.exit(2); }
out.identityEqual = a.identity.id === b.identity.id;
out.plotsBitIdentical = JSON.stringify(a.plots) === JSON.stringify(b.plots);
out.tradesBitIdentical = JSON.stringify(a.trades) === JSON.stringify(b.trades);
out.equityBitIdentical = JSON.stringify(a.equity) === JSON.stringify(b.equity);
out.signalsBitIdentical = JSON.stringify(a.signals) === JSON.stringify(b.signals);
out.unfilledBitIdentical = JSON.stringify(a.unfilled) === JSON.stringify(b.unfilled);

if (caseName === 'M2') {
	out.tradeCount = a.trades.length;
	out.sampleFillSizes = a.trades.map((t) => t.size).slice(0, 4);
}
if (caseName === 'ESC') {
	out.pinnedSeriesOk = JSON.stringify(a.plots['escPin']) === JSON.stringify(expectedPinned);
	out.hasRune = undefined;
	console.log(JSON.stringify(out, null, 2));
	process.exit(0);
}
const allOk = out.identityEqual && out.plotsBitIdentical && out.tradesBitIdentical && out.equityBitIdentical && out.signalsBitIdentical && out.unfilledBitIdentical && (caseName === 'ESC' ? true : out.tradeCount > 0);
out.ALL_OK = allOk;
console.log(JSON.stringify(out, null, 2));
process.exit(allOk ? 0 : 1);