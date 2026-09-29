// avr-p2.mjs — SANITY probes (verifier-owned): failed writes must be truthful,
// roll back live state EXACTLY, leave stored bytes untouched, emit nothing,
// and a fresh session must adopt exactly the last successful write.
import { writeFileSync } from 'node:fs';
import {
	initFixture, loadFixture, makeEnv, setupCommitted, sample, liveEquals, resetIdCounter, T0
} from './avr-harness.mjs';

const fixture = loadFixture();
initFixture(fixture);
const results = { meta: { T0, purpose: 'pending->failure sanity; one pass, no retries' }, rows: [] };
const row = (name, data) => results.rows.push({ row: name, ...data });

/** Fresh-session adoption check on the SAME port (realistic reload path). */
async function freshAdoption(env) {
	const s2env = makeEnv(fixture, { genId: () => 'avr-adopt' });
	// point the fresh session at the SAME storage
	s2env.port.record = env.port.record;
	s2env.session.acknowledgeState(s2env.port.read());
	s2env.port.mode = 'auto-ok';
	const r = await s2env.session.restore();
	s2env.port.mode = 'manual';
	return {
		ok: r.ok,
		adopted: { instant: s2env.session.currentState().instant, stepIndex: s2env.session.currentStep(), levelCount: s2env.session.levelsAll().length, playing: s2env.session.isPlaying }
	};
}

const preCount = (env) => env.clock.records().length;

// ---- P2-1: step unawaited, write REFUSED ({ok:false}) ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	const pre = sample(env);
	const preLog = preCount(env);
	const p = env.session.step(3600);
	env.port.settle([...env.port.pendingIds()][0], 'refuse');
	const outcome = await p;
	const post = sample(env);
	row('P2-1 step(3600) -> write refused', {
		duringPendingExposureKnown: true,
		outcome,
		rollbackExact: liveEquals(pre, post),
		storedBytesUnchanged: post.storedBytes === pre.storedBytes,
		clockOpLogRestored: preCount(env) === preLog,
		noEventEmitted: post.eventCount === pre.eventCount,
		freshAdoption: await freshAdoption(env)
	});
}

// ---- P2-2: step unawaited, write THREW (PORT_ERROR) ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	const pre = sample(env);
	const preLog = preCount(env);
	const p = env.session.step(3600);
	env.port.settle([...env.port.pendingIds()][0], 'throw');
	const outcome = await p;
	const post = sample(env);
	row('P2-2 step(3600) -> write threw', {
		outcome,
		rollbackExact: liveEquals(pre, post),
		storedBytesUnchanged: post.storedBytes === pre.storedBytes,
		clockOpLogRestored: preCount(env) === preLog,
		noEventEmitted: post.eventCount === pre.eventCount,
		freshAdoption: await freshAdoption(env)
	});
}

// ---- P2-3: createLevel unawaited, write refused ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	const pre = sample(env);
	const p = env.session.createLevel(2700, 'refuse-me');
	env.port.settle([...env.port.pendingIds()][0], 'refuse');
	const outcome = await p;
	const post = sample(env);
	row('P2-3 createLevel -> write refused', {
		outcome,
		rollbackExact: liveEquals(pre, post),
		storedBytesUnchanged: post.storedBytes === pre.storedBytes,
		noEventEmitted: post.eventCount === pre.eventCount,
		freshAdoption: await freshAdoption(env)
	});
}

// ---- P2-4: returnToCurrent unawaited, write refused ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	const pre = sample(env);
	const p = env.session.returnToCurrent();
	env.port.settle([...env.port.pendingIds()][0], 'refuse');
	const outcome = await p;
	const post = sample(env);
	row('P2-4 returnToCurrent -> write refused', {
		outcome,
		rollbackExact: liveEquals(pre, post),
		storedBytesUnchanged: post.storedBytes === pre.storedBytes,
		noEventEmitted: post.eventCount === pre.eventCount,
		freshAdoption: await freshAdoption(env)
	});
}

