// Hand-calculated strategy fixture — GENERATOR (G3 exactness oracle).
//
// Emits hand-calculated-fixture.json. The expected values are NOT computed
// here by formula — the point of this fixture is that a HUMAN derived them
// on paper (derivation table in README.md next to this file). The generator
// only serializes the hand-derived inputs and the hand-derived expected
// results as literals.
//
// Strategy under test (long/flat SMA3 threshold):
//   m = mean(last 3 closes) (null until 3 closes exist)
//   close > m and position <= 0 -> order('buy', 10)
//   close < m and position >  0 -> order('sell', 10)
//   (buys only from flat; sells only reduce — no shorts)
// Fill model next-bar-open, spread 0.10 (half 0.05), slippage 0.05,
// commission 1.00, startingCash 2000.
//
// Hand table (24 bars; open_i = close_{i-1}, open_0 = 100.00;
// high = max(o,c)+0.25, low = min(o,c)-0.25 — highs/lows unused by the
// strategy but keep the fixture well-formed):
//   i  close   SMA3      decision
//   0  100.00  —
//   1  100.50  —
//   2  101.00  100.5000  close>SMA -> BUY signal            (fill bar 3)
//   3  101.50  101.0000  (long)
//   4  102.00  101.5000  (long)
//   5  101.00  101.5000  close<SMA -> SELL signal           (fill bar 6)
//   6  101.50  101.5000  (close == SMA -> no signal; flat)
//   7  102.50  101.6667  close>SMA -> BUY signal            (fill bar 8)
//   8  103.00  102.3333  (long)
//   9  102.00  102.5000  close<SMA -> SELL signal           (fill bar 10)
//  10  102.00  102.3333  (flat; close<SMA but no position)
//  11  101.50  101.8333  (flat)
//  12  102.50  102.0000  close>SMA -> BUY signal            (fill bar 13)
//  13  103.00  102.3333  (long)
//  14  103.50  103.0000  (long)
//  15  103.00  103.1667  close<SMA -> SELL signal           (fill bar 16)
//  16  103.00  103.1667  (flat)
//  17  102.50  102.8333  (flat)
//  18  102.50  102.6667  (flat; close<SMA, no position)
//  19  102.00  102.3333  (flat)
//  20  101.50  102.0000  (flat)
//  21  101.00  101.5000  (flat)
//  22  100.50  101.0000  (flat)
//  23  100.00  100.5000  (flat)
//
// Hand-derived fills (fill = open ± (0.05 + 0.05); commission 1.00):
//   F1 buy  bar3  open 101.00 -> 101.10  cash = 2000 - 10*101.10 - 1 = 988.00  pos +10
//   F2 sell bar6  open 101.00 -> 100.90  cash = 988 + 10*100.90 - 1 = 1996.00  pos 0
//   F3 buy  bar8  open 102.50 -> 102.60  cash = 1996 - 10*102.60 - 1 = 969.00  pos +10
//   F4 sell bar10 open 102.00 -> 101.90  cash = 969 + 10*101.90 - 1 = 1987.00  pos 0
//   F5 buy  bar13 open 102.50 -> 102.60  cash = 1987 - 10*102.60 - 1 = 960.00  pos +10
//   F6 sell bar16 open 103.00 -> 102.90  cash = 960 + 10*102.90 - 1 = 1988.00  pos 0
//
// Hand-derived equity per bar close (cash + 10*close while long):
//   [2000, 2000, 2000, 2003, 2008, 1998, 1996, 1996, 1999, 1989,
//    1987, 1987, 1987, 1990, 1995, 1990, 1988, 1988, 1988, 1988,
//    1988, 1988, 1988, 1988]
//   peak = 2008 (bar 4); deepest trough after peak = 1987 (bar 10)
//   -> maxDrawdown = 21.00, maxDrawdownPct = 21/2008
//   finalEquity = 1988.00, netProfit = -12.00, tradeCount = 6
import { writeFileSync } from 'fs';

const T0 = 1800000000;
const STEP = 900;
const closes = [
	100.0, 100.5, 101.0, 101.5, 102.0, 101.0, 101.5, 102.5, 103.0, 102.0,
	102.0, 101.5, 102.5, 103.0, 103.5, 103.0, 103.0, 102.5, 102.5, 102.0,
	101.5, 101.0, 100.5, 100.0
];
const opens = closes.map((c, i) => (i === 0 ? 100.0 : closes[i - 1]));
const bars = closes.map((c, i) => ({
	time: T0 + i * STEP,
	open: opens[i],
	high: Math.max(opens[i], c) + 0.25,
	low: Math.min(opens[i], c) - 0.25,
	close: c
}));

