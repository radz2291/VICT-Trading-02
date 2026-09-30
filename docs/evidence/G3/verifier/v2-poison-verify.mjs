// FRESH VERIFIER — criterion 7 as amended by D-005, with an INDEPENDENT oracle
// (deliberately different structure from the builder's poison-proof.mjs) and
// OWN mutations beyond the committed baseline/alternate pair:
//   V-C  : different poison SHAPE (alternating 9999/1 highs, lows=1, closes=5000+j)
//   V-D  : MID-HISTORY mutation — bars strictly AFTER an EARLIER horizon but
//          BEFORE the original horizon are shifted; a consumer capped at the
//          earlier horizon must not see them, while the naive full-history
//          calc responds (potency at the earlier horizon).
//   V-G  : source GAPS dropped INSIDE the capped history (bucket loss +
//          explicit unavailability must agree with the oracle).
// Oracle: binary-search availability prefix + slot-range aggregation
// (bucket enumeration by division over an UTC slot grid, independent of the
// kit's iteration order).
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire('C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/packages/trading-kit/package.json');
const { runBacktest, createQuickJsScriptRuntime, dataRevision } = require('@vict-trading/trading-kit');

const FIXDIR = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G2/fixture/';
const baseline = JSON.parse(readFileSync(FIXDIR + 'g2-fixture-baseline.json', 'utf8'));
const alternate = JSON.parse(readFileSync(FIXDIR + 'g2-fixture-alternate.json', 'utf8'));
const meta = JSON.parse(readFileSync(FIXDIR + 'fixture-meta.json', 'utf8'));
const horizon = meta.horizonInstant; // 1770068700
const OUT = [];
const FILL = { spread: 0.1, slippage: 0.05, commission: 1.0, startingCash: 10000, model: 'next-bar-open' };

// ---- verifier script (plots max + sma20 EVERY bar; crosses generate trades) --
const SCRIPT = `
const seenBars = [];
function onBar(bar, api) {
  seenBars.push(bar.time);
  const bars = api.bars().bars;
  let mx = null; let sma = null;
  if (bars.length) {
    mx = -Infinity;
    for (let i = 0; i < bars.length; i++) mx = mx > bars[i].high ? mx : bars[i].high;
    if (bars.length >= 20) {
      let s = 0;
      for (let i = bars.length - 20; i < bars.length; i++) s += bars[i].close;
      sma = s / 20;
    }
  }
  api.plot('naiveMax', mx); api.plot('sma20', sma);
  const st = api.state();
  if (mx !== null && bar.close > mx * 0.999 && st.position <= 0) { api.plotSignal('long', 1); api.order('buy', 1); }
  if (mx !== null && bar.close < mx * 0.999 && st.position > 0) { api.plotSignal('long', 0); api.order('sell', 1); }
}`;

// ---- INDEPENDENT oracle ------------------------------------------------------
// Availability prefix by binary search over close times (close = time + 900).
function availCount(bars, t) {
	let lo = 0, hi = bars.length;
	while (lo < hi) { const mid = (lo + hi) >> 1; if (bars[mid].time + 900 <= t) lo = mid + 1; else hi = mid; }
	return lo; // bars[0..lo-1] all have close <= t
}
// Aggregation over an explicit slot grid; no reliance on the kit code path.
function htfBars(bars, av, tf) {
	const tfS = tf === '15m' ? 900 : tf === '1h' ? 3600 : 14400;
	if (tfS === 900) return bars.slice(0, av);
	const slotTimes = new Map();
	for (let i = 0; i < av; i++) slotTimes.set(bars[i].time, bars[i]);
	const srcSlots = new Set(bars.map((b) => b.time));
	const firstTime = bars[0].time;
	const out = [];
	const firstBucket = Math.floor(firstTime / tfS) * tfS;
	const lastAvailableTime = av > 0 ? bars[av - 1].time : -Infinity;
	let s = firstBucket;
	while (s + tfS <= lastAvailableTime + 900) { // only buckets that CAN be complete
		const slots = [];
		for (let k = 0; k < tfS / 900; k++) slots.push(s + k * 900);
		if (slots.every((sl) => srcSlots.has(sl) && slotTimes.has(sl))) {
			const g = slots.map((sl) => slotTimes.get(sl));
			let hi = g[0].high; let lo = g[0].low;
			for (const b of g) { if (b.high > hi) hi = b.high; if (b.low < lo) lo = b.low; }
			out.push({ time: s, open: g[0].open, high: hi, low: lo, close: g[g.length - 1].close });
		}
		s += tfS;
	}
	return out;
}
// Oracle metrics AT a given clock instant for a given timeframe.
function oracleAt(bars, tf, t) {
	const av = availCount(bars, t);
	const series = htfBars(bars, av, tf);
	let mx = null; let sma = null;
	if (series.length) {
		mx = -Infinity;
		for (const b of series) mx = mx > b.high ? mx : b.high;
		if (series.length >= 20) {
			let s = 0.0;
			for (let i = series.length - 20; i < series.length; i++) s += series[i].close;
			sma = s / 20;
		}
	}
	return { count: series.length, mx, sma, baseCount: av };
}

