// avc-harness.mjs — FRESH VERIFIER harness for the G2 async-persistence
// repair falsification (avc-* set). Written independently from the kit's
// PUBLIC contract (SessionPersistence in types.ts). Patterns adapted from the
// prior avr-* verifier harness, with expectations updated to the REPAIRED
// semantics: commit-strictly-after-own-write, FIFO serialization,
// execution-time re-base.
//
// Port contract (same faithful reading as avr):
//   read()  — synchronous; returns committed bytes (deep clone); THROWS on
//             induced read failure (readFail flag).
//   write() — returns a promise: {ok:false} = refusal (WRITE_REFUSED),
//             rejecting = PORT_ERROR, {ok:true} COMMITS the call-time-captured
//             record to storage AT RESOLUTION TIME.
//   remove()— deferred likewise; ok clears storage; throw = removal failure.
//
// Falsification instrumentation:
//   - every call/settle audited in order (port.log)
//   - concurrent persisted-port-operation tracking (maxConcurrent must stay 1)
//   - optional re-entrant observer: write()/read() can sample live state at
//     call time (zero-window check for drafted-state exposure)
import { createReplayClock, createDataSession, ReplaySession } from '@vict-trading/trading-kit';
import { readFileSync } from 'node:fs';

export const T0 = 1767571200; // fixture replay start (2026-01-05T00:00Z)
export const BASE = 900; // 15m seconds

export function loadFixture(path = './fixture.json') {
	return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
}

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

let idCounter = 0;
export function deterministicGenId() {
	idCounter += 1;
	return 'avc-lvl-' + String(idCounter).padStart(3, '0');
}
export function resetIdCounter() {
	idCounter = 0;
}

/** Process-level unhandled-rejection trap. Any hit = falsification signal. */
export function installRejectionTrap(bucket) {
	process.on('unhandledRejection', (reason) => {
		bucket.unhandledRejections.push(String(reason && reason.stack ? reason.stack : reason));
	});
	process.on('rejectionHandled', () => {});
}

