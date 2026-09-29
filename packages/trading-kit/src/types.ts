/**
 * Public type contracts for @vict-trading/trading-kit.
 *
 * The kit owns replay RULES only (clock capping, availability semantics,
 * drawing-visibility provenance rules, session transitions). It never
 * renders, never fetches, never touches storage: the data SOURCE and the
 * SessionPersistence port are consumer-supplied (D-002). Runtime deps: none.
 */

/** One OHLC bar. `time` is unix seconds (UTC, market time). Consumer-provided. */
export interface Bar {
	time: number;
	open: number;
	high: number;
	low: number;
	close: number;
}

export type Timeframe = '15m' | '1h' | '4h';

export const TF_SECONDS: Record<Timeframe, number> = {
	'15m': 900,
	'1h': 3600,
	'4h': 14400
};

/** Granularity descriptor for a query. Base is the source's native cadence. */
export type Granularity = Timeframe;

/** Instrument/timeframe identity rules the consumer pins at session creation. */
export interface InstrumentRules {
	symbol: string;
	baseTimeframe: Timeframe;
}

/** Consumer-provided data source: a base-granularity bar series (no fetching). */
export interface BarsSource {
	/** base-granularity bars, ascending by time; must be the FULL history available */
	bars: Bar[];
}

/** One clock operation, recorded for evidence (hard future-guard audit). */
export interface ClockRecord {
	op: 'advance' | 'setFrame';
	/** requested target/step instant (unix seconds) */
	requested: number;
	/** applied instant after horizon capping (unix seconds) */
	applied: number;
	/** true when the request was capped by the horizon */
	capped: boolean;
}

/** One data query record — the R1 evidence channel. */
export interface QueryRecord {
	kind: 'bars';
	granularity: Granularity;
	/** what the caller asked for (unix seconds; null = "everything") */
	requestedUntil: number | null;
	/** what was actually served: min(requestedUntil ?? +inf, clock.now()) */
	servedUntil: number;
	/** true when servedUntil < requestedUntil (observably capped) */
	capped: boolean;
	/** number of bars returned */
	count: number;
	/** query sequence number */
	seq: number;
}

/**
 * An explicit unavailability interval (R2 — gaps are NEVER bridged).
 * Future-honesty (owner correction-cycle-2 ruling, normative): availability
 * is computed ONLY from clock-visible information — the available prefix
 * (close ≤ clock) plus the clock-visible bound (now/horizon). Interior gaps
 * are detected between consecutive AVAILABLE bars; `to` is a number ONLY
 * when the resumption bar's close is already within the clock's availability;
 * otherwise the gap is OPEN-ENDED (`to: null`). The availability edge is
 * emitted uniformly as a trailing open-ended interval (`from` = last
 * available close, `to: null`) whenever that close precedes the clock —
 * NO lookahead into the source beyond the available prefix, ever — so public
 * outputs cannot change when post-clock source bars are added or removed.
 * No entry is emitted when availability is current through the clock
 * (lastAvailableClose === now): the not-yet-closed next slot is undelivered
 * future, honestly invisible.
 */
export interface MissingInterval {
	status: 'missing';
	/** interval start (exclusive of the previous bar's close), unix seconds */
	from: number;
	/** interval end (next available bar open), unix seconds — null while the resumption is not yet within the clock's availability */
	to: number | null;
}

/** Provenance classes (R3 / D-002 as amended by D-003). */
export type ProvenanceClass = 'market-time-anchored' | 'replay-stamped' | 'provenance-unknown';

/** Visibility verdict with the rule that produced it (evidence, not vibes). */
export interface VisibilityVerdict {
	visible: boolean;
	reason: string;
}

/** A drawing the kit reasons about. The kit never renders. */
export interface ProvenancedDrawing {
	id: string;
	provenance: ProvenanceClass;
	/** replay stamp (market-time instant of creation, unix seconds) — class (b) only */
	creationInstant?: number;
	/** replay step index at creation — class (b) only */
	creationStep?: number;
}

/**
 * Replay session persistence port — storage is the CONSUMER's concern
 * (D-002 choice 3). The kit owns the session RULES; the port moves bytes.
 * Read-before-write acknowledgment (chart-workspace pattern): the session
 * refuses persistence mutations with READ_NOT_ACKNOWLEDGED until a
 * successful read() result has been acknowledged via acknowledgeState().
 * The kit is transactional on top of this port: it persists the NEXT-state
 * record FIRST and commits its live state only after a successful write —
 * a write() that resolves {ok:false} (surfaced as code WRITE_REFUSED) or
 * throws (code PORT_ERROR) leaves the live session state completely
 * unchanged, so ports may fail without corrupting the session.
 */
export interface SessionPersistence {
	/** Full read of the stored session record. THROW on failure. */
	read(): SessionRecord | null;
	/** Persist the session record. May throw or resolve ok:false to refuse. */
	write(record: SessionRecord): Promise<{ ok: true } | { ok: false; code: string; message: string }>;
	/** Optional: remove the stored record (deliberate reset). */
	remove?(): Promise<void> | void;
}

/** Persisted replay session record: clock instant + step index + stamped drawings. */
export interface SessionRecord {
	version: 1;
	symbol: string;
	/** current replay instant (unix seconds, ≤ horizon) */
	instant: number;
	/** step index (count of advance operations since start) */
	stepIndex: number;
	/** running state of the transport */
	playing: boolean;
	/** replay-stamped drawings created during this session */
	levels: ReplayLevel[];
	/** true once returnToCurrent() was executed (session ended honestly) */
	returnedToCurrent: boolean;
}

/** A drawing created DURING replay — replay-stamped (R3 class b) by construction. */
export interface ReplayLevel {
	id: string;
	symbol: string;
	price: number;
	note?: string;
	/** market-time instant of creation = clock.now() at stamp time */
	creationInstant: number;
	/** step index at creation */
	creationStep: number;
}

/** Evidence event emitted on every session transition. */
export interface SessionEvent {
	type: 'start' | 'step' | 'play' | 'pause' | 'restore' | 'reset' | 'returnToCurrent' | 'level-created' | 'level-removed';
	/** event sequence number */
	seq: number;
	/** clock instant after the transition */
	instant: number;
	stepIndex: number;
	detail?: Record<string, unknown>;
}

export interface ReplaySessionOptions {
	onEvent?: (event: SessionEvent) => void;
	/** id generator for replay-stamped levels; injectable for tests */
	genId?: () => string;
}
