// Verify the in-app replay readouts (fixture bars, max, SMA20) against the app-observed
// values collected in rp-4-step12 — computed DIRECTLY from the committed fixture JSON.
// This is the verifier's own oracle; the app must match it exactly.
const fs = require('fs');
const fx = JSON.parse(fs.readFileSync('C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G2/fixture/g2-fixture-baseline.json', 'utf8'));
const observed = [
	{ step: 1, instant: 1769447700, max: 2657.81, sma: 2645.17 },
	{ step: 2, instant: 1769448600, max: 2657.81, sma: 2645.13 },
	{ step: 3, instant: 1769449500, max: 2657.81, sma: 2645.12 },
	{ step: 4, instant: 1769450400, max: 2657.81, sma: 2645.12 },
	{ step: 5, instant: 1769451300, max: 2657.81, sma: 2645.09 },
	{ step: 6, instant: 1769452200, max: 2657.81, sma: 2645.06 },
	{ step: 7, instant: 1769453100, max: 2657.81, sma: 2645.01 },
	{ step: 8, instant: 1769454000, max: 2657.81, sma: 2644.92 },
	{ step: 9, instant: 1769454900, max: 2657.81, sma: 2644.83 },
	{ step: 10, instant: 1769455800, max: 2657.81, sma: 2644.74 },
	{ step: 11, instant: 1769456700, max: 2657.81, sma: 2644.67 },
	{ step: 12, instant: 1769457600, max: 2657.81, sma: 2644.58 },
	{ step: 13, instant: 1769458500, max: 2657.81, sma: 2644.49 }
];
// recompute instants from step semantics: start = bars[1500].time, each step +900
const startIdx = 1500;
let mismatches = 0;
for (const o of observed) {
	const instant = (o.step === 1 ? fx.bars[startIdx].time : fx.bars[startIdx].time + (o.step - 1) * 900);
	if (instant !== o.instant) { console.log('INSTANT MISMATCH step', o.step, instant, o.instant); mismatches++; }
	const slice = fx.bars.filter((b) => b.time + 900 <= instant);
	const max = Math.max(...slice.map((b) => b.high));
	const closes = slice.slice(-20).map((b) => b.close);
	const sma = Math.round((closes.reduce((a, b) => a + b, 0) / closes.length) * 100) / 100;
	const ok = Math.abs(max - o.max) < 1e-9 && Math.abs(sma - o.sma) < 1e-9;
	if (!ok) { mismatches++; console.log('VALUE MISMATCH step', o.step, 'expected', { max, sma, count: slice.length }, 'observed', { max: o.max, sma: o.sma }); }
	else console.log('step', o.step, 'ok: max', max, 'sma20', sma, 'bars', slice.length, '(observed', o.max + '/' + o.sma + ')');
}
console.log(mismatches === 0 ? 'ALL-IN-APP-SLICE-VALUES MATCH OWN ORACLE: PASS' : 'MISMATCHES: ' + mismatches);