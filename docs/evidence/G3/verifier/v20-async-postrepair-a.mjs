// v18-async-red-a.mjs — G3 CONTESTED CHECK ROUND A (owner-ordered), Pattern A.
// Fresh verifier harness. QUESTION: through the PUBLIC script+backtest path,
// does guest async work get SILENTLY SKIPPED while the run reports success?
//
// Pattern A: onBar declared async (or returning a promise) emitting a
// plot/order AFTER an await/then. Content is meaningful: if executed, the
// plot series would appear in result.plots and the order would produce a
// fill in result.trades.
//
// Imports the kit EXACTLY as the host does: name-resolved through
// host/node_modules/@vict-trading/trading-kit (workspace symlink to
// packages/trading-kit → dist/index.js). Own synthetic data (no builder
// fixture). No network, no accounts — runBacktest is simulated-only.
//
// Run: node v18-async-red-a.mjs   (writes v20-async-postrepair-a-results.json)

import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

// ---- provenance: tested tree --------------------------------------------
let head = null, prodDiffEmpty = null;
try {
	head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
	execFileSync('git', ['diff', '--quiet', '8a33b00a9bd0c12f7c8a5fc8ebc78ff9e28bb6e6..HEAD', '--', 'packages', 'host']);
	prodDiffEmpty = true; // exit 0 → packages+host byte-identical to pinned candidate
} catch (e) {
	prodDiffEmpty = false;
}

// ---- kit import, host-style ----------------------------------------------
const require = createRequire(import.meta.url);
const hostDir = fileURLToPath(new URL('../../../../host/', import.meta.url));
const kitEntry = require.resolve('@vict-trading/trading-kit', { paths: [hostDir] });
const kit = await import(pathToFileURL(kitEntry));
const { runBacktest, createQuickJsScriptRuntime } = kit;

// ---- own synthetic data (deterministic, fixed constants) ------------------
const N = 48, STEP = 900, T0 = 1800000000;
const MARKER = T0 + 10 * STEP; // bar index 10
function buildBars() {
	const bars = [];
	let prevClose = 100;
	for (let i = 0; i < N; i++) {
		// fixed deterministic wiggle (no Math.random / Date.now anywhere)
		const close = 100 + Math.round((Math.sin(i / 3.7) * 2 + (i % 5) * 0.3) * 100) / 100;
		const open = prevClose;
		bars.push({
			time: T0 + i * STEP,
			open,
			high: Math.max(open, close) + 0.5,
			low: Math.min(open, close) - 0.5,
			close
		});
		prevClose = close;
	}
	return bars;
}
const sourceBars = buildBars();

const FILL = { spread: 0.1, slippage: 0.05, commission: 1, startingCash: 2000, model: 'next-bar-open' };

function runCfg(scriptSource) {
	return {
		symbol: 'V18-TEST',
		baseTimeframe: '15m',
		timeframe: '15m',
		fromTime: T0,
		toTime: T0 + (N - 1) * STEP,
		scriptSource,
		inputs: {},
		fill: FILL,
		sourceBars,
		runtime: createQuickJsScriptRuntime()
	};
}

const plotSummary = (plots) => Object.fromEntries(
	Object.entries(plots).map(([k, arr]) => [k, { len: arr.length, nonNull: arr.filter((v) => v !== null).length }])
);

async function probe(label, scriptSource, expect) {
	const r1 = await runBacktest(runCfg(scriptSource));
	const r2 = await runBacktest(runCfg(scriptSource));
	const detIdentical = JSON.stringify(r1) === JSON.stringify(r2);
	const row = {
		label,
		run1: {
			status: r1.status,
			identityId: r1.identity.id,
			error: r1.error ?? null,
			plots: plotSummary(r1.plots),
			signalKeys: Object.keys(r1.signals),
			tradeCount: r1.trades.length,
			trades: r1.trades.map((t) => ({ side: t.side, size: t.size, signalBarTime: t.signalBarTime, fillBarTime: t.fillBarTime })),
			unfilledOrders: r1.unfilledOrders,
			netProfit: r1.stats.netProfit,
			barsInRun: r1.assumptions.barsInRun
		},
		determinism_twoRunsIdentical: detIdentical,
		expectation: expect
	};
	const barsInRun = r1.assumptions.barsInRun;
	// RED evaluation: async work silently skipped while run reports success?
	if (expect.kind === 'control') {
		row.redFlags = {
			statusReportsSuccess: r1.status === 'succeeded',
			plotPresent: plotSummary(r1.plots)[expect.plot]?.nonNull === barsInRun,
			orderFilled: r1.trades.length === 1
		};
		row.verdict = (row.redFlags.statusReportsSuccess && row.redFlags.plotPresent && row.redFlags.orderFilled)
			? 'CONTROL_OK (harness sees executed work)' : 'CONTROL_UNEXPECTED';
	} else {
		const asyncPlot = expect.plot;
		const plots1 = r1.plots;
		row.redFlags = {
			statusReportsSuccess: r1.status === 'succeeded',
			anyErrorSurfaced: r1.error != null,
			syncPartExecuted: expect.syncPlot === null || plotSummary(r1.plots)[expect.syncPlot]?.nonNull === barsInRun,
			asyncPlotPresent: asyncPlot in plots1 && plots1[asyncPlot].some((v) => v !== null),
			asyncOrderFilled: expect.order ? r1.trades.length > 0 : undefined,
			interruptionCode: r1.error?.code === 'SCRIPT_INTERRUPTED'
		};
		if (expect.kind === 'env') {
			row.verdict = 'ENV-PROBE (signalKeys embed guest typeof values; no async expectation)';
		} else {
			const orderCheckOk = expect.order ? row.redFlags.asyncOrderFilled === false : true;
			row.verdict = (row.redFlags.statusReportsSuccess
				&& row.redFlags.syncPartExecuted
				&& !row.redFlags.asyncPlotPresent
				&& orderCheckOk
				&& !row.redFlags.anyErrorSurfaced)
				? 'RED: async work silently skipped, run succeeded, no flag'
				: 'NOT_REPRODUCED (inspect row)';
		}
	}
	return row;
}