export class DeferredPort {
	constructor() {
		this.record = null; // committed storage bytes (SessionRecord | null)
		this.readFail = false; // induced read failure (corrupt bytes)
		this.mode = 'manual'; // 'manual' | 'auto-ok' | 'refuse' | 'throw'
		this.pending = new Map(); // id -> {kind, recordSnapshot, resolve, reject}
		this.nextId = 0;
		this.log = []; // ordered audit
		this.concurrentOps = 0; // live write+remove in flight
		this.maxConcurrentOps = 0;
		this.writeCalls = 0;
		this.removeCalls = 0;
		this.observer = null; // fn(kind) called at call time (re-entrancy probe)
	}
	_track(kind) {
		this.concurrentOps += 1;
		if (this.concurrentOps > this.maxConcurrentOps) this.maxConcurrentOps = this.concurrentOps;
		if (kind === 'write') this.writeCalls += 1;
		else this.removeCalls += 1;
	}
	read() {
		this.log.push({ op: 'read', pendingCount: this.pending.size });
		if (this.observer) this.observer('read');
		if (this.readFail) throw new Error('avc-port: induced read failure (corrupt bytes)');
		return this.record === null ? null : clone(this.record);
	}
	write(next) {
		const snapshot = clone(next);
		const id = this.nextId++;
		this._track('write');
		if (this.observer) this.observer('write');
		if (this.mode === 'throw') {
			this.log.push({ op: 'write', id, threw: true });
			this.concurrentOps -= 1;
			return Promise.reject(new Error('avc-port: induced write failure'));
		}
		if (this.mode === 'refuse') {
			this.log.push({ op: 'write', id, refused: true });
			this.concurrentOps -= 1;
			return Promise.resolve({ ok: false, code: 'AVC_REFUSED', message: 'refused by avc test port' });
		}
		if (this.mode === 'auto-ok') {
			this.record = snapshot;
			this.log.push({ op: 'write', id, committedInline: true, record: snapshot });
			this.concurrentOps -= 1;
			return Promise.resolve({ ok: true });
		}
		this.log.push({ op: 'write', id, deferred: true, record: snapshot });
		return new Promise((resolve, reject) => {
			this.pending.set(id, {
				kind: 'write',
				recordSnapshot: snapshot,
				resolve: (v) => { this.concurrentOps -= 1; resolve(v); },
				reject: (e) => { this.concurrentOps -= 1; reject(e); }
			});
		});
	}
	async remove() {
		const id = this.nextId++;
		this._track('remove');
		if (this.observer) this.observer('remove');
		if (this.mode === 'throw') {
			this.log.push({ op: 'remove', id, threw: true });
			this.concurrentOps -= 1;
			throw new Error('avc-port: induced removal failure');
		}
		if (this.mode === 'auto-ok') {
			this.record = null;
			this.log.push({ op: 'remove', id, committedInline: true });
			this.concurrentOps -= 1;
			return;
		}
		this.log.push({ op: 'remove', id, deferred: true });
		await new Promise((resolve, reject) => {
			this.pending.set(id, {
				kind: 'remove',
				resolve: () => { this.concurrentOps -= 1; this.record = null; resolve(); },
				reject: (e) => { this.concurrentOps -= 1; reject(e); }
			});
		});
	}
	/** outcome: 'ok' | 'refuse' | 'throw'. Writes: ok commits captured bytes NOW. */
	settle(id, outcome) {
		const e = this.pending.get(id);
		if (!e) throw new Error('avc-port: no pending op id=' + id);
		this.pending.delete(id);
		if (e.kind === 'write') {
			if (outcome === 'ok') {
				this.record = e.recordSnapshot;
				this.log.push({ op: 'settle', id, kind: 'write', outcome: 'ok' });
				e.resolve({ ok: true });
			} else if (outcome === 'refuse') {
				this.log.push({ op: 'settle', id, kind: 'write', outcome: 'refuse' });
				e.resolve({ ok: false, code: 'AVC_REFUSED', message: 'refused by avc test port' });
			} else {
				this.log.push({ op: 'settle', id, kind: 'write', outcome: 'throw' });
				e.reject(new Error('avc-port: induced write failure'));
			}
		} else {
			if (outcome === 'ok') {
				this.log.push({ op: 'settle', id, kind: 'remove', outcome: 'ok' });
				e.resolve();
			} else {
				this.log.push({ op: 'settle', id, kind: 'remove', outcome: 'throw' });
				e.reject(new Error('avc-port: induced removal failure'));
			}
		}
	}
	pendingIds() {
		return [...this.pending.keys()];
	}
	/** ids of the last n write calls (to know which write belongs to which op) */
	lastWriteId() {
		for (let i = this.log.length - 1; i >= 0; i--) if (this.log[i].op === 'write') return this.log[i].id;
		return null;
	}
}

/** Simple mode-switching port (no deferral) for the failed-write table. */
export class BasicPort {
	constructor() {
		this.bytes = null; // JSON string storage (string identity checks possible)
		this.writeMode = 'ok'; // 'ok' | 'refuse' | 'throw'
		this.removeMode = 'ok'; // 'ok' | 'throw'
		this.readHealthy = true;
	}
	read() {
		if (!this.readHealthy) throw new Error('avc-basic: induced read failure');
		return this.bytes === null ? null : JSON.parse(this.bytes);
	}
	async write(record) {
		if (this.writeMode === 'refuse') return { ok: false, code: 'AVC_REFUSED', message: 'refused by avc basic port' };
		if (this.writeMode === 'throw') throw new Error('avc-basic: induced write failure');
		this.bytes = JSON.stringify(record);
		return { ok: true };
	}
	async remove() {
		if (this.removeMode === 'throw') throw new Error('avc-basic: induced removal failure');
		this.bytes = null;
	}
}

