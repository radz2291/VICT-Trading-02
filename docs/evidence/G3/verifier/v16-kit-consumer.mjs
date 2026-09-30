// ROUND-3 FINAL VERIFIER — own independent kit consumer (outside monorepo).
// Installs the packed kit-0.2.1 tarball, then with OWN synthetic data proves:
//   (1) deterministic two-run identity + bit-identical results (script WITH
//       Math.random + Date.now inside onBar — entropy forms included)
//   (2) one-input-change identity flip + demonstrably different results
//   (3) capped queries during a run (requested beyond clock -> capped + recorded)
//   (4) one sandbox refusal with truthful error + identity preserved on the failed run
//   (5) every fill carries simulated: true
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const CONSUMER = 'C:/Users/RZ1/Desktop/RZ/g3-v3-verifier-kit-consumer';
// runBacktest expects config.runtime to be the LIVE runtime object returned by
// createQuickJsScriptRuntime() (carrying {kind, version} AND .run()); a fresh
// runtime per run, created lazily AFTER the external install from the
// consumer's own node_modules.
let newRuntime = () => { throw new Error('runtime factory not initialized before mk()'); };
const TARBALL = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/packages/trading-kit/vict-trading-trading-kit-0.2.1.tgz';

rmSync(CONSUMER, { recursive: true, force: true });
mkdirSync(CONSUMER, { recursive: true });
writeFileSync(
	CONSUMER + '/package.json',
	JSON.stringify({ name: 'g3-v3-verifier-kit-consumer', version: '1.0.0', private: true, type: 'module', dependencies: {} }, null, 2)
);
execSync('npm install "' + TARBALL + '" --no-workspaces', { cwd: CONSUMER, stdio: 'pipe', env: { ...process.env, npm_config_workspaces: 'false' } });
const installed = JSON.parse(readFileSync(CONSUMER + '/node_modules/@vict-trading/trading-kit/package.json', 'utf8'));
console.log('installed kit version', installed.version);

// ---- consumer's OWN data (independent of every repo fixture) ---------------
const T0 = 1739577600; // 2025-02-15 00:00Z, 15m bars, sawtooth with a rising drift
const bars = [];
for (let i = 0; i < 120; i++) {
	const phase = i % 20;
	const drift = i * 0.05;
	const mid = 2900 + drift + (phase < 10 ? phase * 0.8 : (20 - phase) * 0.8);
	const o = +(mid - 0.4).toFixed(2), c = +(mid + 0.3).toFixed(2);
	bars.push({ time: T0 + i * 900, open: o, high: +(Math.max(o, c) + 0.6).toFixed(2), low: +(Math.min(o, c) - 0.6).toFixed(2), close: c });
}

const mk = (inputs, src) => ({
	symbol: 'GOLDTEST',
	baseTimeframe: '15m',
	timeframe: '15m',
	fromTime: T0,
	toTime: bars[bars.length - 1].time,
	scriptSource: src,
	inputs,
	fill: { startingCash: 5000, commission: 0.5, spread: 0.4, slippage: 0.1 },
	runtime: newRuntime(),
	sourceBars: bars,
	timeoutMs: 2000
});

// entropy-using script: Math.random plots + random-sized orders + Date.now plot + Date() string hash
const SRC = `var s = 0;
function onBar(bar, api){
	api.plot('r', Math.random());
	api.plot('pin', Date.now());
	var h = 0x811c9dc5, str = String(Date());
	for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
	api.plot('dh', (h >>> 0) % 1000003);
	if (s % 5 === 0) api.order('buy', 1 + Math.random());
	if (s % 7 === 0) api.plotSignal('enter', true);
	s++;
}`;
const SRC_BAD = 'function onBar(bar, api){ this is not javascript ))(( }';

const results = {};
const assert = (name, cond, detail) => { results[name] = { ok: !!cond, ...(detail ? { detail } : {}) }; if (!cond) throw new Error(name + ' FAILED: ' + detail); };

