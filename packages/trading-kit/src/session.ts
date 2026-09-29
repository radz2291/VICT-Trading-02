/**
 * ReplaySession — start/step/play/pause/restore/reset/returnToCurrent over
 * a ReplayClock + DataSession, persisted ONLY through the consumer-supplied
 * SessionPersistence port (D-002 choice 3: kit owns rules, app owns storage).
 *
 * Read-before-write acknowledgment (chart-workspace pattern): every
 * persistence mutation is refused with READ_NOT_ACKNOWLEDGED until the
 * consumer acknowledges a SUCCESSFUL port read via acknowledgeState().
 * Additionally:
 *  - per-operation re-verification: EVERY persisted mutation re-reads the
 *    stored record first; on read failure it is refused with READ_FAILED,
 *    no write occurs, stored bytes untouched, live state unchanged.
 *  - TRANSACTIONAL writes (owner correction-cycle-2 ruling): every persisted
 *    operation computes its NEXT state (clock target via the ReplayClock
 *    snapshot/restore primitive; levels/playing/returnedToCurrent are plain
 *    fields), PERSISTS THE NEXT-STATE RECORD FIRST, and only on a successful
 *    write commits the live state. On a refused or failed write the outcome
 *    is ok:false WITH a truthful code (WRITE_REFUSED when the port resolves
 *    ok:false; PORT_ERROR when the port throws), the live state is restored
 *    verbatim (clock instant, step index, drawings, playing,
 *    returnedToCurrent — and the clock's operation log), and no stored bytes
 *    are changed. A subsequent successful write simply works (recovery).
 *  - restore()'s write-commit is transactional too: the persisted record is
 *    written FIRST; live state adopts it only on success.
 *  - reset()'s record REMOVAL is transactional: if the removal fails, live
 *    state does not change (the session stays active at its prior position).
 *
 * Order in every persisted operation: gate → re-verify → compute next state
 * → persist(next) → commit → emit. Emit reflects COMMITTED state only.
 * The kit never touches storage itself.
 */
import type { ClockSnapshot, ReplayClock } from './clock.js';
import type {
	ReplayLevel,
	ReplaySessionOptions,
	SessionEvent,
	SessionPersistence,
	SessionRecord
} from './types.js';

export interface ReplaySessionDeps {
	clock: ReplayClock;
	persistence: SessionPersistence;
}

export interface MutationOutcome {
	ok: boolean;
	code?: string;
	message?: string;
}

/** Live-state snapshot used to make each persisted operation transactional. */
interface StateSnapshot {
	clock: ClockSnapshot;
	levels: ReplayLevel[];
	playing: boolean;
	returnedToCurrent: boolean;
	stepCounter: number;
}

export class ReplaySession {
	private readonly clock: ReplayClock;
	private readonly persistence: SessionPersistence;
	private readonly onEvent?: (event: SessionEvent) => void;
	private readonly genId: () => string;

	private readAcknowledged = false;
	private levels: ReplayLevel[] = [];
	private playing = false;
	private returnedToCurrent = false;
	private eventSeq = 0;
	private lastRead: SessionRecord | null = null;
	/**
	 * Session step index — the persisted step semantics (start = 1, each
	 * step() +1, restore adopts the persisted value). Deliberately NOT the
	 * clock's operation count: setFrame operations (start/restore) would
	 * otherwise desynchronize step-stamped visibility after a restore.
	 */
	private stepCounter = 0;

	constructor(deps: ReplaySessionDeps, opts: ReplaySessionOptions = {}) {
		this.clock = deps.clock;
		this.persistence = deps.persistence;
		this.onEvent = opts.onEvent;
		this.genId = opts.genId ?? (() => 'rlvl-' + Math.random().toString(36).slice(2, 10));
	}

	// ---- acknowledgment gate ---------------------------------------------

