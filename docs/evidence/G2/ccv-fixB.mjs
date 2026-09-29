// ccv-fixB.mjs — FRESH VERIFIER, Repair B negatives at CANDIDATE db66475a (transactional session persistence).
// 17 rows: 8 write-based ops × {ok:false, throw} + reset-removal(throw). Independent storage port emulation.
import { createReplayClock, ReplaySession } from '@vict-trading/trading-kit';
import { readFileSync, writeFileSync } from 'node:fs';

const fixture = JSON.parse(readFileSync('C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G2/fixture.json', 'utf8'));
const S = 900, H = fixture.horizonInstant;
const START_AT = 1767573000; // 2026-01-05T00:30Z

function makePort() {
	const port = {
		bytes: null,
		failWrite: 'none', failRemove: 'none',
		writeCalls: 0,
		read() { return port.bytes === null ? null : JSON.parse(port.bytes); },
		async write(record) {
			port.writeCalls++;
			port.lastRequested = JSON.stringify(record);
			if (port.failWrite === 'okfalse') return { ok: false, code: 'EACCES', message: 'simulated write refusal' };
			if (port.failWrite === 'throw') throw new Error('simulated port crash');
			port.bytes = JSON.stringify(record);
			return { ok: true };
		},
		async remove() { if (port.failRemove === 'throw') throw new Error('simulated remove crash'); delete port.bytes; }
	};
	return port;
}

async function healthyBaseline(portBytes, stepIdx, level) {
	// build a healthy record: start + N steps + level, in a SEPARATE session/port, return its final bytes
}

function stateOf(s, clock) { return { instant: clock.now(), stepIndex: s.currentStep(), levels: s.levelsAll(), playing: s.isPlaying, returnedToCurrent: s.hasReturnedToCurrent, clockOps: clock.records().length }; }

async function row(op, behavior) {
	const p = makePort();
	// pre-build healthy bytes with a SEPARATE session/port then copy bytes
	const p0 = makePort();
	const c0 = createReplayClock({ horizon: H, start: START_AT });
	const s0 = new ReplaySession({ clock: c0, persistence: p0 });
	s0.acknowledgeState(p0.read());
	await s0.start(START_AT);
	await s0.step(S);
	await s0.step(S);
	const lv = await s0.createLevel(2649.5, 'seed-level');
	await s0.play();
	await s0.pause();
	const healthyBytes = p0.bytes; // stepIndex 3, 1 level, paused
	p.bytes = healthyBytes;
	let haveLevel = true;

	const clock = createReplayClock({ horizon: H, start: S_0() });
	const s = new ReplaySession({ clock, persistence: p });
	const rec = p.read();
	s.acknowledgeState(rec); // adopts persisted drawings + stepIndex; playing=false after adoption
	const before = stateOf(s, clock);
	const beforeBytes = p.bytes;
	// turn on failing mode
	p.failWrite = behavior === 'okfalse' ? 'okfalse' : 'none';
	p.failRemove = behavior === 'throw' && op === 'reset' ? 'throw' : 'none';
	if (behavior === 'throw') p.failWrite = 'throw';
	let res;
	try {
		switch (op) {
			case 'start': res = await s.start(START_AT); break;
			case 'step': res = await s.step(S); break;
			case 'createLevel': res = await s.createLevel(999.99, 'ghost'); break;
			case 'removeLevel': res = await s.removeLevel(lv.id); break;
			case 'play': res = await s.play(); break;
			case 'pause': res = await s.pause(); break;
			case 'returnToCurrent': res = await s.returnToCurrent(); break;
			case 'restore': res = await s.restore(); break;
			case 'reset': res = await s.reset(); break;
			default: throw new Error('unknown op');
		}
	} catch (e) { res = { ok: false, code: 'HARNESS_THROWN', message: e.message }; }
	const after = stateOf(s, clock);
	const afterBytes = p.bytes;
	function S_0() { return 0; }
	return {
		op, behavior,
		result: { ok: res.ok, code: res.code ?? null, recordAdopted: res.record ? true : undefined },
		stateUnchanged: JSON.stringify(before) === JSON.stringify(after),
		before, after,
		bytesUnchanged: beforeBytes === afterBytes,
		truthfulCode: ['WRITE_REFUSED', 'PORT_ERROR', 'READ_FAILED', 'READ_NOT_ACKNOWLEDGED'].includes(res.code) ||
			(behavior === 'okfalse' && res.code === 'EACCES') // OLD-kit naming — should NOT appear in candidate
	};
}

