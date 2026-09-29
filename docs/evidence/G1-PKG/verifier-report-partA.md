# G1-PKG Part A — FRESH VERIFIER REPORT (appended, owner-directed re-verification)

**Verifier:** fresh agent/session, fully independent of the builder (not the prior G1/G1-remediation verifier either). No product repair was made at any point. Prior reports under `docs/evidence/G1/` and the earlier builder `findings-closure-report.md` were treated as claims, not evidence.
**Tested SHA:** `git rev-parse HEAD` == **`4a43176cd17d922315101ae55137b10a9f2caf75`** == pinned candidate SHA, working tree clean (no tracked modifications) at start of this session.
**Environment:** Windows, Node v22.13.1; real headless Chrome 153 via CDP (`:9222`); app = `npm run build` (fresh, this SHA) + **my own preview server on fresh port 5231** (started and stopped by me this session; log `verifier-preview-partA.log`).
**Harness:** the committed `docs/evidence/G1-PKG/cdp-pkg.mjs` was behavior-verified: raw CDP protocol, one WS connection per command, auto-accept dialog recording confirmed working (Check 5). Per EVALUATION.md the verifier does NOT adopt builder tooling reasoning; I ran from a **disclosed retargeted/extended copy in a temp dir** (`:5231` + `metrics`, `dialog-policy`, `waitfor` commands + single-connection session scripts). All interaction used real CDP pointer/keyboard events, native host controls; native `select` switches used value+`change` on the real element (accepted technique, disclosed).
**Pre-assertion:** before any interaction: HTTP 200 on `http://localhost:5231/`; **`data-testid="chart-island"` present exactly 1×**; fresh origin `http://localhost:5231` with empty localStorage; `fv-00-baseline-fresh.png`.

---

## Check results

### 1. Byte-survival regression (critical) — **PASS**

Both corruption modes, all three mutation types, node-side byte diffs of raw localStorage snapshots:

| Attempt (real UI) | Island status | Topbar pill | Stored bytes after |
|---|---|---|---|
| Corrupt in place, then **create** (`+ Level` click) | `failed: STORAGE_READ_FAILED` | `failed: storage` | `{"CORRUPT` (unchanged) |
| **Edit price** 2647.77 → 2650 (click line to select — **selection worked and re-synced the price field to 2647.77 first** — then field edit + Tab) | `failed: STORAGE_READ_FAILED` | `failed: storage` | `{"CORRUPT` (unchanged) |
| **Delete** (`Delete` button on the selected level) | `failed: STORAGE_READ_FAILED` | `failed: storage` | `{"CORRUPT` (unchanged) |

- Node-side byte comparison: `C === afterCreate === afterEdit === afterDelete` → **`{"CORRUPT` survived all three refused attempts byte-for-byte**; the good bytes (snapshot A, `fv-bytes-A.json`) were **never rewritten** (`fv-bytes-C.json` = 9 corrupt bytes, verified).
- No success was reported at any point (island status + pill both read failure, per-cell above).
- **Restore → recovery:** valid bytes restored via `setItem` → `+ Level` → `saved`, bytes changed, 3 panel items (`fv-02-restore-normal-write-works.png`).
- **Getter-throw, in a separate load (own session, own reload):** valid bytes seeded, page reloaded, `window.localStorage.getItem` instance-getter overridden to throw for `g1.levels.v1` (**probe-verified**: getter throws, `Storage.prototype.getItem` still returns bytes) → `+ Level` refused with `failed: STORAGE_READ_FAILED` + pill `failed: storage`; bytes read **via `Storage.prototype.getItem`** were **byte-identical** to pre-attempt (`fv-bytes-getterBefore.json` === `fv-bytes-getterAfter.json`, Node `Buffer.equals` → `true`). Getter restored → normal write works again (count 2, `saved`) — refusal is not a stuck state.
- Screenshots: `fv-01-create-refused-corrupt.png`, `fv-01-edit-delete-refused-corrupt.png`, `fv-03-getter-throw-refused.png`.
- Console across both sessions: `[]`.
- **One invariant observation (not a failure):** the topbar pill said `failed: storage` *while level saves were succeeding again after recovery* (status `saved`, bytes written) — see Finding F-N1.

### 2. `loading` state — **PASS**

