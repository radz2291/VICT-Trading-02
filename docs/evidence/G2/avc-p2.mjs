// avc-p2.mjs — FALSIFICATION ATTEMPT 2: OVERLAP
// Claim under test: overlapping persisted ops serialize FIFO in CALL order;
// at most ONE port write is ever in flight (a second concurrent write
// falsifies); every op re-bases at EXECUTION time (A refused -> B applies on
// the pre-op committed base, never composited); after settle, live state ==
// stored record == fresh-reload adoption, ALWAYS; no lost ops; failed ops
// emit nothing; events match call order of successful ops.
import { writeFileSync } from 'node:fs';
import {
	T0, BASE, loadFixture, initFixture, makeEnv, setupCommitted, sample, freshAdopt,
	installRejectionTrap, flush, same, resetIdCounter, deterministicGenId
} from './avc-harness.mjs';

const fixture = loadFixture();
initFixture(fixture);
const trap = { unhandledRejections: [] };
installRejectionTrap(trap);

const mk = {
	step: (sec) => ({ kind: 'step', issue: (env) => env.session.step(sec) }),
	create: (price, note) => ({ kind: 'create', issue: (env) => env.session.createLevel(price, note) }),
	remove: (id) => ({ kind: 'remove', issue: (env) => env.session.removeLevel(id) }),
	play: { kind: 'play', issue: (env) => env.session.play() },
	pause: { kind: 'pause', issue: (env) => env.session.pause() },
	rtc: { kind: 'rtc', issue: (env) => env.session.returnToCurrent() },
	reset: { kind: 'reset', issue: (env) => env.session.reset() } // settle f == removal throw
};

// pair definitions: A then B (B may need A's deterministic id)
const PAIRS = [
	{ name: 'step+step', A: mk.step(3600), B: mk.step(3600) },
	{ name: 'step+create', A: mk.step(3600), B: mk.create(2700, 'b') },
	{ name: 'create+remove', A: mk.create(2700, 'a'), B: null }, // B built per row (needs id)
	{ name: 'step+returnToCurrent', A: mk.step(3600), B: mk.rtc },
	{ name: 'play+pause', A: mk.play, B: mk.pause },
	{ name: 'reset+step', A: mk.reset, B: mk.step(3600) }
];
const COMBOS = ['s,s', 's,f', 'f,s', 'f,f'];

// Expected FINAL committed state (live and storage) after the pair, given
// the pre-op base = record {instant:T0, stepIndex:1, playing:false, levels:[], rtc:false}
function expected(kind, combo) {
	const [a, b] = combo.split(',');
	const lvl = (inst, step, price, note) => ({ id: 'avc-lvl-001', symbol: '', price, note, creationInstant: inst, creationStep: step });
	switch (kind) {
		case 'step+step': {
			if (a === 's' && b === 's') return { instant: T0 + 7200, stepIndex: 3, levels: [], playing: false, rtc: false, storedNull: false, events: ['step', 'step'] };
			if (a === 's') return { instant: T0 + 3600, stepIndex: 2, levels: [], playing: false, rtc: false, storedNull: false, events: ['step'] }; // s,f
			if (b === 's') return { instant: T0 + 3600, stepIndex: 2, levels: [], playing: false, rtc: false, storedNull: false, events: ['step'], reBased: true }; // f,s
			return { instant: T0, stepIndex: 1, levels: [], playing: false, rtc: false, storedNull: false, events: [] }; // f,f
		}
		case 'step+create': {
			if (a === 's' && b === 's') return { instant: T0 + 3600, stepIndex: 2, levels: [lvl(T0 + 3600, 2, 2700, 'b')], playing: false, rtc: false, storedNull: false, events: ['step', 'level-created'] };
			if (a === 's') return { instant: T0 + 3600, stepIndex: 2, levels: [], playing: false, rtc: false, storedNull: false, events: ['step'] }; // s,f: create refused
			if (b === 's') return { instant: T0, stepIndex: 1, levels: [lvl(T0, 1, 2700, 'b')], playing: false, rtc: false, storedNull: false, events: ['level-created'], reBased: true }; // f,s
			return { instant: T0, stepIndex: 1, levels: [], playing: false, rtc: false, storedNull: false, events: [] }; // f,f
		}
		case 'create+remove': {
			if (a === 's' && b === 's') return { instant: T0, stepIndex: 1, levels: [], playing: false, rtc: false, storedNull: false, events: ['level-created', 'level-removed'] };
			if (a === 's') return { instant: T0, stepIndex: 1, levels: [lvl(T0, 1, 2700, 'a')], playing: false, rtc: false, storedNull: false, events: ['level-created'] }; // s,f: remove refused
			// f,*: create refused -> remove hits NOT_FOUND (no write, no event)
			return { instant: T0, stepIndex: 1, levels: [], playing: false, rtc: false, storedNull: false, events: [], bNotFound: true };
		}
		case 'step+returnToCurrent': {
			if (a === 's' && b === 's') return { instant: T0 + 3600, stepIndex: 2, levels: [], playing: false, rtc: true, storedNull: false, events: ['step', 'returnToCurrent'] };
			if (a === 's') return { instant: T0 + 3600, stepIndex: 2, levels: [], playing: false, rtc: false, storedNull: false, events: ['step'] };
			if (b === 's') return { instant: T0, stepIndex: 1, levels: [], playing: false, rtc: true, storedNull: false, events: ['returnToCurrent'], reBased: true };
			return { instant: T0, stepIndex: 1, levels: [], playing: false, rtc: false, storedNull: false, events: [] };
		}
		case 'play+pause': {
			if (a === 's' && b === 's') return { instant: T0, stepIndex: 1, levels: [], playing: false, rtc: false, storedNull: false, events: ['play', 'pause'] };
			if (a === 's') return { instant: T0, stepIndex: 1, levels: [], playing: true, rtc: false, storedNull: false, events: ['play'], reBaseNote: 'pause refused must NOT roll back the committed play' }; // s,f
			if (b === 's') return { instant: T0, stepIndex: 1, levels: [], playing: false, rtc: false, storedNull: false, events: ['pause'] }; // f,s
			return { instant: T0, stepIndex: 1, levels: [], playing: false, rtc: false, storedNull: false, events: [] }; // f,f
		}
		case 'reset+step': {
			// a 'f' == removal THROWS (remove contract has no ok:false)
			if (a === 's' && b === 's') return { instant: T0 + 3600, stepIndex: 1, levels: [], playing: false, rtc: false, storedNull: false, events: ['reset', 'step'], postReset: true };
			if (a === 's') return { instant: T0, stepIndex: 0, levels: [], playing: false, rtc: false, storedNull: true, events: ['reset'] }; // s,f: step refused on cleared session
			if (b === 's') return { instant: T0 + 3600, stepIndex: 2, levels: [], playing: false, rtc: false, storedNull: false, events: ['step'], resetThrew: true }; // f,s: live kept, step re-based on kept state
			return { instant: T0, stepIndex: 1, levels: [], playing: false, rtc: false, storedNull: false, events: [] }; // f,f
		}
		default: throw new Error('unknown kind ' + kind);
	}
}

