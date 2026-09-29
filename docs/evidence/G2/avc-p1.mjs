// avc-p1.mjs — FALSIFICATION ATTEMPT 1: PENDING-EXPOSURE
// Claim under test: while a persisted op's write is pending, EVERY public
// read (clock.now, currentState, currentStep, bars, drawings, playing,
// returnedToCurrent, clock op-log length) reflects ONLY the last COMMITTED
// frame — at sync, microtask AND macrotask granularity. The op's promise
// resolves only after its own write settles; a rejected write never becomes
// an unhandled rejection; failures emit nothing and commit nothing.
import { writeFileSync } from 'node:fs';
import {
	T0, BASE, loadFixture, initFixture, makeEnv, setupCommitted, sample, liveEquals,
	installRejectionTrap, flush, same, resetIdCounter, deterministicGenId
} from './avc-harness.mjs';

const fixture = loadFixture();
initFixture(fixture);
const trap = { unhandledRejections: [] };
installRejectionTrap(trap);
const results = { probe: 'avc-p1 pending-exposure', rows: [], allPass: true, unhandledRejections: trap.unhandledRejections };

const OPS = [
	{ name: 'step', issue: (env) => env.session.step(3600) },
	{ name: 'createLevel', issue: (env) => env.session.createLevel(2700, 'pending') },
	{ name: 'removeLevel', pre: async (env) => { env.port.mode = 'auto-ok'; await env.session.createLevel(2650, 'victim'); env.port.mode = 'manual'; }, issue: (env) => env.session.removeLevel(env.session.levelsAll()[0].id) },
	{ name: 'play', issue: (env) => env.session.play() },
	{ name: 'returnToCurrent', issue: (env) => env.session.returnToCurrent() }
];
const SETTLES = [
	{ key: 'ok', outcome: 'ok' },
	{ key: 'refuse', outcome: 'refuse' },
	{ key: 'throw', outcome: 'throw' }
];

// Expected post-commit state per op (from the PRE-OP committed base = start(T0))
function expectedAfter(opName, settleKey, pre) {
	if (settleKey === 'refuse' || settleKey === 'throw') return pre; // nothing committed
	switch (opName) {
		case 'step': return { ...pre, clockNow: T0 + 3600, stateInstant: T0 + 3600, stepIndex: 2, barsCount: 4, lastBar: { time: T0 + 2700, close: 2649.4 } };
		case 'createLevel': return { ...pre, levels: [{ id: 'avc-lvl-001', symbol: '', price: 2700, note: 'pending', creationInstant: pre.clockNow, creationStep: pre.stepIndex }] };
		case 'removeLevel': return { ...pre, levels: [] };
		case 'play': return { ...pre, playing: true };
		case 'returnToCurrent': return { ...pre, returnedToCurrent: true, playing: false };
		default: throw new Error('unknown op ' + opName);
	}
}

