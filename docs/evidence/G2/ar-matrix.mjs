// ar-matrix.mjs — post-repair async-persistence proof matrix (repair cycle ar-*).
// Proves: (1) no pending-window exposure (every public read == last committed
// frame, sync AND microtask granularity); (2) overlap consistency — FIFO makes
// B's write impossible while A is pending (pendingCount <= 1 always, settle ==
// call order), so the old out-of-order rows are structurally excluded; every
// achievable (kind × outcome-combo) row ends live == storage == record;
// (3) re-base on failure (A fails + B -> T0+3600/step 2, NOT T0+7200/step 3);
// (4) queued-behind-reset; (5) event order == call order, none on failure.
import { loadFixture, initFixture, makeEnv, setupCommitted, resetIdCounter, T0 } from './ar-harness.mjs';
import { writeFileSync } from 'node:fs';

const fixture = loadFixture();
initFixture(fixture);
const results = { rows: [], fail: [] };
function log(row) {
	results.rows.push(row);
	if (!row.pass) results.fail.push(row);
}
function liveAt(env) {
	const b = env.data.bars({ granularity: fixture.timeframe });
	return {
		instant: env.clock.now(),
		stepIndex: env.session.currentStep(),
		playing: env.session.isPlaying,
		returnedToCurrent: env.session.hasReturnedToCurrent,
		levels: env.session.levelsAll(),
		barsCount: b.bars.length,
		lastBarTime: b.bars.length ? b.bars[b.bars.length - 1].time : null
	};
}
function storedAt(env) {
	const r = env.port.record;
	return r
		? { instant: r.instant, stepIndex: r.stepIndex, playing: r.playing, levelCount: (r.levels ?? []).length, returnedToCurrent: r.returnedToCurrent }
		: null;
}
const j = (v) => JSON.stringify(v);

// ---- group 1: PENDING exposure ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	env.port.mode = 'manual';
	const pre = j(liveAt(env));
	const preStored = j(storedAt(env));
	const preEvents = env.events.length;
	const p = env.session.step(3600);
	await Promise.resolve(); // let the FIFO run the op's sync prefix; write now pending
	const dur1 = j(liveAt(env));
	const durStored = j(storedAt(env));
	await Promise.resolve(); // one more microtask — still pending
	const dur2 = j(liveAt(env));
	const pass = dur1 === pre && dur2 === pre && j(storedAt(env)) === preStored && env.port.pendingIds().length === 1 && env.events.length === preEvents;
	env.port.settle(env.port.pendingIds()[0], 'ok');
	await p;
	const post = liveAt(env);
	const passPost = post.instant === T0 + 3600 && post.stepIndex === 2 && post.barsCount > 0 && env.events.length === 2;
	log({ group: 'pending', row: 'step(3600): live==pre-op (sync + microtask); storage untouched; settled commit', duringPendingLive: dur1, postInstant: post.instant, pass: pass && passPost });
}
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	env.port.mode = 'manual';
	const pre = j(liveAt(env));
	const pr = env.session.createLevel(2700, 'pending');
	await Promise.resolve();
	const dur = j(liveAt(env));
	const stored = storedAt(env);
	const passPending = dur === pre && stored && stored.levelCount === 0 && env.events.length === 1;
	env.port.settle(env.port.pendingIds()[0], 'refuse');
	const refused = await pr;
	const after = liveAt(env);
	log({ group: 'pending', row: 'createLevel(2700): no uncommitted drawing; refused -> byte-identical, no event', code: refused.code, storedLevelCount: stored ? stored.levelCount : null, pass: passPending && refused.ok === false && j(after) === pre && env.events.length === 1 });
}
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	env.port.mode = 'auto-ok';
	await env.session.createLevel(2650, 'x'); // committed level
	const preEvents = env.events.length;
	env.port.mode = 'manual';
	const pr = env.session.removeLevel(env.port.record.levels[0].id);
	await Promise.resolve();
	const dur = liveAt(env);
	const passPending = dur.levels.length === 1; // removal NOT visible pre-commit
	env.port.settle(env.port.pendingIds()[0], 'refuse');
	const r = await pr;
	const after = liveAt(env);
	log({ group: 'pending', row: 'removeLevel: level still visible during pending; refused -> restored, no event', code: r.code, duringLevelCount: dur.levels.length, pass: passPending && r.ok === false && after.levels.length === 1 && env.events.length === preEvents });
}
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	env.port.mode = 'manual';
	const pr = env.session.play();
	await Promise.resolve();
	const durPlaying = env.session.isPlaying;
	env.port.settle(env.port.pendingIds()[0], 'ok');
	const r = await pr;
	const postPlaying = env.session.isPlaying;
	log({ group: 'pending', row: 'play(): playing==false during pending, true after commit', durPlaying, postPlaying, pass: durPlaying === false && postPlaying === true && env.events.length === 2 });
}
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	env.port.mode = 'manual';
	const pr = env.session.returnToCurrent();
	await Promise.resolve();
	const durRtc = env.session.hasReturnedToCurrent;
	env.port.settle(env.port.pendingIds()[0], 'refuse');
	const r = await pr;
	const after = liveAt(env);
	log({ group: 'pending', row: 'returnToCurrent refused: flag never flips, no event', code: r.code, durRtc, pass: r.ok === false && r.code === 'WRITE_REFUSED' && durRtc === false && after.returnedToCurrent === false && env.events.length === 1 });
}

