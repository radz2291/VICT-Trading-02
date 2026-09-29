/**
 * Public type contracts for @vict-trading/chart-workspace.
 *
 * The package owns headless chart + drawing behavior ONLY. Data (bars),
 * instrument/timeframe vocabularies, fixtures, storage keys, and product
 * wording are the CONSUMER's concern: bars and persistence arrive through
 * the call sites and the PersistencePort below.
 */

/** One OHLC bar. `time` is unix seconds (UTC). Provided by the consumer. */
export interface Bar {
	time: number;
	open: number;
	high: number;
	low: number;
	close: number;
}

/**
 * A horizontal price level (the supported drawing type).
 *
 * Anchoring: a level anchors to a PRICE-AXIS coordinate on the instrument
 * it was drawn on. It renders across all market time and survives pan,
 * zoom, and timeframe change. `symbol` and `createdAt` are metadata the
 * consumer attaches at creation; `createdAt` is wall-clock metadata, NOT a
 * market-time coordinate.
 */
export interface PriceLevel {
	id: string;
	price: number;
	note?: string;
	/** instrument the level was drawn on (consumer enriches at creation) */
	symbol?: string;
	/** creation time, unix seconds wall-clock metadata (consumer enriches) */
	createdAt?: number;
}

export interface CrosshairRead {
	price: number;
	time: number | null;
	/** the bar under the crosshair, for OHLC readout */
	bar: Bar | null;
}

export interface ChartController {
	setData(bars: Bar[]): void;
	/** Replace the full set of drawn horizontal levels (diffed by level id). */
	setLevels(levels: PriceLevel[]): void;
	/** Visually highlight the selected level; null clears. */
	setSelected(id: string | null): void;
	/** Price currently under the crosshair + bar OHLC (price-coordinate mapping). */
	readCrosshair(): CrosshairRead | null;
	/** Screen-y → price (anchored mapping used for hit-testing and drags). */
	coordinateToPrice(y: number): number | null;
	/** Price → screen-y (anchored mapping; null when off the visible scale). */
	priceToCoordinate(price: number): number | null;
	destroy(): void;
}

export interface ChartCallbacks {
	onCrosshairMove(read: CrosshairRead | null): void;
	/** User clicked empty chart space (small movement) → create a level at that price. */
	onCreateAtPrice(price: number): void;
	/** User clicked/pressed on an existing level → select it. */
	onSelectLevel(id: string): void;
	/** Finished dragging a level to a new price (final — dispatched once). */
	onLevelMoved(id: string, price: number): void;
}

export interface ChartHost {
	/** container element (sized by consumer CSS; the chart auto-sizes to it) */
	container: HTMLElement;
}

/** The outcome of one persistence-port operation. */
export type PortResult = { ok: true } | { ok: false; code: string; message: string };

/** One mutation the workspace asks its persistence port to apply. */
export type PersistenceOp =
	| { type: 'save'; level: PriceLevel }
	| { type: 'update'; id: string; price: number; note?: string }
	| { type: 'delete'; id: string };

/**
 * Persistence port — storage is the CONSUMER's concern. The package never
 * touches storage, never owns storage keys, and never persists anything by
 * itself. The consumer supplies an adapter implementing this interface
 * (browser localStorage, IndexedDB, a file, a test double …).
 *
 * Read-gate responsibility split (two layers, defense-in-depth):
 *  1. ADAPTER (byte protection): your adapter must refuse every write after
 *     a failed read of the stored collection, so corrupt/unreadable storage
 *     is never overwritten blind. The package cannot do this — it never
 *     sees your storage.
 *  2. WORKSPACE (intrinsic ordering gate): the workspace refuses every
 *     mutation until you call `acknowledgeRead(levels)` with the result of
 *     a SUCCESSFUL read, returning ok:false with code READ_NOT_ACKNOWLEDGED
 *     before that. This is an additional layer over data the workspace was
 *     fed — it does not replace your adapter's duty.
 */
export interface WorkspacePersistence {
	/**
	 * Optional consumer read hook — READS ARE THE CONSUMER'S CONCERN and the
	 * package never calls it. The consumer reads storage itself and reports a
	 * SUCCESSFUL read to the workspace via `DrawingWorkspace.acknowledgeRead(levels)`.
	 * May be omitted entirely; if present it should still throw on failure so
	 * a consumer reusing it internally keeps honest failure semantics.
	 */
	readLevels?(): PriceLevel[];
	/** Apply one mutation. Reject (throw or return ok:false) to refuse. */
	apply(op: PersistenceOp): Promise<PortResult>;
}