- Reproduced via the app's hydration gate under real throttle: `Network.emulateNetworkConditions` (2 s latency, 20 KB/s) + `Network.setCacheDisabled` + `Page.reload ignoreCache`, polled from first paint in a single connection.
- `data-testid="workspace-loading"` observed at **+2179 ms** with **exact text `"Loading workspace…"`** — matches `host/src/lib/definition.ts` screen state `t.loading.content` byte-for-byte (U+2026 ellipsis included). Poll record: `fv-loading-poll.json`.
- After hydration: loading element gone (`null`), exactly 1× `chart-island`; console `[]`.
- Screenshots: `fv-06-loading-state.png`, `fv-06b-loading-state-2nd-poll.png`.

### 3. `unavailable` state (corrupt-key load) — **PASS**

- Loaded with `g1.levels.v1 = '{BROKEN'`: panel renders `data-testid="panel-read-failed"` — *"Drawings list unavailable: storage read failed. Existing levels may still be visible on the chart."*; `panel-empty`/`panel-drawings` **absent** (never a silent lie); topbar pill `ready` (no write attempted at load, none claimed); stored bytes untouched by the load; console `[]`. Screenshot `fv-04-unavailable-on-load.png`.
- Create under that load: refused — island `failed: STORAGE_READ_FAILED`, pill `failed: storage`, bytes `'{BROKEN` unchanged. Screenshot `fv-05-unavailable-write-refused.png`.

### 4. Anchoring criterion — empirical verification + **MY RULING: MET**

Empirical method (no app-source access): created one level via real `+ Level` click at 15m last close → stored price **2637.77… no — exactly `2647.77`** (bar close, float-exact). Located the rendered line pixel by sweeping the crosshair over the chart column and reading the public crosshair readout (`data-testid="readout"`, display-quantized to 0.01 for XAUUSD); re-swept after each mapping change.

| Mapping state | Effect verified | Nearest crosshair-at-line reading | Error vs stored 2647.77 | per-px | Bytes after |
|---|---|---|---|---|---|
| 15m base | — | 2647.81 (±1 px: 2647.86 / 2647.76) | ≤ 0.04 | 0.050 | unchanged |
| after **pan** (real drag) | probe pixel y=300 changed: bar 2026-01-27 03:00Z → 2026-01-22 15:00Z, cursor 2645.06 → 2643.76 (**pan really happened; price scale re-ranged**) | line px moved 241 → 193; 2647.76 | 0.01 | 0.035 | unchanged |
| after **zoom** (real wheel gestures) | line px moved → **27** (from 51), axis densified (before/after axis crops `fv-zoom-zoombefore-axis/zZoomin3/Zoomin8`) | 2647.76 at line, and **2647.77 exact** at a separate zoomed baseline sample | ≤ 0.01 | changed | unchanged |
| **1h** (panel select) | island `data-timeframe="1h"` re-render | 2647.78 | 0.01 | 0.060 | unchanged |
| **4h** (panel select) | island `data-timeframe="4h"` re-render | 2647.78 | 0.01 | 0.060 | unchanged |
| back to 15m | island `data-symbol/timeframe` restored | 2647.81 | ≤ 0.04 | 0.050 | unchanged |

- **Symbol scoping:** XAUUSD → EURUSD: level hidden from panel (`0` items, honest "None yet"), bytes unchanged; switch back → level listed and line re-rendered at the same anchored price (`fv-12-symbol-scoped-eurusd.png`, `fv-13-line-restored-xauusd.png`).
- **Full-span / no market-time coordinate:** crosshair at the line's pixel row reads ≈ 2647.77 at **far-left** x (bar time 2026-01-26 07:00Z) **and far-right** x (bar time 2026-01-27 18:15Z) — same price at two different market times ⇒ the level spans all market time on the chart. Stored JSON contains only `{id, price, note, symbol, createdAt}` — no time coordinate. `createdAt = 1790644224` → `2026-09-29T01:10:24Z` (wall-clock now) vs market bar times Jan 2026 (≈1.769e9) ⇒ **createdAt is creation metadata, not a market-time coordinate**; it plays no role in rendering (the line px re-derives from price only — proven every re-sweep).
- Screenshots: `fv-07-anchor-created-15m.png`, `fv-08-anchor-after-pan.png`, `fv-09-anchor-after-zoom.png`, `fv-09b-anchor-after-zoom-more.png`, `fv-10-anchor-1h.png`, `fv-11-anchor-4h.png`, `fv-14-level-spans-full-width.png`.
- **Exactness bound:** the crosshair readout is displayed at 0.01 for XAUUSD; sub-pixel quantization ≈0.035–0.06/px. Observed |crosshair-at-line − stored| ≤ 0.05 (≤ one display quantum, < 1 px) in every mapping state, and one zoomed sample read exactly 2647.77. Within achievable public-API precision the anchor is **exact**: the pixel row between two adjacent cursor samples interpolates to the stored price.

