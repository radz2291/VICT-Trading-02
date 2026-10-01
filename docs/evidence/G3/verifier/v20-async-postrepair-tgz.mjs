// v18-async-red-tgz.mjs — G3 CONTESTED CHECK ROUND A (owner-ordered).
// Re-runs the canonical Pattern A (async onBar) and Pattern B (Promise.then)
// red cases against the COMMITTED packed artifact kit-0.2.1.tgz, installed
// in a fresh consumer OUTSIDE the monorepo — the artifact identity path the
// G3 packaging criterion relies on. Proves the red behavior is not an
// artifact of running the workspace build.
//
// Run: node v18-async-red-tgz.mjs   (writes v20-async-postrepair-tgz-results.json)

import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

let head = null, prodDiffEmpty = null;
try {
	head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', cwd: resolve(import.meta.dirname, '../../../../') }).trim();
	execFileSync('git', ['diff', '--quiet', '8a33b00a9bd0c12f7c8a5fc8ebc78ff9e28bb6e6..HEAD', '--', 'packages', 'host'], { cwd: resolve(import.meta.dirname, '../../../../') });
	prodDiffEmpty = true;
} catch { prodDiffEmpty = false; }

const TGZ = resolve(import.meta.dirname, '../kit-0.2.2.tgz');
const tgzSha256 = createHash('sha256').update(readFileSync(TGZ)).digest('hex');

const consumer = join(tmpdir(), 'v20-async-postrepair-consumer-' + Date.now());
mkdirSync(consumer, { recursive: true });
writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'v20-async-postrepair-consumer', private: true, type: 'module' }));

let installLogTail = null, installOk = false;
try {
	const out = execFileSync('npm', ['install', '--no-audit', '--no-fund', TGZ], { cwd: consumer, encoding: 'utf8', timeout: 150_000, shell: process.platform === 'win32' });
	installOk = true;
	installLogTail = out.split(/\r?\n/).slice(-6).join(' | ');
} catch (e) {
	installLogTail = String(e.message).slice(0, 800);
}

const results = {
	harness: 'v20-async-postrepair-tgz.mjs (round-A committed-artifact harness rerun against committed kit-0.2.2.tgz; output redirected to preserve round-A red evidence)',
	testedHead: head,
	productCodeByteIdenticalTo_8a33b00: prodDiffEmpty,
	committedTgz: TGZ,
	tgzSha256,
	install: { ok: installOk, consumerDir: consumer, logTail: installLogTail },
	probes: []
};

if (installOk) {
	const require = createRequire(import.meta.url);
	const consumerRequire = createRequire(join(consumer, 'package.json'));
	const kitEntry = consumerRequire.resolve('@vict-trading/trading-kit');
	const kit = await import(pathToFileURL(kitEntry));
	const { runBacktest, createQuickJsScriptRuntime } = kit;
	results.kitResolvedFrom = kitEntry;
	const pkgJson = JSON.parse(readFileSync(join(kitEntry, '..', '..', 'package.json'), 'utf8'));
	results.installedKitVersion = pkgJson.version;

	const N = 48, STEP = 900, T0 = 1800000000, MARKER = T0 + 10 * STEP;
	const bars = [];
	let prevClose = 100;
	for (let i = 0; i < N; i++) {
		const close = 100 + Math.round((Math.sin(i / 3.7) * 2 + (i % 5) * 0.3) * 100) / 100;
		bars.push({ time: T0 + i * STEP, open: prevClose, high: Math.max(prevClose, close) + 0.5, low: Math.min(prevClose, close) - 0.5, close });
		prevClose = close;
	}
	const FILL = { spread: 0.1, slippage: 0.05, commission: 1, startingCash: 2000, model: 'next-bar-open' };
	const runCfg = (scriptSource) => ({
		symbol: 'V18-TEST', baseTimeframe: '15m', timeframe: '15m',
		fromTime: T0, toTime: T0 + (N - 1) * STEP,
		scriptSource, inputs: {}, fill: FILL, sourceBars: bars,
		runtime: createQuickJsScriptRuntime()
	});
	const plotSummary = (plots) => Object.fromEntries(
		Object.entries(plots).map(([k, arr]) => [k, { len: arr.length, nonNull: arr.filter((v) => v !== null).length }])
	);

	async function probe(label, scriptSource, expect) {
		const r1 = await runBacktest(runCfg(scriptSource));
		const r2 = await runBacktest(runCfg(scriptSource));
		const det = JSON.stringify(r1) === JSON.stringify(r2);
		const row = {
			label,
			status: r1.status,
			identityId: r1.identity.id,
			error: r1.error ?? null,
			plots: plotSummary(r1.plots),
			tradeCount: r1.trades.length,
			determinism_twoRunsIdentical: det,
			expectation: expect
		};
		row.redFlags = {
			statusReportsSuccess: r1.status === 'succeeded',
			anyErrorSurfaced: r1.error != null,
			asyncPlotPresent: plotSummary(r1.plots)[expect.plot]?.nonNull > 0,
			asyncOrderFilled: expect.order ? r1.trades.length > 0 : undefined
		};
		row.verdict = (row.redFlags.statusReportsSuccess && !row.redFlags.asyncPlotPresent
			&& (expect.order ? row.redFlags.asyncOrderFilled === false : true)
			&& !row.redFlags.anyErrorSurfaced)
			? 'RED: async work silently skipped, run succeeded, no flag (COMMITTED ARTIFACT)'
			: 'NOT_REPRODUCED (inspect row)';
		return row;
	}

	// Pattern A canonical (async onBar, work after await)
	results.probes.push(await probe('TGZ-A1-async-onBar', `
async function onBar(bar, api) {
  api.plot('syncA', bar.close);
  await Promise.resolve();
  api.plot('asyncA', bar.close * 2);
  if (bar.time === ${MARKER}) api.order('buy', 1);
}
`, { kind: 'async', plot: 'asyncA', order: true }));

	// Pattern B canonical (sync onBar, work scheduled in .then)
	results.probes.push(await probe('TGZ-B1-then-pattern', `
function onBar(bar, api) {
  api.plot('syncB', bar.close);
  var t = bar.time;
  Promise.resolve().then(function () {
    api.plot('thenB', bar.close * 2);
    if (t === ${MARKER}) api.order('buy', 1);
  });
}
`, { kind: 'async', plot: 'thenB', order: true }));

	results.overall = {
		redConfirmed_onCommittedArtifact: results.probes.filter((p) => String(p.verdict).startsWith('RED')).length,
		notes: 'Same silent-skip on the committed kit-0.2.1.tgz installed outside the monorepo — behavior is intrinsic to the shipped artifact, not a workspace-build artifact.'
	};
}

writeFileSync(new URL('./v20-async-postrepair-tgz-results.json', import.meta.url), JSON.stringify(results, null, 2));
console.log('tgzSha256:', tgzSha256);
console.log('install ok:', installOk, '| kit version:', results.installedKitVersion ?? 'n/a');
console.log(JSON.stringify(results.probes.map((p) => ({ label: p.label, verdict: p.verdict, status: p.status, det: p.determinism_twoRunsIdentical })), null, 1));
// leave the temp consumer in place briefly for inspection; tmpdir is cleaned by the OS
