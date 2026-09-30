// FRESH VERIFIER probe pack v1 — INDEPENDENT probes beyond the builder's pack.
// Runs through the kit's actual entry points where possible (runBacktest with
// the shipped QuickJS runtime) so probes test the REAL containment surface.
// Node-side; browser-side probes are in v1-browser-probes.mjs.
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire('C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/packages/trading-kit/package.json');
const { runBacktest, createQuickJsScriptRuntime } = require('@vict-trading/trading-kit');

const FIX = JSON.parse(readFileSync(new URL('../fixtures/hand-calculated-fixture.json', import.meta.url), 'utf8'));
const bars = FIX.bars;
const tfEnd = bars[bars.length - 1].time + 900;
const results = { label: 'VERIFIER own sandbox probes (Node)', probes: {} };

let seq = 0;
async function ownRun(scriptSource, opts = {}) {
	seq += 1;
	return runBacktest({
		symbol: 'T',
		baseTimeframe: '15m',
		timeframe: '15m',
		fromTime: bars[0].time,
		toTime: opts.toTime ?? tfEnd,
		scriptSource,
		inputs: opts.inputs ?? {},
		fill: FIX.fill,
		sourceBars: opts.sourceBars ?? bars,
		runtime: createQuickJsScriptRuntime(),
		limits: opts.limits
	});
}

async function probe(name, fn) {
	try {
		results.probes[name] = await fn();
	} catch (e) {
		results.probes[name] = { harnessError: String(e).slice(0, 300) };
	}
	writeFileSync(new URL('./v1-probe-results.json', import.meta.url), JSON.stringify(results, null, 2));
}

// P1 — constructor-chain escape to globalThis enumeration (deeper than builder's
// typeof checks): dump the full global name list through Function('...').
await probe('p1-constructor-global-dump', async () => {
	const src = `
	function onBar(bar, api) {
		const F = ({}).constructor.constructor;
		const names = F('return Object.getOwnPropertyNames(globalThis)')().join(',');
		throw new Error('DUMP::' + names);
	}`;
	const r = await ownRun(src);
	return { status: r.status, code: r.error?.code, msg: (r.error?.message ?? '').slice(0, 500) };
});

// P2 — direct globals visibility inside onBar (no constructor involved)
await probe('p2-direct-globals', async () => {
	const src = `
	function onBar(bar, api) {
		const names = Object.getOwnPropertyNames(globalThis).join(',');
		const d = {
			haveFetch: typeof fetch, haveXml: typeof XMLHttpRequest,
			haveDoc: typeof document, haveWin: typeof window,
			haveLs: typeof localStorage, haveProc: typeof process,
			haveReq: typeof require, haveWorker: typeof Worker,
			haveWs: typeof WebSocket, haveSetTimeout: typeof setTimeout,
			haveIndexed: typeof indexedDB, haveCrypto: typeof crypto,
			haveModule: typeof module, haveExports: typeof exports
		};
		throw new Error('DUMP::' + names + '||' + JSON.stringify(d));
	}`;
	const r = await ownRun(src);
	return { status: r.status, code: r.error?.code, msg: (r.error?.message ?? '').slice(0, 700) };
});

// P3 — guest Math.random: two identical-input runs must be bit-identical.
// The kit docstring CLAIMS guest Math.random is replaced with a seeded PRNG.
await probe('p3-math-random-determinism', async () => {
	const src = `let s = [];
	function onBar(bar, api) {
		if (bar.time === ${bars[3].time}) s = [Math.random(), Math.random(), Math.random()].join(',');
		if (bar.time === ${bars[tfEnd === bars[bars.length-1].time+900 ? bars.length - 1 : 0].time}); 
		api.plot('rand', bar.time === ${bars[3].time} ? 1 : 0);
		api.plot('randStr', undefined);
	}`; // plots carry state via closure; expose randomness through ORDER SIZE
	const src2 = `
	function onBar(bar, api) {
		if (bar.time === ${bars[3].time}) api.order('buy', 1 + Math.random());
	}`; // size recorded in the fill (only if deterministic size → identical fills)
	const a = await ownRun(src2);
	const b = await ownRun(src2);
	const ta = JSON.stringify(a.trades.map((t) => t.size));
	const tb = JSON.stringify(b.trades.map((t) => t.size));
	return { sizesA: ta, sizesB: tb, identical: ta === tb, statusA: a.status, statusB: b.status };
});

