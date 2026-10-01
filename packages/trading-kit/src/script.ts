/**
 * Script sandbox port + guest contract (G3).
 *
 * The kit OWNS THE RULES: what guest code may receive (only clock-capped
 * data, enforced host-side), what it may produce (plots, signals, simulated
 * order intents), and how failures are classified. The RUNTIME (QuickJS
 * wasm) is behind the ScriptRuntime port — a consumer may inject another
 * implementation, but the selected one ships in sandbox/quickjs.ts.
 *
 * Containment contract (probed in docs/evidence/G3/selection/a1-runtime):
 *  - one sandbox runtime per script run (aborts poison the runtime);
 *  - hard limits: CPU deadline (interrupt), memory limit, guest stack bound;
 *  - the guest realm has no network/DOM/storage/process/module access;
 *  - determinism: the runtime layer replaces guest Math.random with a
 *    seeded PRNG and pins Date.now to market time (host-injected).
 *
 * Guest contract: the script source defines `onBar(bar, api)`; the kit
 * driver calls it once per run-timeframe bar in order, at that bar's close.
 * ALL data the guest can reach flows through host functions that serve
 * slices from the kit's capped DataSession — there is no API by which a
 * script can observe a bar whose close is beyond the current bar's close.
 */

export interface RuntimeLimits {
	/** wall-clock budget for the whole guest run (interrupt deadline) */
	deadlineMs: number;
	/** QuickJS runtime memory limit (bytes) */
	memoryLimitBytes: number;
	/** guest stack bound (bytes) */
	stackBytes: number;
}

export const DEFAULT_RUNTIME_LIMITS: RuntimeLimits = {
	deadlineMs: 10_000,
	memoryLimitBytes: 64 * 1024 * 1024,
	stackBytes: 1024 * 1024
};

export type ScriptErrorCode =
	| 'SCRIPT_SYNTAX_ERROR'
	| 'SCRIPT_CONTRACT_INVALID'
	| 'SCRIPT_ASYNC_FORBIDDEN'
	| 'SCRIPT_ERROR'
	| 'SCRIPT_INTERRUPTED'
	| 'SCRIPT_OOM'
	| 'SCRIPT_STACK_OVERFLOW'
	| 'SCRIPT_LIMIT';

export interface SandboxRunError {
	code: ScriptErrorCode;
	message: string;
}

export interface SandboxRunRequest {
	/** the user script source (must define synchronous onBar(bar, api); async/await and Promise are refused) */
	scriptSource: string;
	/** kit driver executed after the script (executes the bar loop) */
	driverSource: string;
	limits: RuntimeLimits;
	/**
	 * Determinism seed for the guest's Math.random replacement (criterion-5
	 * repair: the contract promised by script.ts docs + the a1 README is now
	 * IMPLEMENTED — same identity inputs → same seed → same PRNG sequence).
	 * Derive deterministically via deriveGuestSeed().
	 */
	prngSeed: number;
	/**
	 * host functions exposed to the guest. Each receives ONE JSON-string
	 * argument and returns a JSON string. Host functions must never throw:
	 * failures are reported in-band as JSON the driver understands.
	 */
	hostFunctions: Record<string, (argsJson: string) => string>;
}

export interface SandboxRunResult {
	status: 'completed' | 'failed';
	error?: SandboxRunError;
}

export interface ScriptRuntime {
	readonly kind: string;
	readonly version: string;
	run(req: SandboxRunRequest): Promise<SandboxRunResult>;
}

/**
 * Deterministic 32-bit seed from identity-relevant strings (FNV-1a over the
 * canonical composition). Same inputs → same seed → same PRNG sequence.
 */
export function deriveGuestSeed(parts: string[]): number {
	let h = 0x811c9dc5;
	for (const part of parts) {
		for (let i = 0; i < part.length; i++) {
			h ^= part.charCodeAt(i);
			h = Math.imul(h, 0x01000193);
		}
		h ^= 0x9e3779b9;
	}
	return h >>> 0;
}

/**
 * The kit driver executed in the guest after the script. It calls onBar
 * once per bar (JSON via __hostBarAt), in order, and reports completion via
 * __hostComplete. Any guest throw (including from onBar) propagates out of
 * eval and is classified by the runtime layer. Host functions returning
 * {"kitFatal":code,message} abort the driver with a throw carrying the
 * same code (classified host-side).
 */