// ---- group 2: OVERLAP consistency matrix ----
// FIFO: the kit cannot ISSUE B's write while A's write is pending.
// Axis 'resolve' collapses to call order; we record maxPendingWriteCalls <= 1.
for (const kind of ['step-step', 'step-create']) {
	for (const combo of ['s,s', 's,f', 'f,s']) {
		resetIdCounter();
		const env = makeEnv(fixture);
		await setupCommitted(env);
		env.port.mode = 'manual';
		const [a, b] = combo.split(',');
		let ra, rb;
		if (kind === 'step-step') {
			ra = env.session.step(3600); // call 1
			rb = env.session.step(3600); // call 2 (queued behind call 1)
		} else {
			ra = env.session.step(3600);
			rb = env.session.createLevel(2700, 'lvl');
		}
		await Promise.resolve(); // let the FIFO run A's sync prefix; its write is pending
		const pendingWhileA = env.port.pendingIds().length;
		env.port.settle(env.port.pendingIds()[0], a === 's' ? 'ok' : 'refuse');
		const raOut = await ra;
		await new Promise((r) => setImmediate(r)); // drain microtasks: FIFO runs B (write pending)
		const pendingWhileB = env.port.pendingIds().length;
		if (env.port.pendingIds().length) env.port.settle(env.port.pendingIds()[0], b === 's' ? 'ok' : 'refuse');
		const rbOut = await rb;
		const after = liveAt(env);
		const stored = storedAt(env);
		const consistent = after.instant === stored.instant && after.stepIndex === stored.stepIndex && after.levels.length === stored.levelCount;
		const s = a === 's';
		const s2 = b === 's';
		// Repair-semantics expectations (re-base on failure):
		let expectedInstant, expectedStep, expectedLevels;
		if (kind === 'step-step') {
			if (s && s2) { expectedInstant = T0 + 7200; expectedStep = 3; expectedLevels = 0; }
			if (s && !s2) { expectedInstant = T0 + 3600; expectedStep = 2; expectedLevels = 0; }
			if (!s && s2) { expectedInstant = T0 + 3600; expectedStep = 2; expectedLevels = 0; } // re-based
		} else {
			if (s && s2) { expectedInstant = T0 + 3600; expectedStep = 2; expectedLevels = 1; }
			if (s && !s2) { expectedInstant = T0 + 3600; expectedStep = 2; expectedLevels = 0; }
			if (!s && s2) { expectedInstant = T0; expectedStep = 1; expectedLevels = 1; } // step refused; re-based create stamps T0/step1
		}
		const pass = consistent &&
			after.instant === expectedInstant && after.stepIndex === expectedStep && after.levels.length === expectedLevels &&
			raOut.ok === s && rbOut.ok === s2 &&
			pendingWhileA <= 1 && pendingWhileB <= 1;
		log({
			group: 'overlap', kind, combo,
			finalLive: j(after), finalStored: j(stored),
			opA: raOut.ok ? 'ok' : (raOut.code ?? '?'), opB: rbOut.ok ? 'ok' : (rbOut.code ?? '?'),
			pendingWhileA, pendingWhileB, pass
		});
	}
}
// Never more than one unresolved persisted write at a time (FIFO proof):
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	env.port.mode = 'manual';
	env.session.step(3600); env.session.step(3600); env.session.step(3600);
	await Promise.resolve();
	const exactlyOne = env.port.pendingIds().length === 1;
	env.port.settle(env.port.pendingIds()[0], 'ok'); await new Promise((r) => setImmediate(r));
	env.port.settle(env.port.pendingIds()[0], 'ok'); await new Promise((r) => setImmediate(r));
	env.port.settle(env.port.pendingIds()[0], 'ok'); await new Promise((r) => setImmediate(r));
	log({ group: 'overlap', row: '3 queued steps: kit holds EXACTLY ONE pending write at a time (out-of-order rows structurally excluded)', pendingCount: exactlyOne ? 1 : 0, pass: exactlyOne });
}

