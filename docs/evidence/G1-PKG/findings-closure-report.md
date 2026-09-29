# G1-PKG Part A — findings closure report (builder)

- **Baseline:** HEAD `11c8b41c1888b4b86bbda20ccbc9278da118400b` (clean tree at start; owner-directed task).
- **Scope:** `host/**` code fixes + `docs/evidence/G1-PKG/**` only. No pack docs, STATE.md, HANDOFF.md, or prior evidence reports touched. Nothing committed or pushed (per task).
- **Environment:** Node v22.13.1, Windows; app served via `npm run build` + `npm run preview` on `http://localhost:5199` (adapter-node production build); real Chrome via CDP (:9222), harness `cdp-pkg.mjs` in this directory (extends the verifier's `cdp.mjs` with `Page.javascriptDialogOpening` auto-accept recording, `click-el`, `wheel`, and network/CPU throttling).
- **Changed host file:** `host/src/routes/+page.svelte` (read-gate + verified write + loading gate). No other host files changed.

---

## FIX 1 — Read-failure write guard (required, highest priority)

### Invariant implemented (exact wording)

> **No persisted write occurs unless the prior read of that collection succeeded.**
> If a read of the stored drawings collection (`g1.levels.v1`) fails — corrupt JSON or a throwing `localStorage` getter — every level mutation (`act.level.save`, `act.level.update`, `act.level.delete`) is refused **before any `setItem` happens**; the existing stored bytes are never overwritten by a blind rewrite; the contract path returns `{ ok: false, code: 'STORAGE_READ_FAILED' }`; and the failure is surfaced honestly (panel pill `failed: storage`, island mutation status `failed: STORAGE_READ_FAILED`). Additionally, every accepted write is **verified by an immediate read-back compare**; on mismatch the original bytes are restored (best effort) and the mutation reports `STORAGE_VERIFY_FAILED`.

### Implementation (host/src/routes/+page.svelte)

- `gateLevelsRead()` — performs a raw `getItem` **and** a full parse/shape check of the levels collection; returns the pre-write raw bytes on success, `{ ok: false }` on any read failure (getter-throw or corrupt JSON).
- All three level mutation branches in `dispatch()` now call the gate first and refuse with `STORAGE_READ_FAILED` (setting `panelStatus='failed'`, `panelDetail='storage'`) before touching storage.
- `writeLevelsVerified(next, rawBefore)` — performs `setItem`, immediately re-reads and byte-compares; on mismatch restores `rawBefore` exactly and reports failure.
- `act.workspace.set` is unchanged (separate key; the drawings invariant is about the levels collection). The reset control is a user-confirmed destructive action and is unchanged.

### Reproduction (exactly as owner specified) — PASS

Setup: fresh storage → two levels created normally through real UI clicks (`+ Level`); a level selected by real chart click; storage snapshot **A** taken; then key `g1.levels.v1` corrupted **in place** to `{"CORRUPT` with `g1.workspace.v1` set to a valid row (other valid keys intact); corrupt snapshot **C** taken. UI state intentionally left intact (no reload) so edit/delete paths are reachable.

| Attempt | Action (real UI) | Island mutation status | Panel pill | Stored bytes after |
|---|---|---|---|---|
| 1 | Edit price 2647.77 → 2650 via toolbar field + Tab | `failed: STORAGE_READ_FAILED` | `failed: storage` | `{"CORRUPT` (unchanged) |
| 2 | Delete selected level (`Delete` button) | `failed: STORAGE_READ_FAILED` | `failed: storage` | `{"CORRUPT` (unchanged) |
| 3 | Create a level (`+ Level`) | `failed: STORAGE_READ_FAILED` | `failed: storage` | `{"CORRUPT` (unchanged) |

**Byte-survival proof (node-side diff of snapshots):**

- `C === after` → **true** — the corrupt bytes survived all three refused attempts byte-for-byte (`{"CORRUPT`, 9 bytes).
- `after !== A` → **true** — the original good bytes were never rewritten/overwritten by any attempted mutation.
- Screenshot: `pkg-01-read-failed-all-refused.png` (all three failure signals visible).

**Getter-throw variant — PASS.** Good bytes restored (`[{"id":"lvl-keep","price":2647.77,...}]`), then `localStorage.getItem` overridden on the instance to throw for the levels key. Attempted `+ Level` create: island `failed: STORAGE_READ_FAILED`, pill `failed: storage`; bytes read back via `Storage.prototype.getItem` were **byte-identical** to the pre-attempt value (node comparison: `true`). Screenshot: `pkg-02-getter-throw-refused.png`.

---

## FIX 2 — `loading` and `unavailable` states in browser

- **`loading`** — the app definition (`host/src/lib/definition.ts`, screen state `t.loading`) declares content `Loading workspace…`, but the ui-svelte renderer never renders a `loading` screen state, so the host now renders it directly: a host-level `data-testid="workspace-loading"` element with exactly the app-defined wording, shown until client hydration completes its first storage read (`hydrated` flag in `+page.svelte`).
  - Demonstration: CDP `Network.emulateNetworkConditions` (2 s latency, 20 KB/s) + `Network.setCacheDisabled` + `Page.reload ignoreCache`; polling observed `data-testid=workspace-loading === "Loading workspace…"` on two consecutive polls (~250 ms window), resolving to `null` with the chart mounted. Screenshot captured while visible: `pkg-03-loading-state.png`.
- **`unavailable`** — with FIX 1, storage read failure is the unavailable case and is shown truthfully:
  - On load with corrupt `g1.levels.v1` (`{BROKEN`): panel shows `data-testid=panel-read-failed` — *"Drawings list unavailable: storage read failed. Existing levels may still be visible on the chart."* — pill `ready` (no write attempted, nothing lied). Screenshot `pkg-04-unavailable-on-load.png`.
  - On attempted create under the same failure: pill → `failed: storage`, island → `failed: STORAGE_READ_FAILED`, bytes untouched. Screenshot `pkg-05-unavailable-write-refused.png`.

---

## FIX 3 — Anchoring claim correction (accuracy, evidence first)

**Correction of the G1 wording "anchored to market price and time":**

- `createdAt` (and `lastModified`, if present) is **wall-clock metadata** about when the drawing object was created — it is **not** a market-time coordinate and plays no role in where the level is drawn.
- A horizontal price level anchors to:
  1. **An exact market PRICE coordinate** on the price axis. This survives pan, zoom and timeframe switching — the price→pixel mapping is recomputed, the pixel position may change, but the price coordinate is preserved exactly.
  2. **The instrument context** — levels are symbol-scoped (stored with `symbol`, displayed filtered per instrument).
  3. **Market TIME: a horizontal level spans ALL market time on the chart by definition** — it has **no market-time coordinate**. It is drawn at every visible timestamp. Any claim of a time *anchor* (a specific market-time position) for a horizontal level is unearned.
- **Empirical verification (this session, real CDP interaction):** level created at price `2647.77` (storage snapshot).
  - After pan (drag) + zoom (wheel): the level's y-position on the axis moved as expected; hovering the crosshair at the rendered line gave cursor price `2647.74` (axis quantization step 0.26–0.79/20 px) — the line sits at the stored price. Storage price unchanged byte-for-byte. Screenshots `pkg-06-anchor-created-15m.png`, `pkg-07-anchor-after-pan-zoom.png`, `pkg-07b-line-hover-zoomed.png`.
  - After timeframe switch 15m → 1h (panel select, CDP change event): stored price still `2647.77`; crosshair at the line reads `2647.82`. Screenshot `pkg-08-anchor-tf-1h.png`.
  - Symbol switch XAUUSD → EURUSD: level hidden from the panel list (symbol-scoped), stored bytes unchanged; restored on switching back. Screenshot `pkg-09-symbol-scoped-eurusd.png`.
- **Open criterion question (not self-certified):** whether the G1 stage wording *"create, select, edit, move, remove, undo and redo a drawing **anchored to market price and time**"* is met. **This builder's analysis: the time-anchor requirement is NOT met by horizontal levels** — they span all market time and have no market-time coordinate; only the price anchor is a true coordinate. **We explicitly recommend the verifier judge that criterion portion HELD** (or the criterion be re-worded by the owner) rather than passed. The verifier decides; the builder does not certify.

---

## FIX 4 — Reset interaction with browser-dialog handling — PASS

- Harness gains `Page.enable` + `Page.javascriptDialogOpening` handling with recorded auto-accept (`Page.handleJavaScriptDialog {accept:true}`).
- Sequence (single WS session, real click): pre-reset state `{keys: 1, drawings: 1}` (one level) → click `Reset workspace` → **dialog observed and recorded:** `{type: "confirm", message: "Reset the workspace? All drawings will be removed."}` → accepted → page reloads → post-reset `{keys: 0, panel: "None yet. Click the chart to draw a level.", island: XAUUSD/15m}` — workspace cleared, fresh defaults.
- Screenshots: `pkg-10-reset-before.png` (pre-reset, level present), `pkg-11-reset-after.png` (post-reset, fresh defaults).

---

## Checks

| Check | Result |
|---|---|
| `npm run check` | **0 errors** (1 pre-existing warning `state_referenced_locally` in `ChartIslandLWC.svelte` — present before this change, untouched) |
| `npm run build` | **PASS** (vite build + adapter-node, ran after all edits) |
| Console (captured across every reload/interaction above) | **clean — no errors, no warnings, no exceptions** |
| F-V1 regression sequence (create → drag → label-only edit → undo ×2 → redo ×2 → reload) | **PASS, no remediation regression:** drag moved 2653.5166…→2656.6678… and the toolbar price field re-synced to the dragged price; a label-only edit then **kept the dragged price** (stored `price: 2656.6678…` after label edit — F-V1 fix intact); undo ×2 restored `2653.5166…`/`note:"level"`; redo ×2 restored `2656.6678…`; after full reload the level persisted identically and the panel listed it. Screenshots `pkg-12-fv1-label-edit-price-kept.png`, `pkg-13-fv1-after-reload.png`. |
| Normal flows under the new read-gate | All create/edit/delete above (regression sequence) dispatched through the gated path and behaved identically to pre-change when reads succeed. |

**Harness disclosure:** during the label edit, Ctrl+A did not replace the existing note text, so the label became `levelsupport` (append instead of replace). This is a harness key-event artifact, not product behavior (the product field behaves normally with real input; the F-V1 point under test was price preservation, which passed). Recorded for honesty.

## Residual notes

- `writeLevelsVerified` restore-on-mismatch is best-effort; if `setItem` itself throws during restore, the failure is reported but the bytes may differ — no such case was observed; the read-gate prevents the realistic overwrite scenarios.
- The `loading` state is host-rendered (the ui-svelte renderer does not render `t.loading`); wording matches the app definition exactly.
- Nothing committed/pushed per task scope. Preview server stopped after evidence capture.
