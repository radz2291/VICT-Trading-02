# G0 spike — chart candidates on the published 0.4.0-rc.1 seam (builder report)

**Candidate report — NOT an independent verdict.** Builder: delegated worker (fork session). Baseline: `58ddfc5b7214a813e4f760ca8bc009d0a4462823` (clean). Node v22.13.1, npm 10.9.2, Windows.

## What was built

`host/` — minimal SvelteKit app (adapter-node) mounting the **published** `@victframework/ui-svelte@0.4.0-rc.1` `VitApp` host with a compiled Application Plan (`compileApplication` from `@victframework/application`), two custom chart islands registered host-side through `createComponentRegistry` (registry authority stays consumer-side, per the ui-svelte contract).

## Exact versions installed (npm ls)

| Package | Version |
|---|---|
| @victframework/application / ui / ui-svelte / sdk / contracts | **0.4.0-rc.1** (exact pin; `latest` avoided — it is a non-functional `0.0.0-bootstrap.1` marker) |
| svelte | 5.57.1 (peer floor ^5.33.0 satisfied) |
| @sveltejs/kit / vite / vite-plugin-svelte / adapter-node | 2.70.3 / 6.4.3 / 5.1.1 / 5.5.7 |
| lightweight-charts | **5.0.8** (exact) |
| uplot | **1.6.32** (exact; registry name is lowercase `uplot` — `uPlot` 404s) |
| svelte-check / typescript | 4.7.6 / 5.9.x (ts 5.9.3 resolved) |

## Fixture (deterministic, fixture-only — no market data)

Seed `20260927` (mulberry32), start `2026-01-05T00:00:00Z` (Monday), 15m step, 2800 candidate slots minus weekends minus deliberate gaps (block: candidate slots 300–307; singles: 17, 499, 1200).

**Verified self-check values (node run against the committed generator):**
- bar count: **2023**
- first bar: `{time:1767571200, open:2650, high:2650.27, low:2649.83, close:2650.1}`
- last bar: `{time:1770090300, open:2647.51, high:2647.94, low:2647.06, close:2647.77}`
- times strictly ascending: true; OHLC sanity (high≥max(o,c), low≤min(o,c)): true for all bars

## Commands and results

| Command | Result |
|---|---|
| `npm install` | OK (1 warning: esbuild postinstall gated by allowScripts — build still worked) |
| `npm run build` (vite + adapter-node) | **PASS** (34.5s; 762 modules) |
| `npm run check` (svelte-check) | **0 errors**, 2 warnings (see findings F3) |
| `npm run preview` + `curl http://localhost:5199/` | **HTTP 200**, 4330 bytes SSR HTML; contains screen title, `vict-app` host div, and both islands' server-rendered shells (`lightweight-charts` ×2, `uPlot` ×1 markers) — **no SSR crash** |

## Bundle & license observations

