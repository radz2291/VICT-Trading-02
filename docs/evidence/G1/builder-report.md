# G1 builder report — native chart workspace (candidate, NOT a verdict)

**Builder:** delegated worker (fork session). **Baseline:** `bc7edbfbfbd7560f13c94f3e17a3e25c8f442cc2` (clean). Node v22.13.1, npm 10.9.2, Windows.
**Scope discipline:** only `host/**` and this report were touched; nothing committed or pushed (orchestrator integrates).

## What was built

`host/` evolved from the G0 spike into the G1 product workspace, keeping the verifier-confirmed architecture (published `ui-svelte` seam: `VitApp` + host-side `createComponentRegistry` + island props via view bindings + contract-validated action dispatch).

- **Bare chart first:** opening `/` shows XAUUSD 15m immediately. No Program/Method/Session/account anything — the only chrome is a workspace header and a collapsible panel.
- **Instrument + timeframe:** panel selects XAUUSD/EURUSD × 15m/1h/4h. XAUUSD base fixture is byte-identical to G0 (verified: 2023 bars, first/last bar values match the G0 self-check exactly). EURUSD is a second deterministic walk (seed 20260928, base 1.0850, 4 decimals — documented in `fixture.ts`). 1h/4h are honest UTC-bucket aggregations of existing bars only (1h=506, 4h=127 bars; partial buckets aggregate what exists; no invented bars — hand-checked bucket math).
- **Drawing lifecycle (horizontal price levels):** create (click empty chart space, short press), select (click within 6 px of a line), edit (price/label fields in the island toolbar, applied on change), **move (drag)** — implemented client-side via LWC coordinate conversion (`priceToCoordinate`/`coordinateToPrice`); chart panning is suppressed (`handleScroll: false`) for the duration of a drag so LWC never fights the gesture; store dispatch happens once on pointerup (live preview is local only). Remove (Delete key or toolbar). Undo/redo: symmetric stack of prebuilt `{undo, redo}` action pairs (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y), every entry dispatched through the contract path — undo of a remove restores the level with its ORIGINAL symbol/createdAt (save contract rev 2 carries them), so cross-symbol undo is correct.
- **Levels are instrument-scoped:** each level stores the symbol it was drawn on; the chart and panel list show only the current instrument's levels (verified in smoke: XAUUSD level hidden on EURUSD).
- **Persistence:** two localStorage keys (`g1.levels.v1`, `g1.workspace.v1`) written ONLY through the VICT dispatch path (contract parse → host persist → dataVersion bump → view refetch → reactive props). Workspace row = symbol/timeframe/panelOpen. Survives reload; fresh-browser-session persistence follows from origin-scoped localStorage (verifier to confirm with a fresh context).
- **Truthful states:** panel pill `ready / saving / saved / failed: quota|storage|CONTRACT_REJECTED`; island mutation status `idle / saving / saved / deleting / failed: detail`. Reset workspace button (confirm-guarded). Gap honesty: fixture gaps are bridged visually by LWC — stated in the island status line and panel Data note as a known limitation carried to G2 (per owner instruction; G0 evidence v2-13..v2-16b is the reference).
- **Panel:** instrument/timeframe selects, drawings list (price, label, created-UTC) for the current symbol, data note, reset. Toggle button in header (`aria-expanded`); panel state persists. Chart remains fully usable with the panel open (chart flexes; panel 260px).
- **Keyboard:** timeframe/instrument selects are native (focusable); `+ Level` button (adds at last close) is the keyboard path to create; Delete removes selected; Ctrl+Z/Ctrl+Shift+Z/Ctrl+Y undo/redo; Escape deselects/blur; visible `:focus-visible` outlines on all controls. Chart-canvas click-to-create is pointer-only (documented limitation; keyboard users have the `+ Level` path).
- **Narrow width:** stacked layout below 768px (panel below chart); `autoSize: true` on the chart handles live resize. Smoke-tested at 390×844: no horizontal overflow (`overflowX: false`), canvas reflowed correctly.
- **uPlot removed from the product** (adapter + island files deleted, dependency dropped) — preserved in git history and G0 evidence per owner instruction.

## VICT contract usage (all published 0.4.0-rc.1, exact pins)

| Path | Usage |
|---|---|
| `chart.level.save` rev **2** | create + keyed restore (now carries optional `symbol`, `createdAt` — enables correct cross-symbol undo) |
| `chart.level.update` rev 1 (NEW) | edit/move (price, note) |
| `chart.level.delete` rev 1 | unchanged |
| `workspace.set` rev 1 (NEW) | panel writes symbol/timeframe/panelOpen (`panelOpen` as 0/1 number) |
| views `v.levels` (rev 2), `v.workspace` (NEW) | reactive island props via source bindings |
| resources `levels` rev 2 (fields + update mutation), `workspace` rev 1 (NEW) | compiled plan |
| `useVictActions` via `@victframework/ui-svelte/component-actions` subpath | unchanged from G0 (finding F1 still open) |