const results = { probe: 'avc-p2 overlap', rows: [], allPass: true, unhandledRejections: trap.unhandledRejections };

for (const pair of PAIRS) {
	for (const combo of COMBOS) {
		const failOf = (op) => (op && op.kind === 'reset' ? 'throw' : 'refuse');
		const sa = combo[0] === 's' ? 'ok' : failOf(pair.A);
		const sb = combo[2] === 's' ? 'ok' : failOf(pair.B);
		resetIdCounter();
		const env = makeEnv(fixture, { genId: deterministicGenId });
		await setupCommitted(env);
		const setupWrites = env.port.writeCalls; // setup start write (1)
		const setupOps = env.port.writeCalls + env.port.removeCalls;
		const preEventTypes = env.events.map((e) => e.type);

		const B = pair.B ?? mk.remove('avc-lvl-001'); // deterministic id of A's create

		const cap = (p) => { p.catch((e) => { trap.forced = String(e && e.message); }); return p; };
		const pa = cap(pair.A.issue(env));
		const pb = cap(B.issue(env));

		await flush();
		// after issuing A + B: exactly ONE new port op in flight (A's write or
		// removal); B must NOT have issued anything yet (FIFO)
		const duringA = {
			pendingIds: env.port.pendingIds().length,
			writeCalls: env.port.writeCalls,
			removeCalls: env.port.removeCalls,
			totalOps: env.port.writeCalls + env.port.removeCalls,
			maxConcurrentOps: env.port.maxConcurrentOps
		};

		let outcomeA = null;
		{
			const aid = env.port.pendingIds()[0]; // A's write OR removal (reset)
			if (aid !== undefined) env.port.settle(aid, sa);
			outcomeA = await pa;
		}
		await flush();

		// after A settled: B's write may now be the single in-flight op
		const duringB = {
			pendingIds: env.port.pendingIds().length,
			writeCalls: env.port.writeCalls,
			removeCalls: env.port.removeCalls
		};

		let outcomeB = null;
		{
			const rid = env.port.pendingIds()[0];
			if (rid !== undefined) {
				env.port.settle(rid, sb);
				outcomeB = await pb;
			} else {
				outcomeB = await pb; // no write issued (e.g. NOT_FOUND)
			}
		}
		await flush();

		const post = sample(env);
		const exp = expected(pair.name, combo);
		const finalEvents = env.events.map((e) => e.type).slice(preEventTypes.length);

		const liveMatches =
			post.clockNow === exp.instant &&
			post.stateInstant === exp.instant &&
			post.stepIndex === exp.stepIndex &&
			post.playing === exp.playing &&
			post.returnedToCurrent === exp.rtc &&
			same(post.levels, exp.levels);
		const storedMatches = exp.storedNull ? env.port.record === null : post.storedBytes !== null && JSON.parse(post.storedBytes).instant === exp.instant && JSON.parse(post.storedBytes).stepIndex === exp.stepIndex && JSON.parse(post.storedBytes).returnedToCurrent === exp.rtc && same(JSON.parse(post.storedBytes).levels, exp.levels);

		// fresh-reload: the RECORD a fresh consumer reads must equal the stored
		// record. For non-ended sessions the kit re-adopts counters exactly. For
		// ENDED sessions (rtc=true) the kit deliberately does NOT re-adopt (the
		// recorded G2 rule: return-to-current IS the reload state; restore refuses
		// SESSION_ENDED) — assert that refusal instead of counter re-adoption.
		const adopted = freshAdopt(env);
		let adoptMatches;
		if (exp.rtc && !exp.storedNull) {
			const clock2 = (await import('@vict-trading/trading-kit')).createReplayClock({ horizon: fixture.horizonInstant, start: T0 });
			const { ReplaySession } = await import('@vict-trading/trading-kit');
			const s2 = new ReplaySession({ clock: clock2, persistence: env.port }, { genId: deterministicGenId });
			const rec2 = env.port.read();
			s2.acknowledgeState(rec2);
			const rr = await s2.restore();
			adoptMatches =
				adopted.record !== null &&
				adopted.record.instant === exp.instant && adopted.record.stepIndex === exp.stepIndex &&
				adopted.record.returnedToCurrent === true && same(adopted.record.levels, exp.levels) &&
				rr.ok === false && rr.code === 'SESSION_ENDED';
		} else {
			adoptMatches = exp.storedNull
				? adopted.record === null && adopted.stepIndex === 0
				: adopted.record !== null &&
					adopted.instant === exp.instant &&
					adopted.stepIndex === exp.stepIndex &&
					same(adopted.levels, exp.levels) &&
					adopted.returnedToCurrent === exp.rtc;
		}

		const row = {
			pair: pair.name, combo,
			duringA, duringB,
			outcomeA, outcomeB,
			finalLive: { instant: post.clockNow, stepIndex: post.stepIndex, playing: post.playing, rtc: post.returnedToCurrent, levelCount: post.levels.length },
			expectedFinal: { instant: exp.instant, stepIndex: exp.stepIndex, playing: exp.playing, rtc: exp.rtc, levelCount: exp.levels.length, storedNull: exp.storedNull },
			liveMatches, storedMatches, adoptMatches,
			maxConcurrentOps: env.port.maxConcurrentOps,
			finalEvents,
			expectedEvents: exp.events,
			eventsMatch: same(finalEvents, exp.events)
		};
		row.pass =
			duringA.pendingIds === 1 &&
			duringA.totalOps === setupOps + 1 && // exactly ONE new op (A's); B not issued yet (FIFO)
			env.port.maxConcurrentOps <= 1 && // never two writes in flight
			liveMatches && storedMatches && adoptMatches && // live == storage == fresh record
			row.eventsMatch &&
			trap.unhandledRejections.length === 0 && !trap.forced;
		if (!row.pass) results.allPass = false;
		results.rows.push(row);
	}
}

