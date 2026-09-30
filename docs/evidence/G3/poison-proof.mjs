// G3 poison-future proof — pass criterion 7 AS AMENDED (D-005):
//   (a) fixture POTENCY: a naive calculation over the FULL SOURCE HISTORY
//       must RESPOND to changes in the poisoned future bars (different value
//       under mutated poison proves the fixture can expose a leak);
//   (b) capped-consumer ISOLATION: a script consuming the kit's capped data
//       must match an INDEPENDENT clock-capped oracle (computed here from
//       the raw fixture JSON, NOT via the kit) and must remain IDENTICAL
//       when only future bars change — at EVERY supported timeframe, and
//       for derived outputs (the script's sma/max plots AND the runner's
//       equity curve are both checked).
// The script itself is deliberately naive: it reports the max high and a
// 20-bar SMA over everything api.bars() gives it. If any post-horizon bar
// were visible, (b) would fail because the poison variants differ there.
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire('C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/packages/trading-kit/package.json');
const { runBacktest, createQuickJsScriptRuntime } = require('@vict-trading/trading-kit');

const FIX = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G2/fixture/';
const baseline = JSON.parse(readFileSync(FIX + 'g2-fixture-baseline.json', 'utf8'));
const alternate = JSON.parse(readFileSync(FIX + 'g2-fixture-alternate.json', 'utf8'));
const meta = JSON.parse(readFileSync(FIX + 'fixture-meta.json', 'utf8'));

const horizon = meta.horizonInstant;
const TFS = ['15m', '1h', '4h'];

// the script under test: naive over its ENTIRE served slice (derived output:
// plotted sma + max; orders create trades -> trades + equity also derived)
const SCRIPT = `
function onBar(bar, api) {
  const bars = api.bars().bars;
  let mx = null;
  for (let i = 0; i < bars.length; i++) { if (mx === null || bars[i].high > mx) mx = bars[i].high; }
  let sma = null;
  if (bars.length >= 20) {
    let s = 0;
    for (let i = bars.length - 20; i < bars.length; i++) s += bars[i].close;
    sma = s / 20;
  }
  api.plot('naiveMax', mx);
  api.plot('sma20', sma);
  const st = api.state();
  if (mx !== null && bar.close > mx * 0.999 && st.position <= 0) api.order('buy', 1);
  if (mx !== null && bar.close < mx * 0.999 && st.position > 0) api.order('sell', 1);
}`;

// ---- (a) POTENCY: naive full-source-history calcs differ across variants --
function naiveFullHistory(bars) {
	let max = -Infinity;
	for (const b of bars) max = Math.max(max, b.high);
	let s = 0;
	const last20 = bars.slice(-20);
	for (const b of last20) s += b.close;
	return { fullHistoryMax: max, sma20Final: s / 20 };
}
const potB = naiveFullHistory(baseline.bars);
const potA = naiveFullHistory(alternate.bars);
const potency = {
	baseline: potB,
	alternate: potA,
	respondsToPoison: potB.fullHistoryMax !== potA.fullHistoryMax && potB.sma20Final !== potA.sma20Final,
	committedNaiveValues: meta.naiveCalculations
};

// ---- (b) ISOLATION: independent clock-capped oracle -----------------------
// Oracle built from the RAW fixture JSON (independent of the kit's
// aggregation code): base bars with close <= instant; for HTF, complete
// UTC-aligned buckets only (all required base slots present AND available).
function oracleCappedView(bars, tfSeconds, instant) {
	const available = bars.filter((b) => b.time + 900 <= instant);
	if (tfSeconds === 900) {
		let mx = null;
		for (const b of available) mx = mx === null ? b.high : Math.max(mx, b.high);
		let sma = null;
		if (available.length >= 20) {
			let s = 0;
			for (let i = available.length - 20; i < available.length; i++) s += available[i].close;
			sma = s / 20;
		}
		return { count: available.length, naiveMax: mx, sma20: sma };
	}
	const slots = new Set(bars.map((b) => b.time));
	const avail = new Map(available.map((b) => [b.time, b]));
	const out = [];
	const seen = new Set();
	for (const b of available) {
		const start = Math.floor(b.time / tfSeconds) * tfSeconds;
		if (seen.has(start)) continue;
		seen.add(start);
		const factor = tfSeconds / 900;
		let complete = true;
		const group = [];
		for (let k = 0; k < factor; k++) {
			const slot = start + k * 900;
			if (!slots.has(slot) || !avail.has(slot)) { complete = false; break; }
			group.push(avail.get(slot));
		}
		if (!complete) continue;
		let high = -Infinity;
		for (const g of group) high = Math.max(high, g.high);
		out.push({ time: start, open: group[0].open, high, low: Math.min(...group.map((g) => g.low)), close: group[group.length - 1].close });
	}
	let mx = null;
	for (const b of out) mx = mx === null ? b.high : Math.max(mx, b.high);
	let sma = null;
	if (out.length >= 20) {
		let s = 0;
		for (let i = out.length - 20; i < out.length; i++) s += out[i].close;
		sma = s / 20;
	}
	return { count: out.length, naiveMax: mx, sma20: sma };
}

