
import { runBacktest, createQuickJsScriptRuntime } from '@vict-trading/trading-kit';
// the CONSUMER's own data: 240 bars, own generator
const T0 = 1900000000;
const bars = [];
for (let i = 0; i < 240; i++) {
	const base = 50 + 5 * Math.sin(i / 16) + i * 0.02;
	const close = Math.round(base * 1000) / 1000;
	bars.push({ time: T0 + i * 900, open: close - 0.1, high: close + 0.4, low: close - 0.5, close });
}
const SCRIPT = `
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
}`;
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
