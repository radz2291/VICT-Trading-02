/**
 * R3 visibility predicates — provenance classes and replay stamps.
 *
 * Rules (D-002 as AMENDED by D-003):
 *  - `provenance-unknown` (class c): HIDDEN in replay entirely — a label
 *    cannot keep the drawing's price level from revealing future
 *    information. Visible in current mode (unchanged behavior).
 *  - `replay-stamped` (class b): visible iff creationStep ≤ currentStep
 *    AND creationInstant ≤ clock.now().
 *  - `market-time-anchored` (class a): holds a market-time coordinate; the
 *    kit treats it as visible (its coordinate is honest historical data).
 *
 * The kit does NOT render: these predicates are the RULES; the consumer
 * decides display. Consumers invent no provenance classes of their own.
 */
import type { ReplayClock } from './clock.js';
import type { ProvenanceClass, ProvenancedDrawing, VisibilityVerdict } from './types.js';

export interface VisibilityContext {
	mode: 'replay' | 'current';
	/** current replay step index (class-b comparison); required in replay */
	currentStep: number;
	/** current replay instant (unix seconds); required in replay */
	now: number;
}

export function visibilityAt(
	drawing: ProvenancedDrawing,
	ctx: VisibilityContext
): VisibilityVerdict {
	if (ctx.mode !== 'replay') {
		return { visible: true, reason: 'current-mode: replay visibility rules do not apply' };
	}
	if (drawing.provenance === 'provenance-unknown') {
		return {
			visible: false,
			reason: 'D-003: provenance-unknown drawings are HIDDEN in blind replay (wall-clock metadata cannot prove historical existence)'
		};
	}
	if (drawing.provenance === 'market-time-anchored') {
		return { visible: true, reason: 'market-time-anchored: holds a proven market-time coordinate' };
	}
	// replay-stamped
	if (
		typeof drawing.creationStep !== 'number' ||
		typeof drawing.creationInstant !== 'number'
	) {
		return { visible: false, reason: 'replay-stamped drawing missing its stamp — treated as not provable (hidden)' };
	}
	if (drawing.creationStep > ctx.currentStep) {
		return { visible: false, reason: `created at step ${drawing.creationStep} > current step ${ctx.currentStep}` };
	}
	if (drawing.creationInstant > ctx.now) {
		return { visible: false, reason: `created at instant ${drawing.creationInstant} > clock now ${ctx.now}` };
	}
	return {
		visible: true,
		reason: `replay-stamped: creationStep ≤ currentStep and creationInstant ≤ clock now`
	};
}

/** Convenience wrapper taking the clock directly (replay mode). */
export function visibilityInReplay(
	drawing: ProvenancedDrawing,
	clock: ReplayClock
): VisibilityVerdict {
	return visibilityAt(drawing, {
		mode: 'replay',
		currentStep: clock.stepIndex(),
		now: clock.now()
	});
}

/**
 * Stamp a drawing created during replay with the replay-clock instant
 * (market time by construction) — the only provable basis for historical
 * visibility (R3 class b). Returns the stamp fields to attach.
 */
export function stampReplayCreation(
	instant: number,
	step: number
): { provenance: 'replay-stamped'; creationInstant: number; creationStep: number } {
	if (!Number.isFinite(instant) || !Number.isFinite(step) || step < 0) {
		throw new Error('stampReplayCreation: instant and step must be finite (step ≥ 0)');
	}
	return { provenance: 'replay-stamped', creationInstant: instant, creationStep: step };
}

export type { ProvenanceClass };