// P4 — guest Date.now / new Date freshness (two runs must match if pinned)
await probe('p4-date-now', async () => {
	const src = `
	function onBar(bar, api) {
		if (bar.time === ${bars[3].time}) api.plot('ts', Date.now() % 1e7);
	}`;
	const a = await ownRun(src);
	const b = await ownRun(src);
	return {
		tsA: a.plots?.ts?.[3], tsB: b.plots?.ts?.[3],
		identical: JSON.stringify(a.plots) === JSON.stringify(b.plots)
	};
});

// P5 — setTimeout/setInterval/queueMicrotask: presence + whether a queued
// microtask ever executes (executePendingJobs is never called by runBacktest).
await probe('p5-timers-and-microtasks', async () => {
	const src = `
	function onBar(bar, api) {
		api.plot('haveTimeout', typeof setTimeout === 'function' ? 1 : 0);
		api.plot('haveMicrotask', typeof queueMicrotask === 'function' ? 1 : 0);
		Promise.resolve().then(function () { api.plot('microtaskRan', 42); });
		if (typeof setTimeout === 'function') { setTimeout(function(){ api.plot('timeoutRan', 99); }, 0); }
	}`;
	const r = await ownRun(src);
	return {
		status: r.status, code: r.error?.code,
		haveTimeout: r.plots?.haveTimeout?.[0], haveMicrotask: r.plots?.haveMicrotask?.[0],
		microtaskRan: r.plots?.microtaskRan?.[0], timeoutRan: r.plots?.timeoutRan?.[0]
	};
});

// P6 — infinite async loop (Promise chain): must NOT hang the run (no leak of
// control flow), and must not bypass the deadline mechanism.
await probe('p6-async-loop', async () => {
	const t0 = Date.now();
	const src = `
	function onBar(bar, api) {
		function loop() { Promise.resolve().then(loop); }
		loop();
	}`;
	const r = await ownRun(src, { limits: { deadlineMs: 500 } });
	return { status: r.status, code: r.error?.code, elapsedMs: Date.now() - t0 };
});

// P7 — output-cap bypass via giant strings through the plot host channel.
await probe('p7-giant-string-plot', async () => {
	const src = `
	function onBar(bar, api) {
		let big = 'x'.repeat(1024 * 1024);
		api.plot('blob', big.charCodeAt(0)); // numeric coercion kills the string
		api.order('buy', Number(big)); // NaN refusable check
	}`;
	const r = await ownRun(src);
	return { status: r.status, code: r.error?.code, plotsBlob: typeof r.plots?.blob?.[0] };
});

// P8 — memory limit bypass via host-channel JSON payloads (guest->host).
await probe('p8-giant-host-payload', async () => {
	const src = `
	function onBar(bar, api) {
		const big = new Array(8 * 1024 * 1024).fill(1e9);
		api.plot('n', JSON.stringify(big).length % 97);
		const t0 = Date.now ? undefined : undefined;
	}`;
	const a = await ownRun(src, { limits: { deadlineMs: 4000 } });
	const b = await ownRun(src, { limits: { deadlineMs: 4000 } });
	return {
		status: a.status, code: a.error?.code, n: a.plots?.n?.[0],
		identical: JSON.stringify(a.plots) === JSON.stringify(b.plots)
	};
});

// P9 — stack escape: recursion through a HOST function each frame
// (host calls must not reset or bypass the guest stack bound).
await probe('p9-host-recursive-stack', async () => {
	const src = `
	function recurse(i) {
		if (i > 1000000) throw new Error('escaped depth');
		api.state(); // host call per frame? no — api is a driver-local var
		return recurse(i + 1);
	}
	function onBar(bar, api) {
		window.__ = api; // no window — this should throw SCRIPT_ERROR truthfully
		recurse(0);
	}`;
	const r = await ownRun(src);
	return { status: r.status, code: r.error?.code, msg: (r.error?.message ?? '').slice(0, 120) };
});

// P9b — recursion through the HOST call stack: every frame does a host roundtrip.
await probe('p9b-host-stack-recursion', async () => {
	const src = `
	function f(n) { globalThis.__api.state(); return n <= 0 ? 0 : f(n - 1); }
	function onBar(bar, api) { globalThis.__api = api; f(1000000); }`;
	const r = await ownRun(src);
	return { status: r.status, code: r.error?.code, msg: (r.error?.message ?? '').slice(0, 160) };
});

