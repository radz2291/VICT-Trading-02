// G3 runner smoke test — deterministic synthetic series + SMA-cross script.
import { runBacktest, createQuickJsScriptRuntime, canonicalJson, sha256Hex } from '@vict-trading/trading-kit';

// deterministic synthetic 15m series: 300 bars around 100.00 with a wave
const bars = [];
const T0 = 1767225600; // 2026-01-01T00:00:00Z
for (let i = 0; i < 300; i++) {
	const t = T0 + i * 900;
	const base = 100 + 10 * Math.sin(i / 20) + i * 0.01;
	const close = Math.round(base * 100) / 100;
	bars.push({ time: t, open: Math.round((base - 0.3) * 100) / 100, high: Math.round((base + 0.8) * 100) / 100, low: Math.round((base - 0.9) * 100) / 100, close });
}

const script = `
function sma(values, n) {
  if (values.length < n) return null;
  let s = 0;
  for (let i = values.length - n; i < values.length; i++) s += values[i];
  return s / n;
}
function onBar(bar, api) {
  const period = api.input('period', 5);
  const closes = api.bars().bars.map(function (b) { return b.close; });
  const m = sma(closes, period);
  api.plot('sma', m);
  if (m === null) return;
  const st = api.state();
  if (bar.close > m && st.position <= 0) api.order('buy', 10);
  if (bar.close < m && st.position >= 0) api.order('sell', 10);
}
`;

const t0 = Date.now();
const result = await runBacktest({
	symbol: 'TEST',
	baseTimeframe: '15m',
	timeframe: '15m',
	fromTime: T0,
	toTime: T0 + 299 * 900 + 900,
	scriptSource: script,
	inputs: { period: 5 },
	fill: { spread: 0.02, slippage: 0.01, commission: 0.5, startingCash: 10000, model: 'next-bar-open' },
	sourceBars: bars,
	runtime: createQuickJsScriptRuntime()
});
const ms = Date.now() - t0;
console.log('status:', result.status, 'in', ms, 'ms');
if (result.error) console.log('error:', JSON.stringify(result.error));
console.log('identity:', result.identity.id.slice(0, 16));
console.log('barsInRun:', result.assumptions.barsInRun);
console.log('stats:', JSON.stringify(result.stats));
console.log('trades:', result.trades.length, 'first fill:', result.trades[0] ? JSON.stringify(result.trades[0]) : 'none');
console.log('plots.sma last5:', JSON.stringify((result.plots.sma ?? []).slice(-5)));
console.log('signals.buy last10:', JSON.stringify((result.signals.buy ?? []).slice(-10)));
console.log('capped queries:', result.cappedQueryCount, '/', result.queryRecordCount);

// determinism: second identical run
const r2 = await runBacktest({
	symbol: 'TEST', baseTimeframe: '15m', timeframe: '15m',
	fromTime: T0, toTime: T0 + 299 * 900 + 900,
	scriptSource: script, inputs: { period: 5 },
	fill: { spread: 0.02, slippage: 0.01, commission: 0.5, startingCash: 10000, model: 'next-bar-open' },
	sourceBars: bars, runtime: createQuickJsScriptRuntime()
});
console.log('determinism identity:', r2.identity.id === result.identity.id ? 'IDENTICAL' : 'DIFFERENT');
console.log('determinism trades:', JSON.stringify(r2.trades) === JSON.stringify(result.trades) ? 'IDENTICAL' : 'DIFFERENT');
console.log('determinism equity:', JSON.stringify(r2.equity) === JSON.stringify(result.equity) ? 'IDENTICAL' : 'DIFFERENT');
