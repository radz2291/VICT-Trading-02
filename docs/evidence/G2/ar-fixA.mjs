// cc2 FIX A harness — future-free availability (owner's clock-visible-only ruling)
// Two sources with IDENTICAL bars available at each chosen clock (full committed
// fixture vs post-clock-remainder-deleted variant, built programmatically):
// every public output must be IDENTICAL across the two sources.
import { readFileSync, writeFileSync } from 'fs';
import { createReplayClock, createDataSession, TF_SECONDS } from '@vict-trading/trading-kit';

const fixture = JSON.parse(readFileSync('fixture.json', 'utf8'));
const full = fixture.bars.map((b) => ({ ...b }));
const BASE = 900; // 15m
const HORIZON = fixture.horizonInstant;

function fmt(t) { return new Date(t * 1000).toISOString().replace('.000Z', 'Z'); }

function makeSource(bars) { return { bars }; }

// clock instants: mid-gap 04:15Z, 04:14:30Z, at-close-edge, strictly > lastClose, horizon, plus extra
const CLOCKS = [
  Math.floor(Date.parse('2026-01-05T04:15:00Z') / 1000),
  Math.floor(Date.parse('2026-01-05T04:14:30Z') / 1000),
  Math.floor(Date.parse('2026-01-05T05:00:00Z') / 1000),
  Math.floor(Date.parse('2026-01-05T06:00:00Z') / 1000),
  Math.floor(Date.parse('2026-01-05T07:15:00Z') / 1000),
  Math.floor(Date.parse('2026-01-08T06:00:00Z') / 1000),
  HORIZON,
  // one instant strictly > the very last available close for the horizon clock:
  HORIZON - BASE + 0.5 // mid-slot after last available close, still ≤ horizon
].filter((t) => t <= HORIZON);

function buildClock(t) { return createReplayClock({ horizon: HORIZON, start: t }); }

function availablePrefix(barsIn, t) {
  const bars = Array.isArray(barsIn) ? barsIn : barsIn.bars;
  return bars.filter((b) => b.time + BASE <= t);
}

// own oracle from clock-visible info: interior gaps between consecutive
// available bars; trailing open-ended iff lastAvailableClose < now
function oracleAvailability(bars, t) {
  const avail = availablePrefix(bars, t);
  const out = [];
  for (let i = 1; i < avail.length; i++) {
    const gapFrom = avail[i - 1].time + BASE;
    if (avail[i].time > gapFrom) out.push({ status: 'missing', from: gapFrom, to: avail[i].time });
  }
  if (avail.length > 0) {
    const lastClose = avail[avail.length - 1].time + BASE;
    if (lastClose < t) out.push({ status: 'missing', from: lastClose, to: null });
  }
  return out;
}

function sliceStats(bars, g, t) {
  const factor = TF_SECONDS[g] / BASE;
  const avail = availablePrefix(bars, t);
  if (factor === 1) {
    const mx = Math.max(...avail.map((b) => b.high));
    const c = avail.slice(-20).map((b) => b.close);
    return { max: mx, sma20: c.length ? c.reduce((a, b) => a + b, 0) / c.length : NaN };
  }
  const b2 = avail.filter((b) => (Math.floor(b.time / TF_SECONDS[g]) * TF_SECONDS[g]) === (Math.floor((t - (t % TF_SECONDS[g])) ) / 1) * 0 || true);
  // naive max over aggregated slice (complete buckets only, clock-side)
  const bucketSeconds = TF_SECONDS[g];
  const groups = new Map();
  for (const b of avail) {
    const bs = Math.floor(b.time / bucketSeconds) * bucketSeconds;
    if (!groups.has(bs)) groups.set(bs, []);
    groups.get(bs).push(b);
  }
  const agg = [];
  for (const [bs, arr] of groups) {
    if (arr.length === factor) {
      agg.push({ time: bs, open: arr[0].open, close: arr[arr.length - 1].close, high: Math.max(...arr.map((b) => b.high)), low: Math.min(...arr.map((b) => b.low)) });
    }
  }
  const mx = Math.max(...agg.map((b) => b.high));
  const c = agg.slice(-20).map((b) => b.close);
  return { max: mx, sma20: c.length ? c.reduce((a, b) => a + b, 0) / c.length : NaN };
}

