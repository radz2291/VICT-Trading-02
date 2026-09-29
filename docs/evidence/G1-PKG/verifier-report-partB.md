# G1-PKG — Fresh Verifier Report, Part B

**Verifier session:** fresh port, independent of builder. **Tested SHA: `f0fdcd4f01ae6c9192543b52f26e149492bf3198`** (verified: `git rev-parse HEAD` matches pinned candidate; working tree clean at start; origin `https://github.com/radz2291/VICT-Trading-02`).
**Environment:** Node v22.13.1, npm 10.9.2, Windows, Chrome 153 via CDP (:9222). Host app served as production build (`vite preview :5199`). Independent consumer served on `http://localhost:8077` from `C:\Users\RZ1\AppData\Local\Temp\gv-verifier\consumer` (outside the repo).

**Verdict summary: PASS WITH NON-BLOCKING FINDINGS** (per-check verdicts and findings below; vocabulary per docs/EVALUATION.md).

---

## Check 1 — Independent-consumer proof (critical, redone independently)

**PASS.**

- My own `npm pack` (run from a temp copy of `packages/chart-workspace`, output to `C:\Users\RZ1\AppData\Local\Temp\gv-verifier`): `vict-trading-chart-workspace-0.1.0.tgz`,
  sha512 `299d1d9c2f3c23f619c4cfd4ce1c107cdc4431e617d4120845bee5301c93550906f67a9c3cb90cb620f64be8904f68dd933174a7254e17201a6655d8759016fa` — **exact match** with the hash recorded in packaging-report.md. The gate artifact is byte-reproducible from the pinned SHA.