// 3 steps queued together: exactly one unresolved write at ALL times
{
	resetIdCounter();
	const env = makeEnv(fixture, { genId: deterministicGenId });
	await setupCommitted(env);
	const preEventTypes = env.events.map((e) => e.type);
	const p1 = env.session.step(3600); p1.catch(() => {});
	const p2 = env.session.step(3600); p2.catch(() => {});
	const p3 = env.session.step(3600); p3.catch(() => {});
	const pendingTrace = [];
	for (let i = 0; i < 6; i++) {
		await new Promise((r) => setTimeout(r, 0));
		pendingTrace.push(env.port.pendingIds().length);
		const ids = env.port.pendingIds();
		if (ids.length) env.port.settle(ids[0], 'ok');
	}
	await Promise.all([p1, p2, p3].map((p) => p.catch(() => {})));
	await flush();
	const post = sample(env);
	const row = {
		pair: '3x step queued', combo: 's,s,s',
		pendingTrace,
		maxConcurrentOps: env.port.maxConcurrentOps,
		finalLive: { instant: post.clockNow, stepIndex: post.stepIndex },
		events: env.events.map((e) => e.type).slice(preEventTypes.length)
	};
	row.pass =
		pendingTrace.every((n) => n <= 1) &&
		env.port.maxConcurrentOps <= 1 &&
		post.clockNow === T0 + 10800 && post.stepIndex === 4 &&
		same(row.events, ['step', 'step', 'step']) &&
		post.storedBytes !== null && JSON.parse(post.storedBytes).stepIndex === 4;
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
writeFileSync('avc-p2-results.json', JSON.stringify(results, null, 2));
console.log('avc-p2 allPass:', results.allPass, `(${results.summary.pass}/${results.summary.rows} rows)`);
for (const r of results.rows) if (!r.pass) console.log('FAIL:', r.pair, r.combo ?? '', JSON.stringify(r).slice(0, 700));
