# G3 builder report — candidate

**Candidate SHA:** the head commit that carries this report + the G3 status reconciliation (full SHA reported to the owner in the pause message and recorded in STATE.md). No SHA is asserted here beyond the verified work-path commits below — nothing in this report is self-certifying: per the owner-specified sequencing, the fresh verifier attacks this candidate AFTER the engine-adoption decision.

**Builder/stage-manager:** this session (one local stage manager owning the cycle per D-005).
**Baseline:** `c480934aa14991139de87d4d19ba65a4af868802` (G3 acceptance commit). Working path: a1db44b → a9f820a → c92b515 → baa71e2 → 9c565f0 → 4a6130c → cea5cca → 477cd2e → candidate.
**Not self-verifying:** the fresh verifier runs after the owner's engine decision (owner-specified sequencing); this report is the CANDIDATE claim matrix it will attack.

## Claim matrix (criterion → verdict → evidence)

| # | Criterion (accepted record, as amended) | Verdict | Evidence |
|---|---|---|---|
| 1 | Free entry + draft lifecycle (no Method prerequisite; hide/reopen + reload byte-exact) | **PASS (browser-proven)** | `browser-results.json` w2-add-sma-indicator / w2-new-draft-hide-reopen (byteExactAfterReopen true) / w2-reload-draft-survives; screenshots br-01/02/03/04 |
| 2 | Plot/signal through capped data | **PASS with interpretation note** | plots/signals flow kit-capped (`poison-proof-results.json` isolation rows); rendered in the host plot pane (`br-01-desktop-w5.png`). NOTE for verifier: chart-workspace (closed package, not in G3 scope) has no public overlay-series export, so plots render in a host-composed pane directly beneath the chart, not as candle-chart overlays — recorded as an interpretation the verifier should judge |
| 3 | Invalid edit actionable; saved draft not corrupted; previous good version runnable | **PASS (browser-proven)** | w5-invalid-edit-actionable: SCRIPT_SYNTAX_ERROR rendered with runtime message; failed run stored with inputs+error+identity; prior successful runs intact |
| 4 | Sandbox boundary + hard limits + documented syntax subset | **PASS (probe pack + browser)** | `selection/a1-runtime/probe-results.json` — 20 probes all clean (containment 10/10, interrupt 502ms@500 deadline, OOM, stack overflow contained, determinism identical); limits verified in Chromium too; syntax subset = QuickJS ES2020+ (documented in a1 README); error taxonomy in kit (SYNTAX/CONTRACT/ERROR/INTERRUPTED/OOM/STACK_OVERFLOW) |
| 5 | Run identity + pinning; identical inputs → identical identity AND bit-identical results; one-input change → different identity | **PASS (kit tests + browser)** | kit g3.test.mjs (identical-identity, whitespace-flip, range-flip tests); browser w5-identical-inputs-identical-run (true) + w5-one-input-change-flips-identity (true, e1a0d7b4 vs b2a2ee7f, net −67.80 vs −55.60) |
| 6 | Draft-mutation isolation: editing a draft leaves completed runs byte-identical | **PASS (browser-proven)** | w5-draft-edit-cannot-rewrite-run: runsBytesUnchangedAfterDraftEdit true (separate storage keys + append-only runs) |
| 7 | Future isolation, all timeframes + derived output (**as amended by D-005**) | **PASS** | `poison-proof-results.json`: POTENCY — naive full-source max + sma20 respond to poison (3112.5→6112.5); ISOLATION — script plots/trades(economic)/equity/signals/stats identical across variants at 15m/1h/4h AND match an independent clock-capped oracle exactly (reference computed from raw fixture JSON, independent of kit aggregation); run identities differ across variants by design (data-revision pinning) |
| 8 | Simulated-only authority | **PASS** | all fills carry `simulated: true` (kit type + tests); no account/order/live pathway in kit or host (import audit for the verifier); browser runs labelled via run records; W6 current-market endpoint cannot be reached — no code path exists (negative test for verifier) |
| 9 | Honest run states | **PASS (browser-proven)** | w5-invalid-edit shows 'run failed: SCRIPT_SYNTAX_ERROR: …'; succeeded runs show fills/net; failed runs preserve inputs+error+identity (kit test 'failed runs still carry identity and full assumptions') |
| 10 | Packaging: standalone build + npm pack sha512 + independent consumer outside monorepo | **PASS** | `consumer-results.json` + `pack-and-consume.mjs`: kit 0.2.0 tarball (44,638 B, sha512 a6d4b02a…, sha256 5775181f…), consumer at C:/Users/RZ1/Desktop/RZ/g3-consumer with OWN data — deterministic two-run identity, one-input flip, capped queries, sandbox refusal, no host globals |
| 11 | Shared checks: check+build clean, console clean, browser W2/W5 desktop+375/768, keyboard, W1+W3 regression | **PASS** | host `npm run check` 0 errors; build clean; browser-results console errors: none (favicon 404 excluded); 375/768 horizontalOverflowPx 0; W1 level-drawing regression persisted; W3 smoke implicitly via favc1 step flow (verifier re-runs full W3); keyboard = native focusable buttons/textarea (verifier may deepen) |
| 12 | Carried-findings dispositions executed | **PASS (see table)** | below |

