// avr-p1.mjs — PENDING EXPOSURE probes (verifier-owned).
// Question: while a persisted write is PENDING, what do clock.now(),
// currentState().stepIndex, data.bars(), levels, playing expose — and what
// does storage hold? Sampled synchronously after issuing unawaited, after one
// microtask, and after resolution. No retries, one pass, process exits.
import {
	initFixture, loadFixture, makeEnv, setupCommitted, sample, liveEquals, resetIdCounter, T0
} from './avr-harness.mjs';

const fixture = loadFixture();
initFixture(fixture);
const meta = {
	fixture: { symbol: fixture.symbol, timeframe: fixture.timeframe, bars: fixture.bars.length, horizon: fixture.horizonInstant },
	T0,
	T0ISO: new Date(T0 * 1000).toISOString(),
	horizonISO: new Date(fixture.horizonInstant * 1000).toISOString(),
	generatedAt: 'fixed-clock probes — no wall clock used for market time'
};
const results = { meta, rows: [] };

function row(name, data) {
	results.rows.push({ row: name, ...data });
}

// ---- P1-1: unawaited step(3600) — clock/step/bars exposure while pending ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	const pre = sample(env);
	const p = env.session.step(3600); // NOT awaited — write pending in deferred port
	const syncS = sample(env);
	await Promise.resolve(); // one microtask
	const microS = sample(env);
	env.port.settle([...env.port.pendingIds()][0], 'ok');
	const outcome = await p;
	const post = sample(env);
	row('P1-1 step(3600) unawaited — exposure while write pending', {
		pre: { instant: pre.stateInstant, stepIndex: pre.stepIndex, barsCount: pre.barsCount, lastBar: pre.lastBar, stored: pre.stored, eventCount: pre.eventCount },
		syncDuringPending: { instant: syncS.stateInstant, stepIndex: syncS.stepIndex, clockNow: syncS.clockNow, barsCount: syncS.barsCount, lastBar: syncS.lastBar, stored: syncS.stored, eventCount: syncS.eventCount, eventTypes: syncS.eventTypes },
		microDuringPending: { instant: microS.stateInstant, stepIndex: microS.stepIndex, stored: microS.stored },
		exposedNewFrameWhilePending: syncS.stateInstant !== pre.stateInstant || syncS.stepIndex !== pre.stepIndex || syncS.barsCount !== pre.barsCount,
		storedUnchangedDuringPending: syncS.storedBytes === pre.storedBytes,
		outcome,
		post: { instant: post.stateInstant, stepIndex: post.stepIndex, stored: post.stored }
	});
}

// ---- P1-2: unawaited createLevel — drawing exposure while pending ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	const pre = sample(env);
	const p = env.session.createLevel(2700, 'probe');
	const syncS = sample(env);
	env.port.settle([...env.port.pendingIds()][0], 'ok');
	const outcome = await p;
	const post = sample(env);
	row('P1-2 createLevel(2700) unawaited — drawing exposure while pending', {
		pre: { levelCount: pre.levels.length, storedLevelCount: pre.stored.levelCount },
		syncDuringPending: { levelCount: syncS.levels.length, level: syncS.levels[0] ?? null, storedLevelCount: syncS.stored.levelCount, eventCount: syncS.eventCount },
		exposedNewDrawingWhilePending: syncS.levels.length !== pre.levels.length,
		storedUnchangedDuringPending: syncS.storedBytes === pre.storedBytes,
		outcome,
		post: { levelCount: post.levels.length, storedLevelCount: post.stored.levelCount }
	});
}

// ---- P1-2b: createLevel then write REFUSED — rollback exactness ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	const pre = sample(env);
	const p = env.session.createLevel(2700, 'probe-refused');
	const syncS = sample(env);
	env.port.settle([...env.port.pendingIds()][0], 'refuse');
	const outcome = await p;
	const post = sample(env);
	row('P1-2b createLevel unawaited then write refused', {
		syncDuringPending: { levelCount: syncS.levels.length, storedLevelCount: syncS.stored.levelCount },
		outcome,
		rollbackExact: liveEquals(pre, post),
		storedBytesUnchanged: post.storedBytes === pre.storedBytes,
		postLevelCount: post.levels.length
	});
}

// ---- P1-3: unawaited play() — transport flag exposure while pending ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	const pre = sample(env);
	const p = env.session.play();
	const syncS = sample(env);
	env.port.settle([...env.port.pendingIds()][0], 'ok');
	const outcome = await p;
	const post = sample(env);
	row('P1-3 play() unawaited — playing flag exposure while pending', {
		pre: { playing: pre.playing, storedPlaying: pre.stored.playing },
		syncDuringPending: { playing: syncS.playing, storedPlaying: syncS.stored.playing, eventCount: syncS.eventCount },
		exposedPlayingWhilePending: syncS.playing !== pre.playing,
		storedUnchangedDuringPending: syncS.storedBytes === pre.storedBytes,
		outcome,
		post: { playing: post.playing, storedPlaying: post.stored.playing }
	});
}

