// A1 scripting-runtime probe pack — quickjs-emscripten 0.32.0, explicit
// RELEASE_SYNC variant (newQuickJSWASMModule). Falsification-first: every
// probe tries to break containment, determinism, or limits.
//
// Environment note (evidence, 2026-09-30): the LEGACY `getQuickJS()` entry
// is BROKEN on this machine (win32-x64; Node v22.13.1 AND Chromium via
// esbuild bundle): every evalCode result dumps as 0 / garbage floats for
// both success and error paths, across v0.31.0 and v0.32.0 and across
// wasmfile + singlefile variants. The EXPLICIT variant path
// `newQuickJSWASMModule(RELEASE_SYNC)` works everywhere tested and is the
// ONLY wiring this kit uses. Recorded as a selection-scoped pitfall.
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
const require = createRequire('C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/packages/trading-kit/package.json');
const { newQuickJSWASMModule, RELEASE_SYNC } = require('quickjs-emscripten');

let currentRT = null; // set by freshSandbox; used to pump the job queue
const results = { startedAt: new Date().toISOString(), variant: 'RELEASE_SYNC (wasmfile-release-sync) via newQuickJSWASMModule', probes: {}, notes: [] };
const probes = results.probes;
const save = () => writeFileSync(new URL('./probe-results.json', import.meta.url), JSON.stringify(results, null, 2));

