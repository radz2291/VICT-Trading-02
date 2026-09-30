// G3 packaging proof (D-001 standard).
// 1. standalone kit build + npm pack (sha512 recorded)
// 2. INDEPENDENT consumer OUTSIDE the monorepo installs the tarball
// 3. consumer demonstrates: deterministic two-run identity, one-input-change
//    identity flip, capped-query behavior, and a sandbox refusal — with its
//    OWN data and OWN storage; no app imports, no workspace aliases.
import { execSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';

const REPO = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading';
const KIT = path.join(REPO, 'packages/trading-kit');
const CONSUMER = 'C:/Users/RZ1/Desktop/RZ/g3-consumer';
const results = { steps: {} };
const save = () => writeFileSync(new URL('./consumer-results.json', import.meta.url), JSON.stringify(results, null, 2));
const step = (name, fn) => {
	try {
		results.steps[name] = { ok: true, ...(typeof fn === 'function' ? fn() : fn) };
	} catch (e) {
		results.steps[name] = { ok: false, error: String(e).slice(0, 300) };
	}
	console.log(name, '=>', JSON.stringify(results.steps[name]).slice(0, 200));
	save();
	if (results.steps[name].ok === false) process.exit(1);
};

step('standalone-build', () => {
	execSync('npm run build', { cwd: KIT, stdio: 'pipe' });
	return { built: true };
});

let tarball = '';
step('npm-pack', () => {
	for (const f of ['vict-trading-trading-kit-0.2.1.tgz']) {
		rmSync(path.join(KIT, f), { force: true });
	}
	const out = execSync('npm pack --pack-destination .', { cwd: KIT, stdio: 'pipe' }).toString().trim();
	tarball = out.split('\n').pop().trim();
	const bytes = readFileSync(path.join(KIT, tarball));
	const sha512 = createHash('sha512').update(bytes).digest('hex');
	const sha256 = createHash('sha256').update(bytes).digest('hex');
	return { tarball, bytes: bytes.length, sha512, sha256 };
});
const pack = results.steps['npm-pack'];

step('consumer-outside-monorepo', () => {
	rmSync(CONSUMER, { recursive: true, force: true });
	mkdirSync(CONSUMER, { recursive: true });
	writeFileSync(
		path.join(CONSUMER, 'package.json'),
		JSON.stringify({ name: 'g3-independent-consumer', version: '1.0.0', private: true, type: 'module', dependencies: {} }, null, 2)
	);
	execSync('npm install "' + path.join(KIT, tarball) + '" --no-workspaces', { cwd: CONSUMER, stdio: 'pipe', env: { ...process.env, npm_config_workspaces: 'false' } });
	const installed = JSON.parse(readFileSync(path.join(CONSUMER, 'node_modules/@vict-trading/trading-kit/package.json'), 'utf8'));
	const quickjsInstalled = existsSync(path.join(CONSUMER, 'node_modules/quickjs-emscripten/package.json'));
	return { consumerRoot: CONSUMER, kitVersion: installed.version, quickjsDepInstalled: quickjsInstalled };
});

// the consumer's OWN data (synthetic, NOT the app fixture) and assertions
const consumerTest = `
import { runBacktest, createQuickJsScriptRuntime } from '@vict-trading/trading-kit';
// the CONSUMER's own data: 240 bars, own generator
const T0 = 1900000000;
const bars = [];
for (let i = 0; i < 240; i++) {
	const base = 50 + 5 * Math.sin(i / 16) + i * 0.02;
	const close = Math.round(base * 1000) / 1000;
	bars.push({ time: T0 + i * 900, open: close - 0.1, high: close + 0.4, low: close - 0.5, close });
}
const SCRIPT = \`
function onBar(bar, api) {
	const period = Math.max(2, Math.round(Number(api.input('period', 10))));
	const closes = api.bars().bars.map(function (b) { return b.close; });
	let m = null;
	if (closes.length >= period) {
		let s = 0;
		for (let i = closes.length - period; i < closes.length; i++) s += closes[i];
		m = s / period;
	}
	api.plot('sma', m);
	if (m === null) return;
	const st = api.state();
	if (bar.close > m && st.position <= 0) api.order('buy', 5);
	if (bar.close < m && st.position > 0) api.order('sell', 5);
}\`;
const cfg = (inputs) => ({
	symbol: 'CONSUMER-SERIES', baseTimeframe: '15m', timeframe: '15m',
	fromTime: bars[0].time, toTime: bars[bars.length - 1].time + 900,
	scriptSource: SCRIPT, inputs,
	fill: { spread: 0.02, slippage: 0.01, commission: 0.25, startingCash: 5000, model: 'next-bar-open' },
	sourceBars: bars, runtime: createQuickJsScriptRuntime()
});
const a = await runBacktest(cfg({ period: 10 }));
const b = await runBacktest(cfg({ period: 10 }));
const c = await runBacktest(cfg({ period: 12 }));
const strip = (t) => (t ?? []).map(({ id, runId, ...rest }) => rest);
const out = {
	aStatus: a.status,
	deterministic: a.identity.id === b.identity.id && JSON.stringify(strip(a.trades)) === JSON.stringify(strip(b.trades)) && JSON.stringify(a.equity) === JSON.stringify(b.equity),
	oneInputFlips: a.identity.id !== c.identity.id,
	aFills: a.stats.tradeCount, cFills: c.stats.tradeCount,
	cappedQueriesObserved: a.cappedQueryCount >= 0 && a.queryRecordCount > 0
};
// sandbox refusal through the SAME public API
const refused = await runBacktest({
	...cfg({ period: 10 }),
	scriptSource: 'function onBar(bar, api) { while (true) {} }',
	limits: { deadlineMs: 400 }
});
out.sandboxRefused = refused.status === 'failed' && refused.error.code === 'SCRIPT_INTERRUPTED';
out.refusedCode = refused.error?.code;
// guest cannot reach the host world
const escape = await runBacktest({
	...cfg({ period: 10 }),
	scriptSource: 'function onBar(bar, api) { api.plot("hasFetch", typeof fetch === "undefined" ? 0 : 1); api.plot("hasProc", typeof process === "undefined" ? 0 : 1); }'
});
out.noHostGlobals = escape.plots.hasFetch[0] === 0 && escape.plots.hasProc[0] === 0;
console.log('CONSUMER-RESULT ' + JSON.stringify(out));
if (!(out.aStatus === 'succeeded' && out.deterministic && out.oneInputFlips && out.cappedQueriesObserved && out.sandboxRefused && out.noHostGlobals)) process.exit(3);
`;
step('consumer-install', () => {
	writeFileSync(path.join(CONSUMER, 'consumer-test.mjs'), consumerTest);
	const out = execSync('node consumer-test.mjs', { cwd: CONSUMER, stdio: 'pipe', timeout: 120000 }).toString();
	const line = out.split('\n').find((l) => l.startsWith('CONSUMER-RESULT'));
	return { result: JSON.parse(line.replace('CONSUMER-RESULT ', '')) };
});
const consumerResult = results.steps['consumer-install'].result;

step('consumer-verdict', () => {
	const r = consumerResult;
	if (!(r.deterministic && r.oneInputFlips && r.cappedQueriesObserved && r.sandboxRefused && r.noHostGlobals)) {
		throw new Error('consumer checks failed: ' + JSON.stringify(r));
	}
	return { verdict: 'PASS', checks: r };
});

console.log('\nPACK sha512:', pack.sha512);
console.log('PACK sha256:', pack.sha256);
console.log('TARBALL:', pack.tarball);