	/**
	 * Acknowledge a SUCCESSFUL consumer-side read of the persisted record.
	 * Required before the first persisted mutation; until then every
	 * persistence write is refused with READ_NOT_ACKNOWLEDGED.
	 */
	acknowledgeState(record: SessionRecord | null): void {
		this.lastRead = record;
		this.readAcknowledged = true;
		if (record && record.version === 1 && !record.returnedToCurrent) {
			// adopt persisted stamped drawings + transport state into live state
			this.levels = record.levels ?? [];
			this.stepCounter = record.stepIndex ?? 0;
			this.playing = false; // never auto-play on restore; explicit only
		}
	}

	get acknowledged(): boolean {
		return this.readAcknowledged;
	}

	private gate(): MutationOutcome | null {
		if (this.readAcknowledged) return null;
		return {
			ok: false,
			code: 'READ_NOT_ACKNOWLEDGED',
			message: 'no successful read acknowledged yet — call acknowledgeState(await persistence.read()) after your read succeeds'
		};
	}

	/**
	 * Per-operation re-verification: the one-shot construction-time
	 * acknowledgment is NOT enough — EVERY persisted mutation first re-reads
	 * (re-verifies readability of) the stored record. On read failure the
	 * operation is REFUSED with READ_FAILED, no in-memory state changes, no
	 * write occurs, and the stored bytes are untouched. Recovery: once a
	 * successful read completes, subsequent operations work again.
	 */
	private reverify(): { outcome: MutationOutcome | null; record: SessionRecord | null } {
		try {
			const record = this.persistence.read();
			this.lastRead = record;
			return { outcome: null, record };
		} catch {
			return {
				outcome: {
					ok: false,
					code: 'READ_FAILED',
					message: 'stored session record is unreadable — operation refused, stored bytes untouched'
				},
				record: null
			};
		}
	}

	// ---- transactional state primitives ---------------------------------

	private snapshotState(): StateSnapshot {
		return {
			clock: this.clock.snapshot(),
			levels: this.levels,
			playing: this.playing,
			returnedToCurrent: this.returnedToCurrent,
			stepCounter: this.stepCounter
		};
	}

	private restoreState(snap: StateSnapshot): void {
		this.clock.restoreSnapshot(snap.clock);
		this.levels = snap.levels;
		this.playing = snap.playing;
		this.returnedToCurrent = snap.returnedToCurrent;
		this.stepCounter = snap.stepCounter;
	}

	/** Committed live state, for consumers' before/after evidence checks. */
	currentState(): { instant: number; stepIndex: number; levels: ReplayLevel[]; playing: boolean; returnedToCurrent: boolean } {
		return {
			instant: this.clock.now(),
			stepIndex: this.stepCounter,
			levels: this.levelsAll(),
			playing: this.playing,
			returnedToCurrent: this.returnedToCurrent
		};
	}

	// ---- evidence ----------------------------------------------------------

	private emit(type: SessionEvent['type'], detail?: Record<string, unknown>): void {
		this.eventSeq += 1;
		this.onEvent?.({
			type,
			seq: this.eventSeq,
			instant: this.clock.now(),
			stepIndex: this.stepCounter,
			detail
		});
	}

	/**
	 * Persist the NEXT-STATE record. Called BEFORE the live-state commit
	 * (transactional order). Returns ok:false with a truthful code on any
	 * port refusal: WRITE_REFUSED when the port resolves {ok:false},
	 * PORT_ERROR when the port throws.
	 */
	private async persist(record?: SessionRecord): Promise<MutationOutcome> {
		const next: SessionRecord = record ?? {
			version: 1,
			symbol: '',
			instant: this.clock.now(),
			stepIndex: this.stepCounter,
			playing: this.playing,
			levels: this.levels.map((l) => ({ ...l })),
			returnedToCurrent: this.returnedToCurrent
		};
		try {
			const r = await this.persistence.write(next);
			if (r && r.ok === false) {
				return {
					ok: false,
					code: 'WRITE_REFUSED',
					message: `persistence port refused the write: ${r.code ?? 'unnamed'}: ${r.message ?? 'no message'} — no state change`
				};
			}
			return { ok: true };
		} catch (e) {
			return { ok: false, code: 'PORT_ERROR', message: e instanceof Error ? e.message : 'port error' };
		}
	}

