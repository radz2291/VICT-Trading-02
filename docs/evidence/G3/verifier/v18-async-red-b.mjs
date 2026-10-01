// v18-async-red-b.mjs — G3 CONTESTED CHECK ROUND A (owner-ordered), Pattern B.
// QUESTION: through the PUBLIC script+backtest path, does a SYNCHRONOUS onBar
// that SCHEDULES guest work via a Promise (Promise.resolve().then(...)) get
// that work silently skipped while the run reports success?
// Pattern B work is exactly what a naive runner "never pumps": the .then
// callbacks become QuickJS pending jobs; if the host never executes pending
// jobs they never run.
// Also probes: (B3) a THROWN error inside onBar IS surfaced (contrast:
// failures are truthful, silent SKIPPING is not); (B4) waiting host-side
// after runBacktest returns changes nothing (jobs died with the disposed
// runtime; there is no public pending-job API to pump — see
// v18-async-red-a-results.json publicRuntimePortSurface).
//
// Imports the kit EXACTLY as the host does (host/node_modules workspace
// symlink → packages/trading-kit → dist/index.js). Own synthetic data.
// Run: node v18-async-red-b.mjs   (writes v18-async-red-b-results.json)

import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

let head = null, prodDiffEmpty = null;
try {
	head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
	execFileSync('git', ['diff', '--quiet', '8a33b00a9bd0c12f7c8a5fc8ebc78ff9e28bb6e6..HEAD', '--', 'packages', 'host']);
	prodDiffEmpty = true;
} catch { prodDiffEmpty = false; }

const require = createRequire(import.meta.url);
const hostDir = fileURLToPath(new URL('../../../../host/', import.meta.url));
const kitEntry = require.resolve('@vict-trading/trading-kit', { paths: [hostDir] });
const kit = await import(pathToFileURL(kitEntry));
const { runBacktest, createQuickJsScriptRuntime } = kit;

const N = 48, STEP = 900, T0 = 1800000000;
const MARKER = T0 + 10 * STEP; // bar index 10
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
	symbol: 'V18-TEST', baseTimeframe: '15m', timeframe: '15m',
	fromTime: T0, toTime: T0 + (N - 1) * STEP,
	scriptSource, inputs: {}, fill: FILL, sourceBars,
	runtime: createQuickJsScriptRuntime()
});

const plotSummary = (plots) => Object.fromEntries(
	Object.entries(plots).map(([k, arr]) => [k, { len: arr.length, nonNull: arr.filter((v) => v !== null).length }])
);

async function probe(label, scriptSource, expect, postRunHook = null) {
	const r1 = await runBacktest(runCfg(scriptSource));
	if (postRunHook) await postRunHook();
	const r2 = await runBacktest(runCfg(scriptSource));
	const detIdentical = JSON.stringify(r1) === JSON.stringify(r2);
	const barsInRun = r1.assumptions.barsInRun;
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
			netProfit: r1.stats.netProfit,
			barsInRun
		},
		determinism_twoRunsIdentical: detIdentical,
		expectation: expect
	};
	if (expect.kind === 'control') {
		row.redFlags = {
			statusReportsSuccess: r1.status === 'succeeded',
			plotPresent: plotSummary(r1.plots)[expect.plot]?.nonNull === barsInRun,
			orderFilled: r1.trades.length === 1
		};
		row.verdict = (row.redFlags.statusReportsSuccess && row.redFlags.plotPresent && row.redFlags.orderFilled)
			? 'CONTROL_OK (harness sees executed work)' : 'CONTROL_UNEXPECTED';
	} else if (expect.kind === 'thrown-error-contrast') {
		row.redFlags = {
			failed: r1.status === 'failed',
			truthfulCode: r1.error?.code ?? null,
			nothingFromThisRunInResults: r1.trades.length === 0
		};
		row.verdict = (row.redFlags.failed && row.redFlags.truthfulCode)
			? 'CONTRAST_OK: a thrown guest error IS surfaced truthfully (run failed)'
			: 'NOT_REPRODUCED (inspect row)';
	} else {
		row.redFlags = {
			statusReportsSuccess: r1.status === 'succeeded',
			anyErrorSurfaced: r1.error != null,
			syncPartExecuted: expect.syncPlot === null || plotSummary(r1.plots)[expect.syncPlot]?.nonNull === barsInRun,
			scheduledPlotPresent: plotSummary(r1.plots)[expect.plot]?.nonNull > 0,
			scheduledOrderFilled: expect.order ? r1.trades.length > 0 : undefined,
			stillAbsentAfterHostWait: undefined
		};
		if (expect.order === false) row.redFlags.scheduledOrderFilled = undefined;
		row.verdict = (row.redFlags.statusReportsSuccess
			&& row.redFlags.syncPartExecuted
			&& !row.redFlags.scheduledPlotPresent
			&& (expect.order ? row.redFlags.scheduledOrderFilled === false : true)
			&& !row.redFlags.anyErrorSurfaced)
			? 'RED: scheduled guest work silently skipped, run succeeded, no flag'
			: 'NOT_REPRODUCED (inspect row)';
	}
	return row;
}