**RULING (my independent judgment; the builder recommended HELD):**

> The G1 criterion *"create, select, edit, move, remove, undo and redo a drawing anchored to market price and time"* is **MET for the horizontal-level drawing model shipped in G1**, on this evidence:
> 1. A horizontal price level is a function of **price × instrument only**; it has **no market-time coordinate by definition** — requiring one would be a category error. The meaningful time-dimension behavior — **spans all market time, independent of the visible time window** — is empirically demonstrated (far-left/far-right probes above), i.e., its relation to the time axis is correct and stable under pan/zoom/timeframe change.
> 2. The thing the criterion is really guarding against — a drawing stored as screen pixels whose position breaks when the mapping changes — is decisively falsified: the line's **pixel position changed under pan, zoom, and timeframe change while the stored price coordinate stayed byte-identical and the crosshair-at-line kept reading the stored price**.
> 3. The app makes no unearned time-anchor claim in its data model (nothing that renders as a time coordinate for levels), so nothing is being lied about.
>
> **Boundary:** this ruling covers horizontal levels (the only G1 drawing type). If the owner intends *point-time-anchored* drawings (e.g., trendlines/rays with a market-time coordinate), that is a different drawing type and is **not** covered or judged here; the wording refinement the builder made (price + instrument + span-all-time) accurately describes the G1 behavior and avoids over-claiming.

### 5. Reset flow (in-session dialog handling) — **PASS**

- Pre-state: 2 keys (`g1.levels.v1` 95 bytes + `g1.workspace.v1` with symbol EURUSD), pill `saved`. Screenshot `fv-15-reset-before.png`.
- Real click on `Reset workspace` → **dialog observed and recorded: `{type:"confirm", message:"Reset the workspace? All drawings will be removed."}`** → accepted → page reloads → **keys = `[]` (both cleared)**, panel "None yet. Click the chart to draw a level.", fresh defaults **XAUUSD / 15m**, pill `ready`. Screenshot `fv-16-reset-after-accept.png`.
- **Negative (dismiss once):** re-created one level; dialog policy set to **dismiss** → same confirm message recorded, dialog dismissed → **nothing cleared** (keys before == keys after: byte-identical key list), page did not reload, level still listed, workspace row intact. Screenshot `fv-17-dismiss-kept.png`. Console `[]` throughout.

### 6. No regressions — **PASS**

- `npm run check` → **0 errors / 1 warning** (accepted pre-existing `state_referenced_locally` baseline in ChartIslandLWC.svelte).
- `npm run build` → **PASS** (vite ~53 s + adapter-node, built at this SHA before browser work).
- Console: `[]` (no errors/warnings/exceptions) captured at the end of **every** script and most single-command rounds — across ~12 full reloads incl. corrupt-storage loads, throttle load, drag, dialog and reset flows.
- **F-V1 remediation regression (fresh, real pointer + real keys with verified modifiers):** create via chart click @ **2638.993062645012** (toolbar field synced) → **real 6-step drag** → stored **2636.758723897912**, field re-synced to exactly the stored price → **label-only edit** (Ctrl+A + typed `fv-label` + Tab; note **replaced**, not appended) → **price KEPT at 2636.758723897912** (F-V1 intact) → **undo ×3** symmetric (label edit reverted w/ price kept → drag reverted to 2638.993062645012 → level removed; fields re-synced at every step) → **redo ×3** exact replay (create → drag → label) → **reload** → level persisted identical, panel lists it, console `[]`. Screenshots `fv-18-fv1-drag-price-field-synced.png`, `fv-19-fv1-label-edit-price-kept.png`, `fv-20-fv1-after-redo.png`, `fv-21-fv1-after-reload.png`.