## Checks run (all attested by me; interaction evidence = fresh verifier)

| Command | Result |
|---|---|
| `npm install` | OK (esbuild allowScripts warning, as G0) |
| `npm run check` (svelte-check) | **0 errors**, 1 warning (`state_referenced_locally` on the raw `$props()` proxy — same accepted pattern as G0 finding F3) |
| `npm run build` | **PASS** (31.0s, 762-class build, adapter-node) |
| SSR curl (fresh port 5211) | HTTP 200, 6313 bytes; `vict-app`, `cmp.chart.lwc`, all G1 testids present |
| Fixture self-check (tsx run) | XAUUSD byte-identical to G0 (2023 bars; first bar `{1767571200, 2650, 2650.27, 2649.83, 2650.1}`; ascending times); EURUSD 2023 bars; 1h=506, 4h=127; bucket OHLC hand-check passed |
| Client smoke (CDP, Chrome 9222) | hydration OK; `+ Level` → contract save → `saved` → panel lists drawing → **reload → drawing + price line present**; timeframe switch → 506 bars + persisted; symbol switch → level correctly hidden; `overflowX: false` at 390px width |

**Bundle:** app entry 6.0 KB, start chunk 22.9 KB (client build `.svelte-kit/output/client/_app/immutable/entry/`); LWC 5.0.8 remains 54.3 KB gzip (G0 measurement).

**IMPORTANT — stale-server trap found and closed:** a G0-era preview server was still listening on port 5199 and served the OLD spike page during first smoke. Both stale servers (5199, 5211) were killed after smoke; the verifier must start its own preview and should confirm the served HTML contains `data-testid="chart-island"` (G1) not `lwc-readout` (G0).

## What I did NOT verify (explicit — belongs to the fresh verifier)

- Real-pointer chart interactions: click-to-create on the canvas, select-by-click, **drag-move** (incl. pan suppression during drag), and their screenshots.
- Keyboard walkthrough evidence (Delete/Ctrl+Z flows in a real session).
- Fresh browser session persistence (new profile/context).
- Panel toggle → chart-usability at 1280px desktop; live resize after load.
- Undo/redo chains in a real browser (stack logic is unit-reasoned, not browser-proven).
- Workspace persistence across browser restart (origin-scoped localStorage expected to hold).

## Files changed (in-scope only)

- `host/src/lib/fixture.ts` — two deterministic instruments + honest timeframe aggregation (XAUUSD byte-identical to G0)
- `host/src/lib/chart-api.ts` — extended controller/callbacks contract (selection, move, OHLC readout)
- `host/src/lib/lwc.ts` — selection highlight, drag-move with pan suppression, pointer hit-testing, `autoSize`, OHLC crosshair readout; `subscribeClick` replaced by unified pointer logic (no double-fire)
- `host/src/lib/island-state.svelte.ts` — rewritten: workspace-view-driven symbol/timeframe, instrument-scoped levels, edit/drag/remove, symmetric undo/redo stack, truthful statuses
- `host/src/lib/islands/ChartIslandLWC.svelte` — workspace toolbar (add/undo/redo/delete + edit fields), OHLC readout, keyboard handling, gap-honesty note
- `host/src/lib/definition.ts` — `app.g1.workspace`; save contract rev 2; new update + workspace contracts; resources/views/actions; single-component plan
- `host/src/routes/+page.svelte` — workspace shell: header (status pill, panel toggle), side panel (selects, drawings list, data note, reset), contract dispatch incl. workspace.set, viewData with two views
- `host/src/lib/islands/ChartIslandUPlot.svelte`, `host/src/lib/uplot-adapter.ts` — **deleted** (G0 history + evidence preserve them)
- `host/package.json`, `host/package-lock.json` — `uplot` removed; VICT pins unchanged (0.4.0-rc.1 exact; `latest` trap avoided)
- this report

**Nothing committed, nothing pushed.** No files outside `host/**` and `docs/evidence/G1/builder-report.md` were touched.

## Residual risks / findings for the verifier and orchestrator

- **RF1 (medium):** drag-move uses LWC coordinate conversion — needs real-pointer proof that pan suppression timing is correct (drag start/end), and that a drag ending outside the price axis clamps sanely.
- **RF2 (low):** `panelOpen` uses number 0/1 (boolean not confirmed in the rc.1 resource field schema) — functional, slightly inelegant.
- **RF3 (low):** undo of the very first action after a failed dispatch leaves status `failed` until the next action — statuses are truthful but could confuse; acceptable.
- **RF4 (info):** keyboard users cannot place a level at an arbitrary price (only last-close via `+ Level`, or edit price after). Documented; refined in a later stage if W1 friction shows.
- **RF5 (info):** rc-stage: `0.4.0-rc.1` accepted by owner for G1; recheck against stable 0.4.0 (recorded in HANDOFF.md).
- **RF6 (low):** workspace row default materializes only on first panel change (view serves a default before that) — reload-before-first-change is lossless by design.
