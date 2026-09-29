// avc-p3.mjs — FALSIFICATION ATTEMPT 3: READ-PATH CONSISTENCY
// Claims under test:
//  (a) while an op write is pending, data.bars()/availabilityAt() serve the
//      COMMITTED clock instant (Fix A oracle still exact — verified against an
//      independent reference session);
//  (b) the read gate (reverify) runs at EXECUTION time: corrupt bytes present
//      when a queued op EXECUTES must cause a READ_FAILED refusal of that op
//      (never silent success); corruption healed before execution -> success;
//  (c) recovery after healing works.
import { writeFileSync } from 'node:fs';
import { createReplayClock, createDataSession } from '@vict-trading/trading-kit';
import {
	T0, loadFixture, initFixture, makeEnv, setupCommitted, sample,
	installRejectionTrap, flush, same, resetIdCounter, deterministicGenId
} from './avc-harness.mjs';

const fixture = loadFixture();
initFixture(fixture);
const trap = { unhandledRejections: [] };
installRejectionTrap(trap);
const results = { probe: 'avc-p3 read-path', rows: [], allPass: true, unhandledRejections: trap.unhandledRejections };

/** Independent reference readouts for a clock parked at `instant`. */
function referenceAt(instant) {
	const clock = createReplayClock({ horizon: fixture.horizonInstant, start: instant });
	const data = createDataSession({ clock, source: { bars: fixture.bars }, rules: { symbol: fixture.symbol, baseTimeframe: fixture.timeframe } });
	const out = { instant };
	for (const g of ['15m', '1h', '4h']) {
		const r = data.bars({ granularity: g });
		out[g] = { count: r.bars.length, last: r.bars.length ? { time: r.bars[r.bars.length - 1].time, close: r.bars[r.bars.length - 1].close } : null, servedUntil: r.servedUntil, capped: r.capped };
	}
	out.availabilityAtNow = data.availabilityAt();
	out.availabilityAtInstant = data.availabilityAt(instant);
	return out;
}

function readouts(env) {
	const out = {};
	for (const g of ['15m', '1h', '4h']) {
		const r = env.data.bars({ granularity: g });
		out[g] = { count: r.bars.length, last: r.bars.length ? { time: r.bars[r.bars.length - 1].time, close: r.bars[r.bars.length - 1].close } : null, servedUntil: r.servedUntil, capped: r.capped };
	}
	out.availabilityAtNow = env.data.availabilityAt();
	out.availabilityAtInstant = env.data.availabilityAt(env.clock.now());
	return out;
}

// ---- (a) mid-pending reads serve the committed frame ---------------------
{
	resetIdCounter();
	const env = makeEnv(fixture, { genId: deterministicGenId });
	await setupCommitted(env);
	env.port.mode = 'auto-ok';
	await env.session.step(3600); // committed T0+3600
	env.port.mode = 'manual';
	const committedNow = env.clock.now(); // T0+3600
	const ref = referenceAt(committedNow);

	const pr = env.session.step(3600); pr.catch(() => {});
	const phases = [];
	const collect = (phase) => phases.push({ phase, reads: readouts(env) });
	collect('sync');
	await Promise.resolve();
	collect('micro1');
	await Promise.resolve();
	collect('micro2');
	await new Promise((r) => setTimeout(r, 0));
	collect('macro1');

	const mismatches = [];
	for (const { phase, reads } of phases) {
		for (const g of ['15m', '1h', '4h']) if (!same(reads[g], ref[g])) mismatches.push(`${phase}/${g}: ${JSON.stringify(reads[g])} != reference ${JSON.stringify(ref[g])}`);
		if (!same(reads.availabilityAtNow, ref.availabilityAtNow)) mismatches.push(`${phase}/availabilityAt: ${JSON.stringify(reads.availabilityAtNow)} != ${JSON.stringify(ref.availabilityAtNow)}`);
	}
	// settle -> committed T0+7200; committed-frame readouts move to the NEW frame
	env.port.settle(env.port.pendingIds()[0], 'ok');
	await pr.catch(() => {});
	await flush();
	const post = readouts(env);
	const refPost = referenceAt(T0 + 7200);
	const postOk = same(post['15m'], refPost['15m']) && same(post['1h'], refPost['1h']) && same(post.availabilityAtNow, refPost.availabilityAtNow);

	const row = {
		name: 'mid-pending bars/availability serve COMMITTED instant',
		committedNow: T0 + 3600,
		phasesSampled: phases.map((p) => p.phase),
		mismatches,
		postCommitMatchesNewFrame: postOk,
		pass: mismatches.length === 0 && postOk && phases.length === 4 && trap.unhandledRejections.length === 0
	};
	if (!row.pass) results.allPass = false;
	results.rows.push(row);
}

