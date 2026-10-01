// v19-bypass.mjs — G3 CONTESTED CHECK ROUND B (owner-ordered): ATTACK the repair.
// Fresh verifier harness — the repair candidate 842122b claims a SYNC-ONLY
// script contract: a thenable onBar return or any pending guest job at
// pass-2/3 end fails the run with SCRIPT_ASYNC_FORBIDDEN. This harness tries
// to BYPASS that contract and get dropped guest work past a `succeeded` state.
//
// Attacks (required by the round-B mandate):
//   a  onBar defined sync, then REASSIGNED to an async arrow before the loop
//   b  sync onBar returns a thenable object ({then: fn})
//   c  promise created at TOP LEVEL (pass 2) with .then "work"
//   d  Promise.resolve().then chained, callback returns another promise
//   e  guest overwrites Promise with a FAKE whose then runs synchronously
//   f  async IIFE (promise discarded) inside sync onBar — two variants:
//      f1 body fully synchronous (no await), f2 with await inside
// Verifier extras:
//   g  onBar installed as a GETTER alternating sync/async per call
//   h  inert fake Promise whose then DISCARDS the callback (guest sabotage)
//   i  real Promise.prototype.then overridden to call back synchronously
//
// Classification vocabulary used in the results:
//   CAUGHT_REFUSED        — run failed with SCRIPT_ASYNC_FORBIDDEN (contract held)
//   ACCEPTABLE_SYNC_EXECUTION — run succeeded AND every api action actually
//                               executed synchronously (nothing dropped; the
//                               executed strategy IS the written strategy)
//   GUEST_SABOTAGE_EDGE   — run succeeded but the "dropped" work never entered
//                               the runtime (the guest replaced the scheduler
//                               with an inert object of its own); recorded as
//                               an observed edge, judged for honesty impact
//   RED_SILENT_DROP       — run succeeded while runtime-submitted work was
//                               silently dropped (this would falsify the repair)
//
// Imports the kit exactly as the host does (host/node_modules workspace
// symlink → packages/trading-kit → dist/index.js). Own synthetic data.
// Run: node v19-bypass.mjs   (writes v19-bypass-results.json)

import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

// ---- provenance: tested tree (repo-root cwd — pathspecs are cwd-relative!) ----
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', cwd: repoRoot }).trim();

const require = createRequire(import.meta.url);
const hostDir = fileURLToPath(new URL('../../../../host/', import.meta.url));
const kitEntry = require.resolve('@vict-trading/trading-kit', { paths: [hostDir] });
const kit = await import(pathToFileURL(kitEntry));
const { runBacktest, createQuickJsScriptRuntime } = kit;

// ---- own synthetic data (same construction as the round-A harnesses) ------
const N = 48, STEP = 900, T0 = 1800000000;
const MARKER = T0 + 10 * STEP;
function buildBars() {
	const bars = [];
	let prevClose = 100;
	for (let i = 0; i < N; i++) {
		const close = 100 + Math.round((Math.sin(i / 3.7) * 2 + (i % 5) * 0.3) * 100) / 100;
		const open = prevClose;
		bars.push({ time: T0 + i * STEP, open, high: Math.max(open, close) + 0.5, low: Math.min(open, close) - 0.5, close });
		prevClose = close;
	}
	return bars;
}
const sourceBars = buildBars();
const FILL = { spread: 0.1, slippage: 0.05, commission: 1, startingCash: 2000, model: 'next-bar-open' };
const runCfg = (scriptSource) => ({
	symbol: 'V19-BYPASS', baseTimeframe: '15m', timeframe: '15m',
	fromTime: T0, toTime: T0 + (N - 1) * STEP,
	scriptSource, inputs: {}, fill: FILL, sourceBars,
	runtime: createQuickJsScriptRuntime()
});
const plotSummary = (plots) => Object.fromEntries(
	Object.entries(plots).map(([k, arr]) => [k, { len: arr.length, nonNull: arr.filter((v) => v !== null).length }])
);

