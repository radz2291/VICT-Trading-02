/**
 * Candidate-neutral chart interface.
 *
 * G1: the product workspace uses lightweight-charts only (G0 selection,
 * verifier-confirmed). The interface stays candidate-neutral so a future
 * candidate comparison (G2+) can slot in without touching island logic.
 */

import type { Bar } from './fixture.js';

export interface Level {
	id: string;
	price: number;
	note?: string;
	/** instrument the level was drawn on (host enriches at creation) */
	symbol?: string;
	/** creation time, unix seconds (host enriches at creation) */
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
	/** Replace the full set of drawn horizontal levels (diffing done by impl). */
	setLevels(levels: Level[]): void;
	/** Visually highlight the selected level; null clears. */
	setSelected(id: string | null): void;
	/** Price currently under the crosshair + bar OHLC. */
	readCrosshair(): CrosshairRead | null;
	destroy(): void;
}

export interface ChartCallbacks {
	onCrosshairMove(read: CrosshairRead | null): void;
	/** User clicked empty chart space (small movement) → create a level at that price. */
	onCreateAtPrice(price: number): void;
	/** User clicked/pressed on an existing level → select it. */
	onSelectLevel(id: string): void;
	/** Finished dragging a level to a new price (final — dispatch once). */
	onLevelMoved(id: string, price: number): void;
}

export interface ChartHost {
	/** container element (sized by CSS; the chart auto-sizes to it) */
	container: HTMLElement;
}
