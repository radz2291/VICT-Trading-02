/**
 * Run identity — deterministic pinning for reproducible tests (G3).
 *
 * A run's identity is the SHA-256 of a CANONICAL serialization of every
 * input that could change its results: exact script source, data revision,
 * symbol/timeframe/range, input values, fill/cost assumptions, engine and
 * runtime identities, and the clock policy. Identical inputs produce the
 * identical identity string; changing ANY one of them produces a different
 * identity (verified in the kit tests). Canonical = sorted object keys,
 * fixed number formatting, no ambient state.
 */
import type { Bar, FillAssumptions, Granularity } from './types.js';

/** Stable, human-auditable JSON: sorted keys, no whitespace. */
export function canonicalJson(value: unknown): string {
	const seen = new WeakSet<object>();
	function walk(v: unknown): unknown {
		if (v === null || typeof v !== 'object') {
			if (typeof v === 'number') {
				if (!Number.isFinite(v)) throw new Error('canonicalJson: non-finite number');
				return Object.is(v, -0) ? 0 : v;
			}
			return v;
		}
		if (seen.has(v as object)) throw new Error('canonicalJson: circular structure');
		seen.add(v as object);
		if (Array.isArray(v as object)) return (v as unknown[]).map(walk);
		const out: Record<string, unknown> = {};
		for (const k of Object.keys(v as Record<string, unknown>).sort()) {
			out[k] = walk((v as Record<string, unknown>)[k]);
		}
		return out;
	}
	return JSON.stringify(walk(value));
}

/** SHA-256 hex of a string (WebCrypto subtle — browser and Node ≥ 20 both provide it). */
export async function sha256Hex(text: string): Promise<string> {
	const bytes = utf8Bytes(text);
	const c = (globalThis as {
		crypto?: { subtle?: { digest: (alg: string, data: Uint8Array) => Promise<ArrayBuffer> } };
	}).crypto;
	if (!c?.subtle?.digest) throw new Error('sha256Hex: WebCrypto subtle.digest unavailable in this environment');
	// keep the receiver bound — Node's SubtleCrypto rejects detached calls
	const digest = await c.subtle.digest('SHA-256', bytes);
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/** Explicit UTF-8 encoding (no TextEncoder dependency in the type surface). */
function utf8Bytes(s: string): Uint8Array {
	const out: number[] = [];
	for (let i = 0; i < s.length; i++) {
		const cp = s.codePointAt(i) as number;
		if (cp > 0xffff) i += 1;
		if (cp < 0x80) out.push(cp);
		else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
		else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
		else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
	}
	return Uint8Array.from(out);
}

/** Revision of an exact script source text. */
export async function scriptRevision(source: string): Promise<string> {
	return sha256Hex(canonicalJson({ kind: 'script-source-v1', source }));
}

/** Revision of a bar series (the data revision a run pins). */
export async function dataRevision(bars: Bar[]): Promise<string> {
	return sha256Hex(canonicalJson({ kind: 'bars-v1', bars }));
}

export interface RunIdentityInput {
	scriptSource: string;
	dataRev: string;
	symbol: string;
	timeframe: Granularity;
	range: { fromTime: number; toTime: number };
	inputs: Record<string, number | string | boolean>;
	fill: FillAssumptions;
	engine: { kind: string; version: string };
	runtime: { kind: string; version: string };
	clockPolicy: string;
}

export interface RunIdentity {
	/** canonical preimage (recorded for audit — the id is its SHA-256) */
	canonical: string;
	/** sha256 hex of the canonical preimage */
	id: string;
}

export async function runIdentity(input: RunIdentityInput): Promise<RunIdentity> {
	const rev = await scriptRevision(input.scriptSource);
	const canonical = canonicalJson({
		kind: 'run-identity-v1',
		scriptRevision: rev,
		dataRevision: input.dataRev,
		symbol: input.symbol,
		timeframe: input.timeframe,
		range: { fromTime: input.range.fromTime, toTime: input.range.toTime },
		inputs: input.inputs,
		fill: input.fill,
		engine: input.engine,
		runtime: input.runtime,
		clockPolicy: input.clockPolicy
	});
	return { canonical, id: await sha256Hex(canonical) };
}
