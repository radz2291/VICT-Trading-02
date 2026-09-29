/**
 * ReplaySession — start/step/play/pause/restore/reset/returnToCurrent over
 * a ReplayClock + DataSession, persisted ONLY through the consumer-supplied
 * SessionPersistence port (D-002 choice 3: kit owns rules, app owns storage).
 *
 * Read-before-write acknowledgment (chart-workspace pattern): every
 * persistence mutation is refused with READ_NOT_ACKNOWLEDGED until the
 * consumer acknowledges a SUCCESSFUL port read via acknowledgeState().
 * Additionally (contested-case remediation) EVERY persisted mutation
 * re-verifies readability of the stored record before applying: on read
 * failure it is refused with READ_FAILED, stored bytes untouched, live
 * state unchanged — recovery is automatic once a read succeeds again.
 * Every transition is emitted on the evidence channel with the recorded
 * rules. The kit never touches storage itself.
 */
import type { ReplayClock } from './clock.js';
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
	 * Per-operation re-verification (contested-case remediation): the
	 * one-shot construction-time acknowledgment is NOT enough — EVERY
	 * persisted mutation first re-reads (re-verifies readability of) the
	 * stored record. On read failure the operation is REFUSED with
	 * READ_FAILED, no in-memory state changes, no write occurs, and the
	 * stored bytes are untouched. Recovery: once a successful read
	 * completes (via this check or an explicit acknowledgeState after a
	 * successful consumer read), subsequent operations work again —
	 * acknowledgeState() itself is only required once, at construction.
	 * Returns the fresh record on success, null is never a failure here.
	 */
	private reverify(): { outcome: MutationOutcome | null; record: SessionRecord | null } {
		try {
			const record = this.persistence.read();
			this.lastRead = record;
			return { outcome: null, record };
		} catch (e) {
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

	private async persist(): Promise<MutationOutcome> {
		const record: SessionRecord = {
			version: 1,
			symbol: '',
			instant: this.clock.now(),
			stepIndex: this.stepCounter,
			playing: this.playing,
			levels: this.levels.map((l) => ({ ...l })),
			returnedToCurrent: this.returnedToCurrent
		};
		try {
			const r = await this.persistence.write(record);
			if (r && r.ok === false) return { ok: false, code: r.code, message: r.message };
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
		this.clock.setFrame(fromInstant);
		this.levels = [];
		this.stepCounter = 1; // start counts as the first frame
		this.returnedToCurrent = false;
		this.emit('start', { fromInstant });
		return this.persist();
	}

	/** Advance the clock by one caller-chosen step and persist. */
	async step(stepSeconds: number): Promise<MutationOutcome> {
		const gated = this.gate();
		if (gated) return gated;
		const rv = this.reverify();
		if (rv.outcome) return rv.outcome;
		this.clock.advance(stepSeconds);
		this.stepCounter += 1;
		this.emit('step', { stepSeconds, capped: this.clock.now() >= this.clock.horizon() });
		return this.persist();
	}

	async play(): Promise<MutationOutcome> {
		const gated = this.gate();
		if (gated) return gated;
		const rv = this.reverify();
		if (rv.outcome) return rv.outcome;
		this.playing = true;
		this.emit('play');
		return this.persist();
	}

	async pause(): Promise<MutationOutcome> {
		const gated = this.gate();
		if (gated) return gated;
		const rv = this.reverify();
		if (rv.outcome) return rv.outcome;
		this.playing = false;
		this.emit('pause');
		return this.persist();
	}

	/**
	 * Restore the exact persisted session (clock instant + step index +
	 * stamped drawings). Returns the restored record; ok:false NEVER silently
	 * overwrites anything.
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
		this.clock.setFrame(record.instant);
		this.levels = (record.levels ?? []).map((l) => ({ ...l }));
		this.stepCounter = record.stepIndex ?? this.stepCounter;
		this.playing = false;
		this.emit('restore', { restoredInstant: record.instant, restoredStepIndex: record.stepIndex });
		const p = await this.persist();
		return p.ok ? { ok: true, record } : p;
	}

	/** Deliberately discard the persisted session (removes the record). */
	async reset(): Promise<MutationOutcome> {
		const gated = this.gate();
		if (gated) return gated;
		const rv = this.reverify();
		if (rv.outcome) return rv.outcome;
		this.levels = [];
		this.playing = false;
		this.stepCounter = 0;
		this.returnedToCurrent = false;
		this.emit('reset');
		if (this.persistence.remove) {
			try {
				await this.persistence.remove();
			} catch (e) {
				return { ok: false, code: 'PORT_ERROR', message: e instanceof Error ? e.message : 'port error' };
			}
		}
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
		this.playing = false;
		this.returnedToCurrent = true;
		this.emit('returnToCurrent');
		return this.persist();
	}

	// ---- replay-stamped drawings ------------------------------------------

	/** Create a replay-stamped level at `price` (stamped with clock.now()). */
	async createLevel(price: number, note?: string): Promise<MutationOutcome & { id?: string }> {
		const gated = this.gate();
		if (gated) return gated;
		const rv = this.reverify();
		if (rv.outcome) return rv.outcome;
		if (!Number.isFinite(price)) return { ok: false, code: 'INVALID_INPUT', message: 'price must be finite' };
		const level: ReplayLevel = {
			id: this.genId(),
			symbol: '',
			price,
			note,
			creationInstant: this.clock.now(),
			creationStep: this.stepCounter
		};
		this.levels.push(level);
		this.emit('level-created', { id: level.id, creationInstant: level.creationInstant, creationStep: level.creationStep });
		const p = await this.persist();
		return p.ok ? { ok: true, id: level.id } : p;
	}

	async removeLevel(id: string): Promise<MutationOutcome> {
		const gated = this.gate();
		if (gated) return gated;
		const rv = this.reverify();
		if (rv.outcome) return rv.outcome;
		const before = this.levels.length;
		this.levels = this.levels.filter((l) => l.id !== id);
		if (this.levels.length === before) return { ok: false, code: 'NOT_FOUND', message: 'no level ' + id };
		this.emit('level-removed', { id });
		return this.persist();
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