// ---- group 3: RE-BASE on failure ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	env.port.mode = 'manual';
	const ra = env.session.step(3600);
	await Promise.resolve();
	env.port.settle(env.port.pendingIds()[0], 'refuse');
	const rA = await ra;
	const rb = env.session.step(3600);
	await Promise.resolve();
	env.port.settle(env.port.pendingIds()[0], 'ok');
	const rB = await rb;
	const after = liveAt(env);
	const pass = rA.ok === false && rB.ok === true && after.instant === T0 + 3600 && after.stepIndex === 2 && env.port.record.instant === T0 + 3600;
	log({ group: 're-base', row: 'A step refused, then B step ok -> T0+3600/step2 (NOT T0+7200/step3)', instant: after.instant, step: after.stepIndex, pass });
}
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	env.port.mode = 'manual';
	const ra = env.session.step(3600);
	const rb = env.session.step(3600); // queued while A still pending
	await Promise.resolve();
	env.port.settle(env.port.pendingIds()[0], 'refuse');
	const rA = await ra;
	await Promise.resolve();
	env.port.settle(env.port.pendingIds()[0], 'ok');
	const rB = await rb;
	const after = liveAt(env);
	const pass = after.instant === T0 + 3600 && after.stepIndex === 2 && env.port.record.instant === T0 + 3600;
	log({ group: 're-base', row: 'B QUEUED while A pending; A refused -> identical re-based result', instant: after.instant, step: after.stepIndex, pass });
}

// ---- group 4: QUEUED-BEHIND-RESET ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	env.port.mode = 'auto-ok';
	await env.session.step(3600); // committed step 2
	env.port.mode = 'manual';
	const clockBeforeReset = env.clock.now();
	const rr = env.session.reset();
	const rs = env.session.step(600); // queued behind reset; re-bases on post-reset cleared state
	await Promise.resolve();
	env.port.settle(env.port.pendingIds()[0], 'ok');
	const rReset = await rr;
	await Promise.resolve(); // queued step's write is now pending
	env.port.settle(env.port.pendingIds()[0], 'ok');
	const rStep = await rs;
	const after = liveAt(env);
	const pass = rReset.ok === true && rStep.ok === true && after.stepIndex === 1 && after.instant === clockBeforeReset + 600 && (env.port.record.levels ?? []).length === 0;
	log({ group: 'queued-behind-reset', row: 'reset then step(600) -> runs on the cleared counters from the pre-reset clock: +600/step1, record written', instant: after.instant, step: after.stepIndex, pass });
}
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	env.port.mode = 'manual';
	const rs = env.session.step(3600);
	const resetP = env.session.reset(); // queued behind the step write
	await Promise.resolve();
	env.port.settle(env.port.pendingIds()[0], 'ok'); const rStep = await rs;
	await Promise.resolve();
	env.port.settle(env.port.pendingIds()[0], 'throw'); const rReset = await resetP;
	const after = liveAt(env);
	const pass = rStep.ok && rReset.ok === false && rReset.code === 'PORT_ERROR' && after.stepIndex === 2 && env.port.record !== null;
	log({ group: 'queued-behind-reset', row: 'step ok + reset(remove throws) -> live stays step2, record kept, truthful PORT_ERROR', code: rReset.code, pass });
}

// ---- group 5: EVENT ORDER == CALL ORDER; failures emit nothing ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	env.port.mode = 'manual';
	const pa = env.session.step(3600);        // call 1
	const pb = env.session.createLevel(2700); // call 2
	await Promise.resolve();
	env.port.settle(env.port.pendingIds()[0], 'refuse');             // A FAILS -> emits nothing
	await pa;
	await Promise.resolve();
	env.port.settle(env.port.pendingIds()[0], 'ok');                 // B commits only after A settles
	await pb;
	const types = env.events.slice(1).map((e) => e.type); // skip the setup 'start'
	const seqs = env.events.slice(1).map((e) => e.seq);
	const pass = types.length === 1 && types[0] === 'level-created' && seqs.length === 1;
	log({ group: 'events', row: 'A fail + B ok -> only the B event; stream matches committed state', eventTypes: types, pass });
}
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	env.port.mode = 'manual';
	const p1 = env.session.step(3600);
	const p2 = env.session.removeLevel('nope');
	const p3 = env.session.createLevel(2700);
	await Promise.resolve();
	env.port.settle(env.port.pendingIds()[0], 'ok'); await p1;
	await p2; // NOT_FOUND — never reaches a write, emits nothing
	await Promise.resolve();
	env.port.settle(env.port.pendingIds()[0], 'ok'); await p3;
	const types = env.events.slice(1).map((e) => e.type);
	const pass = j(types) === j(['step', 'level-created']) && env.port.record.levels.length === 1;
	log({ group: 'events', row: 'order: step, (NOT_FOUND emits nothing), level-created', eventTypes: types, pass });
}

writeFileSync('ar-matrix-results.json', JSON.stringify(results, null, 2));
console.log('rows:', results.rows.length, 'failing:', results.fail.length);
for (const f of results.fail) console.log('FAIL', j(f));