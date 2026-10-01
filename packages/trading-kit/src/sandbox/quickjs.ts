/**
 * QuickJS (WASM) implementation of the ScriptRuntime port — the selected
 * G3 scripting runtime (A1 selection evidence:
 * docs/evidence/G3/selection/a1-runtime/README.md).
 *
 * CRITICAL wiring note: the kit uses the EXPLICIT variant constructor
 * `newQuickJSWASMModule(RELEASE_SYNC)`. The legacy `getQuickJS()` entry is
 * broken on at least one win32-x64 environment (returns garbage for every
 * eval, success or error) — do not "simplify" this back.
 *
 * One fresh QuickJS runtime + context is created per run and ALWAYS both
 * disposed (failure paths included): guest OOM / stack exhaustion /
 * interrupts leave the runtime unsafe for reuse, and an undisposed context
 * trips QuickJS's GC-list assertion at runtime disposal.
 *
 * Host functions are injected under the `__vict_` namespace the kit driver
 * addresses (`globalThis.__vict_<name>`). Guest failures are classified:
 *   - compile-only eval fails        → SCRIPT_SYNTAX_ERROR
 *   - interrupt handler fired        → SCRIPT_INTERRUPTED
 *   - 'out of memory' guest error    → SCRIPT_OOM
 *   - host RangeError through FFI    → SCRIPT_STACK_OVERFLOW
 *   - KIT_FATAL::CODE::msg (driver)  → the carried code (e.g. SCRIPT_CONTRACT_INVALID)
 *   - anything else                  → SCRIPT_ERROR (message preserved)
 */
import { newQuickJSWASMModule, RELEASE_SYNC, type QuickJSWASMModule } from 'quickjs-emscripten';
import { PINNED_DATE_SNIPPET } from '../snippets.js';
import type {
	SandboxRunRequest,
	SandboxRunResult,
	ScriptErrorCode,
	ScriptRuntime
} from '../script.js';

export const QUICKJS_VERSION = '0.32.0';

let modulePromise: Promise<QuickJSWASMModule> | null = null;
function module(): Promise<QuickJSWASMModule> {
	if (!modulePromise) modulePromise = newQuickJSWASMModule(RELEASE_SYNC);
	return modulePromise;
}

function classify(raw: string, interrupted: boolean, hostRangeError: boolean): { code: ScriptErrorCode; message: string } {
	const msg = raw.length > 400 ? raw.slice(0, 400) + '…' : raw;
	if (interrupted) return { code: 'SCRIPT_INTERRUPTED', message: msg || 'script exceeded its time budget' };
	if (hostRangeError) return { code: 'SCRIPT_STACK_OVERFLOW', message: 'guest stack exhausted (script recursion too deep)' };
	if (/out of memory/i.test(msg)) return { code: 'SCRIPT_OOM', message: 'script exceeded its memory budget' };
	const fatal = msg.match(/KIT_FATAL::([A-Z_]+)::([\s\S]*)/);
	if (fatal) return { code: fatal[1] as ScriptErrorCode, message: fatal[2] || fatal[1] };
	return { code: 'SCRIPT_ERROR', message: msg };
}

function dumpMessage(dump: (h: any) => unknown, handle: any): string {
	try {
		const d = dump(handle);
		return d && typeof d === 'object' && 'message' in d ? String((d as { message: unknown }).message) : String(d);
	} catch {
		return 'script error';
	}
}

