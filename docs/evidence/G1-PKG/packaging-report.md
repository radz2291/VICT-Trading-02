# G1-PKG Part B — Packaging report: `@vict-trading/chart-workspace`

**Builder report (not a verifier verdict).** Baseline HEAD: `02d9d054d155a17acfd3232ad9943860add09887` (clean tree). Work done on the committed state; **not committed/pushed by the builder** — left for orchestrator integration. Environment: Node v22.13.1, npm 10.9.2, Windows, Chrome (CDP-driven) for browser evidence.

**Boundary statement: the app consumes the package through public exports; the package does not import the app.** Verified by import audit: every import in `packages/chart-workspace/src/**` resolves to `lightweight-charts` or a relative file inside the package (audit command: `grep -rn "from '" packages/chart-workspace/src | grep -v "lightweight-charts|\./"` → empty). No import anywhere in the package references `host/`, `$lib/`, VICT framework modules, or any workspace alias.

## 1. API design (public surface of `@vict-trading/chart-workspace` 0.1.0)

Small documented surface (see `packages/chart-workspace/README.md` for the full example):

| Export | Kind | Covers |
| --- | --- | --- |
| `createChart(host, bars, callbacks)` | function | LWC 5.0.8 candlestick surface; pan/zoom (native), crosshair OHLC readout, pointer create/select/drag-move of horizontal price levels, `ChartController` with `setData`/`setLevels`/`setSelected`/`readCrosshair`/`coordinateToPrice`/`priceToCoordinate`/`destroy` (anchored price-coordinate mapping) |
| `DrawingWorkspace` | class | headless drawing lifecycle: create / select / edit / move / remove / undo / redo (symmetric prebuilt op-pair stacks, symbol rides in the save op so an undo across an instrument switch restores on the ORIGINAL instrument); `subscribe()` change notification |
| `WorkspacePersistence` / `PersistenceOp` / `PortResult` | types | persistence port: `readLevels()` (throws on failure — read-gate contract) + `apply(op)` for save/update/delete. **Storage is the consumer's concern; the package owns no storage keys and never persists by itself** |
| `Bar`, `PriceLevel`, `CrosshairRead`, `ChartCallbacks`, `ChartController`, `ChartHost`, `CreateLevelInput`, `MutationResult`, `WorkspaceOptions` | types | API contracts. `PriceLevel` documents the anchoring truth: a level anchors to a **price-axis coordinate** (renders across all market time; survives pan/zoom/timeframe change); `createdAt` is wall-clock metadata, NOT a market-time coordinate (Part A correction carried into the package docs) |
| `isBar`, `isPriceLevel`, `isFiniteNumber`, `isNonEmptyString`, `validateCreateInput`, `validateUpdateInput` | functions | minimal input validation owned by the package |

**Dependency decision (recorded):** the package has **no VICT dependency**. Its API contracts are small and fully expressible with its own minimal guards (`src/validate.ts`); pulling the published VICT contract set would couple a chart capability to the app-facing contract layer. Only runtime dependency: `lightweight-charts@5.0.8` (G0 selection, pinned exact). Host-side VICT contract dispatch (`act.level.*` zod-parse in `host/src/lib/definition.ts`, routed via `useVictActions`) stays in the app — the app implements the persistence port on top of it.

## 2. What moved vs stayed

