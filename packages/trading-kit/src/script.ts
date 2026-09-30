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
	/** the user script source (must define onBar(bar, api)) */
	scriptSource: string;
	/** kit driver executed after the script (executes the bar loop) */
	driverSource: string;
	limits: RuntimeLimits;
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
  var inputs = callHost('inputs', '{}').inputs || {};
  var api = {
    bars: function (q) {
      q = q || {};
      return callHost('bars', JSON.stringify({ until: q.until === undefined || q.until === null ? null : Number(q.until), granularity: q.granularity ? String(q.granularity) : '' }));
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
  void inputs;
  for (var i = 0; i < count; i++) {
    var bar = callHost('barAt', JSON.stringify({ index: i }));
    onBar(bar, api);
  }
  callHost('complete', '{}');
})();
`;