| Item | Value |
|---|---|
| lightweight-charts 5.0.8 production ESM | 171,718 B raw / 54,326 B gzip |
| uplot 1.6.32 ESM (esm.js) | 145,423 B raw / 41,780 B gzip (minified iife: 51,081 B) |
| Full page client chunk (both candidates + host + VitApp) | 501 KB raw |
| Total client JS (both candidates) | 585,685 B raw / 189,910 B gzip |
| Per-candidate in-app delta | NOT isolated (both statically imported on one page) — honest gap; per-candidate dist sizes above are the honest figures. Isolation would need two builds or dynamic-import islands (deferred). |
| lightweight-charts license | Apache-2.0 (https://www.tradingview.com/lightweight-charts/) |
| uplot license | MIT (https://github.com/leeoniya/uPlot) |
| @victframework/ui, ui-svelte license | Apache-2.0 |

## Durability answer (the critical question) — implemented on the published contract

The drawing survives reload through **two published-contract paths combined** (implemented end-to-end):

1. **Write path — action dispatch**: island calls `useVictActions().run('act.level.save', {id, price, note})` → `VitApp` dispatch → **host-side dispatch function** validates via the same `defineContract` parser (`chart.level.save`) → persists to `localStorage` → bumps its data version. (Import path on the published tarball is the **subpath** `@victframework/ui-svelte/component-actions` — `useVictActions` is NOT exported from the package root at rc.1, contrary to repo-tip docs. Recorded as finding F1.)
2. **Read path — expanded props domain**: the plan declares island `props.levels = { view: 'v.levels' }` (closed source binding). Host feeds `viewData['v.levels'].rows` from the persisted store; the renderer resolves it (`resolveComponentProps` → `resolveComponentSource` in ui-svelte logic.ts) and the island receives saved levels **reactively**, including after full reload. Islands reconcile drawn levels by id (`$effect`).

Both islands share identical logic (`island-state.svelte.ts`); only the chart adapters differ.

**Honesty boundary:** mechanism implemented per published contracts (ComponentSlot.svelte `provideComponentActions`; logic.ts source bindings — quoted files in `raw2/tarball-inspect/`). The **click→save→reload→redraw loop itself was NOT verified in a real browser** in this run (no interaction evidence) — runtime interaction verification belongs to the fresh verifier pass with browser tooling. Build/typecheck/SSR are the only claims attested here.

## Candidate behavior implemented (to be exercised by verifier)

| Behavior | lightweight-charts 5.0.8 | uPlot 1.6.32 |
|---|---|---|
| Pan | native drag | drag-select = zoom (no native pan; reset via dblclick) |
| Zoom | native wheel | wheel (implemented, x-only) |
| Crosshair read (price+time) | native subscribe + `coordinateToPrice` | `setCursor` hook + `posToVal` |
| Horizontal level | `series.createPriceLine` per level, diffed by id | one 2-point span series per level; full re-init on change |
| Click-to-add | native `subscribeClick` | container click (ignored while drag-selecting) |

## Findings

- **F1 (medium, upstream doc/contract drift):** published `ui-svelte@0.4.0-rc.1` index.ts does not export `useVictActions`; it lives behind the `./component-actions` subpath. Repo-tip sources export it from the root. Narrow public-contract question for upstream: *should the component-actions API be re-exported from the package root in the stable 0.4.0?* Not blocking: subpath works and is a stable export-map entry.
- **F2 (medium, candidate limitation):** uPlot has no native pan; pan is absent in this spike (zoom + reset only). If uPlot advances, a pan layer must be custom-built — added cost versus lightweight-charts' native interaction stack.
- **F3 (low, tooling):** svelte-check emits 2 `state_referenced_locally` warnings on passing the `$props()` proxy into the shared island-state helper — intentional reactive pattern (the helper must re-read `props.levels`); warnings documented as accepted.
- **F4 (low, perf approach):** uPlot levels use full chart re-init per level-set change (simple + correct); fine at this fixture size, would need a cursor-draw plugin at production interaction rates. Deferred.
- **F5 (info, rc-stage):** everything pinned to `0.4.0-rc.1`. G0 gate should state whether the rc is acceptable for the gate itself or re-run against stable 0.4.0 (owner/orchestrator decision).

## Not verified here (explicit)

- Real-mouse pan/zoom/crosshair/drawing evidence (needs browser tooling — fresh verifier pass)
- Hydration runtime behavior in a browser (SSR HTML verified only via curl)
- Multi-chart sync, keyboard accessibility, 60fps pan performance on 2023 bars (later stage criteria)

## Files created (in-scope)

- `host/package.json`, `host/svelte.config.js`, `host/vite.config.ts`, `host/tsconfig.json`
- `host/src/app.html`, `host/src/app.d.ts`
- `host/src/routes/+layout.svelte`, `host/src/routes/+page.svelte`
- `host/src/lib/fixture.ts`, `host/src/lib/definition.ts`, `host/src/lib/chart-api.ts`, `host/src/lib/lwc.ts`, `host/src/lib/uplot-adapter.ts`, `host/src/lib/island-state.svelte.ts`
- `host/src/lib/islands/ChartIslandLWC.svelte`, `host/src/lib/islands/ChartIslandUPlot.svelte`
- `host/package-lock.json`, build outputs (`.svelte-kit/`, `node_modules/` — untracked artifacts, gitignored)

Nothing outside `host/` and this report was modified. Nothing committed or pushed.