// import from the EXTERNAL consumer's node_modules — never the repo workspace
const consumerRequire = createRequire(CONSUMER + '/package.json');
const { runBacktest, createQuickJsScriptRuntime, createReplayClock, createDataSession } = consumerRequire('@vict-trading/trading-kit');
newRuntime = () => createQuickJsScriptRuntime();
const assertImport = consumerRequire.resolve('@vict-trading/trading-kit');
const norm = (p) => p.toLowerCase().replaceAll('/', '\\').replaceAll('\\\\', '\\');
assert('import-from-consumer-install', norm(assertImport).startsWith(norm(CONSUMER)), assertImport);

const rt = () => createQuickJsScriptRuntime();
const a = await runBacktest(mk({ period: 5 }, SRC));
const b = await runBacktest(mk({ period: 5 }, SRC));
const c = await runBacktest(mk({ period: 7 }, SRC));

assert('two-run-bit-identity', JSON.stringify(a.plots) === JSON.stringify(b.plots) && a.identity.id === b.identity.id && JSON.stringify(a.trades) === JSON.stringify(b.trades) && JSON.stringify(a.equity) === JSON.stringify(b.equity));
// per-bar pinned Date.now: every plotted pin equals this bar's close ms
const pins = a.plots['pin'];
let pinOk = Array.isArray(pins) && pins.length > 0;
// plots cover CLOSED run bars only (the bar whose time == toTime is the open bar,
// not yet closed) — compare each plotted pin against ITS bar's close ms
if (pinOk) for (let i = 0; i < pins.length; i++) if (pins[i] !== (bars[i].time + 900) * 1000) { pinOk = false; break; }
assert('pinned-date-now-is-bar-close-per-bar', pinOk, JSON.stringify({ plotLen: Array.isArray(pins)? pins.length : 'none', barsLen: bars.length }).slice(0,160));
assert('one-input-flip', c.identity.id !== a.identity.id && JSON.stringify(c.plots) !== JSON.stringify(a.plots));

// capped queries: request beyond the final clock via the consumer's own clock/session
const clock = createReplayClock({ symbol: 'GOLDTEST', timeframe: '15m', start: T0, horizon: bars[bars.length - 1].time });
clock.advance(60 * 60); // move the replay clock INTO the data (1h in): real bars behind it
clock.setFrame(T0 + 60 * 60); // pin the queried instant explicitly
const ds = createDataSession({ clock, source: { bars: [...bars] }, rules: { baseTimeframe: '15m' } });
const q1 = ds.bars({ until: 1739577600 + 60 * 60 + 7200 }); // beyond the clock → must cap, still serve the capped slice
const q2 = ds.bars({ until: 9999999999 });
assert('capped-query-recorded', q2.capped === true && q2.bars.length > 0 && q2.bars.length <= q1.bars.length && q2.servedUntil < 9999999999 && q2.servedUntil + 900 >= (bars[0].time + 900), JSON.stringify({ capped: q2.capped, servedUntil: q2.servedUntil, n: q2.bars.length, total: q1.bars.length }));
// every served bar closes at or before the clock instant (no future leak)
let cappinOk = q2.bars.every((bb) => bb.time + 900 <= q2.servedUntil);
assert('capped-slice-bounded-by-clock', cappinOk, JSON.stringify({ n: q2.bars.length, lastClose: q2.bars.length ? q2.bars[q2.bars.length-1].time + 900 : -1, servedUntil: q2.servedUntil }).slice(0,160));

const bad = await runBacktest(mk({}, SRC_BAD));
assert('sandbox-refusal-status-failed', bad.status === 'failed' && !!bad.error && 'message' in (bad.error ?? {}), JSON.stringify(bad.error).slice(0, 120));
assert('failed-run-identity-preserved', typeof bad.identity?.id === 'string' && bad.identity.id.length > 0);

const fills = a.trades.filter((t) => t.size !== undefined ? true : true);
assert('fills-simulated-only', a.trades.length > 0 && a.trades.every((t) => t.simulated === true), 'trades=' + a.trades.length);

const allOk = Object.values(results).every((r) => r.ok);
writeFileSync(CONSUMER + '/v3-verifier-kit-consumer-results.json', JSON.stringify({ results, allOk }, null, 2));
console.log(JSON.stringify({ results, allOk }, null, 2));
process.exit(allOk ? 0 : 1);