function collect(source, t) {
  const clock = buildClock(t);
  const data = createDataSession({ clock, source: makeSource(source.bars), rules: { symbol: 'XAUUSD', baseTimeframe: '15m' } });
  const bars = {};
  for (const g of ['15m', '1h', '4h']) bars[g] = data.bars({ until: null, granularity: g }).bars;
  const stats = {};
  for (const g of ['15m', '1h', '4h']) { const s = bars[g]; const mx = Math.max(...s.map((b) => b.high)); const c = s.slice(-20).map((b) => b.close); stats[g] = { max: mx, sma20: c.length ? c.reduce((a, x) => a + x, 0) / c.length : NaN }; }
  return {
    bars,
    availability: data.availabilityAt(),
    availability15: data.availabilityAt(t),
    queryRecords: data.queryRecords(),
    clockRecords: data.clockRecords(),
    horizon: clock.horizon(),
    now: clock.now(),
    stats
  };
}

const results = { clocks: [], identity: true, potency: {} };

for (const t of CLOCKS) {
  const A = { bars: full };
  const B = { bars: availablePrefix(full, t) }; // post-clock remainder deleted
  const a = collect(A, t);
  const b = collect(B, t);
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const cmp = {
    clock: fmt(t),
    bars15: same(a.bars['15m'], b.bars['15m']),
    bars1h: same(a.bars['1h'], b.bars['1h']),
    bars4h: same(a.bars['4h'], b.bars['4h']),
    availabilityAt: same(a.availability, b.availability),
    queryRecordsStructure: same(a.queryRecords.map(q => ({ ...q, seq: 0 })), b.queryRecords.map(q => ({ ...q, seq: 0 }))),
    clockRecords: same(a.clockRecords, b.clockRecords),
    stats: same(a.stats, b.stats),
    availabilityAtMatchesOracle: same(a.availability, oracleAvailability(A, t)) && same(b.availability, oracleAvailability(B, t))
  };
  const rowOk = Object.values(cmp).every((v) => typeof v !== 'boolean' || v);
  if (!rowOk) results.identity = false;
  results.clocks.push({ ...cmp, ok: rowOk, availabilityA: a.availability, counts: { m15: a.bars['15m'].length } });
}

// POTENCY — naive full-history calculations MUST differ between the two sources
// (proving the identical-available compare is not a null test)
{
  const mx = (bars) => Math.max(...bars.map((b) => b.high));
  const sma = (bars, n) => bars.slice(-n).map((b) => b.close).reduce((a, x) => a + x, 0) / n;
  const A = { bars: full };
  const clockLast = CLOCKS[CLOCKS.length - 2]; // horizon clock for a stable B
  const B = { bars: availablePrefix(full, HORIZON) };
  results.potency = {
    note: 'naive FULL-HISTORY max-high and SMA20 over the identical-available pair: they DIFFER — the compare is over a real future-existence difference',
    maxNaive_full: mx(A.bars),
    maxNaive_prefixAtHorizon: mx(B.bars),
    maxDiffers: mx(A.bars) !== mx(B.bars),
    smaNaive_full: sma(A.bars, 20),
    smaNaive_prefixAtHorizon: sma(B.bars, 20),
    smaDiffers: Math.abs(sma(A.bars, 20) - sma(B.bars, 20)) > 1e-12,
    barCountDiffers: A.bars.length - B.bars.length
  };
  // also at a mid-session clock: naive calc vs clock-visible calc, using clock 06:00Z
  const t6 = CLOCKS[3];
  const B6 = { bars: availablePrefix(full, t6) };
  results.potency.maxNaive_fullAt0600 = mx(A.bars);
  results.potency.maxNaive_prefix0600 = mx(B6.bars);
  results.potency.smaNaive_full = sma(A.bars, 20);
  results.potency.smaNaive_prefix0600 = sma(B6.bars, 20);
}

