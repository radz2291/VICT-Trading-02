// avc-p4.mjs — FALSIFICATION ATTEMPT 4a: FAILED-WRITE TABLE (regression)
// 17 rows: {refuse -> WRITE_REFUSED, throw -> PORT_ERROR} x {start, step,
// createLevel, removeLevel, play, pause, returnToCurrent} + reset(removal
// throw) + restore x2. Each row asserts: refused, truthful code, live state
// bitwise-unchanged (incl. clock op-log length), stored bytes unchanged, NO
// event emitted. Plus recovery: heal -> ghost op absent, real op lands, fresh
// session adopts exactly the last successful write.
import { writeFileSync } from 'node:fs';
import { createReplayClock, ReplaySession } from '@vict-trading/trading-kit';
import { T0, BASE, loadFixture, BasicPort, same } from './avc-harness.mjs';

const fixture = loadFixture();
const HORIZON = fixture.horizonInstant;
const results = { probe: 'avc-p4 failed-write table', rows: [], allPass: true, notApplicable: [] };
results.notApplicable.push('reset(removal) under ok:false — the remove() contract has no ok:false channel; throw is the only removal failure shape');

function snap(clock, sess) {
	return JSON.stringify({
		instant: clock.now(),
		step: sess.currentStep(),
		levels: sess.levelsAll(),
		playing: sess.isPlaying,
		returnedToCurrent: sess.hasReturnedToCurrent,
		clockOps: clock.records().length
	});
}

async function healthyCtx() {
	const clock = createReplayClock({ horizon: HORIZON, start: T0 });
	const port = new BasicPort();
	const events = [];
	const sess = new ReplaySession({ clock, persistence: port }, { onEvent: (e) => events.push(e), genId: (() => { let i = 0; return () => 'avc-lvl-' + String(++i).padStart(3, '0'); })() });
	sess.acknowledgeState(port.read());
	const s1 = await sess.start(T0);
	const s2 = s1.ok ? await sess.step(BASE) : null;
	const s3 = s2 && s2.ok ? await sess.step(BASE) : null;
	const s4 = s3 && s3.ok ? await sess.createLevel(2650, 'healthy') : null;
	if (!s4 || !s4.ok) throw new Error('healthyCtx setup failed');
	return { clock, port, sess, events };
}

const OPS = {
	start: (ctx) => ctx.sess.start(T0 + 3600),
	step: (ctx) => ctx.sess.step(BASE),
	createLevel: (ctx) => ctx.sess.createLevel(2649, 'failing'),
	removeLevel: (ctx) => ctx.sess.removeLevel(ctx.sess.levelsAll()[0].id),
	play: (ctx) => ctx.sess.play(),
	pause: (ctx) => ctx.sess.pause(),
	returnToCurrent: (ctx) => ctx.sess.returnToCurrent()
};

for (const failMode of ['refuse', 'throw']) {
	for (const opName of Object.keys(OPS)) {
		const ctx = await healthyCtx();
		ctx.port.writeMode = failMode;
		const before = snap(ctx.clock, ctx.sess);
		const beforeBytes = ctx.port.bytes;
		const beforeEvents = ctx.events.length;
		const r = await OPS[opName](ctx);
		const after = snap(ctx.clock, ctx.sess);
		const expectedCode = failMode === 'refuse' ? 'WRITE_REFUSED' : 'PORT_ERROR';
		const row = {
			failMode, op: opName,
			refused: r.ok === false,
			code: r.code,
			codeTruthful: r.code === expectedCode,
			stateBeforeEqualsAfter: before === after,
			bytesBeforeEqualsAfter: beforeBytes === ctx.port.bytes,
			opLogUnchanged: JSON.parse(after).clockOps === JSON.parse(before).clockOps,
			noEventEmitted: ctx.events.length === beforeEvents
		};
		row.pass = row.refused && row.codeTruthful && row.stateBeforeEqualsAfter && row.bytesBeforeEqualsAfter && row.opLogUnchanged && row.noEventEmitted;
		if (!row.pass) results.allPass = false;
		results.rows.push(row);
	}
}