async function attack(label, scriptSource, classification) {
	const r1 = await runBacktest(runCfg(scriptSource));
	const r2 = await runBacktest(runCfg(scriptSource));
	const det = JSON.stringify(r1) === JSON.stringify(r2);
	const x = r1;
	const row = {
		label,
		status: x.status,
		error: x.error ?? null,
		identityId: x.identity.id,
		identityLen: x.identity.id.length,
		assumptionsBarsInRun: x.assumptions.barsInRun,
		plots: plotSummary(x.plots),
		tradeCount: x.trades.length,
		trades: x.trades.map((t) => ({ side: t.side, size: t.size, signalBarTime: t.signalBarTime })),
		netProfit: x.stats.netProfit,
		determinism_twoRunsIdentical: det,
		claimedClassification: classification
	};
	// independent classification from the OBSERVED record:
	let observed;
	if (x.status === 'failed') {
		observed = x.error?.code === 'SCRIPT_ASYNC_FORBIDDEN' ? 'CAUGHT_REFUSED' : 'REFUSED_OTHER_CODE';
	} else {
		// succeeded — decide whether anything was dropped
		const p = x.plots;
		const present = (name) => name in p && p[name].some((v) => v !== null);
		if (classification === 'RED_SILENT_DROP_EXPECTED') {
			observed = 'RED_SILENT_DROP';
		} else if (classification === 'ACCEPTABLE_SYNC_EXPECTED') {
			// every claimed plot must actually be there, fully
			observed = classification; // refined below by expectedPlots check
		} else {
			observed = 'SUCCEEDED_INSPECT';
		}
		row.succeededPlots = p;
	}
	row.observedClassification = observed;
	// the repair's own promise: failed runs keep identity (64) + assumptions
	if (x.status === 'failed') {
		row.failedRecordCarriesIdentity = x.identity.id.length === 64;
		row.failedRecordCarriesAssumptions = x.assumptions.barsInRun > 0;
		row.actionableMessage = /onBar|Promise|async/i.test(x.error?.message ?? '');
	}
	return row;
}

const results = {
	harness: 'v19-bypass.mjs (G3 contested check round B — attack the repair)',
	testedHead: head,
	kitResolvedFrom: kitEntry,
	data: { kind: 'verifier-own synthetic 15m bars', bars: N, fromTime: T0, markerBarTime: MARKER },
	attacks: []
};

// (a) sync onBar reassigned to async arrow before the loop
results.attacks.push(await attack('a-sync-then-reassigned-async', [
	'function onBar(bar, api) {',
	"	api.plot('reassignedSync', bar.close);",
	'}',
	'onBar = async function (bar, api) {',
	"	await Promise.resolve();",
	"	api.plot('reassignedAsync', bar.close);",
	"	if (bar.time === " + MARKER + ") api.order('buy', 1);",
	'};'
].join('\n'), 'RED_SILENT_DROP_EXPECTED'));

// (b) thenable object returned from a sync onBar
results.attacks.push(await attack('b-sync-onBar-returns-thenable-object', [
	'function onBar(bar, api) {',
	"	api.plot('thenableSync', bar.close);",
	'	return { then: function (done) { done(function () { api.plot("thenableWork", 1); }); } };',
	'}'
].join('\n'), 'RED_SILENT_DROP_EXPECTED'));

// (c) promise created at TOP LEVEL (pass 2) with .then work
results.attacks.push(await attack('c-top-level-promise-then', [
	'globalThis.__topRan = false;',
	'Promise.resolve().then(function () { globalThis.__topRan = true; });',
	'function onBar(bar, api) {',
	"	api.plot('topLevelSync', bar.close);",
	'}'
].join('\n'), 'RED_SILENT_DROP_EXPECTED'));

// (d) chained .then where the callback returns another promise
results.attacks.push(await attack('d-chained-then-callback-returns-promise', [
	'function onBar(bar, api) {',
	"	api.plot('chainSync', bar.close);",
	'	Promise.resolve().then(function () {',
	'		return Promise.resolve().then(function () { api.plot("chainDeep", 1); });',
	'	});',
	'}'
].join('\n'), 'RED_SILENT_DROP_EXPECTED'));

// (e) guest overwrites Promise with a fake whose then runs synchronously
results.attacks.push(await attack('e-fake-promise-sync-then', [
	'Promise = { resolve: function () { return { then: function (fn) { fn(); } }; } };',
	'function onBar(bar, api) {',
	"	api.plot('fakeSync', bar.close);",
	'	Promise.resolve().then(function () {',
	"		api.plot('fakeThenWork', bar.close * 2);",
	"		if (bar.time === " + MARKER + ") api.order('buy', 1);",
	'	});',
	'}'
].join('\n'), 'ACCEPTABLE_SYNC_EXPECTED'));

// (f1) async IIFE, body fully synchronous, promise discarded
results.attacks.push(await attack('f1-async-iife-no-await-discarded', [
	'function onBar(bar, api) {',
	"	api.plot('iifeOuter', bar.close);",
	'	(async function () {',
	"		api.plot('iifeSyncBody', bar.close * 2);",
	'	})();',
	'}'
].join('\n'), 'ACCEPTABLE_SYNC_EXPECTED'));

// (f2) async IIFE with await inside, promise discarded
results.attacks.push(await attack('f2-async-iife-with-await-discarded', [
	'function onBar(bar, api) {',
	"	api.plot('iifeOuter2', bar.close);",
	'	(async function () {',
	'		await Promise.resolve();',
	"		api.plot('iifeAsyncWork', bar.close);",
	"		if (bar.time === " + MARKER + ") api.order('buy', 1);",
	'	})();',
	'}'
].join('\n'), 'RED_SILENT_DROP_EXPECTED'));

