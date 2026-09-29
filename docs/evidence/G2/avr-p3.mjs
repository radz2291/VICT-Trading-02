// avr-p3.mjs — OVERLAPPING OPS matrix (verifier-owned).
// Two unawaited ops A,B issued back-to-back (B's synchronous phase runs while
// A's write is still pending in the deferred port). Writes then settled in a
// controlled order and outcome combo. 2 kinds x 2 resolve orders x 3 combos.
// One pass, no retries. Verdict per row: CONSISTENT iff final live == final
// stored == fresh-session adoption.
import { writeFileSync } from 'node:fs';
import {
	initFixture, loadFixture, makeEnv, setupCommitted, sample, resetIdCounter, T0
} from './avr-harness.mjs';

const fixture = loadFixture();
initFixture(fixture);

const KINDS = {
	'step-step': {
		A: (env) => env.session.step(3600),
		B: (env) => env.session.step(3600),
		seqExpect: { 's,s': { instant: T0 + 7200, stepIndex: 3, levelCount: 0 }, 's,f': { instant: T0 + 3600, stepIndex: 2, levelCount: 0 }, 'f,s': { instant: T0 + 3600, stepIndex: 2, levelCount: 0 } }
	},
	'step-create': {
		A: (env) => env.session.step(3600),
		B: (env) => env.session.createLevel(2700, 'overlap'),
		seqExpect: { 's,s': { instant: T0 + 3600, stepIndex: 2, levelCount: 1 }, 's,f': { instant: T0 + 3600, stepIndex: 2, levelCount: 0 }, 'f,s': { instant: T0 + 3600, stepIndex: 2, levelCount: 1 } }
	}
};

function storedMatchesLive(storedBytes, live) {
	if (storedBytes === null) return false;
	const rec = JSON.parse(storedBytes);
	return (
		rec.instant === live.stateInstant &&
		rec.stepIndex === live.stepIndex &&
		rec.playing === live.playing &&
		rec.returnedToCurrent === live.returnedToCurrent &&
		JSON.stringify(rec.levels ?? []) === JSON.stringify(live.levels)
	);
}

async function freshAdoption(env) {
	const s2 = makeEnv(fixture, { genId: () => 'avr-adopt' });
	s2.port.record = env.port.record;
	s2.session.acknowledgeState(s2.port.read());
	s2.port.mode = 'auto-ok';
	const r = await s2.session.restore();
	s2.port.mode = 'manual';
	return { ok: r.ok, instant: s2.session.currentState().instant, stepIndex: s2.session.currentStep(), levelCount: s2.session.levelsAll().length };
}

const results = { meta: { T0, matrix: '2 kinds x 2 resolve orders x {s,s; s,f; f,s} = 12 rows; f = port resolves {ok:false}' }, rows: [] };

for (const [kind, spec] of Object.entries(KINDS)) {
	for (const resolveOrder of ['A-first', 'B-first']) {
		for (const combo of ['s,s', 's,f', 'f,s']) {
			resetIdCounter();
			const env = makeEnv(fixture);
			await setupCommitted(env);
			const pre = sample(env);
			const [outA, outB] = combo.split(','); // 's' | 'f' per op
			const pa = spec.A(env); // unawaited
			const pb = spec.B(env); // unawaited — issued while A pending
			const [idA, idB] = [...env.port.pendingIds()]; // insertion order: [A's write, B's write]
			const outcomeFor = (id) => (id === idA ? outA : outB) === 's' ? 'ok' : 'refuse'; // combo is per-OP
			const first = resolveOrder === 'A-first' ? idA : idB;
			const second = resolveOrder === 'A-first' ? idB : idA;
			env.port.settle(first, outcomeFor(first));
			const mid = sample(env);
			env.port.settle(second, outcomeFor(second));
			const [oa, ob] = await Promise.all([pa, pb]);
			const fin = sample(env);
			const adopted = await freshAdoption(env);
			const seqExp = spec.seqExpect[combo];
			const liveOk =
				fin.stateInstant === seqExp.instant && fin.stepIndex === seqExp.stepIndex && fin.levels.length === seqExp.levelCount;
			const consistent = storedMatchesLive(fin.storedBytes, fin) && adopted.ok && adopted.instant === fin.stateInstant && adopted.stepIndex === fin.stepIndex && adopted.levelCount === fin.levels.length;
			let mechanism = 'none';
			if (!consistent) {
				const rec = JSON.parse(fin.storedBytes);
				if (outA === 's' && outB === 's' && (rec.stepIndex < fin.stepIndex || rec.levels.length < fin.levels.length)) mechanism = 'LOST_OP_IN_STORAGE_lastResolvedOlderWriteWon';
				else if (outA === 'f' && (rec.stepIndex > fin.stepIndex || rec.levels.length > fin.levels.length)) mechanism = 'LIVE_REGRESSED_BELOW_STORAGE_reload_resurrects_op';
				else mechanism = 'OTHER_DIVERGENCE';
			}
			results.rows.push({
				row: `${kind} | resolve ${resolveOrder} | combo ${combo}`,
				opResults: { A: { ok: oa.ok, code: oa.code ?? null }, B: { ok: ob.ok, code: ob.code ?? null } },
				preState: { instant: pre.stateInstant, stepIndex: pre.stepIndex },
				midAfterFirstSettle: { instant: mid.stateInstant, stepIndex: mid.stepIndex, levelCount: mid.levels.length },
				finalLive: { instant: fin.stateInstant, stepIndex: fin.stepIndex, levelCount: fin.levels.length, levelIds: fin.levels.map((l) => l.id) },
				finalStored: rec2(fin.storedBytes),
				freshAdoption: adopted,
				writeCallOrder: env.port.log.filter((e) => e.op === 'write').map((e) => ({ id: e.id, record: e.record ? { instant: e.record.instant, stepIndex: e.record.stepIndex, levelCount: (e.record.levels ?? []).length } : null })),
				settleOrder: env.port.log.filter((e) => e.op === 'settle').map((e) => ({ id: e.id, outcome: e.outcome })),
				eventEmissionOrder: fin.eventTypes,
				sequentialExpectation: seqExp,
				matchesSequential: liveOk,
				verdict: consistent ? 'CONSISTENT' : 'DISAGREEMENT',
				mechanism
			});
		}
	}
}

function rec2(bytes) {
	if (bytes === null) return null;
	const r = JSON.parse(bytes);
	return { instant: r.instant, stepIndex: r.stepIndex, levelCount: (r.levels ?? []).length };
}

writeFileSync(new URL('./avr-p3-results.json', import.meta.url), JSON.stringify(results, null, '\t') + '\n');
console.log('P3 done:', results.rows.length, 'rows');
for (const r of results.rows) {
	console.log(
		'-', r.row,
		'| live', r.finalLive.instant + '/' + r.finalLive.stepIndex + '/L' + r.finalLive.levelCount,
		'| stored', r.finalStored ? r.finalStored.instant + '/' + r.finalStored.stepIndex + '/L' + r.finalStored.levelCount : 'null',
		'|', r.verdict, r.mechanism !== 'none' ? '(' + r.mechanism + ')' : ''
	);
}
