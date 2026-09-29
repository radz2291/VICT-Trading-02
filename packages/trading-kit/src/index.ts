/**
 * @vict-trading/trading-kit — public API.
 *
 * Smallest useful replay contracts (D-002 / G2): replay clock with a hard
 * future-guard (R1), capped+recorded data queries (R1), availability
 * semantics (R2), drawing visibility provenance rules (R3/D-003), and a
 * ReplaySession persisted only through a consumer-supplied port.
 *
 * The kit imports nothing from any app or from @vict-trading/chart-workspace,
 * has zero runtime dependencies, never renders, never fetches, never touches
 * storage, and never consults the wall clock for market-time decisions.
 */
export { createReplayClock } from './clock.js';
export type { ReplayClock, ReplayClockConfig } from './clock.js';
export { createDataSession } from './data.js';
export type { BarsResult, DataSession, DataSessionConfig } from './data.js';
export { ReplaySession } from './session.js';
export type { MutationOutcome, ReplaySessionDeps } from './session.js';
export { visibilityAt, visibilityInReplay, stampReplayCreation } from './visibility.js';
export type { VisibilityContext } from './visibility.js';
export type {
	Bar,
	BarsSource,
	ClockRecord,
	Granularity,
	InstrumentRules,
	MissingInterval,
	ProvenanceClass,
	ProvenancedDrawing,
	QueryRecord,
	ReplayLevel,
	ReplaySessionOptions,
	SessionEvent,
	SessionPersistence,
	SessionRecord,
	Timeframe,
	VisibilityVerdict
} from './types.js';
export { TF_SECONDS } from './types.js';
