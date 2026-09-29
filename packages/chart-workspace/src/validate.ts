/**
 * Minimal input validation owned by the package.
 *
 * Dependency decision (recorded for G1-PKG): the package deliberately does
 * NOT depend on the published VICT contract/validation set. Its API
 * contracts are small and fully expressible with these guards; pulling in
 * VICT would couple a chart capability to the app-facing contract layer.
 * Consumers that route mutations through VICT contracts (as the host app
 * does) keep that validation app-side and may rely on the package guards
 * as a second line of defense.
 */
import type { Bar, PriceLevel } from './types.js';

export function isFiniteNumber(v: unknown): v is number {
	return typeof v === 'number' && Number.isFinite(v);
}

export function isNonEmptyString(v: unknown): v is string {
	return typeof v === 'string' && v.length > 0;
}

/** Structural check for a Bar row (used when consumer data enters the chart). */
export function isBar(v: unknown): v is Bar {
	if (typeof v !== 'object' || v === null) return false;
	const b = v as Record<string, unknown>;
	return isFiniteNumber(b.time) && isFiniteNumber(b.open) && isFiniteNumber(b.high) && isFiniteNumber(b.low) && isFiniteNumber(b.close);
}

/** Structural check for a stored/consumer-provided PriceLevel. */
export function isPriceLevel(v: unknown): v is PriceLevel {
	if (typeof v !== 'object' || v === null) return false;
	const l = v as Record<string, unknown>;
	if (!isNonEmptyString(l.id) || !isFiniteNumber(l.price)) return false;
	if (l.note !== undefined && typeof l.note !== 'string') return false;
	if (l.symbol !== undefined && typeof l.symbol !== 'string') return false;
	if (l.createdAt !== undefined && !isFiniteNumber(l.createdAt)) return false;
	return true;
}

/** Validate a level-create input; returns an error string or null. */
export function validateCreateInput(input: { id: string; price: number; note?: string; symbol?: string; createdAt?: number }): string | null {
	if (!isNonEmptyString(input.id)) return 'id must be a non-empty string';
	if (!isFiniteNumber(input.price)) return 'price must be a finite number';
	if (input.note !== undefined && typeof input.note !== 'string') return 'note must be a string';
	if (input.symbol !== undefined && !isNonEmptyString(input.symbol)) return 'symbol must be a non-empty string';
	if (input.createdAt !== undefined && !isFiniteNumber(input.createdAt)) return 'createdAt must be a finite number (unix seconds)';
	return null;
}

/**
 * Validate a level-update input; returns an error string or null.
 *
 * Note semantics (matching `DrawingWorkspace.edit`): `undefined` means
 * "preserve the existing note" and is resolved by the workspace before
 * validation; `''` (empty string) is a valid EXPLICIT CLEAR; any other
 * string sets the note.
 */
export function validateUpdateInput(input: { id: string; price: number; note?: string }): string | null {
	if (!isNonEmptyString(input.id)) return 'id must be a non-empty string';
	if (!isFiniteNumber(input.price)) return 'price must be a finite number';
	if (input.note !== undefined && typeof input.note !== 'string') return 'note must be a string';
	return null;
}