const scriptSource = [
	'function onBar(bar, api) {',
	'  const closes = api.bars().bars.map(function (b) { return b.close; });',
	'  let m = null;',
	'  if (closes.length >= 3) {',
	'    m = (closes[closes.length - 1] + closes[closes.length - 2] + closes[closes.length - 3]) / 3;',
	'  }',
	'  api.plot(\'sma3\', m);',
	'  if (m === null) return;',
	'  const st = api.state();',
	'  if (bar.close > m && st.position <= 0) api.order(\'buy\', 10);',
	'  if (bar.close < m && st.position > 0) api.order(\'sell\', 10);',
	'}'
].join('\n');

const fixture = {
	kind: 'hand-calculated-strategy-fixture-v1',
	symbol: 'XAUUSD-TEST',
	baseTimeframe: '15m',
	timeframe: '15m',
	fromTime: T0,
	toTime: T0 + 23 * STEP + STEP,
	strategy: 'long/flat SMA3 threshold (period 3), buys only from flat, sells only reduce',
	inputs: { period: 3 },
	fill: { spread: 0.1, slippage: 0.05, commission: 1.0, startingCash: 2000, model: 'next-bar-open' },
	bars,
	scriptSource,
	expected: {
		// literals from the hand table above (decimal math; the test suite
		// evaluates the same arithmetic in float and compares)
		fills: [
			{ side: 'buy', fillBarIndex: 3, signalBarIndex: 2, basePrice: 101.0, fillPrice: 101.1, cashAfter: 988.0, positionAfter: 10 },
			{ side: 'sell', fillBarIndex: 6, signalBarIndex: 5, basePrice: 101.0, fillPrice: 100.9, cashAfter: 1996.0, positionAfter: 0 },
			{ side: 'buy', fillBarIndex: 8, signalBarIndex: 7, basePrice: 102.5, fillPrice: 102.6, cashAfter: 969.0, positionAfter: 10 },
			{ side: 'sell', fillBarIndex: 10, signalBarIndex: 9, basePrice: 102.0, fillPrice: 101.9, cashAfter: 1987.0, positionAfter: 0 },
			{ side: 'buy', fillBarIndex: 13, signalBarIndex: 12, basePrice: 102.5, fillPrice: 102.6, cashAfter: 960.0, positionAfter: 10 },
			{ side: 'sell', fillBarIndex: 16, signalBarIndex: 15, basePrice: 103.0, fillPrice: 102.9, cashAfter: 1988.0, positionAfter: 0 }
		],
		stats: { finalEquity: 1988.0, netProfit: -12.0, tradeCount: 6, maxDrawdown: 21.0, maxDrawdownPct: 21 / 2008 },
		equityByBar: [2000, 2000, 2000, 2003, 2008, 1998, 1996, 1996, 1999, 1989, 1987, 1987, 1987, 1990, 1995, 1990, 1988, 1988, 1988, 1988, 1988, 1988, 1988, 1988],
		smaPlotByBar: [null, null, 100.5, 101.0, 101.5, 101.5, 101.5, (101 + 101.5 + 102.5) / 3, (101.5 + 102.5 + 103) / 3, (102.5 + 103 + 102) / 3, (103 + 102 + 102) / 3, (102 + 102 + 101.5) / 3, (102 + 101.5 + 102.5) / 3, (101.5 + 102.5 + 103) / 3, (102.5 + 103 + 103.5) / 3, (103 + 103.5 + 103) / 3, (103.5 + 103 + 103) / 3, (103 + 103 + 102.5) / 3, (103 + 102.5 + 102.5) / 3, (102.5 + 102.5 + 102) / 3, (102.5 + 102 + 101.5) / 3, (102 + 101.5 + 101) / 3, (101.5 + 101 + 100.5) / 3, (101 + 100.5 + 100) / 3]
	}
};

writeFileSync(new URL('./hand-calculated-fixture.json', import.meta.url), JSON.stringify(fixture, null, '\t') + '\n');
console.log('wrote hand-calculated-fixture.json:', bars.length, 'bars;');