// ---- P1-4a: unawaited removeLevel — removal visible pre-commit, rollback on refusal ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	env.port.mode = 'auto-ok';
	const created = await env.session.createLevel(2700, 'to-remove');
	env.port.mode = 'manual';
	const pre = sample(env);
	const p = env.session.removeLevel(created.id);
	const syncS = sample(env);
	env.port.settle([...env.port.pendingIds()][0], 'refuse');
	const outcome = await p;
	const post = sample(env);
	row('P1-4a removeLevel unawaited — level hidden live while write pending; refusal restores', {
		pre: { levelCount: pre.levels.length, storedLevelCount: pre.stored.levelCount },
		syncDuringPending: { levelCount: syncS.levels.length, storedLevelCount: syncS.stored.levelCount },
		removalVisibleWhilePending: syncS.levels.length < pre.levels.length,
		outcome,
		rollbackExact: liveEquals(pre, post),
		storedBytesUnchanged: post.storedBytes === pre.storedBytes
	});
}

// ---- P1-4b: unawaited returnToCurrent — ended flag exposure while pending ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	const pre = sample(env);
	const p = env.session.returnToCurrent();
	const syncS = sample(env);
	env.port.settle([...env.port.pendingIds()][0], 'refuse');
	const outcome = await p;
	const post = sample(env);
	row('P1-4b returnToCurrent unawaited — ended flag exposed while pending; refusal restores', {
		pre: { returnedToCurrent: pre.returnedToCurrent, storedRTC: pre.stored.returnedToCurrent },
		syncDuringPending: { returnedToCurrent: syncS.returnedToCurrent, storedRTC: syncS.stored.returnedToCurrent },
		exposedWhilePending: syncS.returnedToCurrent !== pre.returnedToCurrent,
		outcome,
		rollbackExact: liveEquals(pre, post),
		storedBytesUnchanged: post.storedBytes === pre.storedBytes
	});
}

// ---- P1-5a: restore() — write-first check (pending window must show PRE-restore) ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env); // live+stored at T0/1
	// Prepare DIFFERENT storage directly through the consumer-owned port (legitimate:
	// storage is the consumer's concern). The crafted record is what restore() must adopt.
	env.port.record = {
		version: 1, symbol: fixture.symbol, instant: T0 + 3600, stepIndex: 2, playing: false,
		levels: [{ id: 'avr-craft-1', symbol: fixture.symbol, price: 2700, note: 'crafted', creationInstant: T0 + 3600, creationStep: 2 }],
		returnedToCurrent: false
	};
	const craftedBytes = JSON.stringify(env.port.record);
	const pre = sample(env);
	const p = env.session.restore(); // reads crafted record, persists it, THEN adopts
	const syncS = sample(env);
	env.port.settle([...env.port.pendingIds()][0], 'ok');
	const outcome = await p;
	const post = sample(env);
	row('P1-5a restore() unawaited — pending window must show PRE-restore state (write-first)', {
		pre: { instant: pre.stateInstant, stepIndex: pre.stepIndex, levelCount: pre.levels.length },
		syncDuringPending: { instant: syncS.stateInstant, stepIndex: syncS.stepIndex, levelCount: syncS.levels.length, stored: syncS.stored },
		pendingWindowShowsPreRestore: syncS.stateInstant === pre.stateInstant && syncS.stepIndex === pre.stepIndex && syncS.levels.length === pre.levels.length,
		outcome: { ok: outcome.ok, code: outcome.code, restoredInstant: outcome.record?.instant, restoredStepIndex: outcome.record?.stepIndex },
		post: { instant: post.stateInstant, stepIndex: post.stepIndex, levelCount: post.levels.length, level: post.levels[0] ?? null },
		storedBytesAfterEqualCrafted: post.storedBytes === craftedBytes
	});
}

// ---- P1-5b: reset() — live unchanged while removal pending ----
{
	resetIdCounter();
	const env = makeEnv(fixture);
	await setupCommitted(env);
	const pre = sample(env);
	const p = env.session.reset();
	const syncS = sample(env);
	env.port.settle([...env.port.pendingIds()][0], 'ok');
	const outcome = await p;
	const post = sample(env);
	row('P1-5b reset() unawaited — live unchanged while removal pending; ok clears', {
		pre: { instant: pre.stateInstant, stepIndex: pre.stepIndex, stored: pre.stored },
		syncDuringPending: { instant: syncS.stateInstant, stepIndex: syncS.stepIndex, stored: syncS.stored },
		liveUnchangedWhilePending: syncS.stateInstant === pre.stateInstant && syncS.stepIndex === pre.stepIndex,
		storedStillPresentWhilePending: syncS.stored !== null,
		outcome,
		post: { instant: post.stateInstant, stepIndex: post.stepIndex, stored: post.stored, levels: post.levels.length, playing: post.playing, returnedToCurrent: post.returnedToCurrent }
	});
}

const { writeFileSync } = await import('node:fs');
writeFileSync(new URL('./avr-p1-results.json', import.meta.url), JSON.stringify(results, null, '\t') + '\n');
console.log('P1 done:', results.rows.length, 'rows');
for (const r of results.rows) console.log('-', r.row);