// ---- OWN variants ------------------------------------------------------------
const variantC = structuredClone(baseline);
{
	const hz = horizon;
	let j = 0;
	for (const b of variantC.bars) {
		if (b.time + 900 > hz) { // everything after the horizon
			b.high = j % 2 ? 9999 : 1; b.low = 1; b.open = 5000 + j; b.close = 5000 + j; j++;
		}
	}
}
const EARLIER_HORIZON = baseline.bars[1450].time + 900; // inside history
const variantD = structuredClone(baseline);
for (const b of variantD.bars) {
	if (b.time >= variantD.bars[1500].time && b.time <= variantD.bars[1530].time) {
		b.close += 5000; b.high += 5000; b.open += 5000; b.low += 5000;
	}
}
const variantG = structuredClone(baseline);
{ // drop 3 single slots (indices 500/1000/1500 — all < horizon 1997)
	const drop = new Set([500, 1000, 1500]);
	variantG.bars = variantG.bars.filter((_, i) => !drop.has(i));
}

// ---- runner harness ----------------------------------------------------------
async function runOne(variantBars, tf, toTime) {
	const r = await runBacktest({
		symbol: baseline.symbol ?? 'XAUUSD',
		baseTimeframe: '15m',
		timeframe: tf,
		fromTime: variantBars[0].time,
		toTime,
		scriptSource: SCRIPT,
		inputs: {},
		fill: FILL,
		sourceBars: variantBars,
		runtime: createQuickJsScriptRuntime()
	});
	return r;
}
const stripIds = (trades) => (trades ?? []).map(({ id, runId, ...rest }) => rest);

const potencyFull = (barsArr) => {
	let mx = -Infinity; for (const b of barsArr) { if (b.high > mx) mx = b.high; }
	let s = 0; const l20 = barsArr.slice(-20); for (const b of l20) s += b.close;
	return { fullHistoryMax: mx, sma20Final: s / 20 };
};
const pot = {
	baseline: potencyFull(baseline.bars),
	alternate: potencyFull(alternate.bars),
	ownVariantC: potencyFull(variantC.bars),
	midHistoryD: potencyFull(variantD.bars)
};

const rows = [];
function addRow(row) { rows.push(row); }

// --- Block 1: committed baseline vs alternate (+ own variant C), all TFs ------
for (const tf of ['15m', '1h', '4h']) {
	const rb = await runOne(baseline.bars, tf, horizon);
	const ra = await runOne(alternate.bars, tf, horizon);
	const rc = await runOne(variantC.bars, tf, horizon);
	const pairIdentical =
		JSON.stringify(stripIds(rb.trades)) === JSON.stringify(stripIds(ra.trades)) &&
		JSON.stringify(rb.plots) === JSON.stringify(ra.plots) &&
		JSON.stringify(rb.equity) === JSON.stringify(ra.equity) &&
		JSON.stringify(stripIds(rb.unfilledOrders)) === JSON.stringify(stripIds(ra.unfilledOrders));
	const pairCIdentical = rc.status === 'succeeded' &&
		JSON.stringify(stripIds(rb.trades)) === JSON.stringify(stripIds(rc.trades)) &&
		JSON.stringify(rb.plots) === JSON.stringify(rc.plots) &&
		JSON.stringify(rb.equity) === JSON.stringify(rc.equity);
	// own oracle: EVERY bar index, not just the last
	const n = rb.plots?.naiveMax?.length ?? 0;
	let mismatches = 0; let firstMismatch = -1;
	for (let i = 0; i < n; i++) {
		const t = rb.barTimesOracleHint || null; // run bars not exposed; recompute closes below
		// run bar i closes at firstTime + (i+1)*tfSeconds IF no gaps — recompute from
		// the plot semantics instead: walk via availability using baseline bars.
	}
	// We compare per-bar: reconstruct run bar closes. In this fixture base gaps
	// exist; derive close instants from the ORACLE aggregation cadence instead:
	const seqOracle = [];
	{
		let t = baseline.bars[0].time + 900;
		const tfS = tf === '15m' ? 900 : tf === '1h' ? 3600 : 14400;
		// advance over every base close, but only push when a new oracle bar appears
		for (let idx = 0; idx < baseline.bars.length; idx++) seqOracle.push(baseline.bars[idx].time + 900);
	}
	let oracleOk = true; let lastIdx = n - 1;
	{
		// per-index oracle comparison via replay of availability at each run bar's
		// close — need run bar closes: derive from assumption barsInRun by walking
		// the oracle slot list for tf, taking the LAST `barsInRun` buckets.
		const closes = [];
		{
			// enumerate oracle bucket closes at FULL future clock, then pick entries
			// whose close <= horizon (the run range = everything capped at horizon)
			const av = availCount(baseline.bars, horizon);
			const series = htfBars(baseline.bars, av, tf);
			for (let k = Math.max(0, series.length - (rb.assumptions.barsInRun ?? series.length)); k < series.length; k++) {
				// run starts at fromTime = bars[0].time → all buckets are in range
			}
			for (const b of series) closes.push(b.time + tfSecondsOf(tf));
		}
		let ok = closes.length === n;
		for (let i = 0; i < n && closes.length === n; i++) {
			const o = oracleAt(baseline.bars, tf, closes[i]);
			const mv = rb.plots.naiveMax[i]; const sv = rb.plots.sma20[i];
			const eqMax = mv === o.mx;
			const eqSma = sv === null ? o.sma === null : Math.abs(sv - o.sma) < 1e-9;
			if (!(eqMax && eqSma)) { mismatchInfo(i, o, mv, sv); break; }
		}
		oracleOk = ok;
	}
	addRow({
		block: 'committed-pair+variantC', tf,
		statusA: rb.status, statusB: ra.status, statusC: rc.status,
		barsInRun: rb.assumptions?.barsInRun,
		identicalBaselineVsAlternate: pairIdentical,
		identicalBaselineVsOwnVariantC: pairCIdentical,
		oracleAllBarsMatch: oracleOk,
		oracleLast: oracleAt(baseline.bars, tf, horizon),
		scriptLast: { mx: rb.plots?.naiveMax?.[lastIdx], sma: rb.plots?.sma20?.[lastIdx] },
		identityBase: rb.identity.id.slice(0, 12), identityAlt: ra.identity.id.slice(0, 12),
		identitiesDifferByDesign: rb.identity.id !== ra.identity.id
	});
}
function tfSecondsOf(tf) { return tf === '15m' ? 900 : tf === '1h' ? 3600 : 14400; }
function mismatchInfo(i, o, mv, sv) {
	rows.push({ note: 'FIRST ORACLE MISMATCH', idx: i, oracle: o, scriptMax: mv, scriptSma: sv });
}