// NOTE cleanup: S_0 helper is bogus; clock start must be BEFORE the persisted record instant check... actually
// the fresh live session must be built at some start instant; the persisted record says instant = ? 
// The record from healthy baseline is at instant START_AT+2*S = 00:30+30m = 01:00Z with stepIndex 3.
// Fresh session adopting it: start of clock irrelevant because we do NOT restore; we only acknowledge.
const rows = [];
for (const op of ['start', 'step', 'createLevel', 'removeLevel', 'play', 'pause', 'returnToCurrent', 'restore']) {
	rows.push(await row(op, 'okfalse'));
	rows.push(await row(op, 'throw'));
}
rows.push(await row('reset', 'throw'));

console.log('=== REPAIR B @ db66475a: 17-row failed-write table ===');
let failures = 0;
for (const r of rows) {
	const expectedCode = r.behavior === 'okfalse' ? 'WRITE_REFUSED' : 'PORT_ERROR';
	const bad = r.result.ok !== false || r.result.code !== expectedCode || !r.stateUnchanged || !r.bytesUnchanged;
	if (bad) failures++;
	console.log(JSON.stringify({ ...r, FAIL: bad }));
}
console.log('failed rows:', failures, 'of', rows.length);

// ---- recovery + reload-exact (ghost scenario) ----
async function recovery() {
	const p = makePort();
	const c0 = createReplayClock({ horizon: H, start: START_AT });
	const s0 = new ReplaySession({ clock: c0, persistence: p });
	s0.acknowledgeState(p0read());
	function p0read() { return null; }
	await s0.start(START_AT);
	await s0.step(S); await s0.step(S);
	await s0.createLevel(2649.5, 'seed-level');
	// failing phase
	p.failWrite = 'okfalse';
	const refusedStep = await s0.step(S);           // refused — state must stay at step 3
	const refusedGhost = await s0.createLevel(888, 'ghost'); // refused — no ghost level
	// heal
	p.failWrite = 'none';
	const healedStep = await s0.step(S);            // step 4
	const healedLevel = await s0.createLevel(2650.5, 'post-heal');
	// storage content: NO ghost; step 4; two levels
	const stored = JSON.parse(p.bytes);
	const ghostAbsent = !stored.levels.some(l => l.note === 'ghost') && !stored.levels.some(l => l.price === 888);
	// reload: fresh session + fresh clock adopting stored bytes exactly
	const c2 = createReplayClock({ horizon: H, start: stored.instant });
	const s2 = new ReplaySession({ clock: c2, persistence: p });
	s2.acknowledgeState(p.read());
	const reloadExact =
		s2.currentStep() === stored.stepIndex &&
		Math.round(c2.now()) === stored.instant &&
		JSON.stringify(s2.levelsAll().map(l => [l.id, l.price, l.note, l.creationInstant, l.creationStep])) ===
		JSON.stringify(stored.levels.map(l => [l.id, l.price, l.note, l.creationInstant, l.creationStep]));
	return {
		refusedStep: { ok: refusedStep.ok, code: refusedStep.code },
		refusedGhost: { ok: refusedGhost.ok, code: refusedGhost.code },
		ghostAbsent, healedStepOk: healedStep.ok, healedLevelOk: healedLevel.ok,
		stored: { stepIndex: stored.stepIndex, instant: stored.instant, levels: stored.levels.map(l => l.note) },
		reloadExact
	};
}
const recoveryOut = await recovery();

const out = { rows, recovery: recoveryOut, tableAllPass: failures === 0 };
writeFileSync('C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G2/ccv-fixB-results.json', JSON.stringify(out, null, 2));
console.log('recovery+reload:', JSON.stringify(recoveryOut));