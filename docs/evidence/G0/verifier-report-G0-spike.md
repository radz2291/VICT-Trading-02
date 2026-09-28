# G0 chart-candidate spike — FRESH VERIFIER REPORT (attempt 2)

**Independent verifier session. Candidate SHA tested: `212d490219921e75e4a3554c6f7f575aa22441f7`** (verified: `git log --oneline -5` shows HEAD = `212d490`; parent `236c096` = spike host; base `58ddfc5`). Working tree at start: clean except untracked inherited shots `docs/evidence/G0/verifier-shots/01–08*.png`.

I am independent of the builder. The builder report (`spike-host.md`) was treated as unproven. Every builder claim below was re-executed or re-tested by me. **Screenshots 01–08 are INHERITED from the crashed prior verifier attempt — none is used as my evidence.** All my evidence is prefixed `v2-`.

Environment: Node v22.13.1, npm 11.19.1, Windows; Chrome 153 via CDP (remote debugging :9222, fresh debug profile `~/.cache/browser-tools/win-profile`); viewport 1280×800 @ dpr 1.25. Interactions were dispatched as real browser input through CDP `Input.dispatchMouseEvent` (mousePressed/moved/released, wheel via `Input.synthesizeScrollGesture` — see note R1) and read back via `Runtime.evaluate`. Tooling scripts live outside the repo (`%TEMP%/cdp-*.mjs`); nothing in the repo was modified.

---

## Criterion matrix

| ID | Criterion | Verdict | Evidence |
|---|---|---|---|
| C1 | Builder's rebuild claims reproduce (`npm run build`, `npm run check`, SSR 200, fixture self-check) | **PASS** | shell outputs in this report; `v2-02-fresh-load.png` |
| C2 | LWC island: pan, zoom, crosshair price+time read-back vs fixture, create/remove level | **PASS** | `v2-03`,`v2-04`,`v2-08`,`v2-12`,`v2-30` |
| C3 | uPlot island: pan, zoom, crosshair read-back, create/remove level | **FAIL (as claimed)** — crosshair read and level drawing contradicted; wheel zoom, click-add, remove pass | `v2-17`–`v2-28` |
| C4 | Durability loop: create → reload → redrawn; edit → reload → survived; remove | **PASS for LWC**; in-app edit affordance NOT DEMONSTRATED (none exists) | `v2-09`,`v2-10`,`v2-11`,`v2-28`,`v2-29`,`v2-30` |
| C5 | Negative: fixture gap block (slots 300–307), console errors | **Gap truthful in data, visually bridged in LWC (finding V-F4)**; console clean except favicon 404 | `v2-15`,`v2-16a`,`v2-16b` |
| C6 | Scope: only in-scope paths changed vs `58ddfc5` | **PASS** | diff stat below |
| C7 | F1: `useVictActions` on `./component-actions` subpath in installed 0.4.0-rc.1 | **PASS (confirmed)** | node_modules inspection below |