	// ---- lifecycle ---------------------------------------------------------

	/** Enter replay at a historical instant (unix seconds, must be ≤ horizon). */
	async start(fromInstant: number): Promise<MutationOutcome> {
		const gated = this.gate();
		if (gated) return gated;
		const rv = this.reverify();
		if (rv.outcome) return rv.outcome;
		if (fromInstant > this.clock.horizon()) {
			return { ok: false, code: 'PAST_HORIZON', message: 'start instant is beyond the configured horizon' };
		}
		const snap = this.snapshotState();
		this.clock.setFrame(fromInstant);
		this.levels = [];
		this.stepCounter = 1; // start counts as the first frame
		this.returnedToCurrent = false;
		const p = await this.persist();
		if (!p.ok) {
			this.restoreState(snap);
			return p;
		}
		this.emit('start', { fromInstant });
		return p;
	}

	/** Advance the clock by one caller-chosen step and persist. */
	async step(stepSeconds: number): Promise<MutationOutcome> {
		const gated = this.gate();
		if (gated) return gated;
		const rv = this.reverify();
		if (rv.outcome) return rv.outcome;
		const snap = this.snapshotState();
		this.clock.advance(stepSeconds);
		this.stepCounter += 1;
		const p = await this.persist();
		if (!p.ok) {
			this.restoreState(snap);
			return p;
		}
		this.emit('step', { stepSeconds, capped: this.clock.now() >= this.clock.horizon() });
		return p;
	}

	async play(): Promise<MutationOutcome> {
		const gated = this.gate();
		if (gated) return gated;
		const rv = this.reverify();
		if (rv.outcome) return rv.outcome;
		const snap = this.snapshotState();
		this.playing = true;
		const p = await this.persist();
		if (!p.ok) {
			this.restoreState(snap);
			return p;
		}
		this.emit('play');
		return p;
	}

	async pause(): Promise<MutationOutcome> {
		const gated = this.gate();
		if (gated) return gated;
		const rv = this.reverify();
		if (rv.outcome) return rv.outcome;
		const snap = this.snapshotState();
		this.playing = false;
		const p = await this.persist();
		if (!p.ok) {
			this.restoreState(snap);
			return p;
		}
		this.emit('pause');
		return p;
	}

	/**
	 * Restore the exact persisted session (clock instant + step index +
	 * stamped drawings). The restored record is PERSISTED FIRST and live
	 * state adopts it only on a successful write; on refusal/failure the
	 * live state is untouched. Returns the restored record; ok:false NEVER
	 * silently overwrites anything.
	 */
	async restore(): Promise<MutationOutcome & { record?: SessionRecord | null }> {
		const gated = this.gate();
		if (gated) return gated;
		let record: SessionRecord | null;
		try {
			record = this.persistence.read(); // throws on failure — consumer decides
		} catch (e) {
			return { ok: false, code: 'READ_FAILED', message: e instanceof Error ? e.message : 'read failed' };
		}
		if (!record) return { ok: false, code: 'NO_SESSION', message: 'no persisted session to restore' };
		if (record.returnedToCurrent) {
			return { ok: false, code: 'SESSION_ENDED', message: 'the persisted session already returned to current' };
		}
		this.lastRead = record;
		const snap = this.snapshotState();
		// transactional write-commit: persist the restored record FIRST
		const p = await this.persist(
			{ ...record, levels: (record.levels ?? []).map((l) => ({ ...l })) }
		);
		if (!p.ok) {
			this.restoreState(snap);
			return p;
		}
		this.clock.setFrame(record.instant);
		this.levels = (record.levels ?? []).map((l) => ({ ...l }));
		this.stepCounter = record.stepIndex ?? this.stepCounter;
		this.playing = false;
		this.emit('restore', { restoredInstant: record.instant, restoredStepIndex: record.stepIndex });
		return { ok: true, record };
	}