resetIdCounter();
for (const op of OPS) {
	for (const s of SETTLES) {
		resetIdCounter();
		const env = makeEnv(fixture, { genId: deterministicGenId });
		await setupCommitted(env);
		if (op.pre) await op.pre(env);
		const pre = sample(env);
		const preEventCount = env.events.length;

		// issue UNAWAITED — attach .catch (an actual rejection would be an anomaly:
		// the kit must surface port failures as ok:false outcomes, not rejections)
		let rejected = null;
		const pr = op.issue(env);
		pr.catch((e) => { rejected = String(e && e.message); });

		// granularity ladder: sync, micro1, micro2, macro1, macro2 — all mid-pending
		const phases = [];
		phases.push(['sync', sample(env)]);
		await Promise.resolve();
		phases.push(['micro1', sample(env)]);
		await Promise.resolve();
		phases.push(['micro2', sample(env)]);
		await new Promise((r) => setTimeout(r, 0));
		phases.push(['macro1', sample(env)]);
		await new Promise((r) => setTimeout(r, 0));
		phases.push(['macro2', sample(env)]);

		const midFindings = [];
		for (const [phase, s] of phases) {
			if (!liveEquals(s, pre)) midFindings.push(`${phase}: live state != pre-op committed: ${JSON.stringify({ clockNow: s.clockNow, stepIndex: s.stepIndex, playing: s.playing, rtc: s.returnedToCurrent, levels: s.levels })}`);
			if (s.barsCount !== pre.barsCount || !same(s.lastBar, pre.lastBar)) midFindings.push(`${phase}: bars slice != committed frame: ${JSON.stringify({ barsCount: s.barsCount, lastBar: s.lastBar })}`);
			if (s.clockOpCount !== pre.clockOpCount) midFindings.push(`${phase}: clock op-log length changed mid-pending (${pre.clockOpCount} -> ${s.clockOpCount})`);
			if (s.storedBytes !== pre.storedBytes) midFindings.push(`${phase}: storage bytes changed mid-pending`);
			if (s.eventCount !== preEventCount) midFindings.push(`${phase}: event emitted mid-pending`);
			if (env.port.concurrentOps > 1) midFindings.push(`${phase}: ${env.port.concurrentOps} concurrent port ops in flight`);
		}
		const pendingDuringWindow = env.port.pendingIds().length;

		// resolve the single pending write per combo; promise-resolution must
		// land strictly AFTER the settle entry in the port audit log
		const writeId = env.port.lastWriteId();
		const settleIdx = writeId === null ? -1 : env.port.log.findIndex((l) => l.op === 'settle' && l.id === writeId);
		let resolvedOrderOk = true;
		if (writeId !== null) {
			pr.then(() => { env.port.log.push({ op: 'promise-resolved', id: writeId }); }).catch(() => {});
			env.port.settle(writeId, s.outcome);
			await pr;
			const si = env.port.log.findIndex((l) => l.op === 'settle' && l.id === writeId);
			const ri = env.port.log.findIndex((l) => l.op === 'promise-resolved' && l.id === writeId);
			resolvedOrderOk = si !== -1 && ri !== -1 && si < ri;
		} else {
			await pr; // nothing deferred (refuse/throw inline modes are not used here)
		}
		await flush();

		const post = sample(env);
		const exp = expectedAfter(op.name, s.key, pre);
		const postOk =
			liveEquals(post, exp) &&
			post.barsCount === exp.barsCount &&
			same(post.lastBar, exp.lastBar) &&
			(s.key === 'ok' ? post.storedBytes !== pre.storedBytes || same(post.levels, pre.levels) : post.storedBytes === pre.storedBytes);
		const eventDelta = env.events.length - preEventCount;
		const eventsOk = s.key === 'ok' ? eventDelta === 1 : eventDelta === 0;
		const failureCodeOk =
			s.key === 'ok' ? true :
			s.key === 'refuse' ? !rejected : true; // a THROWN port write may surface as rejection or outcome; both recorded

		const row = {
			op: op.name, settle: s.key,
			midFindings, pendingDuringWindow,
			maxConcurrentOps: env.port.maxConcurrentOps,
			resolvedOrderOk,
			rejected,
			finalLiveMatchesExpected: liveEquals(post, exp),
			finalBarsMatch: post.barsCount === exp.barsCount && same(post.lastBar, exp.lastBar),
			storagePost: post.stored,
			eventDelta, eventsOk,
			unhandledRejections: trap.unhandledRejections.length
		};
		row.pass =
			midFindings.length === 0 &&
			pendingDuringWindow === 1 &&
			env.port.maxConcurrentOps <= 1 &&
			resolvedOrderOk &&
			rejected === null && // no op promise may reject — failures are truthful outcomes
			postOk && eventsOk &&
			trap.unhandledRejections.length === 0;
		if (!row.pass) results.allPass = false;
		results.rows.push(row);
	}
}

// RE-ENTRANT port: write() samples live state at CALL time — at that point the
// kit has already restored the pre-op frame; the drafted state must be invisible.
{
	resetIdCounter();
	const env = makeEnv(fixture, { genId: deterministicGenId });
	await setupCommitted(env);
	const pre = sample(env);
	const observed = [];
	env.port.observer = () => {
		const s = sample(env);
		observed.push({ clockNow: s.clockNow, stepIndex: s.stepIndex, playing: s.playing, levels: s.levels.length, barsCount: s.barsCount, opCount: s.clockOpCount });
	};
	env.port.mode = 'auto-ok';
	await env.session.step(3600);
	env.port.mode = 'manual';
	const post = sample(env);
	const exp = expectedAfter('step', 'ok', pre);
	const reentrantOk = observed.every((o) =>
		o.clockNow === pre.clockNow && o.stepIndex === pre.stepIndex && o.playing === pre.playing &&
		o.levels === pre.levels.length && o.barsCount === pre.barsCount && o.opCount === pre.clockOpCount);
	const row = {
		op: 'step (re-entrant observer at write-call time)',
		observedCount: observed.length,
		observed,
		reentrantOk,
		committedOk: liveEquals(post, exp),
		pass: reentrantOk && observed.length > 0 && liveEquals(post, exp) && trap.unhandledRejections.length === 0
	};
	if (!row.pass) results.allPass = false;
	results.rows.push(row);
}

results.summary = {
	rows: results.rows.length,
	pass: results.rows.filter((r) => r.pass).length,
	fail: results.rows.filter((r) => !r.pass).length,
	allPass: results.allPass,
	unhandledRejections: trap.unhandledRejections
};
writeFileSync('avc-p1-results.json', JSON.stringify(results, null, 2));
console.log('avc-p1 allPass:', results.allPass, `(${results.summary.pass}/${results.summary.rows} rows)`);
for (const r of results.rows) if (!r.pass) console.log('FAIL:', JSON.stringify(r).slice(0, 600));