**Moved into the package** (behavior): `host/src/lib/lwc.ts` → `packages/chart-workspace/src/lwc.ts` (LWC adapter, now behind the `createChart` export, with two additions: `coordinateToPrice`/`priceToCoordinate` exposed on the controller, and try/catch around pointer capture so synthetic/inactive pointer ids can't crash the handler); the drawing mutation engine (create/edit/move/remove/undo/redo stacks, formerly `island-state.svelte.ts` private functions) → `packages/chart-workspace/src/workspace.ts` as `DrawingWorkspace`; input validation → `src/validate.ts`.

**Stayed in the app** (composition, unchanged in kind): deterministic fixtures and instrument/timeframe vocabulary (`host/src/lib/fixture.ts` — byte-identical, untouched); storage keys (`g1.levels.v1`, `g1.workspace.v1` in `host/src/routes/+page.svelte` — unchanged); product wording everywhere; VICT contract definitions and dispatch + read-gate/write-verify logic (Part A FIX 1 preserved); Svelte rendering (`ChartIslandLWC.svelte` stays a thin app-side island; no Svelte component needed in the package — everything the package owns is headless); workspace panel, registry, plan.

## 3. App refactor (W1 preserved)

- `host/package.json`: added `"@vict-trading/chart-workspace": "file:../packages/chart-workspace"` — **dev-iteration link only**; the final proof below uses the packed artifact in an independent consumer.
- `host/src/lib/chart-api.ts`: now a type re-export shim from the package (host import paths stable).
- `host/src/lib/lwc.ts`: **deleted** (package internal now).
- `host/src/lib/island-state.svelte.ts`: imports `createChart`/`DrawingWorkspace` from the package; builds a persistence port that routes save/update/delete through the existing VICT action dispatch (status pill mapping preserved); feeds consumer-owned reads via `store.setSource(incoming, symbol)`; all undo/redo/mutation stack logic removed (package-owned). F-V1 field-sync effects untouched.
- `host/src/lib/islands/ChartIslandLWC.svelte`: `createLwcChart` → `createChart` (package).
- `host/src/routes/+page.svelte`: **F-N1 fix** — every successful level mutation (save/update/delete) now sets `panelStatus='saved'`/`panelDetail=''`, so a stale `failed: storage` pill is cleared on recovery. Verified live: corrupt `g1.levels.v1` → save refused (`failed: storage`, bytes untouched) → restore `[]` → save succeeds → **pill shows `saved`** (screenshot `consumer/w1-after-refactor-fn1-recovery.png`).

App-side verification run (production build, preview on :5199, CDP-driven Chrome): bare chart renders (7 canvases, pill `ready`); create via toolbar → localStorage bytes written, pill `saved`; undo → `[]`; redo → bytes restored; full reload → drawings list re-rendered from storage; console clean. Screenshots: `consumer/w1-after-refactor-bare.png`, `consumer/w1-final-after-refactor.png`, `consumer/w1-after-refactor-fn1-recovery.png`.

**W1 claim status:** the refactored app passes the builder smoke above, but **W1 re-verification in the app (full walkthrough, desktop + narrow width, fresh profile, persistence across a fresh browser session) belongs to the fresh verifier on the final integrated SHA.** This report does not certify W1.

## 4. Standalone build + npm pack (the gate artifact)

Commands (exact, run in `packages/chart-workspace`):

```
npm install            # resolves lightweight-charts@5.0.8 + typescript
npm run build          # tsc -p tsconfig.json → dist/ (ESM + .d.ts + maps)
npm pack --pack-destination C:\Users\RZ1\AppData\Local\Temp\g1pkg-consumer
```

- Build result: **clean, no type errors**. `dist/` = **50,212 bytes (≈49 KB)**, 27 files (js + d.ts + sourcemaps).
- Packed artifact: `vict-trading-chart-workspace-0.1.0.tgz` (NOT committed; left under the gitignored/temp consumer dir).
- **sha512**: `299d1d9c2f3c23f619c4cfd4ce1c107cdc4431e617d4120845bee5301c93550906f67a9c3cb90cb620f64be8904f68dd933174a7254e17201a6655d8759016fa` (final repack, after the pointer-capture robustness fix and the addition of the `prepare` build script; `dist/` code byte-identical across the repacks — the consumer proof was run against this exact artifact, reinstalled from this tgz).
- Tarball contents: `package/package.json`, `package/README.md`, `package/dist/**` (index, lwc, types, validate, workspace — js/d.ts/maps). No source, no node_modules, no fixtures.

## 5. Independent consumer OUTSIDE the monorepo (the gate proof)

Location: `C:\Users\RZ1\AppData\Local\Temp\g1pkg-consumer` — fresh temp dir, own `package.json`, **no workspace/parent resolution** (npm ran with no workspace config; the monorepo root's package-lock/node_modules were never visible to it).

Exact commands:

```
cd C:\Users\RZ1\AppData\Local\Temp\g1pkg-consumer
npm install .\vict-trading-chart-workspace-0.1.0.tgz   # installs the packed artifact
npm install                                            # vite dev dependency
npm run dev -- --force                                 # vite on http://localhost:5299
```

The consumer (`index.html` + `src/main.js`, vanilla JS + vite, ~120 lines) imports **only** the package's public exports:

```js
import { createChart, DrawingWorkspace } from '@vict-trading/chart-workspace';
```

- **No app imports:** zero references to `host/`, `$lib`, `@victframework/*`, or the app fixture in the consumer tree (grep-audited).
- Consumer provides ITS OWN data: a locally generated 300-bar OHLC walk (not the app fixture).
- Consumer provides ITS OWN storage adapter with ITS OWN key `independent-consumer.levels.v1` — the package never saw or chose a storage key.

Demonstrated in a real browser (CDP-driven Chrome, screenshots in `consumer/`):

1. Chart renders from consumer data (7 canvases).
2. `+ Level` → level saved through the package workspace → consumer adapter → consumer storage (`{"id":"lvl-0hp8j8yv","price":97.32,...}`), status `saved` (consumer-01 from the earlier run; final run consumer-final-01).
3. Drag-move: pointer drag moved the level 97.32 → **100.4725**, persisted to the consumer's storage through the port, list re-rendered (`consumer-final-01-dragged.png`).
4. Full page reload → level re-read from the consumer's own storage and re-rendered (`persistedAfterReload: 100.4725…`, list = 1) (`consumer-final-02-reload.png`).
5. Undo/redo round-trip verified in the same flow (stored `[]` → restored).
6. Console clean after the final flow (`[]`).

One consumer-side bug was found and fixed during the proof (not a package defect): the consumer initially forgot to feed `workspace.setSource(...)` its own reads, so `move` correctly returned `NOT_FOUND` — the package refuses mutations against state it was never fed. Fixed in `src/main.js`; the README example already documented the correct pattern.

### Dependency identity table

| Package | Version | Source | Notes |
| --- | --- | --- | --- |
| `@vict-trading/chart-workspace` | 0.1.0 | packed tgz (sha512 above), installed into the consumer | the artifact under proof |
| `lightweight-charts` | 5.0.8 | npm registry (published) | pulled transitively INTO the consumer by the package — exact pinned |
| `fancy-canvas` | 2.1.0 | npm registry | transitive of lightweight-charts |
| `vite` | 6.4.3 | npm registry | consumer devDependency only (build tooling, not shipped by the package) |
| `typescript` | ^5.6 | npm registry | package devDependency only |
| `@victframework/*` | — | **absent from the consumer tree** | `npm ls` proof: no host, no VICT, no workspace packages |

Consumer `npm ls` (top of tree; full output captured during the run):

```
g1pkg-independent-consumer@0.0.0
+-- @vict-trading/chart-workspace@0.1.0
| `-- lightweight-charts@5.0.8
|   `-- fancy-canvas@2.1.0
`-- vite@6.4.3 (dev; + esbuild optional platform binaries)
```

## 6. Bundle observations

| Measure | Before refactor (HEAD 02d9d05) | After refactor |
| --- | --- | --- |
| App main page chunk (`nodes/2.*.js`, raw) | 462,297 B | 466,053 B (+3,756 B ≈ +0.8%) |
| Package `dist/` | — | 50,212 B (incl. d.ts + sourcemaps) |
| Consumer minimal app build (vite, includes LWC + package) | — | 161.59 kB raw / 51.62 kB gzip |

The app still bundles everything into its page chunk (SvelteKit/Vite inlines the linked package); the +3.7 KB delta is the package wrapper/validation/workspace layer. Nothing was duplicated (single LWC copy).

## 7. Honesty / unverified items

- npm publish was NOT performed (prohibited) — proof standard is `npm pack` + independent install, as directed.
- W1 full re-verification (desktop + narrow, fresh session, keyboard access) = **fresh verifier's job on the final SHA**; only builder smoke evidence exists here.
- The drag-move evidence in the consumer was exercised via synthetic PointerEvents (CDP/JS); real-pointer behavior is covered by the identical code path verified in the app in Part A evidence. Labeled as such.
- The `.tgz` sha512 above must be re-verified by the verifier after rebuild — `npm pack` is reproducible in content, but the verifier should pin its own hash against the committed `packages/chart-workspace` sources at the final SHA.
- `docs/STATE.md` not updated by the builder (gate not complete; no commit) — orchestrator/verifier to record the actual verdict + SHA.