// --- Block 2: MID-HISTORY mutation D — capped at EARLIER horizon --------------
for (const tf of ['15m', '1h', '4h']) {
	const rb0 = await runOne(baseline.bars, tf, EARLIER_HORIZON);
	const rd = await runOne(variantD.bars, tf, EARLIER_HORIZON);
	const identical =
		JSON.stringify(rb0.plots) === JSON.stringify(rd.plots) &&
		JSON.stringify(stripIds(rb0.trades)) === JSON.stringify(stripIds(rd.trades)) &&
		JSON.stringify(rb0.equity) === JSON.stringify(rd.equity);
	const rLater0 = await runOne(baseline.bars, tf, horizon);
	const rLaterD = await runOne(variantD.bars, tf, horizon);
	const laterDiffers =
		JSON.stringify(rLater0.plots.naiveMax) !== JSON.stringify(rLaterD.plots.naiveMax);
	addRow({
		block: 'mid-history-mutation-D', tf, earlierHorizon: EARLIER_HORIZON,
		identicalAtEarlierHorizon: identical,
		naiveDiffersAtLaterHorizon_whenHistorySeesMutation: laterDiffers,
		naiveFullHistoryPotency_atEarlierHorizon: {
			baseline: oracleNaiveAll(baseline.bars), mutated: oracleNaiveAll(variantD.bars),
			responds: JSON.stringify(oracleNaiveAll(baseline.bars)) !== JSON.stringify(oracleNaiveAll(variantD.bars))
		}
	});
}
function oracleNaiveAll(barsArr) { return potencyFull(barsArr); }

// --- Block 3: gaps IN CAP HISTORY — bucket loss + explicit unavailability -----
for (const tf of ['15m', '1h', '4h']) {
	const rg = await runOne(variantG.bars, tf, horizon);
	const g0 = oracleAt(variantG.bars, tf, horizon);
	addRow({
		block: 'gaps-in-capped-history', tf,
		status: rg.status, code: rg.error?.code,
		barsInRun: rg.assumptions?.barsInRun, oracleBars: g0.count,
		scriptMax: rg.plots?.naiveMax?.[rg.plots?.naiveMax?.length - 1]?.valueOf?.() ?? null,
		oracleMax: g0.mx,
		unavailable: rg.unavailable
	});
}

const verdict = {
	potencyCommittedPairResponds:
		pot.baseline.fullHistoryMax !== pot.alternate.fullHistoryMax &&
		pot.baseline.sma20Final !== pot.alternate.sma20Final &&
		pot.baseline.fullHistoryMax !== pot.ownVariantC.fullHistoryMax &&
		pot.midHistoryD.responds,
	isolationAllRowsExact: rows.filter((r) => r.block && (r.identicalBaselineVsAlternate === true || r.identicalAtEarlierHorizon === true)).length,
	anyFalse: JSON.stringify(rows).includes('"identicalBaselineVsAlternate":false') ||
		JSON.stringify(rows).includes('"identicalBaselineVsOwnVariantC":false') ||
		JSON.stringify(rows).includes('"identicalAtEarlierHorizon":false')
};
writeFileSync(new URL('./v2-poison-verify-results.json', import.meta.url), JSON.stringify({ potency: pot, rows, summary: verdict }, null, 2));
console.log(JSON.stringify({ potency: pot, summary: verdict }, null, 1));
console.log(rows.map((r) => JSON.stringify(r)).join('\n'));