const results = {
	harness: 'v20-async-postrepair-a.mjs (round-A Pattern-A harness rerun at repair candidate; output redirected to preserve round-A red evidence)',
	testedHead: head,
	productCodeByteIdenticalTo_8a33b00: prodDiffEmpty,
	kitResolvedFrom: kitEntry,
	data: { kind: 'verifier-own synthetic 15m bars', bars: N, fromTime: T0, markerBarTime: MARKER },
	marker: 'MARKER bar time ' + MARKER + ' — an order emitted there fills at bar 11 open if executed',
	probes: []
};

// CONTROL — fully synchronous onBar: proves the harness would SEE plots/orders
// that really execute (guards against a blind harness).
results.probes.push(await probe('A0-control-sync', `
function onBar(bar, api) {
  api.plot('ctrl', bar.close);
  if (bar.time === ${MARKER}) api.order('buy', 1);
}
`, { kind: 'control', plot: 'ctrl' }));

// A1 — async onBar: plot + order AFTER `await Promise.resolve()`.
results.probes.push(await probe('A1-async-onBar-await-then-plot+order', `
async function onBar(bar, api) {
  api.plot('syncA', bar.close);
  await Promise.resolve();
  api.plot('asyncA', bar.close * 2);
  if (bar.time === ${MARKER}) api.order('buy', 1);
}
`, { kind: 'async', syncPlot: 'syncA', plot: 'asyncA', order: true }));

// A2 — async onBar with a NEVER-SETTLING await. The accepted A1-runtime record
// claims "an `await` that never settles is interrupted truthfully" — test it.
results.probes.push(await probe('A2-async-onBar-never-settling-await', `
async function onBar(bar, api) {
  api.plot('syncA2', bar.close);
  await new Promise(function () {});
  api.plot('neverA', 1);
}
`, { kind: 'async', syncPlot: 'syncA2', plot: 'neverA', order: false }));

// A3 — onBar returns a promise (not declared async): work in .then.
results.probes.push(await probe('A3-onBar-returns-promise', `
function onBar(bar, api) {
  return Promise.resolve().then(function () {
    api.plot('retA', bar.close);
    if (bar.time === ${MARKER}) api.order('sell', 1);
  });
}
`, { kind: 'async', syncPlot: null, plot: 'retA', order: true }));

// A4 — guest environment probe: which async primitives exist at all
// (surfaced through public signal names, so no host-side inspection needed).
results.probes.push(await probe('A4-guest-async-env', `
function onBar(bar, api) {
  api.plotSignal('env_Promise_typeof_' + typeof Promise, true);
  api.plotSignal('env_queueMicrotask_typeof_' + typeof queueMicrotask, true);
  api.plotSignal('env_setTimeout_typeof_' + typeof setTimeout, true);
  api.plot('envbar', bar.close);
}
`, { kind: 'env', syncPlot: 'envbar', plot: null, order: false }));

// Pending-job API probe: does the public ScriptRuntime port expose ANY way to
// pump guest jobs? (Keys of the returned object + does the shipped dist even
// mention executePendingJobs?)
const rtInstance = createQuickJsScriptRuntime();
results.publicRuntimePortSurface = { keys: Object.keys(rtInstance), kind: rtInstance.kind, version: rtInstance.version };
const { readFileSync } = await import('node:fs');
const distText = readFileSync(kitEntry, 'utf8');
results.distMentionsExecutePendingJobs = distText.includes('executePendingJobs');

results.overall = {
	redConfirmed_patternA: results.probes.filter((p) => String(p.verdict).startsWith('RED')).length,
	notes: 'A1/A2/A3: if verdict RED — guest async continuation never ran; run reported succeeded with no error/flag; omission is deterministic (two-run identical), so determinism is NOT the violated property — honesty is.'
};

writeFileSync(new URL('./v20-async-postrepair-a-results.json', import.meta.url), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.probes.map((p) => ({ label: p.label, verdict: p.verdict, det: p.determinism_twoRunsIdentical })), null, 1));
console.log('env signals:', JSON.stringify(results.probes.find((p) => p.label === 'A4-guest-async-env').run1.signalKeys));
console.log('publicRuntimePortSurface:', JSON.stringify(results.publicRuntimePortSurface));
console.log('distMentionsExecutePendingJobs:', results.distMentionsExecutePendingJobs);