- Fresh consumer created at `Temp\gv-verifier\consumer` with its own `package.json` (`gv-independent-consumer`), installed **from my tgz via `file:` URL**. `npm ls --all`: only `@vict-trading/chart-workspace@0.1.0 → lightweight-charts@5.0.8 → fancy-canvas@2.1.0`. **No host resolution, no VICT packages** (none are documented in README either — README claims zero VICT dependency, and the tree confirms it).
- Public exports resolve: `node -e require(...)` of the installed dist ESM returns `{createChart, DrawingWorkspace, isBar, isPriceLevel, isFiniteNumber, isNonEmptyString, validateCreateInput, validateUpdateInput}` (+ types).
- Demo (`consumer/demo.mjs`, `index.html` with importmap): imports **only package public exports** (grep of consumer sources: zero app/host/`$lib`/`g1.*` references); consumer-generated bar data (my own seeded series, ~110–113 price range — different from app fixtures); consumer-owned storage adapter under key **`gv.consumer.levels.v1`** (deliberately different from the app's `g1.levels.v1`).
- Browser walkthrough (CDP, real interaction on my page at localhost:8077, `[data-testid="gv-consumer-chart"]` asserted first):
  1. **Chart renders** — 7 canvases, candles drawn from my consumer data. `gv-consumer-01-chart-level-created.png` shows the level too.
  2. **Create a level** — level `lvl-3bngcxuo` @ 111.25; storage bytes written to `gv.consumer.levels.v1`; axis label "gv level" visible. Screenshot: `gv-consumer-01-chart-level-created.png`.
  3. **Move it** — price updated to **112.75** in storage and re-rendered via the package port. Screenshots: `gv-consumer-02-level-moved-11275.png`, `gv-consumer-02b-level-moved-11275-rendered.png`.
  4. **Undo/redo** — undo → storage back to 111.25; redo → 112.75. Symmetric stacks confirmed through the consumer adapter (bytes recorded in session log below).
  5. **Reload persistence** — full `location.reload()`; level restored from consumer storage, re-rendered at 112.75 with label. Screenshot: `gv-consumer-03-after-reload-persisted.png`.
- Consumer runs **outside the repo** (temp dir); served from there; screenshots show it running.

Session transcript (bytes observed): create → `[{id,"price":111.25,"note":"gv level","symbol":"GVDEMO",...}]`; edit → `112.75`; undo → `111.25` (note intact); redo → `112.75`; after reload → same bytes, chart redrawn.

## Check 2 — Import boundary audit

**PASS.**

- `grep -rn "from '" packages/chart-workspace/src` excluding `lightweight-charts`: only relative `./…` imports (`./lwc.js`, `./workspace.js`, `./validate.js`, `./types.js`). Zero references to `host/`, `$lib`, svelte, islands, fixtures, or any VICT workspace alias. Text matches on "host" are local identifiers (`ChartHost`, `host.container`) and comments, not imports.
- Host imports the package via the public export name `@vict-trading/chart-workspace` in exactly three files: `host/src/lib/chart-api.ts` (type re-export shim), `host/src/lib/island-state.svelte.ts` (`DrawingWorkspace`, `createChart`, `WorkspacePersistence`, types), `host/src/lib/islands/ChartIslandLWC.svelte` (`createChart`).
- `package.json` `main`/`exports` resolve correctly; verified from Node in the consumer (`Object.keys` above) and by the consumer browser page resolving the ESM dist through an importmap.

## Check 3 — Storage-failure behavior after the Part B refactor (host app)

**PASS.**

- Production build of host, preview :5199. `data-testid="chart-island"` asserted on load (found, 7 canvases).
- Corrupted `g1.levels.v1` → `CORRUPT{{not json`; clicked **+ Level** → write **refused**: byte diff identical (`CORRUPT{{not json` before/after — captured in-page and logged); status pill shows **`failed: storage`**. Screenshot: `gv-01-corrupt-write-refused-bytes-survive.png`. Undo while corrupt also refused (bytes still corrupt). This is the read-gate invariant operating **end-to-end through the package's `WorkspacePersistence` port** (host port adapter routes through the same VICT write-refusal path; the refactor did not reopen a blind-overwrite hole).
- Restore `[]` → normal writes resume (`+ Level` writes bytes, pill `saved`) — covered in `gv-02-fn1-recovery-pill-saved.png`.

## Check 4 — App W1 re-run: desktop 1280 + narrow 375/768

**PASS** (with one method note below).

- **Fresh first paint:** cleared `localStorage` (the Chrome profile had carried leftover state from the builder's earlier session on this origin — see Findings), reloaded → bare chart, empty drawings panel, pill `ready`, nothing written. Screenshot: `gv-w1-00-bare-firstpaint-1280-fresh.png`.
- **Desktop 1280×800 (dpr2):** created level via **+ Level** (writes bytes, `saved`); edited label via the selected-level field to **"GV edited label"** (persisted into storage `note` field); **dragged the line via real CDP mouse input** (calibrated: moved level `lvl-5mzyzaq6` 2647.77 → **2646.316**, storage updated, pill `saved`) — screenshot `gv-w1-02-desktop1280-drag-moved-persisted.png`; **undo** applied an inverse op changing stored bytes (stack honest); **full reload → persistence proven** (both verifier-modified levels restored and drawn) — screenshot `gv-w1-03-desktop1280-after-reload-persisted.png`.
- **Narrow 375×700 (dpr2, mobile):** chart renders (7 canvases), both persisted levels visible with labels (2649.09, "GV edited label" 2646.32); **+ Level** created `lvl-s02mjp2d` @2647.77 (bytes written); reload → all three persisted. Screenshots: `gv-w1-04-narrow375-persisted.png`, `gv-w1-05-narrow375-created-reloaded-persisted.png`.
- **Narrow 768×800:** renders with all three persisted levels, layout intact. Screenshot: `gv-w1-06-narrow768-persisted.png`. Pill `ready`/`saved`/`failed: storage` states all observed live at least once during this session.

## Check 5 — F-N1 fix (post-recovery pill reset)

**PASS.** Live sequence: corrupt key → create refused (`failed: storage`) → restore `[]` → successful create → pill **`saved`**, failure text gone. Screenshot: `gv-02-fn1-recovery-pill-saved.png`. Regression on the fix not reproduced.

## Check 6 — Checks and builds

**PASS.**

- `host` `npm run check`: **0 errors, 1 warning** (baseline `state_referenced_locally` in `ChartIslandLWC.svelte:7` — matches the claimed baseline).
- `host` `npm run build`: clean (`vite build` + adapter-node done). Client entry `start.Dm3lwFir.js` = 22,886 bytes (raw). Largest chunk `BKzLwrr8.js` 29,143 bytes. No pre-refactor build artifact available at this tree for an exact delta — recorded current sizes; delta accounting: **unverified** (would need a build from the parent SHA `02d9d05`).
- `packages/chart-workspace` `npm run build`: clean tsc; `dist/` = **50,728 bytes, 20 files** (js + d.ts + maps). Packaging-report claims "50,212 bytes, 27 files" — artifact identity is proven by the sha512 match, but the report's size/file-count figures do not reproduce exactly (see Findings).

## Check 7 — Scope audit

**PASS.** `git diff 02d9d05..f0fdcd4 --name-only`: 21 files, all under `packages/**`, `host/**`, or `docs/evidence/G1-PKG/**`. Nothing outside allowed scope.

---

## Findings (all non-blocking)

1. **[minor] Reproducible-artifact metadata discrepancy in packaging-report.md.** The report says dist = "50,212 bytes, 27 files"; my independent build+pack gives dist 50,728 bytes / 20 files (npm tarball shows 22 total files). The tgz sha512 matches exactly, so the shipped artifact is byte-identical — only the report's prose numbers are stale. **User effect:** none; documentation accuracy only. **Bounded/owned:** should be corrected in the packaging report text at next edit.
2. **[minor] Browser-profile freshness caveat.** The CDP Chrome I connected to was already running on :9222 and its profile contained leftover `g1.levels.v1` state from the builder's earlier session on the same origin. I established cleanliness by clearing origin storage and reloading before the fresh first paint demonstration (verified empty `lsKeys`); I did not restart with a brand-new profile. **User effect:** none on demonstrated behaviors (all walkthroughs started from verified-empty state). Recommend the next verifying session launch `browser-start.js` fresh first.
3. **[minor] Consumer-side note-loss on price-only update (consumer adapter design).** In my consumer demo (and per the README example's adapter pattern), `workspace.edit(id, {price})` issues an update op whose `note` is undefined; adapters copying `{...l, note: op.note}` drop the note key. Undo restored the full object, so stacks are honest. The package could preserve an undefined note (omit-and-keep semantics) or the README example could be sharper. **User effect:** a consumer following the README example can silently drop a level's note metadata on price-only moves. **Bounded/owned:** carry to G1-PKG follow-up or document explicitly.
4. **[info] Verifier-caused storage noise.** During drag calibration (probe clicks + synthetic pointer events) I created one extra level (`lvl-q4n835ld`) in the **local verifier browser's** storage under my own account of actions; no product claim is affected, no real data involved (all fixture/localStorage). Documented for transparency.
5. **[info] Bundle-delta accounting is `unverified`** — comparing app bundle sizes before/after the refactor would require building the parent SHA `02d9d05`; I recorded current sizes only.

## Verdict

**PASS WITH NON-BLOCKING FINDINGS** for G1-PKG at pinned SHA `f0fdcd4f01ae6c9192543b52f26e149492bf3198`.

- The independent-consumer proof (the critical gate) was redone end-to-end by this verifier from its own `npm pack` artifact (sha512 match) in a fresh consumer **outside** the repository, consuming only public exports with consumer-owned data and a consumer-owned storage key: chart rendering, create, move, undo/redo, and cross-reload persistence all demonstrated with screenshots.
- Import boundary, storage-failure/refusal behavior, read-gate invariant through the package port, F-N1 recovery pivot, W1 at desktop + narrow widths, checks/builds, and scope audit all pass under independent attempt.
- Non-blocking findings above are identified, bounded, and owned; none contradict a required G1-PKG behavior.

**Not certified by this report:** future stages, publishing (the package must remain UNLICENSED/unpublished), and any owner-experience judgment requiring the human owner.

**Tested SHA:** `f0fdcd4f01ae6c9192543b52f26e149492bf3198`.

*Verifier-caused tree changes: untracked `docs/evidence/G1-PKG/gv-*.png` screenshots only (this report + evidence, per task instruction). No commits, no pushes, no repairs.*