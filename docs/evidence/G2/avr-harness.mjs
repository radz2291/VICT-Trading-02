// avr-harness.mjs — verifier-owned harness for the G2 async-persistence
// reproduction. Written from the kit's PUBLIC contract (types.ts:
// SessionPersistence), independently of the builder's scripts.
//
// Port model (the only faithful reading of the contract):
//   read()  — synchronous; returns committed bytes (clone); THROWS on failure.
//   write() — returns a promise. Resolving {ok:false} = refusal (WRITE_REFUSED);
//             rejecting = PORT_ERROR; resolving {ok:true} COMMITS the captured
//             record to storage AT RESOLUTION TIME. The record content is
//             captured at CALL time (deep clone) so later live mutations can
//             never alias into already-issued writes.
//   remove()— same deferral; ok clears storage, rejection = removal failure.
import { createReplayClock, createDataSession, ReplaySession } from '@vict-trading/trading-kit';
import { readFileSync } from 'node:fs';

export const T0 = 1767571200; // fixture replay start (unix seconds)

export function loadFixture(path = './fixture.json') {
	return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
}

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

let idCounter = 0;
export function deterministicGenId() {
	idCounter += 1;
	return 'avr-lvl-' + String(idCounter).padStart(3, '0');
}
export function resetIdCounter() {
	idCounter = 0;
}

/**
 * Verifier-owned deferred-write SessionPersistence implementation.
 * settle(id, outcome) resolves pending ops in ANY order (id = issue order).
 */
export class DeferredPort {
	constructor() {
		this.record = null; // committed storage bytes (SessionRecord | null)
		this.mode = 'manual'; // 'manual' | 'auto-ok' | 'refuse' | 'throw'
		this.pending = new Map(); // id -> {kind, recordSnapshot, resolve, reject}
		this.nextId = 0;
		this.log = []; // ordered audit of every port call and settle
	}
	read() {
		this.log.push({ op: 'read', pendingCount: this.pending.size });
		if (this.readFail) throw new Error('avr-port: induced read failure');
		return this.record === null ? null : clone(this.record);
	}
	write(next) {
		const snapshot = clone(next);
		const id = this.nextId++;
		if (this.mode === 'throw') {
			this.log.push({ op: 'write', id, threw: true });
			return Promise.reject(new Error('avr-port: induced write failure'));
		}
		if (this.mode === 'refuse') {
			this.log.push({ op: 'write', id, refused: true });
			return Promise.resolve({ ok: false, code: 'AVR_REFUSED', message: 'refused by avr test port' });
		}
		if (this.mode === 'auto-ok') {
			this.record = snapshot;
			this.log.push({ op: 'write', id, committedInline: true });
			return Promise.resolve({ ok: true });
		}
		this.log.push({ op: 'write', id, deferred: true, record: snapshot });
		return new Promise((resolve, reject) => {
			this.pending.set(id, { kind: 'write', recordSnapshot: snapshot, resolve, reject });
		});
	}
	async remove() {
		const id = this.nextId++;
		if (this.mode === 'throw') {
			this.log.push({ op: 'remove', id, threw: true });
			throw new Error('avr-port: induced removal failure');
		}
		if (this.mode === 'auto-ok') {
			this.record = null;
			this.log.push({ op: 'remove', id, committedInline: true });
			return;
		}
		this.log.push({ op: 'remove', id, deferred: true });
		await new Promise((resolve, reject) => {
			this.pending.set(id, { kind: 'remove', resolve, reject });
		});
	}
	/** outcome: 'ok' | 'refuse' | 'throw'. For writes: ok commits captured bytes NOW. */
	settle(id, outcome) {
		const e = this.pending.get(id);
		if (!e) throw new Error('avr-port: no pending op id=' + id);
		this.pending.delete(id);
		if (e.kind === 'write') {
			if (outcome === 'ok') {
				this.record = e.recordSnapshot;
				this.log.push({ op: 'settle', id, outcome: 'ok' });
				e.resolve({ ok: true });
			} else if (outcome === 'refuse') {
				this.log.push({ op: 'settle', id, outcome: 'refuse' });
				e.resolve({ ok: false, code: 'AVR_REFUSED', message: 'refused by avr test port' });
			} else {
				this.log.push({ op: 'settle', id, outcome: 'throw' });
				e.reject(new Error('avr-port: induced write failure'));
			}
		} else {
			if (outcome === 'ok') {
				this.record = null;
				this.log.push({ op: 'settle', id, outcome: 'ok' });
				e.resolve();
			} else {
				this.log.push({ op: 'settle', id, outcome: 'throw' });
				e.reject(new Error('avr-port: induced removal failure'));
			}
		}
	}
	pendingIds() {
		return [...this.pending.keys()];
	}
}

/** Fresh kit environment from the fixture (fresh clock, data, port, session). */
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

/** Committed baseline for probes: acknowledged fresh session, start(T0) already
 * committed via auto-ok port; port returned to deferred ('manual') mode. */
export async function setupCommitted(env) {
	env.session.acknowledgeState(null);
	env.port.mode = 'auto-ok';
	const r = await env.session.start(T0);
	if (!r.ok) throw new Error('setupCommitted: start failed: ' + (r.code ?? '?'));
	env.port.mode = 'manual';
	return r;
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

// fixture singleton for sample()'s granularity (kept simple: one fixture per run)
let _fixture = null;
export function initFixture(f) {
	_fixture = f;
}
function fixture() {
	if (!_fixture) throw new Error('call initFixture(fixture) first');
	return _fixture;
}

/** Live-state equality helper (every field the task lists). */
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