// ---- P2-5: removeLevel unawaited, write refused ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	env.port.mode = 'auto-ok';
	const created = await env.session.createLevel(2700, 'keep-me');
	env.port.mode = 'manual';
	const pre = sample(env);
	const p = env.session.removeLevel(created.id);
	env.port.settle([...env.port.pendingIds()][0], 'refuse');
	const outcome = await p;
	const post = sample(env);
	row('P2-5 removeLevel -> write refused', {
		outcome,
		rollbackExact: liveEquals(pre, post),
		storedBytesUnchanged: post.storedBytes === pre.storedBytes,
		noEventEmitted: post.eventCount === pre.eventCount
	});
}

// ---- P2-6: reset() with removal REJECTED ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	const pre = sample(env);
	const p = env.session.reset();
	env.port.settle([...env.port.pendingIds()][0], 'throw');
	const outcome = await p;
	const post = sample(env);
	row('P2-6 reset -> removal rejected', {
		outcome,
		liveUnchanged: liveEquals(pre, post),
		storedRecordStillPresent: post.stored !== null && post.stored.instant === T0,
		noEventEmitted: post.eventCount === pre.eventCount
	});
}

// ---- P2-7: restore() with write REFUSED (crafted divergent storage) ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env); // live+stored at T0/1
	env.port.record = {
		version: 1, symbol: fixture.symbol, instant: T0 + 3600, stepIndex: 2, playing: false,
		levels: [{ id: 'avr-craft-2', symbol: fixture.symbol, price: 2700, creationInstant: T0 + 3600, creationStep: 2 }],
		returnedToCurrent: false
	};
	const crafted = JSON.stringify(env.port.record);
	const pre = sample(env);
	const p = env.session.restore();
	env.port.settle([...env.port.pendingIds()][0], 'refuse');
	const outcome = await p;
	const post = sample(env);
	row('P2-7 restore -> write refused', {
		outcome,
		liveUntouched: liveEquals(pre, post),
		storedRecordIntact: post.storedBytes === crafted,
		noEventEmitted: post.eventCount === pre.eventCount
	});
}

// ---- P2-8: restore() success adopts the record exactly ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	env.port.record = {
		version: 1, symbol: fixture.symbol, instant: T0 + 3600, stepIndex: 2, playing: false,
		levels: [{ id: 'avr-craft-3', symbol: fixture.symbol, price: 2700, creationInstant: T0 + 3600, creationStep: 2 }],
		returnedToCurrent: false
	};
	const crafted = JSON.stringify(env.port.record);
	const p = env.session.restore();
	env.port.settle([...env.port.pendingIds()][0], 'ok');
	const outcome = await p;
	const post = sample(env);
	row('P2-8 restore -> success adopts record exactly', {
		outcome: { ok: outcome.ok, restoredInstant: outcome.record?.instant, restoredStepIndex: outcome.record?.stepIndex },
		adopted: { instant: post.stateInstant, stepIndex: post.stepIndex, levelCount: post.levels.length, level: post.levels[0] ?? null, playing: post.playing },
		exactAdoption: post.stateInstant === T0 + 3600 && post.stepIndex === 2 && post.levels.length === 1,
		storedBytesStillCrafted: post.storedBytes === crafted
	});
}

// ---- P2-9: reset() success clears record and live ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	const p = env.session.reset();
	env.port.settle([...env.port.pendingIds()][0], 'ok');
	const outcome = await p;
	const post = sample(env);
	row('P2-9 reset -> success', {
		outcome,
		storedCleared: post.stored === null && post.storedBytes === null,
		liveCleared: { instant: post.stateInstant, stepIndex: post.stepIndex, levels: post.levels.length, playing: post.playing, returnedToCurrent: post.returnedToCurrent }
	});
}

// ---- P2-10: READ_FAILED path — reverify read throws -> refusal, bytes untouched ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	const pre = sample(env);
	env.port.readFail = true; // next read() throws (reverify path)
	const outcome = await env.session.step(3600);
	env.port.readFail = false;
	const post = sample(env);
	row('P2-10 step with induced read failure (reverify)', {
		outcome,
		liveUntouched: liveEquals(pre, post),
		storedBytesUnchanged: post.storedBytes === pre.storedBytes,
		noEventEmitted: post.eventCount === pre.eventCount
	});
}

writeFileSync(new URL('./avr-p2-results.json', import.meta.url), JSON.stringify(results, null, '\t') + '\n');
console.log('P2 done:', results.rows.length, 'rows');
for (const r of results.rows) console.log('-', r.row, '| ok:', r.outcome?.ok, '| code:', r.outcome?.code ?? '-');
