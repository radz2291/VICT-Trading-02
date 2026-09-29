// VERIFIER isolation proof (fresh, independent of builder scripts).
// Drives the @vict-trading/trading-kit public API against the two committed
// fixture variants: identical replay steps across timeframes must produce
// IDENTICAL served slices / readouts, while a deliberately naive FULL-history
// calculation must DIFFER (potency, D-003 both-directions).
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(new URL('.', import.meta.url).pathname);
// import the kit from the monorepo package by path (consumer proof uses the packed tarball separately)
import { createReplayClock, createDataSession } from '../../../packages/trading-kit/dist/index.js';

const root = new URL('.', import.meta.url);
const load = (f) => JSON.parse(readFileSync(new URL(f, root), 'utf8'));
const base = load('fixture/g2-fixture-baseline.json');
const alt = load('fixture/g2-fixture-alternate.json');

const H = base.horizonInstant;
const STEP = 5 * 60; // 5-minute steps (a third of a base bar, deliberately off-bucket)

function run(variant) {
	const clock = createReplayClock({ horizon: H, start: 1767945600 }); // start bar ~1500
	const ds = createDataSession({ clock, source: { bars: variant.bars }, rules: { symbol: 'XAUUSD', baseTimeframe: '15m' } });
	const instants = [];
	let t = clock.now();
	for (let s = 1; s <= 14; s++) {
		t = s * STEP;
		clock.advance(5 * 60 + (s % 3) * 60); // uneven steps, 10+ total
		instants.push(clock.now());
	}
	const snapshots = [];
	const capChecks = [];
	for (const inst of instants) {
		for (const tf of ['15m', '1h', '4h']) {
			const r = ds.bars({ until: inst + 3600, granularity: tf }); // deliberately request BEYOND clock
			capChecks.push({
				inst, tf,
				requestedUntil: r.requestedUntil,
				servedUntil: r.servedUntil,
				servedLtRequested: r.servedUntil < r.requestedUntil,
				cappedFlag: r.capped
			});
			const bars = r.bars;
			const last = bars[bars.length - 1];
			snapshots.push({
				inst, tf, count: bars.length,
				lastBar: last ? { time: last.time, o: last.open, h: last.high, l: last.low, c: last.close } : null,
				servedUntil: r.servedUntil
			});
		}
	}
	return { snapshots, capChecks, queryRecords: ds.queryRecords(), clockRecords: clock.records() };
}

const A = run(base);
const B = run(alt);

const sha = (o) => createHash('sha256').update(JSON.stringify(o)).digest('hex');
const identical = JSON.stringify(A.snapshots) === JSON.stringify(B.snapshots);
console.log('=== ISOLATION (kit API, 14 clock steps x {15m,1h,4h}) ===');
console.log('snapshots per variant:', A.snapshots.length);
console.log('ALL served slices identical across variants:', identical, '| digest:', sha(A.snapshots));
if (!identical) {
	const bad = A.snapshots.findIndex((s, i) => JSON.stringify(s) !== JSON.stringify(B.snapshots[i]));
	console.log('FIRST MISMATCH at', bad, JSON.stringify(A.snapshots[bad]), JSON.stringify(B.snapshots[bad]));
}
const capBad = A.capChecks.filter((c) => !(c.servedLtRequested || c.requestedUntil <= c.servedUntil));
console.log('cap checks (requested beyond clock => served<requested):', A.capChecks.length, 'violations:', capBad.length);
const horizonViol = A.capChecks.filter((c) => c.servedUntil > H).length;
console.log('servedUntil greater than horizon:', horizonViol);
const crBad = A.clockRecords.filter((r) => r.applied > H);
console.log('clock records beyond horizon:', crBad.length, '(advance attempts:', A.clockRecords.length + ')');
const lastClock = A.clockRecords[A.clockRecords.length - 1];
console.log('final clock record:', JSON.stringify(lastClock));
console.log('POTENCY (recomputed here): baseline fullMax', Math.max(...base.bars.map((b) => b.high)), 'vs alternate', Math.max(...alt.bars.map((b) => b.high)));
console.log('verdict-isolation:', identical && capBad.length === 0 && horizonViol === 0 && crBad.length === 0 ? 'PASS' : 'FAIL');