### 7. Scope audit — **PASS**

`git diff 11c8b41..4a43176 --stat`: exactly **`host/src/routes/+page.svelte`** (+ `docs/evidence/G1-PKG/*`: harness, builder report, 13 pkg-* artifacts). **No** pack docs, STATE.md, HANDOFF.md, contracts, fixture, keyboard-binding or other host files touched. Prior `docs/evidence/G1/` reports preserved untouched.

---

## Findings

| ID | Severity | Finding | User effect |
|---|---|---|---|
| **F-N1** | **Low** | **Stale failure pill after recovery:** after the read-failure refusal, a *successful* level save does not reset the topbar pill — it stays `failed: storage` while the island reports `saved` and bytes persist correctly (observed in Check 1 recovery). The pill only clears on the next workspace write (symbol/timeframe change) or reload. | User may believe storage is still broken during recovery (false-failure signal, opposite-direction honesty). Fix suggestion: reset `panelStatus` on successful level mutations or on next successful gate read. Not blocking any criterion. |
| — | Info | 1h and 4h sweeps produced identical readouts (same price scale) — **explained**: the fixture's full-period min/max (which fitContent autoscales) is identical across aggregations of the same bars; both states verified different via island `data-timeframe` + bar-bucket density. Anchor correct in both. | none |
| — | Info | Builder's F-V3 wording ("pill ready on load") confirmed: on a corrupt-data load no write is attempted and no failure is faked; the failure appears only when a write is truly attempted. | none |

Harness-only artifacts (disclosed, **not product defects**): (a) CDP wheel with `pointerType:"mouse"/button:"none"` is not handled by LWC — bare-shape wheel works (known-good CDP shape used); (b) headless crosshair readout freezes during continuous in-pane pointer movement — a leave/re-enter wake-probe pattern produces fresh readings (sweep measurements used it); (c) my initial "level1"-in-panel reading was a **misread of a low-res screenshot** (final "l" of `level`), resolved by 8–12× nearest-neighbor crops + per-span DOM reads — the notes render exactly `level`; no data anomaly existed.

## Verdict

**PASS WITH NON-BLOCKING FINDINGS** — every required behavior on this Part A task list was independently demonstrated at the pinned SHA `4a43176cd17d922315101ae55137b10a9f2caf75` with byte-level persistence evidence, two distinct read-failure modes, verified-effective pan and zoom gestures, exact-crosshair anchor measurements, symbol scoping, a loading state reproduced under throttle with word-exact wording, a dialog-handled reset flow with its negative case, a clean scope audit, and a full F-V1 regression pass with clean console. The anchoring criterion is ruled **MET** (ruling + boundary above). Findings F-N1 (low, non-blocking) is carried forward; no FAIL, no HELD criterion, nothing hidden. This verdict covers Part A only and does not authorize any later stage.

## Reproduction

```
# SHA check: git rev-parse HEAD → 4a43176cd17d922315101ae55137b10a9f2caf75 (clean tree)
cd host && npm run check && npm run build
npx vite preview --port 5231 --strictPort        # MY OWN fresh port (stopped at end)
# real Chrome headless via CDP :9222; harness copies in Temp/fv-pkg-harness (retargeted cdp-pkg)
# per-check session scripts: fv-p1.mjs, fv-p2.mjs, fv-loading.mjs, fv-anchors2/3.mjs, fv-pantest.mjs, fv-reset.mjs, fv-fv1b.mjs (temp dir, not committed)
# byte diffs: fv-bytes-A.json vs fv-bytes-C.json; fv-bytes-getterBefore.json vs fv-bytes-getterAfter.json (Node Buffer.equals)
```

## Artifacts

- This report + `fv-00…fv-21` screenshots (21 primary + zoom/axis crops), byte snapshots (`fv-bytes-*.json`), poll record (`fv-loading-poll.json`), my preview log (`verifier-preview-partA.log`) — all under `docs/evidence/G1-PKG/`, untracked, nothing committed or pushed.
- No secrets, no orders, nothing published. Browser localStorage cleared to a clean state; preview server killed (PID 39328); working tree left with only these evidence files added.