	/**
	 * Deliberately discard the persisted session (removes the record). The
	 * removal is TRANSACTIONAL: if the port's remove fails (ok:false is not
	 * part of the remove contract, so failures surface as throws) the live
	 * state does NOT change — the session stays active at its prior position.
	 */
	async reset(): Promise<MutationOutcome> {
		const gated = this.gate();
		if (gated) return gated;
		const rv = this.reverify();
		if (rv.outcome) return rv.outcome;
		if (this.persistence.remove) {
			try {
				await this.persistence.remove();
			} catch (e) {
				return {
					ok: false,
					code: 'PORT_ERROR',
					message: 'persistence port failed to remove the session record — no state change: ' + (e instanceof Error ? e.message : 'port error')
				};
			}
		}
		this.levels = [];
		this.playing = false;
		this.stepCounter = 0;
		this.returnedToCurrent = false;
		this.emit('reset');
		return { ok: true };
	}

	/**
	 * Return to the current (non-replay) context: the session is persisted as
	 * ended; the consumer then restores its current-mode view exactly.
	 */
	async returnToCurrent(): Promise<MutationOutcome> {
		const gated = this.gate();
		if (gated) return gated;
		const rv = this.reverify();
		if (rv.outcome) return rv.outcome;
		const snap = this.snapshotState();
		this.playing = false;
		this.returnedToCurrent = true;
		const p = await this.persist();
		if (!p.ok) {
			this.restoreState(snap);
			return p;
		}
		this.emit('returnToCurrent');
		return p;
	}

	// ---- replay-stamped drawings ------------------------------------------

	/** Create a replay-stamped level at `price` (stamped with clock.now()). */
	async createLevel(price: number, note?: string): Promise<MutationOutcome & { id?: string }> {
		const gated = this.gate();
		if (gated) return gated;
		const rv = this.reverify();
		if (rv.outcome) return rv.outcome;
		if (!Number.isFinite(price)) return { ok: false, code: 'INVALID_INPUT', message: 'price must be finite' };
		const snap = this.snapshotState();
		const level: ReplayLevel = {
			id: this.genId(),
			symbol: '',
			price,
			note,
			creationInstant: this.clock.now(),
			creationStep: this.stepCounter
		};
		this.levels = [...this.levels, level];
		const p = await this.persist();
		if (!p.ok) {
			this.restoreState(snap);
			return p;
		}
		this.emit('level-created', { id: level.id, creationInstant: level.creationInstant, creationStep: level.creationStep });
		return { ok: true, id: level.id };
	}

	async removeLevel(id: string): Promise<MutationOutcome> {
		const gated = this.gate();
		if (gated) return gated;
		const rv = this.reverify();
		if (rv.outcome) return rv.outcome;
		const before = this.levels.length;
		const next = this.levels.filter((l) => l.id !== id);
		if (next.length === before) return { ok: false, code: 'NOT_FOUND', message: 'no level ' + id };
		const snap = this.snapshotState();
		this.levels = next;
		const p = await this.persist();
		if (!p.ok) {
			this.restoreState(snap);
			return p;
		}
		this.emit('level-removed', { id });
		return p;
	}

	/** Persisted step semantics: 1 after start, +1 per step, restored exactly. */
	currentStep(): number {
		return this.stepCounter;
	}

	/** Live (unfiltered) replay-stamped levels. */
	levelsAll(): ReplayLevel[] {
		return this.levels.map((l) => ({ ...l }));
	}

	get isPlaying(): boolean {
		return this.playing;
	}

	get hasReturnedToCurrent(): boolean {
		return this.returnedToCurrent;
	}
}