// (g) EXTRA — onBar installed as a getter alternating sync/async per call
results.attacks.push(await attack('g-onbar-getter-alternating-sync-async', [
	'var __calls = 0;',
	'var syncImpl = function (bar, api) { api.plot("getterSync", bar.close); };',
	'var asyncImpl = async function (bar, api) { await Promise.resolve(); api.plot("getterAsync", bar.close); };',
	'Object.defineProperty(globalThis, "onBar", {',
	'	get: function () { __calls++; return (__calls % 2 === 1) ? syncImpl : asyncImpl; }',
	'});'
].join('\n'), 'RED_SILENT_DROP_EXPECTED'));

// (h) EXTRA — inert fake Promise whose then DISCARDS the callback
results.attacks.push(await attack('h-inert-fake-promise-drops-callback', [
	'Promise = { resolve: function () { return { then: function () { /* inert: discards fn */ } }; } };',
	'function onBar(bar, api) {',
	"	api.plot('inertFakeSync', bar.close);",
	'	Promise.resolve().then(function () { api.plot("neverInert", 1); });',
	'}'
].join('\n'), 'GUEST_SABOTAGE_EDGE_EXPECTED'));

// (i) EXTRA — real Promise.prototype.then overridden to run callbacks synchronously
results.attacks.push(await attack('i-real-promise-prototype-then-sync-override', [
	'Promise.prototype.then = function (fn) { fn(this); return Promise.resolve(); };',
	'function onBar(bar, api) {',
	"	api.plot('protoSync', bar.close);",
	'	Promise.resolve().then(function (p) {',
	"		api.plot('protoThenWork', bar.close * 2);",
	"		if (bar.time === " + MARKER + ") api.order('buy', 1);",
	'	});',
	'}'
].join('\n'), 'ACCEPTABLE_SYNC_EXPECTED'));

// ---- verdict assembly ----
for (const row of results.attacks) {
	if (row.status === 'failed') {
		row.honestyOk = row.failedRecordCarriesIdentity && row.failedRecordCarriesAssumptions && row.actionableMessage;
	}
	if (row.status === 'succeeded' && row.claimedClassification === 'ACCEPTABLE_SYNC_EXPECTED') {
		// for e/f1/i: require the scheduled work to have ACTUALLY executed
		const p = row.plots;
		const want = row.label === 'e-fake-promise-sync-then' ? ['fakeSync', 'fakeThenWork']
			: row.label === 'f1-async-iife-no-await-discarded' ? ['iifeOuter', 'iifeSyncBody']
			: ['protoSync', 'protoThenWork'];
		row.observedClassification = want.every((k) => p[k] && p[k].nonNull === row.assumptionsBarsInRun)
			? 'ACCEPTABLE_SYNC_EXECUTION' : 'SUCCEEDED_WITH_MISSING_WORK';
	}
	if (row.status === 'succeeded' && row.claimedClassification === 'GUEST_SABOTAGE_EDGE_EXPECTED') {
		const dropped = row.plots.neverInert === undefined;
		row.observedClassification = dropped ? 'GUEST_SABOTAGE_EDGE' : 'WORK_EXECUTED_ANYWAY';
	}
}

const reds = results.attacks.filter((a) => a.observedClassification === 'RED_SILENT_DROP');
const refusals = results.attacks.filter((a) => a.observedClassification === 'CAUGHT_REFUSED');
const acceptable = results.attacks.filter((a) => a.observedClassification === 'ACCEPTABLE_SYNC_EXECUTION');
const edges = results.attacks.filter((a) => a.observedClassification === 'GUEST_SABOTAGE_EDGE');
results.overall = {
	redSilentDrops: reds.map((a) => a.label),
	caughtRefusals: refusals.map((a) => a.label),
	acceptableSyncExecution: acceptable.map((a) => a.label),
	guestSabotageEdges: edges.map((a) => a.label),
	allDeterministic: results.attacks.every((a) => a.determinism_twoRunsIdentical),
	allFailedKeepIdentityAndAssumptions: results.attacks.filter((a) => a.status === 'failed').every((a) => a.honestyOk),
	notes: 'RED_SILENT_DROP anywhere would falsify the repair. CAUGHT_REFUSED = contract held. ACCEPTABLE_SYNC_EXECUTION = work fully executed synchronously inside the bar (truthful success). GUEST_SABOTAGE_EDGE = the guest replaced Promise with an inert object; the dropped callback never entered the runtime — recorded as an observed limitation of the sync-only contract (user-inflicted, no runtime-submitted work was dropped).'
};

writeFileSync(new URL('./v19-bypass-results.json', import.meta.url), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.overall, null, 1));
for (const a of results.attacks) {
	console.log(a.label, '=>', a.status, a.error ? a.error.code : '', '| observed:', a.observedClassification, '| det:', a.determinism_twoRunsIdentical, a.honestyOk === undefined ? '' : '| failedRecordHonesty:', a.honestyOk);
}