function mulberry32(seed) {
	let a = seed >>> 0;
	return function () {
		a |= 0; a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const fmtErr = (v) => (v && typeof v === 'object') ? String(v.message ?? JSON.stringify(v)).slice(0, 200) : String(v);

// Evaluate and FULLY dispose handles. Resolves guest promises first
// (dump() on a pending promise disposes the handle itself — never dump a
// promise). Returns {isErr, val}.
async function evalDump(vm, src) {
	try {
		const r = vm.evalCode(src);
		if (r.error) {
			const val = fmtErr(vm.dump(r.error));
			if (r.error.alive) r.error.dispose();
			return { isErr: true, val };
		}
		// NOTE: QuickJS typeof on a promise is "object", never "promise" — use getPromiseState.
	let h = r.value;
	const ps = vm.getPromiseState(h);
	if (!ps.notAPromise) {
		if (ps.type === 'pending') {
			const pending = vm.resolvePromise(h);
			try { for (let i = 0; i < 100 && currentRT; i++) { if (!currentRT.executePendingJobs(-1)) break; } } catch {}
			if (h.alive) h.dispose();
			const state = await pending;
			if (state.error) { const val = fmtErr(vm.dump(state.error)); if (state.error.alive) state.error.dispose(); return { isErr: true, val }; }
			h = state.value;
		} else if (ps.type === 'fulfilled') {
			if (h.alive) h.dispose();
			h = ps.value;
		} else {
			const val = fmtErr(vm.dump(ps.error));
			if (ps.error.alive) ps.error.dispose();
			if (h.alive) h.dispose();
			return { isErr: true, val };
		}
	}
	const val = vm.dump(h);
	if (h.alive) h.dispose();
	return { isErr: false, val };
	} catch (e) {
		if (e instanceof RangeError) {
			// guest stack exhaustion surfaces as a HOST RangeError through the FFI
			// (this build): contained + recorded; a FRESH runtime is required after.
			return { isErr: true, val: 'SCRIPT_STACK_OVERFLOW (guest stack exhausted; host RangeError via FFI; fresh runtime required)' };
		}
		throw e;
	}
}

// Fresh module + runtime per sandbox (an emscripten ABORT poisons its module,
// so abort-capable probes must never share one).
async function freshSandbox(opts = {}) {
	const Q = await newQuickJSWASMModule(RELEASE_SYNC);
	const rt = Q.newRuntime();
	rt.setMemoryLimit(opts.memLimitBytes ?? 64 * 1024 * 1024);
	if (rt.setMaxStackSize) rt.setMaxStackSize(opts.stackBytes ?? 1024 * 1024);
	const deadline = Date.now() + (opts.deadlineMs ?? 10 * 60 * 1000);
	rt.setInterruptHandler(() => Date.now() > deadline);
	const vm = rt.newContext();
	const extraHandles = [];
	if (opts.prng) {
		const h = vm.newFunction('seededRandom', () => vm.newNumber(opts.prng()));
		vm.setProp(vm.global, '__seededRandom', h);
		extraHandles.push(h);
	}
	currentRT = rt;
	return {
		Q, rt, vm,
		dispose() {
			for (const h of extraHandles) { try { if (h.alive) h.dispose(); } catch {} }
			try { vm.dispose(); } catch {}
			try { rt.dispose(); } catch {}
		}
	};
}

async function guarded(name, fn) {
	try {
		probes[name] = await fn();
	} catch (e) {
		probes[name] = { harnessError: String(e).slice(0, 160) };
	}
	save();
}

// ---- containment probes (one fresh sandbox each) ------------------------
for (const [name, src] of [
	['no-fetch', "typeof fetch"],
	['no-xhr', "typeof XMLHttpRequest"],
	['no-document', "typeof document"],
	['no-window', "typeof window"],
	['no-localStorage', "typeof localStorage"],
	['no-process', "typeof process"],
	['no-require', "typeof require"],
	['no-dynamic-import', `import('node:fs').then(m=>'IMPORTED:'+typeof m).catch(e=>'REFUSED:'+String((e&&e.message)||e).slice(0,80))`],
	['fn-constructor-escape', `(() => { const F = ({}).constructor.constructor; const t = F('return typeof fetch')(); const p = F('return typeof process')(); return JSON.stringify({fetchViaFunc: t, processViaFunc: p}); })()`],
]) {
	await guarded(name, async () => {
		const sb = await freshSandbox();
		try {
			const { isErr, val } = await evalDump(sb.vm, src);
			return { guestSaw: String(val), isErr };
		} finally { sb.dispose(); }
	});
}

// ---- prototype pollution containment ------------------------------------
await guarded('proto-pollution', async () => {
	const sb = await freshSandbox();
	try {
		await evalDump(sb.vm, `({}).constructor.prototype.polluted = 1; Object.prototype.polluted = 1; 'ok'`);
		const hostCanary = {};
		return {
			hostObjectProtoPolluted: ({}).polluted === 1,
			hostCanaryTouched: 'polluted' in hostCanary
		};
	} finally { sb.dispose(); }
});

// ---- infinite loop -> interrupt ------------------------------------------
await guarded('infinite-loop', async () => {
	const sb = await freshSandbox({ deadlineMs: 500 });
	try {
		const t = Date.now();
		const { isErr, val } = await evalDump(sb.vm, `while(true){}`);
		return { isErr, val: String(val), elapsedMs: Date.now() - t, deadlineMs: 500 };
	} finally { sb.dispose(); }
});

// ---- memory bomb -> limit -------------------------------------------------
await guarded('memory-bomb', async () => {
	const sb = await freshSandbox({ memLimitBytes: 64 * 1024 * 1024 });
	try {
		const { isErr, val } = await evalDump(sb.vm, `const a=[]; while(true){ a.push(new Array(1e6).fill(1.1)); } 'survived'`);
		return { isErr, val: String(val) };
	} finally { try { sb.dispose(); } catch {} }
});

// ---- huge output string ----------------------------------------------------
await guarded('huge-output', async () => {
	const sb = await freshSandbox({ memLimitBytes: 64 * 1024 * 1024 });
	try {
		const { isErr, val } = await evalDump(sb.vm, `new Array(48*1024*1024).fill('x').join('')`);
		return {
			isErr,
			length: !isErr ? String(val).length : null,
			note: isErr ? String(val).slice(0, 60) : 'string returned; guest memory limit (64MB) is the bounding mechanism; the kit additionally caps structured outputs (plots/trades) by range length'
		};
	} finally { try { sb.dispose(); } catch {} }
});

// ---- deep recursion ---------------------------------------------------------
await guarded('deep-recursion', async () => {
	const sb = await freshSandbox();
	try {
		const { isErr, val } = await evalDump(sb.vm, `function f(n){ return n===0 ? 0 : 1+f(n-1); } f(1e9)`);
		return { isErr, val: String(val).slice(0, 80) };
	} finally { try { sb.dispose(); } catch {} }
});

// ---- determinism -------------------------------------------------------------
async function runDeterministic(seed) {
	const sb = await freshSandbox({ prng: mulberry32(seed) });
	try {
		await evalDump(sb.vm, `Date.now = () => 1770068700000; 'pinned'`);
		const { isErr, val } = await evalDump(sb.vm, `(function(){ let s=''; for (let i=0;i<5;i++) s += __seededRandom().toFixed(6)+','; return s + 'T' + Date.now(); })()`);
		return { isErr, val: String(val) };
	} finally { try { sb.dispose(); } catch {} }
}
await guarded('determinism-run-A', () => runDeterministic(42));
await guarded('determinism-run-B', () => runDeterministic(42));
probes['determinism-identical'] = {
	identical: probes['determinism-run-A'] && probes['determinism-run-B'] &&
		probes['determinism-run-A'].val === probes['determinism-run-B'].val
};
save();

// ---- syntax error shape -------------------------------------------------------
await guarded('syntax-error', async () => {
	const sb = await freshSandbox();
	try {
		const { isErr, val } = await evalDump(sb.vm, `const x = {;\nlet y = 1;`);
		return { isErr, val: String(val).slice(0, 200) };
	} finally { try { sb.dispose(); } catch {} }
});

// ---- runtime error shape -------------------------------------------------------
await guarded('runtime-error', async () => {
	const sb = await freshSandbox();
	try {
		const { isErr, val } = await evalDump(sb.vm, `null.nonexistent.property`);
		return { isErr, val: String(val).slice(0, 200) };
	} finally { try { sb.dispose(); } catch {} }
});

// ---- guest API injection roundtrip ----------------------------------------------
await guarded('guest-api-roundtrip', async () => {
	const sb = await freshSandbox();
	try {
		const bars = [{ time: 1, open: 1, high: 2, low: 0.5, close: 1.5 }, { time: 2, open: 1.5, high: 2.2, low: 1.4, close: 2.1 }];
		const h = sb.vm.newString(JSON.stringify(bars));
		sb.vm.setProp(sb.vm.global, '__barsJson', h);
		h.dispose();
		const { isErr, val } = await evalDump(sb.vm, `(function(){ const b = JSON.parse(globalThis.__barsJson); return b[1].close * 2; })()`);
		return { ok: !isErr && val === 4.2, got: val };
	} finally { try { sb.dispose(); } catch {} }
});

results.finishedAt = new Date().toISOString();
save();
console.log(JSON.stringify(results.probes, null, 1));