export const DRIVER_SOURCE = `
(function () {
  'use strict';
  function kitFatal(code, message) { throw new Error('KIT_FATAL::' + code + '::' + message); }
  function callHost(name, argsJson) {
    var out = globalThis['__vict_' + name](argsJson === undefined ? '{}' : argsJson);
    var parsed;
    try { parsed = JSON.parse(out); } catch (e) { kitFatal('SCRIPT_ERROR', 'host returned unparsable JSON for ' + name); }
    if (parsed && parsed.kitFatal) kitFatal(parsed.kitFatal, parsed.message || '');
    return parsed;
  }
  if (typeof onBar !== 'function') {
    kitFatal('SCRIPT_CONTRACT_INVALID', 'script must define function onBar(bar, api)');
  }
  var count = Number(callHost('barCount', '{}').count);
  // Per-bar Date.now pinning to MARKET time (the current bar's close, ms):
  // the host serves the pin via pinTime; a script reading Date.now inside
  // onBar gets the bar's market close — deterministic per run, never wall
  // clock.
  Date.now = function () { return 0; };
  var __pinned = 0;
  // Per-granularity served-prefix cache. The run cursor only advances, so the
  // available prefix (bars with close <= cursor close) grows MONOTONICALLY
  // during a run: extending a cached prefix via __vict_barsSince is exactly
  // equivalent to re-querying, and the cache can never contain a bar whose
  // close is beyond the current bar's close (the cursor is host state).
  // Mutating a returned array corrupts only this script's own cached view —
  // deterministic and self-inflicted; documented in the kit README.
  var __cache = {};
  function servedSlice(granularity, until) {
    var g = granularity || '';
    var c = __cache[g];
    if (!c) {
      var first = callHost('bars', JSON.stringify({ granularity: g }));
      c = { bars: first.bars, servedUntil: first.servedUntil, last: first.bars.length ? first.bars[first.bars.length - 1].time : -1 };
      __cache[g] = c;
    } else {
      var ext = callHost('barsSince', JSON.stringify({ granularity: g, since: c.last }));
      for (var k = 0; k < ext.bars.length; k++) c.bars.push(ext.bars[k]);
      if (ext.bars.length) c.last = ext.bars[ext.bars.length - 1].time;
      c.servedUntil = ext.servedUntil;
    }
    var servedUntil = c.servedUntil;
    var arr = c.bars;
    var capped = false;
    if (until !== null && until !== undefined && Number(until) > servedUntil) {
      // capped request: routed to the host so the request/served record is
      // authoritative (R1 evidence) — the host serves the same capped prefix
      return callHost('bars', JSON.stringify({ until: Number(until), granularity: g }));
    }
    if (until !== null && until !== undefined) {
      var lim = Number(until);
      capped = servedUntil < lim;
      var hi = arr.length;
      var lo = 0;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (arr[mid].time <= lim) lo = mid + 1; else hi = mid; }
      arr = arr.slice(0, lo);
      servedUntil = Math.min(servedUntil, lim);
    }
    return { bars: arr, servedUntil: servedUntil, requestedUntil: until === undefined || until === null ? null : Number(until), capped: capped };
  }
  var api = {
    bars: function (q) {
      q = q || {};
      return servedSlice(q.granularity ? String(q.granularity) : '', q.until === undefined || q.until === null ? null : Number(q.until));
    },
    availability: function (granularity) {
      return callHost('availability', JSON.stringify({ granularity: granularity ? String(granularity) : '' })).missing;
    },
    input: function (name, fallback) {
      var v = callHost('inputs', '{}').inputs[String(name)];
      return v === undefined ? fallback : v;
    },
    plot: function (name, value) {
      if (value !== null && value !== undefined && !isFinite(Number(value))) value = null;
      callHost('plot', JSON.stringify({ name: String(name), value: value === null || value === undefined ? null : Number(value) }));
    },
    plotSignal: function (name, active) {
      callHost('signal', JSON.stringify({ name: String(name), active: !!active }));
    },
    order: function (side, size) {
      return callHost('order', JSON.stringify({ side: String(side), size: Number(size) }));
    },
    state: function () {
      return callHost('state', '{}');
    }
  };
  for (var i = 0; i < count; i++) {
    var bar = callHost('barAt', JSON.stringify({ index: i }));
    __pinned = Number(callHost('pinTime', '{}').pinnedMs);
    Date.now = function () { return __pinned; };
    var __ret = onBar(bar, api);
    if (
      __ret &&
      (typeof __ret === 'object' || typeof __ret === 'function') &&
      typeof __ret.then === 'function'
    ) {
      kitFatal(
        'SCRIPT_ASYNC_FORBIDDEN',
        'onBar returned a promise (async/await is not supported). The bounded backtest executes synchronous scripts only: remove async/await from onBar and call api.plot/api.order directly inside it so every action is recorded.'
      );
    }
  }
  callHost('complete', '{}');
})();
`;