**VERDICT: PASS WITH NON-BLOCKING FINDINGS** (for the G0 spike candidate — see reasoning and findings; the uPlot claim-level FAILs are bounded, owned, and carried, and G0's required "one real chart candidate demonstrates the full set through the public UI seam" is satisfied by lightweight-charts with my independent interaction evidence).

---

## C1 — Rebuild claims (reproduced)

Commands run by me in `host/`:

- `npm run build` → **PASS** (vite build ✓ 762 modules, "✓ built in 18.38s", adapter-node "✔ done"). Matches builder's PASS.
- `npm run check` → **0 errors, 2 warnings** — exactly the builder's claim; both warnings are `state_referenced_locally` on passing `$props()` into `islandState()` in `ChartIslandLWC.svelte:7` and `ChartIslandUPlot.svelte:7` (documented as F3 in the builder report).
- `npm run preview` (port 5199) → `curl http://localhost:5199/` → **HTTP 200**, SSR HTML contains title "G0 Chart Candidate Spike — XAUUSD 15m fixture", `vict-app` host, both island shells (markers `lightweight-charts` ×2, `uPlot` ×1). No SSR crash.
- Installed identities verified with `npm ls`: `@victframework/{application,ui,ui-svelte,contracts,sdk}@0.4.0-rc.1`, `lightweight-charts@5.0.8`, `uplot@1.6.32`, `svelte@5.57.1` (peer floor ^5.33.0 satisfied).
- Bundle spot-check (builder's figures reproduce byte-exact): `lightweight-charts.production.mjs` 171,718 B raw / 54,326 B gzip; `uPlot.esm.js` 145,423 B raw / 41,780 B gzip. `uPlot.min.css` **exists in the installed package** (contains `.u-wrap` rules) — see V-F1.
- Fixture self-check (esbuild-transpiled the committed `src/lib/fixture.ts`, ran in node): **bar count 2023**; first bar `{1767571200, o 2650, h 2650.27, l 2649.83, c 2650.10}`; last bar `{1770090300, o 2647.51, h 2647.94, l 2647.06, c 2647.77}` — byte-identical to the builder's claimed values; times strictly ascending; OHLC sanity true for all bars; weekend slots absent (0 bars on Sat/Sun); deliberate drops verified absent (slots 17, 499, 1200, and 300–307). No clock usage in the generator (pure seeded PRNG) — no future-data leakage surface in the fixture.

## C2 — lightweight-charts island (real-browser walkthrough)

All steps performed by me with real CDP input on the running preview.

- **Baseline (fresh load, fitContent full range Jan 5 → Feb 3):** `v2-02-fresh-load.png`. 2023 bars visible; price axis labeled; the dotted green line = LWC's default last-value price line at **2647.77 = fixture's true last close** (axis tag visible). Earlier "tail view" (`v2-01`) traced to stale tab state inherited from the crashed session — a fresh reload shows the correct full range (`v2-02-fresh-reload-lwc.png`).
- **Pan (drag):** drag 700→900 px horizontally (`v2-03-lwc-after-pan.png`): the view scrolled by ~4 days (labels 5,7,9,13,15,19,21,23,27). Pan PASS. Reverse pan to the data end (`v2-05`, `v2-06`) — at the data end the last-value tag reads **2647.77** again, matching the fixture's true last close.
- **Zoom (wheel):** 3 wheel steps → visible range narrowed ~25 days → ~18 days anchored near the cursor (`v2-04-lwc-zoom-in.png`). Zoom PASS.
- **Crosshair price+time read-back vs fixture:** crosshair snapped to a bar; island readout showed `price 2642.11 · time 1769006700`; chart tooltip "21 Jan '26 14:45". Checked against the fixture generator: bar `1769006700` = 2026-01-21T14:45:00Z, `{o 2641.91, h 2642.18, l 2641.70, c 2642.08}` exists; cursor price 2642.11 ∈ [low, high] ✓. The readout time is the actual fixture bar time (not an interpolated pixel time). Mapping PASS — visible in `v2-03`/`v2-04` headers.
- **Create level (click):** single click mid-chart → island status "saved"; localStorage `g0.spike.levels.v1` = `[{"id":"lvl-nv8zzll3","price":2642.95,"note":"level"}]`; levels list rendered "level 2642.95 · remove"; yellow dashed price line + "level" axis tag drawn at 2642.95 (`v2-08-lwc-level-created.png`). Dispatch path: island → `useVictActions().run('act.level.save', …)` → host dispatch (contract `chart.level.save` parse) → localStorage → `dataVersion++` → reactive `viewData['v.levels']` → island list + price line. Observed end-to-end.
- **Remove level:** click "remove" button (exact rect from DOM) → status "deleted", store `[]`, line + axis tag gone from chart (`v2-12-lwc-level-removed.png`). PASS.

## C3 — uPlot island (real-browser walkthrough)

- **Baseline:** `v2-17-uplot-baseline.png` — **DEFECT V-F1 visible**: the uPlot canvas (1155×450) renders *outside and below* its island card (container `.chart`/`.u-wrap` measured 924×360 at abs y 646; canvas at abs y 939–1389). The chart breaks out of the dark island box and forces page-level horizontal overflow at 1280×800.
- **Root cause (confirmed by inspection):** uPlot's required stylesheet (`uplot/dist/uPlot.min.css`) is **never imported by the host** — no stylesheet in the document contains `.u-wrap` rules (`uplotCssLoaded: false` via CSSOM scan; two bundle CSS files only). uPlot's internal layers are therefore all static-positioned: `.u-over` (cursor capture layer) at abs y 1389 (849×293), x-axis layer at y 1682, legend at y 1006 — all detached from the canvas.
- **Crosshair read-back: BROKEN.** Mouse moves over the visible chart never reach `.u-over`; the readout stays "crosshair off chart" in every uPlot screenshot (`v2-17`–`v2-28`). The builder's claim "crosshair read: setCursor hook + posToVal — implemented" is **contradicted by observed behavior** in the real browser.
- **Drag-select zoom: BROKEN** (needs `.u-over`). Drag 600→900 px over the visible chart → no zoom, no selection rectangle, view unchanged (`v2-19-uplot-drag-select-attempt.png` vs `v2-18`).
- **Pan: absent by design** (builder's honest F2: no native pan in uPlot; adapter header comment says "drag = x-pan" but the code implements drag-select = zoom — minor doc drift).
- **Wheel zoom: PASS** — 5 wheel steps narrowed the view from ~29 days to ~3 days (1/24→1/27), anchored near the cursor (`v2-18-uplot-zoom-in.png`; re-confirmed with `Input.synthesizeScrollGesture`, `v2-24`). Note R1: after a Chromium-153 CDP quirk (`Input.dispatchMouseEvent type=mouseWheel` stopped acking mid-session), wheel input was dispatched via `Input.synthesizeScrollGesture` — still real browser input.
- **dblclick reset: PASS but with defect V-F3** — dblclick resets the x-scale to full range; however the dblclick first fires two `click` events, which the island's click handler treats as level-adds: **each dblclick silently adds 2 spurious levels** (observed: levels 2617.85, 2622.79 appeared during a reset; `v2-25`,`v2-26`).
- **Create level (click): PASS at store level** — click on the canvas → `act.level.save` → store `[{"id":"lvl-53hhrpf5","price":2638.75,…}]`, list rendered, y-scale expands to include the level value (`v2-20`,`v2-21`).
- **Level DRAWING: BROKEN (V-F2).** The level series is registered (legend row "level" present; y-scale expands to include it) but **no yellow line is visible anywhere on the plot** at full-range view where it would be unmissable (`v2-21-uplot-after-level-full-range.png`). Code analysis agrees with the observation: `seriesData()` pushes a **2-element array** for each level series against a 2023-element x array — uPlot aligns by index, so the "2-point span across [t0,t1]" actually draws between the first two bars only (sub-pixel at any zoomed-out view). Deep-zoom attempts to make the first-two-bars segment visible were inconclusive at pixel level (candle-level zoom achieved; the segment is ~1 bar wide), but the full-range absence + scale inclusion + code analysis together contradict the builder's "2-point horizontal span series per level" claim as a *working* drawing. **uPlot durable-drawing demonstration: not achievable in this candidate.**
- **Remove: PASS** — "remove" button → status "deleted", store count 6→5, list updated (`v2-27-uplot-after-remove.png`; note the rebuild resets the x-scale to full range — builder's documented F4 behavior).

## C4 — Durability loop (the critical question)

All steps on the running preview with real reloads (Page.reload, cache-bypassed; console captured each time):

1. **Create → persist:** LWC click → store written, list + line drawn (`v2-08`). ✓
2. **Reload 1 → redrawn:** full page reload → island status "ready", store intact, list "level 2642.95 · remove", **yellow line + axis tag redrawn at 2642.95 from the persisted store** (`v2-09-lwc-level-survives-reload.png`). ✓
3. **Edit → reload 2 → survived:** **No in-app edit affordance exists** (finding V-F6 — only click-to-add and a remove button; the host dispatch supports upsert-by-id but no UI path triggers it with an existing id). I verified the edit *read path* by editing the persisted store record directly (`price 2600`, then `2650, note "level-edited2"`) and reloading: the levels list and the drawn line followed the store both times (`v2-10`, `v2-11` — line at 2650.00 tagged "level-edited2"). The reactive store→`viewData`→props→adapter chain that an edit would rely on is therefore demonstrated end-to-end; the edit *UI interaction* itself is **NOT DEMONSTRATED** because it does not exist in the spike. 
4. **Remove:** via the in-app button (`v2-12`). ✓
5. **Multi-level shared-state reload:** with 5 levels in the store (added from both islands), reload → both islands' lists show all 5 (`v2-28`, `v2-29`); LWC draws in-range lines (`v2-30`, level 2645.00 "verifier" drawn after reload). uPlot draws none (V-F2). ✓ store-level durability across islands confirmed.

**The durability loop PASSES for lightweight-charts** — create→reload→redraw→edit(store)→reload→survived→remove, all with real reloads and interaction evidence.

## C5 — Negative checks

- **Fixture gap block (slots 300–307 = 2026-01-08T03:00–05:00Z):** crosshair scan across the boundary shows the data jump truthfully — bar slot 299 (02:45) read at cursor x=660, bar slot 308 (05:00) at x=665 (~5 px apart, i.e. normal bar spacing) (`v2-16a`, `v2-16b`). **Finding V-F4:** LWC spaces bars by index, so the 2-hour gap is **silently bridged visually** — no empty span, no marker; only the crosshair readout reveals it. Data mapping is honest; the visual time axis is not. Must be carried into G2 (time/data honesty) and the uPlot comparison (uPlot's real-time x-axis shows honest spacing but draws a connecting line across gaps — neither candidate renders an explicit "unavailable" state, as expected for a spike).
- **Console on load:** every load captured via CDP `Log`/`Runtime` during 5 full reloads: **only** `Failed to load resource: 404` = `http://localhost:5199/favicon.ico` (verified via Network capture). No JS exceptions, no hydration errors. Finding V-F7 (cosmetic).
- **No future-data leakage:** fixture is deterministic and clock-free; SSR HTML contains no market data; the page renders the same deterministic series on every reload (compared across 5 reloads).
- **Silent substitutions:** none observed — the island labels state "fixture data only"; statuses (ready/saved/deleted/failed) are displayed truthfully; the unknown-action path returns `DATA_UNKNOWN_ACTION` (code-read; not exercised in browser).

## C6 — Scope check

`git diff 58ddfc5..212d490 --stat`:
- `236c096` — `host/**` (SvelteKit host, 19 files incl. package-lock), `docs/evidence/G0/spike-host.md`, `.gitignore` (+`.svelte-kit/`). All in-scope per the spike authorization.
- `212d490` — `docs/evidence/G0/engine-candidates-brief.md` + `docs/evidence/G0/raw3/**` (engine intake evidence: NautilusTrader, LEAN). In-scope (G0 engine evidence, docs only).
- **No out-of-scope paths. No code outside `host/` touched. No old Trading OS or private VICT source copied** (host imports only published npm packages + local libs).

## C7 — F1 confirmation (component-actions subpath)

- Installed `node_modules/@victframework/ui-svelte@0.4.0-rc.1`: root `src/index.ts` does **NOT** export `useVictActions` (grep: no match in root index); `src/component-actions.ts:1` re-exports `useVictActions, type VictComponentActions` from `./component-context.js`; export map contains `./component-actions` → `./src/component-actions.ts`. The host imports it from the subpath (`island-state.svelte.ts:8`) and the action dispatch works end-to-end in the browser (C2/C4). **F1 confirmed exactly as the builder recorded it.**

---

## Findings

| ID | Severity | Finding | User effect | Owner / carry-forward |
|---|---|---|---|---|
| V-F1 | **Medium** | uPlot's required CSS (`uplot/dist/uPlot.min.css`) is never imported by the host. uPlot's internal layers dislocate (`.u-over` cursor layer 450 px below the canvas), so **crosshair read-back never fires** and **drag-select zoom has no effect**; the canvas (1155×450) escapes its 924×360 island and causes page-level horizontal overflow at 1280×800. | uPlot candidate cannot demonstrate crosshair or pan; comparison evidence incomplete/biased against uPlot; page layout visibly broken | Host-side fix (one import + size handling). Must be fixed before any uPlot claim is re-compared. |
| V-F2 | **Medium** | uPlot level lines are not drawn: level series registered (legend + scale) but a 2-element data array against a 2023-element x array means the line only spans the first two bars (index alignment), invisible at practical zoom levels. | uPlot durable drawing impossible — the critical G0 loop cannot be demonstrated on uPlot | Host-side fix (build a full-length array or a cursor-draw plugin). |
| V-F3 | Low | uPlot dblclick-reset fires two click events first → **adds 2 spurious levels per reset** (observed: 2617.85, 2622.79). | Accidental object creation on a standard gesture | Host-side fix (suppress click after dblclick / debounce). |
| V-F4 | Low (now), **blocking-class for G2** | LWC spaces bars by index → the deliberate 2 h gap is silently bridged visually; crosshair times stay truthful. | Trader cannot see missing intervals on LWC | Carry into G2: explicit unavailable-state/gap rendering is a G2 requirement. |
| V-F5 | Low | LWC price lines are excluded from autoscale — levels outside the visible price range are drawn but invisible with no indication (observed at 2600 and with 5 off-range levels). | Saved level appears "lost" though persisted | Acceptable for spike; fix in G1 (autoscale include or indicator). |
| V-F6 | Low | No in-app **edit** affordance for levels (only click-to-add and remove). | Level editing not possible from the UI; verified only at store level | Expected for a spike; G1 requires create/edit/remove/undo/redo. |
| V-F7 | Info | `favicon.ico` 404 — the only console entry on load; no JS exceptions across 5 reloads. | None | Cosmetic. |
| V-F8 | Info | Page content wider than viewport at 1280×800 (horizontal scrollbar; uPlot island is the widest offender, V-F1). | Minor scroll friction | Layout fix in G1. |
| V-F9 | Info | Doc drift: `uplot-adapter.ts` header says "drag = x-pan" but the code implements drag-select = zoom (no pan); spike-host.md table is accurate but the file comment is not. | Documentation honesty | One-line comment fix. |

## Reproduction (exact commands)

```
git log --oneline -5                      # HEAD == 212d490…
cd host && npm run build                  # PASS (18.38s)
cd host && npm run check                  # 0 errors, 2 warnings
cd host && npm run preview                # port 5199
curl -s -o /dev/null -w "%{http_code}" http://localhost:5199/   # 200
# Browser: Chrome 153 CDP :9222, fresh profile, viewport 1280×800 dpr 1.25
# interactions: Input.dispatchMouseEvent (press/move/release/click/dblclick),
# wheel via Input.synthesizeScrollGesture (see R1), read-back via Runtime.evaluate
```

## Notes and residual risks

- **R1 (tooling):** mid-session, CDP `Input.dispatchMouseEvent type=mouseWheel` stopped receiving acks (Chromium 153 quirk; mouse press/release/move kept working). Wheel input was switched to `Input.synthesizeScrollGesture` (also real input). This does not weaken the evidence; it is recorded for reproducibility.
- **R2 (inherited shots):** `verifier-shots/01–08` were taken by the crashed prior attempt; marked inherited, not used. My evidence: `v2-01`–`v2-30`.
- **R3:** `v2-01`'s anomalous "tail view" was stale tab state from the crashed session (zoom persisted in that tab); a fresh load/reload shows the correct fitContent full range — verified in `v2-02-fresh-load.png`.
- **R4 (leftover test state):** browser localStorage test data was cleared at the end; browser profile is a disposable debug profile outside the repo. Repository tree: only `docs/evidence/G0/verifier-shots/v2-*.png` (new) and this report are untracked additions; **nothing staged, nothing committed, nothing pushed**. Build artifacts are gitignored.
- **STATE.md:** not updated by me (verifier mandate is this report); the orchestrator should record this verdict at the tested SHA.

## F5 observation (rc vs stable 0.4.0 — observation only, no decision)

The entire seam (`@victframework/*` 0.4.0-rc.1) exists **only** as a release candidate (`latest` is `0.3.1`/placeholder `0.0.0-bootstrap.1`), so G0 cannot be demonstrated against a stable 0.4.0 that does not exist. For the gate: the spike demonstrates the seam works end-to-end (plan compile → SSR → hydration → action dispatch → durable read path) on the pinned rc with byte-verified integrity, and the one public-contract drift found (F1: subpath-only `useVictActions`) is exactly the kind of rc instability the gate should record. My observation as verifier: **the rc pin is acceptable as G0 evidence provided the gate record explicitly carries the rc risk forward** — G1 (native chart workspace) should either re-run its verification against stable 0.4.0 when published, or record an explicit owner decision to proceed on the rc with a re-verification task. The F1 root-export question should be raised upstream before G1 depends on it.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Verification-only session: no candidate code touched, nothing repaired, nothing staged/committed/pushed; verdict written per docs/EVALUATION.md vocabulary from independent interaction evidence at the pinned SHA 212d490219921e75e4a3554c6f7f575aa22441f7"
    },
    {
      "id": "criterion-2",
      "status": "satisfied",
      "evidence": "docs/evidence/G0/verifier-report-G0-spike.md + 30 fresh v2-*.png interaction screenshots; builder build/check/SSR/fixture claims reproduced byte-exact; LWC pan/zoom/crosshair-vs-fixture/create/remove/durability demonstrated with real CDP input; uPlot crosshair + level-drawing claims falsified with root cause (missing uPlot CSS import; 2-vs-2023 series array); gap-bridging negative finding recorded"
    }
  ],
  "changedFiles": [
    "docs/evidence/G0/verifier-report-G0-spike.md (new, uncommitted)",
    "docs/evidence/G0/verifier-shots/v2-*.png (30 new, uncommitted)"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {"command": "git log --oneline -5 && git status --porcelain", "result": "passed", "summary": "HEAD == 212d490 (pinned candidate); tree clean except untracked verifier evidence"},
    {"command": "git diff 58ddfc5..212d490 --stat", "result": "passed", "summary": "scope clean: host/ + .gitignore + docs/evidence/G0 (spike report, engine intake) only"},
    {"command": "cd host && npm run build", "result": "passed", "summary": "vite build + adapter-node OK (18.38s, 762 modules)"},
    {"command": "cd host && npm run check", "result": "passed", "summary": "svelte-check 0 errors, 2 state_referenced_locally warnings (matches builder F3)"},
    {"command": "curl -s http://localhost:5199/ (npm run preview)", "result": "passed", "summary": "HTTP 200, SSR HTML with VitApp + both island shells, no SSR crash"},
    {"command": "node (esbuild-transpile fixture.ts, self-check)", "result": "passed", "summary": "2023 bars; first/last bars byte-identical to builder claims; ascending; OHLC sane; all deliberate drops + weekends absent"},
    {"command": "browser walkthrough LWC island (CDP real input)", "result": "passed", "summary": "pan, wheel zoom, crosshair read verified vs fixture (bar 2026-01-21T14:45Z, cursor price within [low,high]), click-add level (store+line+tag), remove — all PASS"},
    {"command": "browser durability loop (real reloads ×5)", "result": "passed", "summary": "LWC: create→reload→redrawn; store-edit→reload→survived; multi-level shared reload — PASS; in-app edit affordance does not exist (NOT DEMONSTRATED)"},
    {"command": "browser walkthrough uPlot island (CDP real input)", "result": "failed", "summary": "crosshair read never fires and drag-select zoom has no effect (missing uplot/dist/uPlot.min.css → dislocated .u-over); level line not drawn (2-element series array vs 2023-length xs); wheel zoom, click-add, remove, dblclick-reset PASS; canvas escapes island (1155×450 vs 924×360)"},
    {"command": "console/network capture on 5 reloads", "result": "passed", "summary": "only favicon.ico 404; no JS exceptions or hydration errors"},
    {"command": "node_modules inspection (@victframework/ui-svelte@0.4.0-rc.1)", "result": "passed", "summary": "F1 confirmed: useVictActions not exported from package root; exported via ./component-actions subpath"}
  ],
  "validationOutput": [
    "npm run build: ✓ built in 18.38s; adapter-node ✔ done",
    "svelte-check: 0 errors and 2 warnings in 2 files",
    "fixture: bar count 2023; first {1767571200,2650,2650.27,2649.83,2650.1}; last {1770090300,2647.51,2647.94,2647.06,2647.77}; ascending true; OHLC sane true; slots 17/499/1200/300-307 + weekends absent",
    "crosshair check: readout time 1769006700 = 2026-01-21T14:45Z bar {o 2641.91,h 2642.18,l 2641.70,c 2642.08}; cursor price 2642.11 within [low,high]",
    "gap check: bar slot 299 (02:45) and slot 308 (05:00) pixel-adjacent (cursor x 660→665) — LWC visually bridges the 2h gap while crosshair times stay truthful"
  ],
  "residualRisks": [
    "uPlot candidate is not a fair comparison object until V-F1 (missing uPlot CSS import) and V-F2 (level span array bug) are fixed — current comparison evidence favors lightweight-charts partly for host-integration reasons",
    "LWC silently bridges data gaps visually (V-F4) — must be re-addressed as an explicit unavailable-state in G2",
    "Whole seam pinned to 0.4.0-rc.1 (F5) — rc risk must be explicitly accepted or re-verified against stable 0.4.0 before G1",
    "Prior verifier attempt's inherited screenshots 01–08 are untrusted and unused; all evidence is from this session's v2-* captures"
  ],
  "noStagedFiles": true,
  "notes": "VERDICT: PASS WITH NON-BLOCKING FINDINGS for the G0 chart-candidate spike candidate at 212d490. G0's required demonstration (one real chart candidate showing pan, zoom, time/price mapping and one durable drawing through the published UI seam) is satisfied by lightweight-charts 5.0.8 with this verifier's independent real-browser evidence, and all builder build/check/SSR/fixture claims reproduce. uPlot claim-level FAILs (crosshair read, level drawing) and the gap-bridging finding are recorded as bounded, owned, carried-forward findings. STATE.md not updated (verifier mandate); orchestrator should record this verdict at SHA 212d490219921e75e4a3554c6f7f575aa22441f7. Nothing committed or pushed."
}
```