const isolationRows = [];
let allIsolated = true;
let allMatchOracle = true;

for (const tf of TFS) {
	const tfSeconds = tf === '15m' ? 900 : tf === '1h' ? 3600 : 14400;
	const runOne = async (variant) =>
		runBacktest({
			symbol: variant.symbol ?? 'XAUUSD',
			baseTimeframe: '15m',
			timeframe: tf,
			fromTime: variant.bars[0].time,
			toTime: horizon,
			scriptSource: SCRIPT,
			inputs: {},
			fill: { spread: 0.1, slippage: 0.05, commission: 1.0, startingCash: 10000, model: 'next-bar-open' },
			sourceBars: variant.bars,
			runtime: createQuickJsScriptRuntime()
		});
	const rb = await runOne(baseline);
	const ra = await runOne(alternate);
	if (rb.status !== 'succeeded' || ra.status !== 'succeeded') {
		isolationRows.push({ tf, error: 'run failed', rb: rb.error, ra: ra.error });
		allIsolated = false;
		continue;
	}
	// trades carry run-scoped ids (id embeds the run identity, which differs
	// by design because the pinned data revision differs) — compare the
	// ECONOMIC content of fills, not the identity-scoped labels
	const stripIds = (trades) => (trades ?? []).map((t) => { const { id, runId, ...rest } = t; return rest; });
	const resultsIdentical =
		JSON.stringify(rb.plots) === JSON.stringify(ra.plots) &&
		JSON.stringify(stripIds(rb.trades)) === JSON.stringify(stripIds(ra.trades)) &&
		JSON.stringify(rb.equity) === JSON.stringify(ra.equity) &&
		JSON.stringify(rb.signals) === JSON.stringify(ra.signals) &&
		JSON.stringify(rb.stats) === JSON.stringify(ra.stats);
	const oracleB = oracleCappedView(baseline.bars, tfSeconds, horizon);
	const lastIdx = rb.assumptions.barsInRun - 1;
	const scriptMaxB = rb.plots.naiveMax[lastIdx];
	const scriptSmaB = rb.plots.sma20[lastIdx];
	const matchOracle =
		scriptMaxB === oracleB.naiveMax &&
		Math.abs(scriptSmaB - oracleB.sma20) < 1e-9 &&
		rb.assumptions.barsInRun === oracleB.count;
	const identitiesDifferByDesign = rb.identity.id !== ra.identity.id; // data revision pins differ
	isolationRows.push({
		tf,
		barsInRun: rb.assumptions.barsInRun,
		oracleBars: oracleB.count,
		resultsIdenticalBaselineVsAlternate: resultsIdentical,
		scriptMaxMatchesIndependentOracle: scriptMaxB === oracleB.naiveMax,
		scriptSmaMatchesIndependentOracle: Math.abs(scriptSmaB - oracleB.sma20) < 1e-9,
		oracleValues: { naiveMax: oracleB.naiveMax, sma20: oracleB.sma20 },
		scriptValues: { naiveMax: scriptMaxB, sma20: scriptSmaB },
		identitiesDifferByDesign
	});
	if (!resultsIdentical) allIsolated = false;
	if (!matchOracle) allMatchOracle = false;
}

const out = {
	at: new Date().toISOString(),
	criterion: 'G3 pass criterion 7 as amended by D-005',
	potency,
	isolation: { rows: isolationRows, allIsolated, allMatchIndependentOracle: allMatchOracle },
	verdict: potency.respondsToPoison && allIsolated && allMatchOracle ? 'PASS' : 'FAIL'
};
writeFileSync(new URL('./poison-proof-results.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 1));
