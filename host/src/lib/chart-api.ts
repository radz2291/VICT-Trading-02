/**
 * G1-PKG: the chart capability moved to @vict-trading/chart-workspace.
 * This shim keeps host import paths (`$lib/chart-api.js`) stable while the
 * app consumes the package through its public exports only.
 */
export type {
	Bar,
	CrosshairRead,
	ChartCallbacks,
	ChartController,
	ChartHost,
	PriceLevel as Level,
	WorkspacePersistence,
	PersistenceOp,
	PortResult,
	OverlayHandle,
	OverlayMarker,
	OverlayPoint,
	OverlaySpec
} from '@vict-trading/chart-workspace';