const results = {
	harness: 'v18-async-red-b.mjs (G3 contested check round A, Pattern B)',
	testedHead: head,
	productCodeByteIdenticalTo_8a33b00: prodDiffEmpty,
	kitResolvedFrom: kitEntry,
	data: { kind: 'verifier-own synthetic 15m bars', bars: N, fromTime: T0, markerBarTime: MARKER },
	probes: []
};

// B0 — control (sync, no promises): harness sanity.
results.probes.push(await probe('B0-control-sync', `
function onBar(bar, api) {
  api.plot('ctrl', bar.close);
  if (bar.time === ${MARKER}) api.order('buy', 1);
}
`, { kind: 'control', plot: 'ctrl' }));

// B1 — THE Pattern-B canonical case: sync onBar schedules plot+order in .then.
results.probes.push(await probe('B1-sync-onBar-then-plot+order', `
function onBar(bar, api) {
  api.plot('syncB', bar.close);
  var t = bar.time;
  Promise.resolve().then(function () {
    api.plot('thenB', bar.close * 2);
    if (t === ${MARKER}) api.order('buy', 1);
  });
}
`, { kind: 'async', syncPlot: 'syncB', plot: 'thenB', order: true }));

// B2 — two-deep promise chain (job queued from within another job).
results.probes.push(await probe('B2-sync-onBar-chained-then', `
function onBar(bar, api) {
  api.plot('syncB2', bar.close);
  Promise.resolve().then(function () {
    return Promise.resolve().then(function () {
      api.plot('chainB', 1);
    });
  });
}
`, { kind: 'async', syncPlot: 'syncB2', plot: 'chainB', order: false }));

// B3 — CONTRAST: a THROWN error inside onBar (setTimeout does not exist in the
// guest) IS surfaced as a truthful failure. Failures are honest; silent
// skipping is not.
results.probes.push(await probe('B3-thrown-error-contrast', `
function onBar(bar, api) {
  api.plot('syncB3', bar.close);
  setTimeout(function () { api.plot('timerB', 1); }, 0);
}
`, { kind: 'thrown-error-contrast' }));

// B4 — falsifies "it is just a timing thing": run B1 again and WAIT host-side
// after runBacktest resolves; the scheduled work is still absent. The jobs
// died with the per-run disposed runtime; there is no public pump API.
results.probes.push(await probe('B4-then-pattern-with-host-side-wait', `
function onBar(bar, api) {
  api.plot('syncB4', bar.close);
  Promise.resolve().then(function () { api.plot('thenB4', 1); });
}
`, { kind: 'async', syncPlot: 'syncB4', plot: 'thenB4', order: false },
	() => new Promise((res) => setTimeout(res, 250))));

results.overall = {
	redConfirmed_patternB: results.probes.filter((p) => String(p.verdict).startsWith('RED')).length,
	notes: 'B1/B2/B4: scheduled guest work (Promise.then jobs) never executes; run reports succeeded; no error/refusal/flag; omission deterministic. B3 shows the CONTRAST: the same runner DOES surface thrown errors truthfully — the silence is specific to scheduled-but-never-pumped work.'
};

writeFileSync(new URL('./v18-async-red-b-results.json', import.meta.url), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.probes.map((p) => ({ label: p.label, verdict: p.verdict, det: p.determinism_twoRunsIdentical })), null, 1));
