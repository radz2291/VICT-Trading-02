// FRESH VERIFIER — criterion 5/hand-fixture: re-derive the strategy from RAW
// bars with an independent implementation (kit never invoked for the math),
// then compare: (a) my derivation vs the committed hand table, (b) my
// derivation vs the kit runner's actual fills/equity/stats.
// Strategy (from the fixture spec): long/flat SMA3 threshold, size 10,
// buy only from flat when close > sma3; sell reduce when close < sma3;
// fill at NEXT bar open ± (spread/2 + slippage); commission 1 per fill;
// startingCash 2000.
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire('C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/packages/trading-kit/package.json');
const { runBacktest, createQuickJsScriptRuntime } = require('@vict-trading/trading-kit');

const fixture = JSON.parse(readFileSync(new URL('../fixtures/hand-calculated-fixture.json', import.meta.url), 'utf8'));
const bars = fixture.bars;
const FILL = fixture.fill;

// ---- my OWN derivation (independent walk of raw bars) -----------------------
const pending = []; // orders awaiting next-bar-open fill
let pos = 0, avg = 0, cash = FILL.startingCash, fills = [], equity = [], signals = [];
const closeAt = (i) => bars[i].close;
function mySma3(i) { // served prefix through bar i inclusive
	if (i < 2) return null;
	return (closeAt(i) + closeAt(i - 1) + closeAt(i - 2)) / 3;
}
const smaPlot = new Array(bars.length).fill(null);
{
	pending.length = 0; fills.length = 0; equity.length = 0; signals.length = 0; pos = 0; avg = 0; cash = FILL.startingCash;
	for (let i = 0; i < bars.length; i++) {
		if (pending.length > 0) {
			const o = pending.shift();
			const sign = o.side === 'buy' ? 1 : -1;
			const fillPrice = bars[i].open + sign * (FILL.spread / 2 + FILL.slippage);
			cash -= sign * o.size * fillPrice + FILL.commission;
			pos += sign * o.size;
			fills.push({
				side: o.side, fillBarTime: bars[i].time, signalBarTime: o.signalBarTime,
				basePrice: bars[i].open, fillPrice, positionAfter: pos, cashAfter: cash
			});
		}
		const m = mySma3(i);
		smaPlot[i] = m;
		if (m !== null) {
			if (bars[i].close > m && pos <= 0) pending.push({ side: 'buy', size: 10, signalBarTime: bars[i].time });
			if (bars[i].close < m && pos > 0) pending.push({ side: 'sell', size: 10, signalBarTime: bars[i].time });
		}
		equity[i] = cash + pos * bars[i].close;
	}
}
let peak = FILL.startingCash, maxDd = 0;
for (const e of equity) { if (e > peak) peak = e; const dd = peak - e; if (dd > maxDd) maxDd = dd; }

// ---- (a) my derivation vs committed hand table ------------------------------
const exp = fixture.expected;
const mineVsCommitted = {
	fillsCount: [fills.length, exp.fills.length],
	eachFill: fills.map((f, i) => {
		const e = exp.fills[i];
		return e && f.side === e.side && f.fillBarTime === bars[e.fillBarIndex].time &&
			f.signalBarTime === bars[e.signalBarIndex].time &&
			f.basePrice === e.basePrice && f.fillPrice === e.fillPrice &&
			f.cashAfter === e.cashAfter && f.positionAfter === e.positionAfter;
	}),
	equityCurve: JSON.stringify(equity) === JSON.stringify(exp.equityByBar),
	smaPlot: JSON.stringify(smaPlot) === JSON.stringify(exp.smaPlotByBar),
	stats: {
		finalEquity: [equity[equity.length - 1], exp.stats.finalEquity],
		netProfit: [equity[equity.length - 1] - FILL.startingCash, exp.stats.netProfit],
		tradeCount: [fills.length, exp.stats.tradeCount],
		maxDrawdown: [maxDd, exp.stats.maxDrawdown]
	}
};

// ---- (b) my derivation vs the KIT RUNNER ------------------------------------
const r = await runBacktest({
	symbol: fixture.symbol,
	baseTimeframe: fixture.baseTimeframe,
	timeframe: fixture.timeframe,
	fromTime: fixture.fromTime,
	toTime: fixture.toTime,
	scriptSource: fixture.scriptSource,
	inputs: fixture.inputs,
	fill: FILL,
	sourceBars: bars,
	runtime: createQuickJsScriptRuntime()
});
const kitFills = (r.trades ?? []).map((t) => ({
	side: t.side, fillBarTime: t.fillBarTime, signalBarTime: t.signalBarTime,
	basePrice: t.basePrice, fillPrice: t.fillPrice, positionAfter: t.positionAfter, cashAfter: t.cashAfter
}));
const mineVsKit = {
	status: r.status,
	fillsMatchMine: JSON.stringify(kitFills) === JSON.stringify(fills),
	kitFillSummary: kitFills.map((f) => `${f.side}@${f.fillBarTime}:${f.fillPrice} pos=${f.positionAfter} cash=${f.cashAfter}`),
	mineFillSummary: fills.map((f) => `${f.side}@${f.fillBarTime}:${f.fillPrice} pos=${f.positionAfter} cash=${f.cashAfter}`),
	equityMatchMine: JSON.stringify(r.equity) === JSON.stringify(equity),
	smaPlotMatchMine: JSON.stringify(r.plots.sma3) === JSON.stringify(smaPlot),
	statsMatchMine: {
		finalEquity: r.stats.finalEquity === equity[equity.length - 1],
		netProfit: r.stats.netProfit === equity[equity.length - 1] - FILL.startingCash,
		tradeCount: r.stats.tradeCount === fills.length,
		maxDrawdown: Math.abs(r.stats.maxDrawdown - maxDd) < 1e-9
	}
};

// ---- manual spot re-derivations (2 fills, fully hand) -----------------------
// Fill #1: signal at bar 2 (close 101 > sma3(2)=100.5) → buy 10 fills at bar 3
// open=101 → fill=101+0.05+0.05=101.1; cash=2000−1011−1=988.
const f1 = { hand: { base: bars[3].open, fill: bars[3].open + 0.05 + 0.05, cash: 2000 - 10 * (bars[3].open + 0.1) - 1 } };
// Fill #6: signal at bar 15 (close 103 < sma3(15)=103.166) → sell 10 at bar 16
// open=102 → fill=102−0.1=101.9; cash=960+1019−1=1978? — position was 10 long
// since bar 13; cash before = 960; sell: +10*101.9 −1 = 1978? Verify against table (1988).
const f6 = { handCash: 960 + 10 * (bars[16].open - 0.1) - 1 };
const out = { mineVsCommitted, mineVsKit, manual: { f1, f6 }, fills: fills.length, maxDd };
writeFileSync(new URL('./v3-hand-derive-results.json', import.meta.url), JSON.stringify({ mineVsCommitted, mineVsKit, manual: { f1, f6 } }, null, 2));
console.log(JSON.stringify(out, null, 2));