// focused mutation sweep (prior properties re-run under NEW semantics):
// mutations applied ONLY to bars with close > clock
// (implement sweep cleanly below)
function sweep() {
  const rows = [];
  const tMid = Math.floor(Date.parse('2026-01-05T04:15:00Z') / 1000);
  const T = {
    '04:15Z': tMid, '05:00Z': Math.floor(Date.parse('2026-01-05T05:00:00Z') / 1000),
    '07:15Z': Math.floor(Date.parse('2026-01-05T07:15:00Z') / 1000), horizon: HORIZON
  };
  const muts = [
    ['remove resumption 04:30Z', (bs) => bs.filter((b) => b.time !== Math.floor(Date.parse('2026-01-05T04:30:00Z') / 1000))],
    ['add bar inside gap @04:15Z', (bs) => [...bs.filter((b) => b.time < tMid), { time: tMid, open: 2600, high: 2601, low: 2599, close: 2600.5 }, ...bs.filter((b) => b.time > tMid)]],
    ['remove 04:30Z+04:45Z', (bs) => bs.filter((b) => ![Math.floor(Date.parse('2026-01-05T04:30:00Z') / 1000), Math.floor(Date.parse('2026-01-05T04:45:00Z') / 1000)].includes(b.time))],
    ['change values of bars with close > clock', (bs, clock) => bs.map((b) => (b.time + BASE > clock ? { ...b, high: b.high + 500, close: b.close + 500 } : b))],
    ['remove far-future 07:00Z+07:15Z', (bs) => bs.filter((b) => ![Math.floor(Date.parse('2026-01-05T07:00:00Z') / 1000), Math.floor(Date.parse('2026-01-05T07:15:00Z') / 1000)].includes(b.time))]
  ];
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  for (const [name, m] of muts) {
    for (const [label, t] of Object.entries(T)) {
      const clocked = full.filter((b) => b.time + BASE <= t);
      // applicability FIRST: if the mutation touches ANY bar with close ≤ clock
      // (or is already clock-visible), it reaches the clock-visible region —
      // excluded from the future-only sweep, recorded as not-applicable
      let barsFull = m(full.map((b) => ({ ...b })), t);
      const a1 = new Map(full.map((b) => [b.time, JSON.stringify(b)]));
      const a2 = new Map(barsFull.map((b) => [b.time, JSON.stringify(b)]));
      let touchesVisible = false;
      for (const b of full) if (b.time + BASE <= t && (!a2.has(b.time) || a2.get(b.time) !== a1.get(b.time))) touchesVisible = true;
      for (const b of barsFull) if (!a1.has(b.time) && b.time + BASE <= t) touchesVisible = true;
      if (touchesVisible) {
        rows.push({ name, clock: fmt(t), notApplicable: true, note: 'mutation reaches the clock-visible region at this clock — out of the future-only sweep contract' });
        continue;
      }
      // mutation is future-only at this clock: compare directly (no reversion needed)
      const bars2 = barsFull;
      const base = collect({ bars: full }, t);
      const alt = collect({ bars: bars2 }, t);
      const row = {
        name, clock: fmt(t),
        identityBars15: same(base.bars['15m'], alt.bars['15m']),
        identityBars1h: same(base.bars['1h'], alt.bars['1h']),
        identityBars4h: same(base.bars['4h'], alt.bars['4h']),
        identityAvailabilityAt: same(base.availability, alt.availability),
        identityQueryRecords: same(base.queryRecords.map(q => ({ ...q, seq: 0 })), alt.queryRecords.map(q => ({ ...q, seq: 0 }))),
        identityStats: same(base.stats, alt.stats),
        interiorGapStillReported: alt.availability.filter((g) => g.from === tMid)
      };
      row.ok = row.identityBars15 && row.identityBars1h && row.identityBars4h && row.identityAvailabilityAt && row.identityQueryRecords && row.identityStats;
      rows.push(row);
    }
  }
  return rows;
}
function clocksVisibleJson(m){return JSON.stringify([...m.values()]);}
function clocksVisibleJson0(a){return a;}
function visiblePreserved(bars2, json, t){ return JSON.stringify(bars2.filter((b) => b.time + BASE <= t)) === json; }
results.mutationSweep = sweep();
results.sweepAllOk = results.mutationSweep.filter((r) => !r.notApplicable).every((r) => r.ok);

writeFileSync('cc2-fixA-results.json', JSON.stringify(results, null, 2));
console.log('identity:', results.identity, ' potency differs:', results.potency.maxDiffers, results.potency.smaDiffers, ' sweepAllOk:', results.sweepAllOk);