// ---- (b1) corrupt bytes during pending write -> queued op refuses READ_FAILED
{
	resetIdCounter();
	const env = makeEnv(fixture, { genId: deterministicGenId });
	await setupCommitted(env);
	env.port.mode = 'auto-ok';
	await env.session.step(3600); // committed T0+3600 (valid record in storage)
	env.port.mode = 'manual';

	const pa = env.session.step(3600); pa.catch(() => {}); // A write pending
	const pb = env.session.step(3600); // B queued behind A
	pb.catch(() => {});
	await flush();

	env.port.readFail = true; // CORRUPT bytes while A's write is pending
	env.port.settle(env.port.pendingIds()[0], 'ok'); // A's write succeeds -> commits T0+7200
	const outcomeA = await pa.catch(() => null);
	await flush();
	const outcomeB = await pb.catch(() => null);
	await flush();

	const post = sample(env);
	const storedAfter = env.port.record; // must be exactly A's record
	const row = {
		name: 'corrupt-during-pending: queued op refuses READ_FAILED (no silent success)',
		outcomeA, outcomeB,
		bCode: outcomeB && outcomeB.code,
		storageIsARecord: storedAfter !== null && storedAfter.instant === T0 + 7200 && storedAfter.stepIndex === 3,
		liveMatchesA: post.clockNow === T0 + 7200 && post.stepIndex === 3,
		events: env.events.map((e) => e.type)
	};
	// exact write-call count: setup start + setup step + A = 3 (B issued NO write)
	row.exactWriteCalls = env.port.writeCalls === 3;
	row.pass =
		outcomeA && outcomeA.ok === true &&
		outcomeB && outcomeB.ok === false && outcomeB.code === 'READ_FAILED' &&
		row.storageIsARecord && row.liveMatchesA && row.exactWriteCalls &&
		same(env.events.map((e) => e.type), ['start', 'step', 'step']) && // setup + A only; B emits nothing
		trap.unhandledRejections.length === 0;
	if (!row.pass) results.allPass = false;
	results.rows.push(row);

	// recovery: heal -> settle the recovery op's deferred write -> op succeeds
	env.port.readFail = false;
	const pc = env.session.step(3600);
	pc.catch(() => {});
	await flush(); // let C issue its (deferred) write
	const cid = env.port.pendingIds()[0];
	if (cid !== undefined) env.port.settle(cid, 'ok');
	const outcomeC = await pc.catch(() => null);
	await flush();
	const postC = sample(env);
	const recovery = {
		name: 'recovery after heal',
		outcomeC,
		live: { instant: postC.clockNow, stepIndex: postC.stepIndex },
		pass: outcomeC && outcomeC.ok === true && postC.clockNow === T0 + 10800 && postC.stepIndex === 4
	};
	if (!recovery.pass) results.allPass = false;
	results.rows.push(recovery);
}

