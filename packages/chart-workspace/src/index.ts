/**
 * @vict-trading/chart-workspace — public API.
 *
 * Small, documented surface. Everything not exported here is internal.
 * The package imports nothing from any host app and owns no storage.
 */
export { createLwcChart as createChart } from './lwc.js';
export { DrawingWorkspace } from './workspace.js';
export type { CreateLevelInput, MutationResult, WorkspaceOptions } from './workspace.js';
export type { OverlayHandle, OverlayMarker, OverlayPoint, OverlaySpec } from './types.js';
export {
	isBar,
	isFiniteNumber,
	isNonEmptyString,
	isPriceLevel,
	validateCreateInput,
	validateUpdateInput
} from './validate.js';
export type {
	Bar,
	ChartCallbacks,
	ChartController,
	ChartHost,
	CrosshairRead,
	PersistenceOp,
	PortResult,
	PriceLevel,
	WorkspacePersistence
} from './types.js';
