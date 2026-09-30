# A1 — scripting runtime selection evidence (G3 Part A)

**Date:** 2026-09-30. **Stage manager decision (authorized by the accepted G3 record, Part A1):** select **`quickjs-emscripten@0.32.0` (MIT)** via the **explicit variant path `newQuickJSWASMModule(RELEASE_SYNC)`** as the G3 scripting runtime, subject to the real-browser confirmation already obtained (see below) and re-verification by the fresh verifier.

## Verdict basis (all reproducible via `node probe.mjs`; raw results in `probe-results.json`)

| Requirement (accepted record, A1 criteria) | Result |
|---|---|
| Every enumerated escape probe refused/terminated | **PASS** — guest sees no `fetch`, `XMLHttpRequest`, `document`, `window`, `localStorage`, `process`, `require`; dynamic `import('node:fs')` refused (`could not load module`); `Function`-constructor escape reaches only the guest realm; guest `Object.prototype` pollution does not touch the host |
| Hard resource limits enforced with truthful errors | **PASS** — infinite loop interrupted at the 500 ms deadline (observed 502 ms, error `interrupted`); memory bomb refused at the 64 MB runtime limit (error `out of memory`); oversized output refused by the same limit; guest stack exhaustion contained (`SCRIPT_STACK_OVERFLOW`, surfaces as a host `RangeError` through the FFI in this build — **fresh runtime required after it**, which the kit contract mandates anyway: one runtime per script run) |
| Deterministic same-input results | **PASS** — two fresh sandboxes with the same seed produce identical output; the kit replaces guest `Math.random` with a seeded PRNG and pins `Date.now` to market time |
| Documented syntax subset + error behavior | **PASS** — full ES2020+-class QuickJS surface; syntax errors surface as messages (e.g. `invalid property name`) **without line numbers in this build** (recorded honestly; the editor shows the raw message), runtime errors readable (`cannot read property 'x' of null`) |
| Recorded bundle delta | release-sync wasm 1,027,523 bytes loaded at runtime + ~84 KB glue (esbuild bundle, browser-verified); module init ~instant after wasm load. In-browser limits verified: same probe set executed in headless Chromium during selection (interrupt + memory limit + syntax error all confirmed in the TARGET runtime) |
| Zero guest reachability to network/DOM/storage/host globals | **PASS** (see escape probes) |

## Candidates considered

1. **`quickjs-emscripten@0.32.0` (MIT) — SELECTED.** Hard WASM sandbox, memory limit, interrupt deadline, stack bound, seeded determinism, browser+Node parity.
2. `@sebastianwessel/quickjs@3.1.0` (MIT) — NOT selected: does not load under plain Node ESM (bundler-oriented wiring, `variant.importModuleLoader` undefined); wraps the same QuickJS WASM core without adding containment the raw library lacks. Evaluated 2026-09-30, scratch harness.
3. Web Worker + restricted message API — NOT selected: no hard CPU/memory limit (termination only), async-only boundary conflicts with the per-bar synchronous runner contract, and the escape surface (postMessage protocol bugs) is harder to probe exhaustively.
4. Kit-native minimal DSL — NOT needed: candidate 1 passed every probe; fallback remains available if the verifier falsifies containment.

## Environment pitfall (recorded, must survive into the kit docs)

The legacy `getQuickJS()` entry of quickjs-emscripten is **broken on this machine** (win32-x64; Node v22.13.1 AND headless Chromium, both via bundling): every `evalCode` result — success AND error — dumps as `0` / garbage floats, across v0.31.0/v0.32.0 and wasmfile/singlefile variants. The explicit variant path `newQuickJSWASMModule(RELEASE_SYNC)` works everywhere tested and is the **only** wiring the kit uses. Diagnosed and recorded 2026-09-30; probes above all use the explicit path.

## Contract decisions this selection forces (kit design, G3 record criteria)

- One QuickJS runtime **per script run** (aborts/OOM/stack-overflows poison the runtime; disposal is mandatory).
- Guest is executed as **synchronous** code per call; guest promises only settle when the host pumps the job queue — the runner pumps between bars under the same deadline, so an `await` that never settles is interrupted truthfully.
- `Math.random` replaced by a seeded PRNG; `Date.now` pinned to the replay/bar time — determinism is a contract, not a hope.
- Guest output is bounded by the runtime memory limit; the runner additionally caps structured outputs (plots/trades) at the pinned range length.