/** Fresh kit environment from the fixture (clock, data, port, session, events). */
export function makeEnv(fixture, opts = {}) {
	const clock = createReplayClock({ horizon: fixture.horizonInstant, start: opts.start ?? T0 });
	const data = createDataSession({
		clock,
		source: { bars: fixture.bars },
		rules: { symbol: fixture.symbol, baseTimeframe: fixture.timeframe }
	});
	const port = new DeferredPort();
	const events = [];
	const session = new ReplaySession(
		{ clock, persistence: port },
		{ onEvent: (e) => events.push(e), genId: opts.genId ?? deterministicGenId }
	);
	return { clock, data, port, session, events };
}

/** Committed baseline: acknowledged fresh session, start(T0) committed via
 * auto-ok port; port returned to deferred ('manual') mode. */
export async function setupCommitted(env) {
	env.session.acknowledgeState(null);
	env.port.mode = 'auto-ok';
	const r = await env.session.start(T0);
	if (!r.ok) throw new Error('setupCommitted: start failed: ' + (r.code ?? '?'));
	env.port.mode = 'manual';
	return r;
}

let _fixture = null;
export function initFixture(f) {
	_fixture = f;
}
function fixture() {
	if (!_fixture) throw new Error('call initFixture(fixture) first');
	return _fixture;
}

/** Full observation sample: live state, data slice, storage bytes, events. */
export function sample(env) {
	const s = env.session;
	const rec = env.port.record;
	const b = env.data.bars({ granularity: fixture().timeframe });
	const last = b.bars.length ? b.bars[b.bars.length - 1] : null;
	return {
		clockNow: env.clock.now(),
		stateInstant: s.currentState().instant,
		stepIndex: s.currentStep(),
		playing: s.isPlaying,
		returnedToCurrent: s.hasReturnedToCurrent,
		levels: s.levelsAll(),
		barsCount: b.bars.length,
		lastBar: last ? { time: last.time, close: last.close } : null,
		clockOpCount: env.clock.records().length,
		queryCount: env.data.queryRecords().length,
		stored: rec
			? {
					instant: rec.instant,
					stepIndex: rec.stepIndex,
					playing: rec.playing,
					levelCount: (rec.levels ?? []).length,
					returnedToCurrent: rec.returnedToCurrent
				}
			: null,
		storedBytes: rec === null ? null : JSON.stringify(rec),
		eventCount: env.events.length,
		eventTypes: env.events.map((e) => e.type)
	};
}

/** Live-state equality helper (every falsification-relevant field). */
export function liveEquals(a, b) {
	return (
		a.clockNow === b.clockNow &&
		a.stateInstant === b.stateInstant &&
		a.stepIndex === b.stepIndex &&
		a.playing === b.playing &&
		a.returnedToCurrent === b.returnedToCurrent &&
		JSON.stringify(a.levels) === JSON.stringify(b.levels)
	);
}

/** Let the FIFO chain progress: several microtask hops + one macrotask. */
export async function flush() {
	await new Promise((r) => setTimeout(r, 0));
	await Promise.resolve();
	await Promise.resolve();
	await new Promise((r) => setTimeout(r, 0));
}

/** Fresh session adopting current storage bytes (reload simulation). */
export function freshAdopt(env) {
	const rec = env.port.record;
	const clock = createReplayClock({ horizon: fixture().horizonInstant, start: rec ? rec.instant : T0 });
	const session = new ReplaySession(
		{ clock, persistence: env.port },
		{ genId: deterministicGenId }
	);
	session.acknowledgeState(rec);
	return {
		instant: clock.now(),
		stepIndex: session.currentStep(),
		levels: session.levelsAll(),
		returnedToCurrent: session.hasReturnedToCurrent,
		playing: session.isPlaying, // transport flag: kit never auto-plays on adopt (documented)
		record: rec ? clone(rec) : null
	};
}

export const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