// ---- (b2) corrupted at ISSUE time but healed before execution -> op SUCCEEDS
// (proves reverify runs at EXECUTION time, not call time: B is issued while
// bytes are corrupt; the heal lands while A's write is still pending, so at
// B's EXECUTION the bytes are healthy — a call-time reverify would have refused)
{
	resetIdCounter();
	const env = makeEnv(fixture, { genId: deterministicGenId });
	await setupCommitted(env);
	env.port.mode = 'auto-ok';
	await env.session.step(3600); // committed T0+3600
	env.port.mode = 'manual';

	env.port.readFail = false;
	const pa = env.session.step(3600); pa.catch(() => {}); // A: executes on HEALTHY bytes, write pending
	await flush(); // A has executed and issued its deferred write
	env.port.readFail = true; // corrupt AFTER A's execution, during A's pending write
	const pb = env.session.step(3600); // B queued behind A (issued while bytes corrupt)
	pb.catch(() => {});
	env.port.readFail = false; // heal BEFORE A settles (B has not executed yet)
	env.port.settle(env.port.pendingIds()[0], 'ok'); // A commits T0+7200
	await pa.catch(() => {});
	await flush(); // B executes on healed bytes and issues its write
	const bid = env.port.pendingIds()[0];
	if (bid !== undefined) env.port.settle(bid, 'ok');
	const outcomeB = await pb.catch(() => null);
	await flush();
	const post = sample(env);
	const row = {
		name: 'healed-before-execution: queued op succeeds (execution-time reverify)',
		outcomeB,
		live: { instant: post.clockNow, stepIndex: post.stepIndex },
		storage: env.port.record ? { instant: env.port.record.instant, stepIndex: env.port.record.stepIndex } : null,
		pass: outcomeB && outcomeB.ok === true && post.clockNow === T0 + 10800 && post.stepIndex === 4 && env.port.record && env.port.record.stepIndex === 4
	};
	if (!row.pass) results.allPass = false;
	results.rows.push(row);
}

// ---- (c) corrupt during the op's OWN pending write; write settles ok ------
// Documented order: gate -> reverify -> ... -> persist(next) -> commit. The
// reverify already ran for THIS op before its write; a successful write
// replaces the bytes wholesale. Recorded as observed behavior vs docstring.
{
	resetIdCounter();
	const env = makeEnv(fixture, { genId: deterministicGenId });
	await setupCommitted(env);
	const pr = env.session.step(3600); pr.catch(() => {});
	await flush();
	env.port.readFail = true; // corrupt during OWN pending write (reverify already done)
	env.port.settle(env.port.pendingIds()[0], 'ok');
	const outcome = await pr.catch(() => null);
	await flush();
	const post = sample(env);
	const row = {
		name: 'corrupt during OWN pending write, write ok -> commit (documented order; bytes replaced by own record)',
		outcome,
		live: { instant: post.clockNow, stepIndex: post.stepIndex },
		storageStepIndex: env.port.record ? env.port.record.stepIndex : null,
		observedSemantics: outcome && outcome.ok ? 'commit-after-own-successful-write (reverify is pre-write, per documented order)' : 'refused',
		pass: outcome && outcome.ok === true && post.clockNow === T0 + 3600 && post.stepIndex === 2 && env.port.record && env.port.record.stepIndex === 2 && trap.unhandledRejections.length === 0
	};
	if (!row.pass) results.allPass = false;
	results.rows.push(row);
}

// ---- (d) corrupt during pending; write settles REFUSED -> corrupt bytes stay,
// live unchanged; next op refuses READ_FAILED (corruption not repaired by kit)
{
	resetIdCounter();
	const env = makeEnv(fixture, { genId: deterministicGenId });
	await setupCommitted(env);
	const pre = sample(env);
	const pr = env.session.step(3600); pr.catch(() => {});
	await flush();
	env.port.readFail = true;
	env.port.settle(env.port.pendingIds()[0], 'refuse');
	const outcome = await pr.catch(() => null);
	await flush();
	const post = sample(env);
	const stayedPre = post.clockNow === pre.clockNow && post.stepIndex === pre.stepIndex && same(post.levels, pre.levels);
	const pb = env.session.step(3600);
	const outcomeB = await pb.catch(() => null);
	await flush();
	const row = {
		name: 'corrupt during pending + refuse: live unchanged, corrupt bytes NOT overwritten, next op READ_FAILED',
		outcome, outcomeB,
		liveStayedCommitted: stayedPre,
		bCode: outcomeB && outcomeB.code,
		pass: outcome && outcome.ok === false && (outcome.code === 'WRITE_REFUSED') && stayedPre && outcomeB && outcomeB.ok === false && outcomeB.code === 'READ_FAILED'
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
writeFileSync('avc-p3-results.json', JSON.stringify(results, null, 2));
console.log('avc-p3 allPass:', results.allPass, `(${results.summary.pass}/${results.summary.rows} rows)`);
for (const r of results.rows) if (!r.pass) console.log('FAIL:', r.name, JSON.stringify(r).slice(0, 700));