// reset — transactional removal (throw is the only failure shape)
{
	const ctx = await healthyCtx();
	ctx.port.removeMode = 'throw';
	const before = snap(ctx.clock, ctx.sess);
	const beforeBytes = ctx.port.bytes;
	const beforeEvents = ctx.events.length;
	const r = await ctx.sess.reset();
	const after = snap(ctx.clock, ctx.sess);
	const row = {
		failMode: 'throw(remove)', op: 'reset',
		refused: r.ok === false,
		code: r.code,
		codeTruthful: r.code === 'PORT_ERROR',
		stateBeforeEqualsAfter: before === after,
		bytesBeforeEqualsAfter: beforeBytes === ctx.port.bytes,
		opLogUnchanged: JSON.parse(after).clockOps === JSON.parse(before).clockOps,
		noEventEmitted: ctx.events.length === beforeEvents
	};
	row.pass = row.refused && row.codeTruthful && row.stateBeforeEqualsAfter && row.bytesBeforeEqualsAfter && row.opLogUnchanged && row.noEventEmitted;
	if (!row.pass) results.allPass = false;
	results.rows.push(row);
}

// restore — transactional write-first under failing writes (reload simulation:
// fresh session at clock start; stored record at step 3; restore refused/failing
// must leave the fresh session untouched and bytes intact)
for (const failMode of ['refuse', 'throw']) {
	const ctx = await healthyCtx();
	ctx.port.writeMode = failMode;
	const clock2 = createReplayClock({ horizon: HORIZON, start: T0 });
	const sess2 = new ReplaySession({ clock: clock2, persistence: ctx.port }, { genId: () => 'avc-lvl-x' });
	sess2.acknowledgeState(null);
	const pre = snap(clock2, sess2);
	const preBytes = ctx.port.bytes;
	const r = await sess2.restore();
	const post = snap(clock2, sess2);
	const expectedCode = failMode === 'refuse' ? 'WRITE_REFUSED' : 'PORT_ERROR';
	const row = {
		failMode, op: 'restore',
		refused: r.ok === false,
		code: r.code,
		codeTruthful: r.code === expectedCode,
		stateBeforeEqualsAfter: pre === post,
		bytesBeforeEqualsAfter: preBytes === ctx.port.bytes,
		opLogUnchanged: JSON.parse(post).clockOps === JSON.parse(pre).clockOps,
		noEventEmitted: true
	};
	row.pass = row.refused && row.codeTruthful && row.stateBeforeEqualsAfter && row.bytesBeforeEqualsAfter;
	if (!row.pass) results.allPass = false;
	results.rows.push(row);
}

// recovery: heal -> ghost op never persisted; real op lands; fresh session
// adopts the last successful write EXACTLY (levels, step, instant)
{
	const ctx = await healthyCtx();
	ctx.port.writeMode = 'refuse';
	await ctx.sess.createLevel(1, 'ghost'); // refused — must appear nowhere
	ctx.port.writeMode = 'ok';
	await ctx.sess.createLevel(2650.7, 'real');
	const record = JSON.parse(ctx.port.bytes);
	const clock2 = createReplayClock({ horizon: HORIZON, start: record.instant });
	const sess2 = new ReplaySession({ clock: clock2, persistence: ctx.port }, { genId: () => 'avc-lvl-y' });
	sess2.acknowledgeState(ctx.port.read());
	const recovery = {
		op: 'recovery',
		ghostLevelAbsent: record.levels.every((l) => l.note !== 'ghost'),
		realLevelPresent: record.levels.some((l) => l.note === 'real'),
		recordStepMatchesLive: record.stepIndex === ctx.sess.currentStep(),
		recordInstantMatchesLive: record.instant === ctx.clock.now(),
		reloadLevelsExact: same(sess2.levelsAll(), ctx.sess.levelsAll()),
		reloadStepExact: sess2.currentStep() === record.stepIndex
	};
	recovery.pass = recovery.ghostLevelAbsent && recovery.realLevelPresent && recovery.recordStepMatchesLive && recovery.recordInstantMatchesLive && recovery.reloadLevelsExact && recovery.reloadStepExact;
	if (!recovery.pass) results.allPass = false;
	results.rows.push(recovery);
}

results.summary = {
	rows: results.rows.length,
	pass: results.rows.filter((r) => r.pass).length,
	fail: results.rows.filter((r) => !r.pass).length,
	allPass: results.allPass
};
writeFileSync('avc-p4-results.json', JSON.stringify(results, null, 2));
console.log('avc-p4 allPass:', results.allPass, `(${results.summary.pass}/${results.summary.rows} rows)`);
for (const r of results.rows) if (!r.pass) console.log('FAIL:', JSON.stringify(r).slice(0, 500));
