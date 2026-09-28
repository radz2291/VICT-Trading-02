# G1 verifier report — RE-VERIFICATION of remediated candidate (FRESH, independent)

**Verifier:** fresh agent/session, independent of the builder. Did not build the candidate; did not repair anything during this audit (one harness-only helper fix disclosed below, no product change).
**Tested SHA:** `24e81f089d7864f3f23eeb71e5670dd1e0db05a7` — verified `git rev-parse HEAD` == pinned SHA, working tree clean at start; `origin/main` up to date. Only this report + `verifier-shots/rv-*.png` + `verifier-preview-rv.log` added (all untracked, nothing committed/pushed).
**Remediation diff audited:** `git diff 4bdc0a1..24e81f0` — exactly the claimed files: `host/src/lib/island-state.svelte.ts` (sync `$effect`), `host/src/lib/islands/ChartIslandLWC.svelte` (fixed bands + `data-field` anchors + focus-selector fix), `host/src/routes/+page.svelte` (`readLevels`/`panelRead`, `revertToApplied`) + remediation report/screenshot. No contract, fixture, keyboard-binding, or scope changes.
**Environment:** Windows, Node v22.13.1; real headless Chrome (CDP, `:9222`); app served by MY OWN preview server on fresh port **5224** (stopped at session end). A stale `:5223` preview (PID 33508) was already listening at session start (prior session's); left untouched, never used.

## Method notes (per prior protocol M-1/M-3 + this session's traps)

- **Setup (M-2):** asserted before any interaction: HTTP 200 on `http://localhost:5224/`, page contains `data-testid="chart-island"` (1×), zero `lwc-readout` (G0 spike marker). Fresh origin (empty localStorage) confirmed.
- **M-3 clean measurement:** every width change was followed by a **fresh reload at that width** before measuring (`Emulation.setDeviceMetricsOverride`).
- **M-5 (new this session, disclosed):** my first Ctrl+Z invocations passed only 3 args to the helper; its arg parser bound `"ctrl"` into the `key` slot and `"KeyZ".replace("Key","")` → `key:""`, so **no modifiers were delivered** (verified via an in-page `isTrusted` keydown trace: `ctrl:false`). Corrected to 4-arg calls; all keyboard evidence below is from trace-verified `ctrl:true/shift:true, isTrusted:true` events. The same trace **disproved an initial suspicion of a skipped undo step**: the stack was fully symmetric once re-counted (S2→S1→S0→empty; redo S0→S1→S2), single-step each.
- **M-6 (new, disclosed):** `Page.addScriptToEvaluateOnNewDocument` state does **not** survive the helper's one-command-per-connection pattern (per-CDP-session state) — an apparent "panel showed the list under getter-throw" observation was a harness artifact. Superseded by a **single-session** run (one connection: init script → reload → probe), which is the evidence recorded below.
- Typing into inputs used synthesized `input`+`change` on the real input element (same accepted technique as prior M-1 for native controls); all pointer drags/clicks were real CDP mouse events (`isTrusted:true`).

## Re-verification results (affected checks only, per EVALUATION.md)

### R-1 / F-V1 regression — stale price field after drag (the critical fix) — **PASS**

Sequence (all real pointer events, fresh origin, 1280×900, port 5224):

1. Chart click created `lvl-ko9c4mhu` @ **2652.743119290168**, auto-selected; toolbar field showed exactly the stored price (`rv-01-created-selected.png`).
2. Real-pointer 6-step drag (press on line → moves → release at y=615): stored **2645.062579847013** AND toolbar price field showed **exactly 2645.062579847013** — the original finding (field stuck at pre-drag value) is gone (`rv-02-mid-drag.png`).
3. Label-only edit (`support-drag-test`) submitted on the note field: stored note applied, **price UNCHANGED at 2645.062579847013**, field still showing it — silent revert eliminated (`rv-03-after-label-edit.png`).
4. Undo/redo of drag+edit, single-step symmetric (trace-verified keys):
   - undo → note back to `level`, price kept; undo → price back to **2652.743119290168**; undo → level removed (empty); **fields re-synced to the store at every step** (verified stored==field at each read);
   - redo ×3 → create @2652.74 → drag @2645.06 → edit note `support-drag-test` — exact stack replay.
5. Reload → level persisted `{2645.062579847013, "support-drag-test"}`; console `[]` (`rv-05`, `rv-06`).
6. **Multi-level re-sync:** created second level `lvl-l8rq6q72` @2641.1059383156903 (fields showed its values); clicked near level 1 → fields re-synced to level 1's stored `{2645.062…, "support-drag-test"}` **without moving it** (stored unchanged); clicked near level 2 → fields re-synced to level 2's stored values, both prices unchanged (`rv-07`, `rv-08`).

### R-2 / F-V2 regression — toolbar reflow shifting the chart — **PASS** (with one bounded residual finding F-R1 below)

Chart-container (`.chart`) top, measured per M-3:

| Width (chart area) | unselected | selected | after deselect | Shift |
|---|---|---|---|---|
| 1280 (616px) | 315.390625 | 315.390625 | 315.390625 | **0px** |
| 768 (420px, panel side-by-side) | 257.39 | 257.39 | 257.39 | **0px** |

- The three fixed bands (`.toolbar` 30px, `.fieldsrow` 30px, `.hintline` 17px) were measured identical in selected and deselected states at 768 (toolbar 144.39, fieldsrow 174.39 h30, hintline 204.39 h17 in both). The requested "~600px chart area" case is covered by the 1280/panel-open measurement (616px) plus the even narrower 420px case at 768. `rv-09-narrow-768.png`, `rv-10-narrow-select-deselect.png`.
- **Keyboard focus outline (builder-caught regression) holds:** focused `[data-testid=edit-price]` and `[data-testid=edit-note]` both compute `outline: 2px solid rgb(255, 213, 74)` (`outlineStyle solid`, 2px), `data-field` anchors present; screenshots `rv-11-focus-outline-price.png`, `rv-12-focus-outline-note.png`; Tab moved focus onward with visible outline.
- **F-R1 (new finding, low, pre-existing — not caused by remediation):** at narrow chart widths the **`.readout`** band (OHLC line, between hintline and chart) grows 16px→28px when the crosshair readout first fills and wraps (420px chart width), pushing the chart down **~12px once** on first mouse-over; it does not revert on deselect (state-dependent, not selection-dependent). This band is byte-identical in the pre-remediation file (`git show 4bdc0a1` — same `min-height:16px`, no fixed height), so it is pre-existing narrow-width behavior outside the fixed-bands fix; it is the same *class* of issue as F-V2 though. User effect: one-time 12px jump when the mouse first enters the chart at ~≤600px chart widths. Recommend a fixed-height readout band in a future pass. Evidence: fresh-reload 768 measurement 245.39 → 257.39 after first pointer move (readout 16→28px); after crosshair activation, unselected/selected/deselected all stable at 257.39.

### R-3 / F-V3 — panel honesty under storage read failure — **PASS**

- Corrupt `g1.levels.v1` (`{corrupt-json`) → reload: `panel-read-failed` present with text *"Drawings list unavailable: storage read failed. Existing levels may still be visible on the chart."*; `panel-empty` **absent**; drawings list absent; island status line intact; console `[]` (`rv-13-read-failed.png`).
- Harder variant — `window.localStorage` **getter throws** (init script, single CDP session, verified `getter-throws` probe in the same session): same explicit read-failed note, empty note absent, console `[]` (`rv-20-getter-throw-read-failed.png`). The earlier contradictory observation was a harness artifact (M-6), disclosed above and not counted.
- Restore → valid rows → reload: drawings list renders both items, read-failed note gone; console `[]`.

### R-4 / F-V4 — select shows APPLIED value after persist failure — **PASS**

- With the localStorage getter throwing (in-page override, probe-verified): requested **4h** via the panel timeframe select (synthesized `change`, native select per M-1) → select reverted to applied **15m**, header pill honestly **`failed: storage`** (`rv-14-failed-storage-revert.png`); island did not adopt the change (unchanged, as before).
- Storage restored (fresh window on reload) → pill `ready`, tf 15m, levels load normally; console `[]`.

### R-5 — keyboard sanity (sync effect vs undo/redo) — **PASS**

Full flow with trace-verified trusted keys, state-checked at every step (levels `lvl-a`/`lvl-b` pre-seeded, then click-created `lvl-vhlxb225` @2650.4156830952725):

1. label edit → stored `{2650.415…, "kb-flow"}`, fields match store.
2. Ctrl+Z → note reverted to `level`, price kept, **fields re-synced**; Ctrl+Shift+Z → `kb-flow` restored, fields re-synced.
3. Ctrl+Z ×2 → edit undone, then create undone (levels back to 2, fields row hidden, deselected — `rv-15`).
4. Ctrl+Shift+Z ×2 → create restored `{2650.4156830952725, "kb-flow"}` (`rv-16`).
5. Chart and fields consistent at every step; console `[]`.

The new `$effect` sync did not fight the undo/redo stack anywhere in the flow.

### R-6 — no regressions beyond scope — **PASS**

- `npm run check` → **0 errors, 1 warning** (the accepted `state_referenced_locally` warning, baseline).
- `npm run build` → **PASS** (vite + adapter-node, ~31 s).
- Console: `[]` (no errors/warnings/exceptions) captured after **every** load and interaction block across the session (~10 full reloads + storage-failure loads).
- **W1 sanity:** fresh-cleared origin → first paint shows bare XAUUSD 15m chart immediately with honest "None yet" panel (`rv-17-w1-first-paint.png`) → one click-create @2651.346657573231, `saved` status (`rv-18`) → reload → level + panel item restored (`rv-19-w1-reload.png`) → console `[]` throughout. Final state reset to clean defaults (`rv-21-final-clean.png`).

## Findings

| ID | Severity | Finding | User effect |
|---|---|---|---|
| **F-R1** | **Low** | Narrow chart widths (≤~600px): `.readout` OHLC band wraps 16→28px on first crosshair activation → one-time ~12px chart jump; persists (correctly) after deselect since it is crosshair-state-driven, not selection-driven. Pre-existing (readout unchanged in remediation diff), same class as F-V2. | One-time small jump when mouse first enters the chart at narrow widths; harmless after that. Recommend a fixed-height readout band in a future pass. |
| — | Info | F-V2's fix eliminated selection-driven reflow fully at 1280 and 768; F-R1 is the only remaining reflow source found. | — |

Harness-only notes (not product defects): M-5 helper arg-parsing (fixed in my harness copy), M-6 CDP init-script session scoping. No product repair was made at any point.

## Verdict

**PASS WITH NON-BLOCKING FINDINGS** — all four remediated behaviors (F-V1 field-sync incl. drag→label-edit→price-kept and multi-level re-sync; F-V2 zero-shift fixed bands at 1280 and 768 with focus outlines intact; F-V3 explicit read-failed note under two distinct failure modes; F-V4 select-reverts-to-applied with honest `failed: storage` pill) were independently re-demonstrated by real-browser interaction at the pinned SHA, with keyboard undo/redo confirmed symmetric and unaffected by the new sync effect, and with no regressions beyond scope (check/build/console/W1 all clean). The single new finding F-R1 (low, pre-existing narrow-width readout wrap) is bounded, does not contradict any G1 criterion, and is carried forward as non-blocking.

This verdict covers the remediated G1 candidate only; it does not authorize G2.

## Reproduction

```
cd host && npm run check && npm run build
npx vite preview --port 5224 --strictPort   # verifier's own fresh port
# curl http://localhost:5224/ → 200, 1× data-testid="chart-island", 0× lwc-readout
# CDP per docs/evidence/G1/verifier-shots/cdp.mjs (this session's copy: Temp/rv-harness/cdp.mjs, retargeted to :5224)
# F-V3 getter-throw single-session script: Temp/rv-harness/session-fv3.mjs
```

## Artifacts

- This report + `verifier-shots/rv-01…rv-21*.png` (21 real-browser screenshots) + `verifier-preview-rv.log` (my server log). Harness scripts in temp dir only, not committed.
- No secrets, no orders, nothing published or pushed; preview server stopped (PID 29724 killed); browser localStorage reset to fresh defaults. Untracked evidence files left in the tree for review; nothing staged, nothing committed.