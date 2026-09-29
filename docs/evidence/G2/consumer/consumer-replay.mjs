// Independent external consumer — OWN data (different instrument/cadence),
// OWN storage adapter (Map + JSON file), full replay lifecycle.
import {
	createReplayClock, createDataSession, ReplaySession, visibilityAt, visibilityInReplay
} from '@vict-trading/trading-kit';
import { writeFileSync, readFileSync, existsSync } from 'fs';

// ---- OWN data: synthetic EURUSD-like series, 15m, 50 bars + a gap ----------
const bars = [];
let p = 1.0850;
for (let i = 0; i < 50; i++) {
	if (i === 20 || i === 21) continue; // deliberate gap
	bars.push({ time: 1_760_000_000 + i * 900, open: p, high: p + 0.0004, low: p - 0.0004, close: p + 0.0002 });
	p += 0.0002;
}
const HORIZON = 1_760_000_000 + 40 * 900; // replay can never pass bar 40

// ---- OWN storage adapter (app-equivalent read-before-write + verify) ------
const FILE = './session.json';
const adapter = {
	read: () => (existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : null),
	write: async (rec) => { const s = JSON.stringify(rec); writeFileSync(FILE, s); return readFileSync(FILE, 'utf8') === s ? { ok: true } : { ok: false, code: 'VERIFY_FAILED', message: 'read-back mismatch' }; },
	remove: () => { try { require('fs').unlinkSync(FILE); } catch {} }
};
// (unlink via fs.promises to stay ESM-clean)
import { unlinkSync } from 'fs';
adapter.remove = () => { try { unlinkSync(FILE); } catch {} };

const out = {};
// 1. refusal before read acknowledgment
{
	const clock = createReplayClock({ horizon: HORIZON, start: bars[0].time });
	const session = new ReplaySession({ clock, persistence: adapter });
	const r = await session.step(900);
	out.refusalBeforeRead = r; // expect READ_NOT_ACKNOWLEDGED
}
// 2. lifecycle
const clock = createReplayClock({ horizon: HORIZON, start: bars[0].time });
const data = createDataSession({ clock, source: { bars }, rules: { symbol: 'EURUSD', baseTimeframe: '15m' } });
const session = new ReplaySession({ clock, persistence: adapter });
session.acknowledgeState(adapter.read());
await session.start(bars[10].time);
const q1 = data.bars({ until: null, granularity: '15m' });
const qOverClock = data.bars({ until: clock.now() + 3600 });   // direct future query
const qOverHorizon = data.bars({ until: HORIZON + 86400 });    // beyond the horizon
out.capChecks = {
	overClock: { requested: qOverClock.requestedUntil, served: qOverClock.servedUntil, capped: qOverClock.capped, recordedCap: data.queryRecords().some(r => r.requestedUntil > r.servedUntil) },
	overHorizon: { served: qOverHorizon.servedUntil, capped: qOverHorizon.capped, clockNow: clock.now(), servedEqualsClockNow: qOverHorizon.servedUntil === clock.now() }
};
await session.step(900); await session.step(900); await session.step(900);
const created = await session.createLevel(1.0856, 'resistance');
const lvl = { id: created.id, provenance: 'replay-stamped', creationInstant: clock.now(), creationStep: session.currentStep() };
out.visibility = {
	atCreation: visibilityInReplay(lvl, clock).visible,
	oneStepBefore: visibilityAt(lvl, { mode: 'replay', currentStep: session.currentStep() - 1, now: clock.now() - 900 }).visible,
	unknownHiddenInReplay: visibilityInReplay({ id: 'z', provenance: 'provenance-unknown' }, clock).visible
};
out.htf = {
	baseBars: data.bars({ granularity: '15m' }).bars.length,
	oneHourBars: data.bars({ granularity: '1h' }).bars.length,
	missing: data.availabilityAt()
};
out.persisted = adapter.read();
await session.step(900);
// 3. restore lifecycle in a FRESH session (simulating reload)
const clock2 = createReplayClock({ horizon: HORIZON, start: bars[0].time });
const session2 = new ReplaySession({ clock: clock2, persistence: adapter });
session2.acknowledgeState(adapter.read());
const rs = await session2.restore();
const fresh = adapter.read(); // the LAST persisted state (after the final step)
out.restore = {
	ok: rs.ok,
	instantMatches: clock2.now() === fresh.instant,
	stepMatches: session2.currentStep() === fresh.stepIndex,
	levelRestored: session2.levelsAll().length === 1,
	restoredInstant: clock2.now(),
	restoredStep: session2.currentStep()
};
writeFileSync('consumer-results.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
const fail =
	out.refusalBeforeRead.code !== 'READ_NOT_ACKNOWLEDGED' ||
	!out.capChecks.overClock.capped || !out.capChecks.overClock.recordedCap ||
	!out.capChecks.overHorizon.servedEqualsClockNow ||
	!out.visibility.atCreation || out.visibility.oneStepBefore || out.visibility.unknownHiddenInReplay ||
	!out.restore.ok || !out.restore.instantMatches || !out.restore.stepMatches || !out.restore.levelRestored;
process.exit(fail ? 1 : 0);
