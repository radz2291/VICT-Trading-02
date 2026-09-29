/**
 * Replay clock — internal tick counter over MARKET time (unix seconds).
 *
 * HARD future-guard (R1): `now()` can never exceed the configured horizon.
 * Requests past the horizon are CAPPED, not errors — every operation is
 * recorded (requested vs applied, capped flag) so evidence can prove the
 * cap. No wall-clock is consulted anywhere: replay market time advances
 * only through explicit advance/setFrame calls.
 */
import type { ClockRecord } from './types.js';

export interface ReplayClockConfig {
	/** latest instant the clock may ever reach (unix seconds, inclusive) */
	horizon: number;
	/** initial instant (unix seconds); must be ≤ horizon */
	start: number;
}

export interface ReplayClock {
	/** current replay instant — guaranteed ≤ horizon */
	now(): number;
	/** advance by a caller-chosen step (seconds); capped at the horizon */
	advance(stepSeconds: number): number;
	/** jump the frame to an absolute instant; capped at the horizon */
	setFrame(t: number): number;
	/** count of recorded advance/setFrame operations (the step index) */
	stepIndex(): number;
	/** full operation log (evidence channel) */
	records(): readonly ClockRecord[];
	horizon(): number;
}

export function createReplayClock(config: ReplayClockConfig): ReplayClock {
	if (!Number.isFinite(config.horizon) || !Number.isFinite(config.start)) {
		throw new Error('createReplayClock: horizon and start must be finite numbers');
	}
	if (config.start > config.horizon) {
		throw new Error('createReplayClock: start must be ≤ horizon');
	}
	const records: ClockRecord[] = [];
	// instant can only ever be capped DOWN to the horizon — never above it
	let instant = Math.min(config.start, config.horizon);

	function apply(op: ClockRecord['op'], requested: number): number {
		if (!Number.isFinite(requested)) {
			throw new Error(`clock.${op}: requested value must be finite`);
		}
		const target = op === 'advance' ? instant + requested : requested;
		const applied = Math.min(target, config.horizon);
		const capped = applied < target;
		records.push({ op, requested: target, applied, capped });
		instant = applied;
		return instant;
	}

	return {
		now: () => instant,
		advance: (stepSeconds: number) => apply('advance', stepSeconds),
		setFrame: (t: number) => apply('setFrame', t),
		stepIndex: () => records.length,
		records: () => records.slice(),
		horizon: () => config.horizon
	};
}