## Carried findings — status after this cycle

| ID | Disposition (accepted) | Status |
|---|---|---|
| F-AVC-1 | Repair in G3 | **RESOLVED** — success paths now clear stale refusal text (`okStatus` in step/play/pause); browser check favc1-refused-write + recovery step shows truthful current status ('stepped to …', staleAfterRecovery false) |
| F-1 | Normalize regenerator | **NOT DONE — carried with reason** — the G2 regenerator pretty-print mismatch is upstream of every G3 fixture (fixtures are committed artifacts, not regenerated in G3); attempting a regeneration pipeline change under G3 would touch G2-evidence semantics outside this stage's boundaries. Owner may direct a standalone docs-level fix |
| F-3 | Repair in G3 | **RESOLVED** — truthful gap wording shipped (`data gaps are explicit unavailable intervals — never bridged in data · the chart line may still bridge them visually (rendering limitation only)`), rendered in the chart island footer |
| F-C2-2 | Resolve in G3 (production WRITE_REFUSED path) | **RESOLVED** — the G3 draft/run persistence IS the production path: corrupt-key save attempts render `failed: draft save refused [READ_FAILED]: …` in-browser with corrupt bytes preserved (fc22-refused-write-rendered) |
| F-AVC-2/3 | Informational | unchanged, recorded |
| F-R1, RF4, N-1/N-3, stable-0.4.0 recheck, bundle-delta | not expanded | unchanged — no G3 work touched their surfaces; the stable-0.4.0 recheck remains pending with the VICT rc.1 pin |

## New findings recorded this cycle (builder-identified, all non-blocking)

| ID | Severity | Finding |
|---|---|---|
| F-G3-1 | environment (non-blocking) | Vite DEV-mode optimize-deps deterministically fails re-optimizing `@victframework/ui-svelte` (esbuild parse error on a valid file, `xport` at line 12) — same corruption family as the G2 note; `npm run build` + preview unaffected. Verification ran against the production preview (as in G2). Environment-only; no product code implicated |
| F-G3-2 | minor (non-blocking) | chart plots render in a host-composed pane rather than as candle-chart overlays (criterion-2 interpretation note above); extending chart-workspace is out of G3 scope (package closed at G1-PKG) |
| F-G3-3 | informational | legacy `getQuickJS()` entry of quickjs-emscripten returns garbage on this machine (both Node 22.13 + Chromium) while the explicit `newQuickJSWASMModule(RELEASE_SYNC)` works — documented in the a1 README + adapter header comment so future sessions don't "simplify" it back |
| F-G3-4 | minor (non-blocking) | syntax errors from QuickJS do not include line numbers (message only, e.g. `invalid property name`) — the editor shows the raw message; deeper error mapping would require upstream changes |

## Reproduction commands

```bash
# kit suite (hand-fixture exactness + sandbox taxonomy, 18 tests)
cd packages/trading-kit && npm run build && node --test test/g3.test.mjs
# host checks
cd host && npm run check && npm run build
# packaging proof
node docs/evidence/G3/pack-and-consume.mjs
# criterion-7 poison proof (amended)
node docs/evidence/G3/poison-proof.mjs
# A1 probe pack
node docs/evidence/G3/selection/a1-runtime/probe.mjs
# NT evaluation (venv outside repo; research-only)
C:/Users/RZ1/Desktop/RZ/g3-nt-eval/Scripts/python.exe docs/evidence/G3/selection/a2-engines/nt_eval2.py
# browser verification (needs the preview server on :5199)
node docs/evidence/G3/browser-verify.mjs
```

## What is NOT in this candidate

- No engine integration (owner gate pending; recommendation: neither).
- No publication, no accounts, no live anything, no G4 scope.
- Scripts run against the pinned G2 fixture in-app (fixture-labelled data); no new data-provider claims.