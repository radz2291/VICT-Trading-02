/**
 * @vict-trading/trading-kit — public API.
 *
 * Replay + script contracts: replay clock with a hard future-guard (R1),
 * capped+recorded data queries (R1), availability semantics (R2), drawing
 * visibility provenance rules (R3/D-003), a ReplaySession persisted only
 * through a consumer-supplied port, and — since G3 — deterministic run
 * identity, the ScriptRuntime sandbox port (with the selected QuickJS
 * runtime), and the bounded deterministic backtest runner.
 *
 * The kit imports nothing from any app or from @vict-trading/chart-workspace,
 * never renders, never fetches, owns no storage, and never consults the wall
 * clock for market-time decisions. Runtime dependency: quickjs-emscripten
 * (the selected script sandbox; A1 evidence in docs/evidence/G3/selection/).
 */
export { createReplayClock } from './clock.js';
export type { ReplayClock, ReplayClockConfig, ClockSnapshot } from './clock.js';
export { createDataSession } from './data.js';
export type { BarsResult, DataSession, DataSessionConfig } from './data.js';
export { ReplaySession } from './session.js';
export type { MutationOutcome, ReplaySessionDeps } from './session.js';
export { visibilityAt, visibilityInReplay, stampReplayCreation } from './visibility.js';
export type { VisibilityContext } from './visibility.js';
export { canonicalJson, sha256Hex, scriptRevision, dataRevision, runIdentity } from './identity.js';
export type { RunIdentity, RunIdentityInput } from './identity.js';
export { DRIVER_SOURCE, DEFAULT_RUNTIME_LIMITS } from './script.js';
export type {
	RuntimeLimits,
	SandboxRunError,
	SandboxRunRequest,
	SandboxRunResult,
	ScriptErrorCode,
	ScriptRuntime
} from './script.js';
export { createQuickJsScriptRuntime, QUICKJS_VERSION } from './sandbox/quickjs.js';
export { runBacktest, MAX_RUN_BARS, RUNNER_KIND, RUNNER_VERSION } from './backtest.js';
export type {
	BacktestAssumptions,
	BacktestConfig,
	BacktestResult,
	BacktestStats
} from './backtest.js';
export type {
	Bar,
	BarsSource,
	ClockRecord,
	FillAssumptions,
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
	SimulatedFill,
	Timeframe,
	UnfilledOrder,
	VisibilityVerdict
} from './types.js';
export { TF_SECONDS } from './types.js';