export function createQuickJsScriptRuntime(): ScriptRuntime {
	return {
		kind: 'quickjs-emscripten',
		version: QUICKJS_VERSION,
		async run(req: SandboxRunRequest): Promise<SandboxRunResult> {
			const Q = await module();
			const rt = Q.newRuntime();
			let vm: { dispose(): void } | null = null;
			let interrupted = false;
			let hostRangeError = false;
			const fail = (code: ScriptErrorCode, message: string): SandboxRunResult => ({ status: 'failed', error: { code, message } });
			try {
				rt.setMemoryLimit(req.limits.memoryLimitBytes);
				if (rt.setMaxStackSize) rt.setMaxStackSize(req.limits.stackBytes);
				const deadline = Date.now() + req.limits.deadlineMs;
				rt.setInterruptHandler(() => {
					const hit = Date.now() > deadline;
					if (hit) interrupted = true;
					return hit;
				});
				const ctx = rt.newContext();
				vm = ctx;

				// DETERMINISM CONTRACT (script.ts; a1 README) — implemented here:
				// guest Math.random is REPLACED with a PRNG seeded from the run's
				// identity inputs; a guest cannot obtain nondeterminism.
				let prngState = req.prngSeed >>> 0;
				const nextRandom = (): number => {
					prngState = (prngState + 0x6d2b79f5) | 0;
					let t = Math.imul(prngState ^ (prngState >>> 15), 1 | prngState);
					t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
					return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
				};
				const mathObj = ctx.getProp(ctx.global, 'Math');
				const randFn = ctx.newFunction('random', () => ctx.newNumber(nextRandom()));
				ctx.setProp(mathObj, 'random', randFn);
				randFn.dispose();
				mathObj.dispose();
				// Date.now is pinned (per-bar, by the kit driver's pinTime call); the
				// initial pin is 0 — nothing wall-clock is reachable in the guest.
				const dateObj = ctx.getProp(ctx.global, 'Date');
				const nowFn = ctx.newFunction('now', () => ctx.newNumber(0));
				ctx.setProp(dateObj, 'now', nowFn);
				nowFn.dispose();
				dateObj.dispose();
				// PINNED DATE (round-2): the Date CONSTRUCTOR is the remaining
				// wall-clock path (new Date() / Date() read real time). Replace
				// global Date so no-arg paths consult the pinned Date.now.
				const pinned = ctx.evalCode(PINNED_DATE_SNIPPET, 'vict-pinned-date.js');
				if (pinned.error) {
					const message = dumpMessage(ctx.dump.bind(ctx), pinned.error);
					if (pinned.error.alive) pinned.error.dispose();
					return fail('SCRIPT_ERROR', 'sandbox pinned-date setup failed: ' + message);
				}
				if (pinned.value.alive) pinned.value.dispose();

				for (const [name, fn] of Object.entries(req.hostFunctions)) {
					const h = ctx.newFunction('__vict_' + name, (argsPtr) => {
						const argsJson = argsPtr ? ctx.getString(argsPtr) : '{}';
						const out = fn(argsJson);
						return ctx.newString(out);
					});
					ctx.setProp(ctx.global, '__vict_' + name, h);
					h.dispose();
				}

				// pass 1 — compile-only syntax gate (fast, no execution)
				const compiled = ctx.evalCode(req.scriptSource, 'script.js', { compileOnly: true });
				if (compiled.error) {
					const message = dumpMessage(ctx.dump.bind(ctx), compiled.error);
					if (compiled.error.alive) compiled.error.dispose();
					return fail('SCRIPT_SYNTAX_ERROR', message);
				}
				if (compiled.value.alive) compiled.value.dispose();

				// pass 2 — execute the script (defines onBar and any state)
				const run = ctx.evalCode(req.scriptSource, 'script.js');
				if (run.error) {
					const message = dumpMessage(ctx.dump.bind(ctx), run.error);
					if (run.error.alive) run.error.dispose();
					return fail(classify(message, interrupted, hostRangeError).code, classify(message, interrupted, hostRangeError).message);
				}
				if (run.value.alive) run.value.dispose();
				// SYNC-ONLY CONTRACT (V-G3-4 repair): any guest Promise usage
				// enqueues a QuickJS job this runtime never pumps — executing it
				// later would be unbounded/unordered relative to the bar loop.
				// A pending job here means scheduled async work exists; the run
				// FAILS truthfully instead of silently dropping that work.
				if (rt.hasPendingJob()) {
					return fail(
						'SCRIPT_ASYNC_FORBIDDEN',
						'script scheduled asynchronous work (Promise). The bounded backtest executes synchronous scripts only: remove Promise/async from the script and call api.plot/api.order directly inside onBar so every action is recorded.'
					);
				}

				// pass 3 — the kit driver (bar loop)
				const driven = ctx.evalCode(req.driverSource, 'vict-driver.js');
				if (driven.error) {
					const message = dumpMessage(ctx.dump.bind(ctx), driven.error);
					if (driven.error.alive) driven.error.dispose();
					return fail(classify(message, interrupted, hostRangeError).code, classify(message, interrupted, hostRangeError).message);
				}
				if (driven.value.alive) driven.value.dispose();
				// SYNC-ONLY CONTRACT backstop: a promise created but never
				// settled (or a .then callback never pumped) still shows here —
				// fail the run rather than report a clean success with silently
				// dropped actions (V-G3-4).
				if (rt.hasPendingJob()) {
					return fail(
						'SCRIPT_ASYNC_FORBIDDEN',
						'script left unfinished asynchronous work (Promise). The bounded backtest executes synchronous scripts only: remove Promise/async from the script and call api.plot/api.order directly inside onBar so every action is recorded.'
					);
				}

				return { status: 'completed' };
			} catch (e) {
				if (e instanceof RangeError) hostRangeError = true;
				const raw = e instanceof Error ? e.message : String(e);
				return fail(classify(raw, interrupted, hostRangeError).code, classify(raw, interrupted, hostRangeError).message);
			} finally {
				if (vm) {
					try { vm.dispose(); } catch { /* runtime may already be aborted */ }
				}
				try { rt.dispose(); } catch { /* runtime may already be aborted */ }
			}
		}
	};
}
