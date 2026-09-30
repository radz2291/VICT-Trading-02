// FRESH VERIFIER — re-verification of criterion 5 (determinism) after the
// ce8f875 repair. Own failing cases re-run + NEW escape attempts at the
// pinned Date / Math.random contract.
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire('C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/packages/trading-kit/package.json');
const { runBacktest, createQuickJsScriptRuntime } = require('@vict-trading/trading-kit');

const FIX = JSON.parse(readFileSync(new URL('../fixtures/hand-calculated-fixture.json', import.meta.url), 'utf8'));
const bars = FIX.bars;
const tfEnd = bars[bars.length - 1].time + 900;
const results = { label: 'VERIFIER criterion-5 re-verification (ce8f875)', probes: {} };
const out = (name, v) => { results.probes[name] = v; writeFileSync(new URL('../verifier/v10-det-results.json', import.meta.url), JSON.stringify(results, null, 2)); };

async function ownRun(scriptSource, opts = {}) {
	return runBacktest({
		symbol: 'T', baseTimeframe: '15m', timeframe: '15m',
		fromTime: bars[0].time, toTime: tfEnd,
		scriptSource, inputs: opts.inputs ?? {},
		fill: opts.fill ?? FIX.fill,
		sourceBars: opts.sourceBars ?? bars,
		runtime: createQuickJsScriptRuntime(),
		limits: opts.limits
	});
}

// R1 — ORIGINAL FAILING CASE: Math.random-driven order size across two runs
{
	const src = `function onBar(bar, api) { if (bar.time === ${bars[3].time}) api.order('buy', 1 + Math.random()); }`;
	const a = await ownRun(src);
	const b = await ownRun(src);
	const sa = JSON.stringify(a.trades.map((t) => t.size));
	const sb = JSON.stringify(b.trades.map((t) => t.size));
	out('r1-math-random-sizes', { a: sa, b: sb, bitIdentical: sa === sb });
}

// R2 — ORIGINAL FAILING CASE: Date.now plot across two runs
{
	const src = `function onBar(bar, api) { if (bar.time === ${bars[3].time}) api.plot('ts', Date.now()); }`;
	const a = await ownRun(src);
	const b = await ownRun(src);
	out('r2-date-now', {
		tsA: a.plots?.ts?.[3], tsB: b.plots?.ts?.[3],
		identical: JSON.stringify(a.plots) === JSON.stringify(b.plots),
		pinnedToBar3CloseMs: bars[3].time + 900 === (a.plots?.ts?.[3]) / 1000
	});
}

// R3 — Date.now is pinned to the current bar's close at EVERY bar inside onBar
{
	const src = `function onBar(bar, api) { api.plot('now', Date.now() - bar.time * 1000); }`;
	const r = await ownRun(src);
	const deltas = new Set((r.plots?.now ?? []).filter((v) => v !== null));
	out('r3-date-now-per-bar', {
		uniqueDeltasMs: [...deltas],
		allPinned900s: deltas.size === 1 && Math.abs([...deltas][0] - 900000) < 1e-6
	});
}

// R4 — ESCAPE: guest captures/restores Date.now before the driver pins (guest runs first)
{
	const src = `globalThis.__origNow = Date.now;
	function onBar(bar, api) {
		// attempt 1: shadow Date.now mid-run (should not affect determinism of results the KIT sees)
		Date.now = function () { return 12; };
		api.plot('shadow', bar.time === ${bars[3].time} ? 1 : 0);
	}`;
	const a = await ownRun(src);
	const b = await ownRun(src);
	out('r4-guest-shadow-now', { identical: JSON.stringify(a.plots) === JSON.stringify(b.plots) });
}

// R5 — ESCAPE: new Date() constructor and Date() string (QuickJS reads the
// real clock internally in the Date CONSTRUCTOR — the pinning only replaces
// Date.now). A guest using new Date().getTime() would get REAL wall clock.
{
	const src = `function onBar(bar, api) {
		try { api.plot('newDate', new Date().getTime() % 1e7); } catch (e) { api.plot('newDate', -1); }
		try { api.plot('dateStr', String(Date()).length % 97); } catch (e) { api.plot('dateStr', -2); }
	}`;
	const a = await ownRun(src);
	const b = await ownRun(src);
	out('r5-new-date-escape', {
		newDateA: a.plots?.newDate?.[0], newDateB: b.plots?.newDate?.[0],
		identical: JSON.stringify(a.plots) === JSON.stringify(b.plots)
	});
}

// R6 — any other entropy reachable? performance/console randomness probes
{
	const src = `function onBar(bar, api) {
		const bad = ['performance', 'setTimeout', 'queueMicrotask'].filter(function (n) { return typeof globalThis[n] !== 'undefined'; });
		api.plot('entropySources', bad.length);
		api.plot('typeofDateNow', typeof Date.now);
	}`;
	const r = await ownRun(src);
	out('r6-entropy-globals', { entropySources: r.plots?.entropySources?.[0], typeofDateNow: r.plots?.typeofDateNow?.[0] === 'function' ? 'function' : String(r.plots?.typeofDateNow?.[0]) });
}

// R7 — determinism of FULL results incl. Math.random used heavily (50 draws)
{
	const src = `function onBar(bar, api) {
		let s = 0;
		for (let i = 0; i < 50; i++) s += Math.random();
		api.plot('rsum', s);
	}`;
	const a = await ownRun(src);
	const b = await ownRun(src);
	out('r7-heavy-random', { identical: JSON.stringify(a.plots) === JSON.stringify(b.plots), rsum0: a.plots?.rsum?.[0], rsumEnd: a.plots?.rsum?.[a.plots.rsum.length - 1] });
}

// R8 — same seed must hold across kit-level identical input changes that do NOT
// change script/inputs (data revision changes: PRNG stream shared — information for the record)
{
	const src = `function onBar(bar, api) { if (bar.time === ${bars[3].time}) api.plot('rand', Math.random()); }`;
	const gapped = bars.filter((_, i) => i !== 10);
	const a = await ownRun(src);
	const b = await ownRun(src, { sourceBars: gapped, fill: { ...FIX.fill, commission: 2 } });
	out('r8-seed-not-in-identity', {
		note: 'seed derives from scriptSource+inputs only (not data/fill/timeframe)',
		randA: a.plots?.rand?.[3], randB: b.plots?.rand?.[3]
	});
}

// R9 — identity unchanged for deterministic-input path (regression of my v4 browser checks happens separately)
{
	const FIXF = { ...FIX.fill };
	void FIXF;
	// FNV-1a cross-check of deriveGuestSeed behaviour via observed PRNG equality (see r1/r7)
	out('r9-note', { deriveGuestSeed: 'not publicly exported (kit-internal) — determinism verified via r1/r7/r2 observed equality instead' });
}

console.log(JSON.stringify(results.probes, null, 1));