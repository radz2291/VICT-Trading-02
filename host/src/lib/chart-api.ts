/**
 * Thin candidate-neutral chart interface for the G0 spike.
 * Each candidate implements this; the islands never import a candidate
 * directly, keeping the comparison honest (same fixture, same contract).
 */

import type { Bar } from './fixture.js';

export interface Level {
	id: string;
	price: number;
	note?: string;
}

export interface CrosshairRead {
	price: number;
	time: number | null;
}

export interface ChartController {
	setData(bars: Bar[]): void;
	/** Replace the full set of drawn horizontal levels (diffing done by impl). */
	setLevels(levels: Level[]): void;
	/** Price currently under the crosshair, plus the bar time if on a bar. */
	readCrosshair(): CrosshairRead | null;
	destroy(): void;
}

export interface ChartCallbacks {
	onCrosshairMove(read: CrosshairRead | null): void;
	/** Fire when the user clicks the chart (candidate adds level at that price). */
	onAddLevelAtPrice(price: number): void;
}

export interface ChartHost {
	/** container element (sized by CSS) */
	container: HTMLElement;
	width: number;
	height: number;
}

export const CANDIDATES = ['lightweight-charts', 'uPlot'] as const;
export type CandidateName = (typeof CANDIDATES)[number];