// P10 — AUTHORITY HIJACK: guest overwrites the host functions
// (globalThis.__vict_order / __vict_plot). The driver routes through these.
await probe('p10-authority-hijack', async () => {
	const src = `
	function onBar(bar, api) {
		const realOrder = globalThis.__vict_order;
		globalThis.__vict_order = function (argsJson) {
			return JSON.stringify({ accepted: true, faked: true });
		};
	}
	// second bar: the driver's callHost('order', ...) now hits the impostor —
	// but the KIT fills only via the real pending order set in the host fn.
	`;
	const r = await ownRun(src, { toTime: tfEnd });
	return { status: r.status, code: r.error?.code, trades: (r.trades ?? []).length, unfilled: (r.unfilledOrders ?? []).length };
});

// P10b — guest overwrites __vict_barAt to fake bars INCLUDING a poisoned one.
await probe('p10b-fake-bars-hijack', async () => {
	const src = `
	const real = globalThis.__vict_barAt;
	globalThis.__vict_barAt = function (argsJson) {
		const b = JSON.parse(real(argsJson));
		b.high = b.high * 1000; // guest-side tamper of its OWN view
		return JSON.stringify(b);
	};
	function onBar(bar, api) { }`;
	const r = await ownRun(src);
	return { status: r.status, trades: (r.trades ?? []).length };
});

// P11 — dynamic import / module loading inside onBar.
await probe('p11-dynamic-import-onbar', async () => {
	const src = `
	function onBar(bar, api) {
		import('node:fs').then(function (m) { api.plot('imp', typeof m.readFileSync); },
			function (e) { api.plot('imp', 'REFUSED'); });
	}`;
	const r = await ownRun(src);
	return { status: r.status, code: r.error?.code, imp: r.plots?.imp?.[0] };
});

// P12 — future-data leak attempt through guest-side state: keep the last bar
// the guest ever received and compare later bars against a FUTURE record.
await probe('p12-future-accumulation-check', async () => {
	const src = `
	const seen = [];
	function onBar(bar, api) {
		seen.push(bar.time);
		if (seen.length === ${20}) { // near the END of the run
			// the future beyond the CURRENT bar must never have appeared earlier
			const maxSeen = Math.max.apply(null, seen);
			if (maxSeen > bar.time) throw new Error('FUTURE VIA HISTORY: ' + maxSeen);
		}
	}`;
	const r = await ownRun(src);
	return { status: r.status, code: r.error?.code, msg: (r.error?.message ?? '').slice(0, 200) };
});

// P13 — Error().stack: does it expose host function names / source paths?
await probe('p13-error-stack-leak', async () => {
	const src = `
	function onBar(bar, api) {
		try { null.x; } catch (e) { api.plot('stack', String(e.stack).slice(0, 80).length); }
	}`;
	const r = await ownRun(src);
	return { status: r.status, stackLen: r.plots?.stack?.[0] };
});

// P14 — deadline under host-heavy load: tight loop of host calls each bar.
await probe('p14-interrupt-with-host-calls', async () => {
	const src = `
	function onBar(bar, api) { while (true) { api.state(); } }`;
	const t0 = Date.now();
	const r = await ownRun(src, { limits: { deadlineMs: 500 } });
	return { status: r.status, code: r.error?.code, elapsedMs: Date.now() - t0, bounded: Date.now() - t0 < 4000 };
});

// P15 — guest deletes/tampers with 'use strict' scope or uses eval
await probe('p15-eval-and-fn-shadowing', async () => {
	const src = `
	var onBar2;
	function onBar(bar, api) {
		const g = eval('typeof fetch');
		const v = eval('1+1');
		api.plot('v', g === 'undefined' ? v : 999);
	}`;
	const r = await ownRun(src);
	return { status: r.status, code: r.error?.code, v: r.plots?.v?.[0] };
});

// P16 — getter/Proxy-based host-side reach: pass an object with a throwing
// getter into a host JSON-arg call (host must not crash the harness).
await probe('p16-host-arg-objects', async () => {
	const src = `
	function onBar(bar, api) {
		const evil = {};
		Object.defineProperty(evil, 'until', { get: function () { throw new Error('host crash attempt'); } });
		try { api.bars(evil); } catch (e) { /* nothing */ }
		api.plot('alive', 1);
	}`;
	const r = await ownRun(src);
	return { status: r.status, code: r.error?.code, alive: r.plots?.alive?.[0] };
});

console.log(JSON.stringify(results.probes, null, 1));