# G1 remediation report — post-verifier fixes (candidate, orchestrator integrates)

**Baseline:** `4bdc0a1d9944e30e514bebddf68099da7ca79ce6` (clean). Fixes the four findings from `verifier-report-G1.md`. No contracts changed, no rev bumps, keyboard paths unchanged, no commits/pushes (orchestrator integrates).

## Per-finding changes

### F-V1 (medium, required) — stale price field after drag — FIXED & SELF-VERIFIED

- `host/src/lib/island-state.svelte.ts`: added a `$effect` that re-syncs `editPrice`/`editNote` from the selected level's **stored** values whenever the store changes (drag-move, undo/redo, any successful mutation). A field the user is actively typing in (`document.activeElement[data-field]`) is left untouched until blur/change submits it.
- `host/src/lib/islands/ChartIslandLWC.svelte`: added `data-field="edit-price"` / `"edit-note"` to the inputs (focus-aware sync anchors).
- **Self-verification (real CDP pointer events, headless Chrome, own preview on fresh port 5223):** created a level by chart click (2653.044) → dragged it with a 6-step real-pointer drag (pan suppressed, released at cursor) → stored 2647.8445534399543 AND toolbar field showed exactly that → label-only edit submitted → **price kept at 2647.8445534399543, note applied**. Reload → both persisted. The silent revert is eliminated.
- Harness note: real CDP `char` typing into inputs did not generate `input` events in this headless harness, so the label edit was submitted via synthesized `input`+`change` events on the real input element — the same accepted technique as the verifier's M-1 for native controls. The drag itself was real pointer events.

### F-V2 (low) — toolbar reflow shifted the chart — FIXED & SELF-VERIFIED

- First attempt (`min-height` on the toolbar) reduced the jump from ~25–40px to 13px but did not eliminate it: at narrow chart widths the long hint wrapped, and field appearance still changed row count.
- Final structure (`ChartIslandLWC.svelte`): three **always-present fixed bands** — `.toolbar` (buttons, `min-height: 30px`), `.fieldsrow` (edit fields when selected, empty otherwise, `min-height: 30px`), `.hintline` (gesture hint when nothing selected, `min-height: 17px`, `.hint` as `display:block; line-height/height: 17px` — killed a residual 1–2px line-box rounding shift found during measurement).
- **Self-verification:** chart-container top `315.4` unselected == `315.4` selected — **0px shift** (originally ~25–40px). An intermediate 13px case (wrap at 599px chart width) and a 1–2px case (hint line-height rounding) were both found by measurement and eliminated.
- **Regression caught and fixed during this work:** moving the inputs out of `.toolbar` had silently killed the `.toolbar input:focus-visible` rule (keyboard focus outline loss). Selector updated to `.fieldsrow input:focus-visible` — rule confirmed present in the live stylesheet (Svelte-scoped form `.fieldsrow.svelte-xxx input:where(...):focus-visible`).

### F-V3 (low) — panel list lied under storage read failure — FIXED & SELF-VERIFIED

- `host/src/routes/+page.svelte`: split reads into `readLevels()` (pure, throws) and `loadLevels()` (non-throwing, used by dispatch paths). Panel list now derives through `panelRead` ($derived.by with try/catch — **no state mutation during derivation**, avoiding Svelte 5 `state_unsafe_mutation`). On read failure the panel renders an explicit `panel-read-failed` note ("Drawings list unavailable: storage read failed…") instead of "None yet".
- **Self-verification:** corrupted `g1.levels.v1` → reload → `panel-read-failed` present, `panel-empty` absent. Console clean.

### F-V4 (low) — select showed rejected value after persist failure — FIXED & SELF-VERIFIED

- `+page.svelte`: added `revertToApplied()` (re-reads the last applied/persisted workspace row); called from `persistWorkspace`'s catch and from the `setSymbol`/`setTimeframe` dispatch-failure branches, so the select always displays the value the chart actually adopted.
- **Self-verification (verifier's storage-kill technique):** `window.localStorage` getter made to throw → requested 4h via the panel select → select reverted to applied `15m`, pill honestly `failed: storage`. Island unchanged (it was already honest).

## Checks run

| Command | Result |
|---|---|
| `npm run check` | **0 errors, 1 warning** (the accepted `state_referenced_locally` pattern from G0-F3; warning count back to baseline) |
| `npm run build` | **PASS** (adapter-node) |
| CDP smoke (own preview, fresh port 5223, headless Chrome + own temp profile) | create → drag (real pointer) → field syncs → label-only edit → price kept ✓ → reload → persisted ✓ → console **[]** across all loads ✓ |

## What still needs independent re-verification (per EVALUATION.md, changed behavior only)

1. F-V1: drag → field sync → label-only edit keeps price (real-pointer drag + the fix's sync behavior), incl. undo/redo of an edit after a drag.
2. F-V2: chart-top stability across create/select/deselect at desktop AND narrow widths (I verified 1280-class headless + a 599px chart width case during measurement; verifier should sample both).
3. F-V3/F-V4 under induced storage failure (techniques as in verifier C-17 / this report).
4. Keyboard paths unchanged but re-confirm one Ctrl+Z flow (the new sync effect touches the same state).

## Not changed

Fixture data, VICT contracts/revs, keyboard bindings, the F1 subpath usage, verifier/builder evidence files, pack docs. uPlot remains deleted (G0 history preserves it). Nothing committed; nothing pushed.
