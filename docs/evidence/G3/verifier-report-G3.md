# FRESH VERIFIER report — G3 (script experiments and reproducible tests)

**Verifier:** fresh, independent session; did not build the candidate; falsification-first.
**Candidate tested:** `685d769e02df94e73e0033e6a03f1fe72210d211` (HEAD of `origin/main`, clean tree at start; verified `git log`/`git rev-parse origin/main`).
**Authority:** HANDOFF.md G3 record (ACCEPTED 2026-09-30, baseline `c480934…`), amendments D-005, engine resolution D-006. No product code modified by the verifier; only `docs/evidence/G3/verifier/**` added.

## Verdict: **FAIL** at `685d769…`

Two required behaviors are contradicted by observed evidence:

- **Criterion 2 (placement component):** the accepted criterion says script series/signals render **on the chart**. They render in a separate, index-scaled SVG pane below the chart — see the owner-mandated independent pane ruling below (ruled **FAIL** on the criterion itself, per D-006's instruction).
- **Criterion 5 (reproducibility):** two runs with **identical inputs produce bit-DIFFERENT results** whenever the guest script uses `Math.random` or `Date.now` — reproduced through the public `runBacktest` API with a minimal natural script. The kit's own documented containment contract claims exactly the missing mechanism (`script.ts:14-15`, a1 README "Math.random replaced by a seeded PRNG; Date.now pinned"), and nothing in `sandbox/quickjs.ts` implements it. The criterion's stop condition ("non-reproducible identical-input runs") is thereby observed.

Both defects are precisely bounded with small in-scope repairs (a few lines in the sandbox adapter for criterion 5; the D-006-pre-authorized bounded chart-workspace extension for criterion 2) and precise reproduction steps below. **All other criteria pass** (several verified strictly beyond the builder's evidence). This is a **failure of this candidate SHA**; the stage remains recoverable by bounded repair + re-verification per D-005's execution mandate — not a scope or authority failure.

---

## Owner-mandated PANE RULE ruling (criterion 2) — **FAIL**, ruled independently

**Question (D-006):** do plots/signals rendered in the separate host pane satisfy the accepted "plot or signal on the chart" experience (STAGES G3 outcome, EXPERIENCE W2 + G3 record criterion 2)?

**Decision: FAIL on the criterion's placement component.** Reasoning:

1. **The accepted text is explicit, three times over.** STAGES.md G3 outcome: "a draft script can plot or signal **on the chart**"; the HANDOFF G3 outcome: "plots or signals **on the chart** against clock-capped data"; criterion 2's own wording: "script series/signals **render on the chart** via public kit + chart-workspace exports". The delivered surface renders in the ScriptsIsland's own `<svg>` (`host/src/lib/islands/ScriptsIsland.svelte`, plots block) — not the chart.
2. **It does not actually share the chart's time axis.** Verified live: the plot polyline is **index-proportional** across a full-width pane (`plotPoints()` stretches values over viewBox width per run-bar index) — it has no price axis, no time labels, no crosshair linkage. A signal circle is a dot at the pane bottom at some run index; the trader cannot tell which candle it belongs to or at what price. The weigh-in premise "shares the same bars/time axis context" holds only conceptually (same underlying run bars), not visually.
3. **W2/W5 product intent** ("add an indicator … see outputs" with visible-chart context; "see its plots/signals") is materially weaker when an SMA curve cannot be read against candles: with the fixture's ~2650 range and no price units on the pane, the shape alone loses the price anchoring a trader needs.
4. **"chart-workspace exposes no overlay API" is a scope artifact, not a product justification** — CONFIRMED: the package's public `ChartController` (`packages/chart-workspace/src/types.ts:45-58`) exposes only `setData(bars)` / `setLevels(levels)`; nothing else. The owner pre-authorized exactly this bounded extension in D-006 ("This bounded extension is authorized for the G3 criterion"), which is evidence the pane was not already considered satisfying.

**Smallest public chart-workspace extension that would satisfy it (API shape only, no code):**

```
// @vict-trading/chart-workspace ChartController additions (public surface only):
addOverlay(spec: {
  id: string;
  kind: 'line' | 'area' | 'histogram';
  pane: 'price' | 'sub';          // price-pane overlay (e.g. SMA) or lower sub-pane sharing the same time scale
  color?: string; lineWidth?: number;
}): OverlayHandle
removeOverlay(id: string): void

interface OverlayHandle {
  // data mapped by the APP from kit-capped run bars; the kit still never
  // imports chart-workspace (R4 preserved); times are unix seconds (market
  // time); null values render as gaps; points beyond the caller's clock are
  // the app's responsibility to withhold
  setData(points: { time: number; value: number | null }[]): void;
  setMarkers(markers: { time: number; shape: 'arrowUp' | 'arrowDown' | 'circle'; text?: string }[]): void;
}
```

Implementation path: lightweight-charts 5 native `chart.addSeries(LineSeries, { priceScaleId })` for price-pane overlays and its panes/sub-pane support for 'sub' — both inherit the chart's real time scale, so candles, crosshair and time labels align automatically; signals become positioned markers visible at their candle. Boundaries unchanged: app maps kit-capped run-bar plots `{time, value}` to `setData`, calls the public export only. Per D-001/D-006 this extension needs its own pack + independent-consumer proof at a new SHA before the criterion can re-verify.

---

## Claim matrix (accepted G3 record criteria 1–12, as amended by D-005 / resolved by D-006)

| # | Criterion | Verdict (verifier) | Independent evidence |
|---|---|---|---|
| 1 | Free entry + draft lifecycle (no Method prerequisite; hide/reopen + reload byte-exact) | **PASS** | v4 browser: `+ SMA` indicator from the bare chart with no prerequisite form; `v4-w2-draft-hide-reopen`: editorGoneOnHide=true, byteExactReopen=true. Draft restored from storage after reload + fresh page (v6 seeded-reload, `draft-kb draft` clickable after reload; v6 `v6-identity-across-fresh-session` draft present in a fresh page). Fresh profile W1 (v7): chart + scripts island with no prerequisite, 0 page errors |
| 2 | Plot/signal through capped data + render **on the chart** | **FAIL (placement) / PASS (capping)** | Capping: independent consumer capped records 160/80 (own data); poison runs cappedQueryCount>0; every derived value matched a clock-capped independent oracle per-bar (v2). Placement: separate index-scaled SVG pane below the chart, no shared time axis, no crosshair, no price units — owner-mandated ruling above: FAIL |
| 3 | Invalid edit: actionable local error; saved draft uncorrupted; previous good version runnable | **PASS** | v4: `run failed: SCRIPT_SYNTAX_ERROR: invalid property name` rendered; stored run status=failed; prior good run row intact and re-runnable (v6 re-run after recovery). Note F-G3-4 (no line numbers) stands |
| 4 | Sandbox boundary + hard limits + documented syntax subset | **PASS (containment/limits), with findings** | My OWN 16-probe pack (`v1-probe-results.json`): constructor-chain global dump reaches only the guest realm (full `Object.getOwnPropertyNames(globalThis)` clean — no fetch/XHR/process/require/window/document/localStorage/Worker/WebSocket/indexedDB); dynamic `import` refused (handler never runs — silent, see F-G3-7); memory cap enforced (SCRIPT_OOM at 64MB via 8M-element payload through the host channel); stack bound enforced via host-roundtrip recursion (P9b → SCRIPT_STACK_OVERFLOW); interrupt bounded with host-call-heavy loops (P14: 569ms @ 500ms deadline); host-fn authority hijack contained (P10/P10b: guest can only tamper with its OWN view; kit state unaffected); eval/getter-trap/`Function`-constructor probes clean. Limits verified in-browser by the builder's Chromium probes (wiring = same RELEASE_SYNC path). Findings: F-G3-6 (doc claim contradicted — see criterion 5), F-G3-5 (GC abort), F-G3-7 (async silent no-op + README promise-pumping claim false), F-G3-8 (MAX_RUNS eviction note — listed under 6) |
| 5 | Run identity + pinning; identical inputs → identical identity **and bit-identical results**; one input → different | **FAIL (bit-identity for entropy-using scripts)** | Identity/pinning mechanics PASS: kit tests identical-identity + whitespace flip + range flip; browser v4: identical runs → same id `9b632b5e2de7` + identical stored results; `{"period":21}` → id `27c2900cba86` + different trades/net; identity identical across a fresh browser session (v6, `08dc33e9206c` ×2); my independent consumer: deterministic two-run + one-input flip on OWN data (**only for scripts that don't call Math.random/Date.now**) — **BUT** `v1` P3: two `runBacktest` runs of `api.order('buy', 1 + Math.random())` produce fill sizes `1.158782660022586` vs `1.5922288013500867` (bit-different results, identical inputs); P4: `Date.now()%1e7` plot = `1545787` vs `1545796`. The containment doc (`script.ts:14-15`) and the a1 README claim both are replaced/pinned — they are not. **This is the recorded stop condition "non-reproducible identical-input runs"** |
| 6 | Draft-mutation isolation (no rewrite path for completed runs) | **PASS** | v4 `v4-draft-edit-runs-immutable`: runs bytes byte-identical after draft name+source edit+save (separate keys `g3.scripts.v1` / `g3.runs.v1`, append-only mutate). Minor bounded note F-G3-8: runs list evicts beyond MAX_RUNS=12 (`[...runs, run].slice(-MAX_RUNS)`) — pruning, not rewriting; UI labels runs "immutable" while the record silently drops the oldest row after 12 runs (bounded, user-benign at G3 scale, but not literally append-only) |
| 7 | Future isolation, all timeframes + derived (A1 as amended) | **PASS (verified beyond builder's own proof)** | `v2-poison-verify-results.json`, written with an oracle whose structure is independent of both the kit and the builder's oracle (binary-search availability prefix + slot-grid bucket enumeration): (a) POTENCY — naive full-history max/sma20 respond: committed pair 3112.5/3107.25 → 6112.5/6107.25; MY OWN mutation shapes: variant C (alternating 9999/1 poison) → 9999/5014.5; variant D (mid-history shift of bars 1500–1530) → 7645.56/7645.56; (b) ISOLATION — committed baseline vs alternate identical (plots/trades/equity/unfilled) at 15m/1h/4h, **and vs my OWN variant C identical**; script values match MY oracle at **every bar index** (not just last), `barsInRun == oracleCount` at all 3 TFs (1998/498/122); (c) MID-HISTORY BEYOND AN EARLIER HORIZON — mutated bars strictly after `1769403600` (bar 1450's close) are invisible to runs capped there (identical results, all TFs) while provably changing results when the later horizon reveals them (naiveDiffersAtLaterHorizon = true — the mutation is real, so the identity is not an artifact of invisibility); (d) GAPS of my own shape (slot drops): barsInRun matches oracle exactly (1995/495/119), 9 explicit missing intervals, none bridged. Unfinished-HTF absence covered by bucket completeness (all TFs) |
| 8 | Simulated-only authority | **PASS** | Import audit: kit imports only `quickjs-emscripten` + own modules — nothing from app/chart-workspace; chart-workspace imports neither; host has no `fetch(`/WebSocket/XHR/broker/account/live-order code (grep clean); kit has no http/ws endpoint. Every `SimulatedFill` carries `simulated: true` (owned by types + kit test + consumer check over own data). Runtime negatives: guest realm has no fetch/XHR/process/require (v1 P1/P2 + consumer probe); `api.order` can only queue intent fills at next-bar-open inside `runBacktest`; **no code path exists to any current-market endpoint** — a backtest physically cannot route to one |
| 9 | Honest run states | **PASS** | v4: succeeded runs show fills/net; failed run stored with inputs+error+identity (kit test); unavailable intervals surface in run records and are rendered (v5 W3 gap note; `plots-pane` gap hint). Distinct running/failed/succeeded states observed |
| 10 | Packaging: standalone build + npm pack sha512 + independent consumer | **PASS** | **Reproduced three-way identity:** fresh `npm pack` = `a6d4b02a1f63be7359d7dfd6df535aaa327c7b6872ff417ddf94eed439030387507252b03667fbc0510bd5935bef5a9fce4fffb7b0fd4c78c1b2a0ff3caa01cb` == committed `docs/evidence/G3/kit-0.2.0.tgz` == committed `packages/trading-kit/vict-trading-…0.2.0.tgz` (sha256 `5775181f…`). **MY OWN consumer** at `C:/Users/RZ1/Desktop/RZ/g3-verifier-consumer` (outside the monorepo, own synthetic sawtooth data, own assertions, `npm install` from the committed tarball artifact): ALL PASS — determinism (identical id `1bbfe468abff8d62` + bit-identical results, 10 fills), one-input flip (identity + results), capped queries (160 records / 80 capped), sandbox refusal (SCRIPT_INTERRUPTED, identity preserved on failed runs), no host globals, all fills `simulated: true`, session slice capping correct (own `createReplayClock`/`createDataSession` checks) |
| 11 | Shared checks: check+build clean, console clean, W2/W5 desktop+narrow, keyboard, W1+W3 regression | **PASS** | `host npm run check`: 0 errors (3 warnings); `npm run build` clean; production preview used. Console: 0 errors across my v6/v8 harnesses (favicon 404 excluded); horizontal overflow 0px at 768 and 375; runs + plots visible at narrow widths (v4 shot-05/06, v6 shot-03/04). Keyboard: Tab walk reaches `btn-run-backtest`, **Enter activated a real run** (v8: rows incremented); textarea focusable, Tab lands on Save (v6/v8). **W1 regression** (v7, fresh profile): bare chart, add level (`g1.levels.v1` bytes), tf→1h, reload → level + tf persisted, 0 page errors. **W3 regression** (v5+v7): enter replay (REPLAY banner + horizon), 2 steps (honest position line), tf switch 15m→1h→4h with capped-slice readouts, gap note "shown, never bridged", provenance-unknown hidden note "(1 hidden)" with 0 shown rows, **replay level created by real mouse click** (stored `g2.replay.v1` level stamped creationStep/instant, price 2652.19), reload → CURRENT (per D-004/G2 recorded rule), deliberate Restore → REPLAY restored exact, Return-to-current → CURRENT. W2's "draw a note" limb exercised via v7 current-mode level creation in the same workspace |
| 12 | Carried-findings dispositions | **Executed; F-1 carry judged** | F-AVC-1 **RESOLVED — verified live** (v7: refusal rendered mid-corruption → `stepped to 2026-01-07 02:30Z` after repair — stale text cleared, position honest step 2). F-3 **RESOLVED — verified live** (v7 footer + v5 gap note: "shown, never bridged"). F-C2-2 **RESOLVED — verified live** (v4 corrupt-scripts save → `failed: draft save refused [READ_FAILED]: … stored bytes untouched`; v6 corrupt-runs run → `run store refused [READ_FAILED]`, bytes preserved; corrupt-reload renders truthful "storage unreadable" state without crash, bytes preserved — `/tmp` crash-probe output recorded in runlog). **F-1 carried with reason — judgment: reason HOLDS materially, wording does not.** Reproduced live: `node docs/evidence/G2/fixture/generate.mjs` produces exactly the one-file spurious diff (`host/src/lib/fixtures/g2-fixture.json`, pretty-print → compact) — **BUT the regenerated file is NOT "semantically identical"** as carried: it adds one top-level key `horizonBarIndex` (all other content equal). No G3 surface consumes that key (scripts.svelte.ts declares it unused); the G3 fixtures are separate committed artifacts, so the carry (out-of-G3-scope upstream serialization) stands, with the wording corrected by this report |

## Findings (verifier-recorded; none repaired)

| ID | Severity | Finding | User effect | Suggested owner/repair path |
|---|---|---|---|---|
| V-G3-1 | **blocker (stage)** | **Guest `Math.random` and `Date.now` are live (not seeded/pinned).** Repro: run `runBacktest` twice with `function onBar(bar, api) { if (bar.time === <bar-3>) api.order('buy', 1 + Math.random()); }` (same source/data/inputs) → fill sizes `1.158782660022586` vs `1.5922288013500867`; `Date.now()%1e7` plot differs across runs (`1545787` vs `1545796`). Evidence: `verifier/v1-probe-results.json` P3/P4. Contradicts `script.ts:14-15` + a1 README claims; violates criterion 5's bit-identity requirement; is the recorded stop condition | A user strategy using randomness/time (e.g. random entries, time gates) yields runs that cannot be reproduced or compared — the core W5 promise "identical pinned inputs → identical results" breaks silently, and the docs actively claim otherwise | Implement in `sandbox/quickjs.ts` what `script.ts` already documents: seeded PRNG replacement for guest `Math.random` (host-injected seed, part of nothing — seed may derive from the run identity) + `Date.now`/`new Date()` pinning to the current bar close. Re-run v1 P3/P4 + kit tests |
| V-G3-2 | **blocker (stage)** | **Criterion-2 placement: plots/signals render in an index-scaled SVG pane, not on the chart** (see ruling above) | Trader cannot read plots/signals in price/time context; signals lack candle anchoring; crosshair/linkage absent | D-006 pre-authorized bounded chart-workspace extension (API shape above); stage manager implements at a new SHA + D-001 pack/consumer proof + re-verification |
| V-G3-3 | minor | **QuickJS GC-list assertion abort during dispose after stack exhaustion** (P9b): `Aborted(Assertion failed: list_empty(&rt->gc_obj_list), quickjs.c:2036,JS_FreeRuntime)` prints to stderr while classification still succeeds (SCRIPT_STACK_OVERFLOW) and subsequent runs work (fresh-module memoization verified: 3 runs after the abort all succeeded, `/tmp/gc-poison.mjs` sequence recorded in runlog) | Console noise; potential hard-crash risk of the host process in other emscripten configs; user sees the truthful failure either way | Dispose the context before/independently of the runtime in the stack-overflow path, or catch-and-detach; verify no abort in v1 P9b after repair |
| V-G3-4 | minor | **Async guest code is a silent no-op with success status.** QuickJS pending jobs are never pumped (`executePendingJobs` absent), and microtask/timer globals don't exist (P5: `queueMicrotask`/`setTimeout` typeof 0 — so an async-loop guest can't spin, P6: run completes in 23ms). A `Promise.then`-based script never executes its callbacks and the run reports `succeeded` | A user script written with `async/await` logic runs ONCE per bar up to its awaits and then silently does nothing more, with the run labelled succeeded | Document the synchronous-only subset in the kit README (drop the false "runner pumps between bars" claim at a1 README "Contract decisions"), or implement job pumping under the deadline |
| V-G3-5 | minor | **Runs list silently evicts beyond MAX_RUNS=12** (`scripts.svelte.ts` `[...runs, run].slice(-MAX_RUNS)`) while the UI headline says "Runs (immutable)" | After the 13th run the oldest disappears without notice | Raise/bound the label ("last 12 runs kept") or make eviction visible |
| V-G3-6 | informational | F-1's carried wording "semantically identical" is inaccurate: regeneration adds key `horizonBarIndex` (verified live; rest identical). Carry itself stands (upstream of G3) | None at G3 | Amend the F-1 note when the upstream regenerator is touched (post-G3) |
| V-G3-7 | informational | Builder's committed determinism probe (`a1-runtime/probe.mjs` determinism-run-A/B) is partially circular: it injects its OWN seeded `__seededRandom` and pins `Date.now` from the host before asserting identical outputs — it never tested the guest's own `Math.random`/`Date.now` | Evidence did not cover the actual risk | V-G3-1's repair makes the doc claim true; re-probe with guest-native calls |
| V-G3-8 | informational | Dev-mode `optimize-deps` failure (F-G3-1, builder) confirmed as environment-only in my run — I verified against the production preview throughout; not re-triggered | None (preview verified) | Environment cleanup, post-G3 |

## D-004 async persistence on the NEW stores — verifier harness evidence

Live, against the app's own `TxStore` (not a copy):

- **Failed write → refusal + bytes + live state consistent:** forced `Storage.prototype.setItem` throw once → op1 refused (truthful failure family), op2 **re-based and committed** (`v8-d004-fifo-overlap`: committedName == `kb draft v8-b`, UI == bytes, status `saved`). Call order preserved via per-store FIFO (mutate queue) — re-base on last committed state confirmed by the second op landing the changed name rather than composing a phantom.
- Refusal rendering proven for: READ_FAILED (draft save, run store), corrupt-at-load (truthful unreadable state), corrupt `g2.replay.v1` step refusal (v7), and READ_NOT_ACKNOWLEDGED family exists at kit level (G2-verified).
- Run records are immutable under draft edits (byte-identical, v4) and unchanged across a fresh session run-append (v6 identity continuity).

## Scope audit (`git diff c480934..HEAD`)

- Changed paths: `packages/trading-kit/**` (contracts + tests + committed tarball), `host/**` (ScriptsIsland, scripts store, replay/page glue), `docs/evidence/G3/**`, and status reconciliation in AGENTS/STAGES/STATE/HANDOFF/DECISIONS — **everything within the accepted "In-scope paths"** of the G3 record. No G4+ scope, no engine integration, no publication, no live/account/order pathway, no editing of accepted pack product documents beyond status notes the record permits.
- Secrets scan of the full diff: clean (only normative rule text uses the word "secret"). No credentials anywhere; NT evaluation artifacts contain no credentials; no real orders; nothing published.

## Reproduction commands (all verified by this verifier)

```bash
# 0 — provenance
git rev-parse HEAD                        # 685d769e02df94e73e0033e6a03f1fe72210d211
git status                                # clean before verifier evidence

# 1 — kit suite (18/18)
cd packages/trading-kit && npm run build && node --test test/g3.test.mjs

# 2 — verifier's own sandbox probes (Node)          → verifier/v1-probe-results.json
node docs/evidence/G3/verifier/v1-sandbox-probes.mjs
#    single-probe isolations used in analysis:
#      /tmp/gc-iso2.mjs (P9b abort), /tmp/gc-poison.mjs (module survives abort)

# 3 — verifier's own poison oracle + variants       → verifier/v2-poison-verify-results.json
node docs/evidence/G3/verifier/v2-poison-verify.mjs

# 4 — verifier's own hand-fixture re-derivation     → verifier/v3-hand-derive-results.json
node docs/evidence/G3/verifier/v3-hand-derive.mjs

# 5 — host checks
cd host && npm run check && npm run build

# 6 — production preview + browser harnesses
#     (server started detached: PORT=5199 node build/index.js)
node docs/evidence/G3/verifier/v4-browser.mjs       # W2/W5 core, identity, immutability, refusals  → v4-browser-results.json
node docs/evidence/G3/verifier/v5-browser-continue.mjs  # corrupt-reload honesty, narrow, W3 sweep   → v5-browser-results.json
node docs/evidence/G3/verifier/v6-browser-final.mjs     # runs-refusal w/ draft, identity across session, keyboard, plot pane → v6-browser-results.json
node docs/evidence/G3/verifier/v7-browser-final.mjs     # W1 regression, W3 level click stamps, F-AVC-1, F-3 → v7-browser-results.json
node docs/evidence/G3/verifier/v8-browser-final.mjs     # keyboard Enter-run, D-004 FIFO overlap     → v8-browser-results.json

# 7 — pack reproduction + independent consumer
cd packages/trading-kit && npm pack --pack-destination /tmp && sha512sum /tmp/vict-trading-trading-kit-0.2.0.tgz
sha512sum docs/evidence/G3/kit-0.2.0.tgz packages/trading-kit/vict-trading-trading-kit-0.2.0.tgz
cd C:/Users/RZ1/Desktop/RZ/g3-verifier-consumer && node verifier-consumer-test.mjs

# 8 — audits
#   import audit + simulated-only: grep over packages/trading-kit/src, packages/chart-workspace/src, host/src (clean; shown above)
#   scope + secrets: git diff c480934..HEAD --name-only; diff | grep token/key/secret (clean)

# 9 — F-1 live reproduction
node docs/evidence/G2/fixture/generate.mjs && git status --short   # one-file spurious diff; RESTORE: git checkout -- host/src/lib/fixtures/g2-fixture.json
```

## Artifacts (this verifier's own, under `docs/evidence/G3/verifier/`)

- `v1-sandbox-probes.mjs` + `v1-probe-results.json` — 16 independent probes (Node, through the shipped runtime + `runBacktest`)
- `v2-poison-verify.mjs` + `v2-poison-verify-results.json` — criterion-7 rerun: own oracle (different structure), per-bar equality, own variants C/D/G incl. mid-horizon mutation
- `v3-hand-derive.mjs` + `v3-hand-derive-results.json` — independent re-derivation of all 6 fills/equity/stats/SMA from raw bars
- `v4-browser*.mjs/json` + `v4-shot-0*.png` — W2/W5, identity, immutability, refusal scripts-key
- `v5-browser-continue.*` + shots — corrupt-reload honesty, narrow 768/375, W3 sweep (entry/step/tf/gaps/hidden/restore/return)
- `v6-browser-final.*` + shots — runs-key refusal with draft, identity across fresh session, keyboard walk, plot-pane geometry
- `v7-browser-final.*` + shots — W1 regression (fresh profile), W3 level creation with stamps, provenance-unknown hidden, F-AVC-1, F-3 footer
- `v8-browser-final.*` — keyboard Enter-run, D-004 FIFO overlap with forced write failure
- `verifier-consumer-test.mjs` results copied to `consumer-verifier-results.json` (results also at `C:/Users/RZ1/Desktop/RZ/g3-verifier-consumer-verifier-results.json` outside the repo)
- Fresh pack digest recorded from `/tmp/vict-trading-trading-kit-0.2.0.tgz` (matches both committed tarballs)

## Lineage

- Base (G3 acceptance): `c480934aa14991139de87d4d19ba65a4af868802` → candidate: `685d769e02df94e73e0033e6a03f1fe72210d211` (HEAD == origin/main at verification; tree clean apart from this verifier's own evidence, committed in a separate verifier commit that touches `docs/evidence/G3/verifier/**` only).
- Diff summary: kit G3 contracts (identity/script/sandbox/runner/types/tests/tarballs), host scripts island + store, evidence bundle, decision records D-005/D-006.
- Builder findings acknowledged and re-bounded: F-G3-1 (environment, preview verified), F-G3-2 (superseded by the pane ruling — it is a criterion-2 FAIL, not a note), F-G3-3 (RELEASE_SYNC pitfall — consistent), F-G3-4 (line numbers — stands).
- Not demonstrated by this verifier (with the command that would demonstrate it): **none skipped** — the full required list was executed; the only narrowed item is a *re-run of the NautilusTrader local evaluation* (research-only, owner chose neither in D-006; the recorded NT evidence files were inspected, not re-executed — command would be `C:/Users/RZ1/Desktop/RZ/g3-nt-eval/Scripts/python.exe docs/evidence/G3/selection/a2-engines/nt_eval2.py`).

## Verdict rationale

EVALUATION.md **FAIL** = "a required behavior contradicts observed evidence." Observed: (i) bit-DIFFERENT results for identical inputs via the public API (criterion 5's core promise, also a named stop condition); (ii) plots/signals not rendered on the chart (criterion 2's explicit placement, ruled FAIL on the criterion itself per D-006). Everything else — sandbox containment and limits, poison isolation (amended), fill/cost exactness, persistence/D-004 semantics, packaging with independent consumer, W1/W2/W3/W5 in a real browser at all widths with键盘-free console errors and keyboard access — passed independent falsification, several beyond the builder's evidence depth. The stage is recoverable by two precisely bounded repairs in already-authorized scope; verdict **FAIL at `685d769…` until those repairs are made and re-verified at a new SHA.**

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "This report + committed verifier evidence: verdict FAIL with claim matrix (criteria 1-12), reproduction commands, artifacts (v1-v8 harnesses + results + screenshots), findings with severity, and the pane-ruling and pack-sha512/own-consumer checks"
    }
  ],
  "changedFiles": [
    "docs/evidence/G3/verifier-report-G3.md",
    "docs/evidence/G3/verifier/v1-sandbox-probes.mjs",
    "docs/evidence/G3/verifier/v1-probe-results.json",
    "docs/evidence/G3/verifier/v2-poison-verify.mjs",
    "docs/evidence/G3/verifier/v2-poison-verify-results.json",
    "docs/evidence/G3/verifier/v3-hand-derive.mjs",
    "docs/evidence/G3/verifier/v3-hand-derive-results.json",
    "docs/evidence/G3/verifier/v4-browser.mjs",
    "docs/evidence/G3/verifier/v4-browser-results.json",
    "docs/evidence/G3/verifier/v4-browser-runlog.txt",
    "docs/evidence/G3/verifier/v4-shot-01-w2-reopen.png",
    "docs/evidence/G3/verifier/v4-shot-02-runs.png",
    "docs/evidence/G3/verifier/v4-shot-03-refusal-scripts.png",
    "docs/evidence/G3/verifier/v4-shot-05-narrow-768.png",
    "docs/evidence/G3/verifier/v4-shot-06-narrow-375.png",
    "docs/evidence/G3/verifier/v5-browser-continue.mjs",
    "docs/evidence/G3/verifier/v5-browser-results.json",
    "docs/evidence/G3/verifier/v5-browser-runlog.txt",
    "docs/evidence/G3/verifier/v5-shot-01-runs-refusal.png",
    "docs/evidence/G3/verifier/v5-shot-02-768.png",
    "docs/evidence/G3/verifier/v5-shot-03-375.png",
    "docs/evidence/G3/verifier/v5-shot-05-w3-replay-4h.png",
    "docs/evidence/G3/verifier/v6-browser-final.mjs",
    "docs/evidence/G3/verifier/v6-browser-results.json",
    "docs/evidence/G3/verifier/v6-browser-runlog.txt",
    "docs/evidence/G3/verifier/v6-shot-01-runs-refusal.png",
    "docs/evidence/G3/verifier/v6-shot-02-fresh-session.png",
    "docs/evidence/G3/verifier/v6-shot-03-768.png",
    "docs/evidence/G3/verifier/v6-shot-04-375.png",
    "docs/evidence/G3/verifier/v6-shot-05-w1.png",
    "docs/evidence/G3/verifier/v7-browser-final.mjs",
    "docs/evidence/G3/verifier/v7-browser-results.json",
    "docs/evidence/G3/verifier/v7-browser-runlog.txt",
    "docs/evidence/G3/verifier/v7-shot-01-w1.png",
    "docs/evidence/G3/verifier/v7-shot-02-w3-level.png",
    "docs/evidence/G3/verifier/v7-shot-03-hidden.png",
    "docs/evidence/G3/verifier/v7-shot-04-favc1.png",
    "docs/evidence/G3/verifier/v7-shot-05-keyboard.png",
    "docs/evidence/G3/verifier/v7-shot-06-d004.png",
    "docs/evidence/G3/verifier/v8-browser-final.mjs",
    "docs/evidence/G3/verifier/v8-browser-results.json",
    "docs/evidence/G3/verifier/v8-browser-runlog.txt",
    "docs/evidence/G3/verifier/consumer-verifier-results.json",
    "docs/evidence/G3/verifier/pack-sha512-verified.txt"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    { "command": "node --test packages/trading-kit/test/g3.test.mjs (after tsc build)", "result": "passed", "summary": "18/18 kit tests incl. hand-fixture exactness" },
    { "command": "node docs/evidence/G3/verifier/v1-sandbox-probes.mjs", "result": "passed", "summary": "16 own probes; containment/limits hold; determinism falsified (P3/P4)" },
    { "command": "node docs/evidence/G3/verifier/v2-poison-verify.mjs", "result": "passed", "summary": "criterion-7 own-oracle: potency + isolation + mid-horizon + gaps all PASS" },
    { "command": "node docs/evidence/G3/verifier/v3-hand-derive.mjs", "result": "passed", "summary": "6 fills/equity/stats re-derived independently; exact match" },
    { "command": "node docs/evidence/G3/verifier/v4..v8-browser*.mjs (production preview :5199)", "result": "passed", "summary": "W2/W5, identity, immutability, refusals+F-C2-2/F-AVC-1/F-3, keyboard Enter-run, D-004 FIFO overlap, narrow 768/375, W1+W3 regressions" },
    { "command": "npm pack + sha512sum (kit tarball)", "result": "passed", "summary": "a6d4b02a…01cb matches both committed tarballs; own outside-monorepo consumer passes determinism/flip/cap/refusal/globals/simulated" },
    { "command": "git diff c480934..HEAD audits + grep secrets/network", "result": "passed", "summary": "scope within accepted paths; no prohibited work; no secrets; import audit clean; F-1 reproduced (carry holds, wording amended)" }
  ],
  "validationOutput": [
    "Verdict: FAIL at 685d769e02df94e73e0033e6a03f1fe72210d211 — criterion 5 (non-reproducible identical-input runs when guest uses Math.random/Date.now; docs claim otherwise) and criterion 2 placement (pane, not chart; owner-mandated ruling: FAIL) — all other criteria independently PASS",
    "18/18 kit tests; 3-way tarball sha512 identity; consumer outside monorepo all checks pass; D-004 FIFO overlap verified live"
  ],
  "residualRisks": [
    "Vite dev-mode optimize-deps corruption (F-G3-1) remains environment-only; all browser evidence is from the production preview",
    "MAX_RUNS=12 silent eviction of oldest completed run (V-G3-5)",
    "QuickJS GC assertion abort prints on stack-overflow dispose (V-G3-3); subsequent runs verified unaffected on this machine",
    "stable-0.4.0 VICT recheck and bundle-delta remain open carries (unchanged, not G3 scope)"
  ],
  "noStagedFiles": true,
  "diffSummary": "verifier evidence + report only (docs/evidence/G3/**); no product code touched; working tree restored after F-1 regeneration test",
  "reviewFindings": [
    "blocker: packages/trading-kit/src/sandbox/quickjs.ts — guest Math.random/Date.now not replaced/pinned despite script.ts:14-15 + a1 README claiming so; identical-input runs bit-differ (stop condition)",
    "blocker: host/src/lib/islands/ScriptsIsland.svelte.plotPoints — index-scaled SVG pane instead of on-chart plots/signals; criterion-2 placement FAIL (D-006 ruling)",
    "minor: quickjs.ts stack-overflow dispose path triggers QuickJS gc_obj_list assertion abort (stderr); classification and subsequent runs unaffected",
    "minor: scripts.svelte.ts run store evicts oldest run beyond MAX_RUNS=12 despite 'immutable' headline",
    "informational: a1-runtime/probe.mjs determinism check is circular (host-injected PRNG/date); a1 README 'runner pumps pending jobs' claim is false (microtasks never drained)"
  ],
  "manualNotes": "Pane-rule API shape for the D-006-pre-authorized extension recorded in the report (addOverlay/addHandle with setData/setMarkers on price or sub pane over lightweight-charts 5 native series/panes; app maps capped run bars; R4 preserved). NT evaluation re-run out of verification scope (D-006 chose neither; recorded evidence files inspected, not re-executed — marked as such rather than verified)."
}
```
---

# ADDENDUM — remediation re-verification (fresh verifier, same verifier session lineage)

**Candidate re-tested:** `ce8f875fbc29e3383bdb097f5af0836eb216cddd` (HEAD == origin/main; repair commits `5400a45` + `ce8f875` on top of the FAIL verdict at `685d769…`). Per EVALUATION.md, the verifier reran the CHANGED behaviors with its own evidence; original report above is preserved unchanged.

## Re-verification results — the two FAIL findings

### 1. Criterion 5 (determinism) — repair partially effective; criterion **STILL FAIL**

Verified PASS limbs (my own harness `verifier/v10-det.mjs`, results `v10-det-results.json`):

- `r1` — my original failing case (`order size = 1 + Math.random()` at bar 3, two identical runs): sizes now bit-identical (`1.1353659911546856` twice) — Math.random replacement real, seeded deterministically from scriptSource+inputs.
- `r2/r3` — guest `Date.now()` inside onBar returns the CURRENT BAR's market close in ms exactly (`1800003600000` = bar-3 close; unique per-bar delta of exactly 900000 ms across all bars).
- `r4` — guest shadowing `Date.now` mid-run cannot import nondeterminism (results bit-identical).
- `r7` — 50 consecutive Math.random draws identical across runs.

**Still falsified (new evidence):**

- `r5` — **`new Date().getTime()` inside onBar reads the REAL wall clock**: two identical-input runs produce `5096336` vs `5096359` (ms mod 1e7) — differing results. The repair pins `Date.now` and `Math.random` but NOT the `Date` constructor (QuickJS core reads the host clock internally); `String(Date())` also reaches the real clock/date. Two identical inputs still yield bit-different results for any script using `new Date()` — criterion 5's bit-identity requirement is still contradicted, and the repair commit's claim "guest cannot obtain nondeterminism (contract now true, not just documented)" is falsified by this probe. (Informational: the 2 new kit tests cover Math.random + Date.now but not the Date constructor case.)
- **Kit artifact identity diverged** (packaging-integrity): the repair modified kit sources without bumping the version or refreshing the committed artifact — fresh `npm pack` of the ce8f875 kit source produces sha512 `7661d3972295268136bec994761e87a0c36006054fc0cd9d0481bf2315dfe601` (46,317 B) while BOTH committed `0.2.0` tarballs (`docs/evidence/G3/kit-0.2.0.tgz`, `packages/trading-kit/vict-trading-trading-kit-0.2.0.tgz`) remain `a6d4b02a…01cb` (44,638 B) and, verified by extraction (`tar`+grep), contain **zero** occurrences of `prngSeed`/`pinnedMs` — i.e. the recorded/packed kit artifact does NOT contain the determinism repair; an external consumer installing the recorded 0.2.0 artifact still has the original criterion-5 defect. The `0.2.0` version now names two different byte identities.

### 2. Criterion 2 (placement) — extension real and working; HOST wiring ineffective; criterion **STILL FAIL**

The `@vict-trading/chart-workspace@0.1.1` bounded extension itself is genuine and works, proven by my own consumer **outside the monorepo** (`verifier/v11-chart-consumer.mjs` + `v12-consumer-page.mjs` against a self-bundled page from the COMMITTED artifact; results `v11-chart-consumer-results.json`, screenshots `v11-shot-*.png`, `v12-shot-0*.png`):

- Pack sha512 reproduced: fresh `npm pack` of cw == committed `docs/evidence/G3/chart-workspace-0.1.1.tgz` == **`e4576272c4b73fab693b66a9a9855054706f0d3b7b2ff21c9157be5359a7dcbfde3c02786189ba31553250ce6bf2b1f580b457622eb4714d6b62a68ed072e7a4`**.
- In a real browser page with candles loaded (`controller.setData` contract): `addOverlay({kind:'line',pane:'price'})` renders a line sharing the candle price scale (my 108/103 test lines got price-axis labels on the candle axis, v12-shot-02) and the shared time axis; `pane:'sub'` gives a lower pane with its OWN price scale (4.00 label) sharing the candle time axis (v12-shot-04); `setMarkers` draws arrow/circle markers AT candle times ("sig" arrow over the 19:13 candle); overlapping/out-of-order points are refused without corrupting the series. R4 unchanged (chart-workspace imports nothing from trading-kit — grep clean).
- **Falsified within the extension** (latent): re-adding the same overlay id does NOT replace — it STACKS an orphaned series (v11/v12: one logical id leaves BOTH a magenta 103 line and a cyan 108 line on the candle price scale, v12-shot-02); `removeOverlay` after stacking removes only the newest series and leaves the orphan permanently (v12-shot-03: cyan gone, magenta remains, unremovable). The `OverlaySpec` comment claims "re-adding replaces the handle" — the implementation does not. Latent because the host currently never succeeds in adding data (below), but the moment the host mismatch is fixed, the app inherits this stacking/leak behavior (every effect firing adds series; none are ever removed by the host).

**The host application's use of the extension never renders anything — pixel- and byte-proven:**

- `run.barTimes` is computed from BASE (15m) bars (`scripts.svelte.ts:416`, including the horizon-open bar at `time == horizonInstant`), giving 250 times for the app's `rangeBars=250` run, while the run's plot arrays have RUN-TIMEFRAME length (`sma20: 249`, live-verified via the stored run record — `verifier/v14-alignment-check.mjs`). The equality `times.length === activePlot.length` in `applyOverlays` can therefore NEVER hold for ANY (timeframe, rangeBars) combination (15m off-by-one; 1h/4h structurally impossible), so the code always takes the empty branch: `addOverlay(...)` + `setData([])`.
- Live pixel proof (`verifier/v13-browser.mjs`): `#4ea1ff` (the configured overlay color) pixel count = **0** on every canvas of the workspace chart across THREE consecutive runs (period 20/2/24), while candle colors (#2f9e63: 4511 px, #d05050: 3430 px) are found on the same canvases; screenshot `v13-shot-01-sma20.png` shows the candles with NO SMA trace, despite the run having succeeded and the legend rendering "Plots on chart — run f01f2563d21f (249 bars, 15m, sma20)".
- The repaired candidate REMOVED the previous SVG plot pane (builder suite step asserts `svgPaneRemoved: true`), so script plots and signal markers now render **NOWHERE in the host app** — a regression from "renders in a pane below the chart" (my earlier finding) to "renders nowhere", while the on-chart legend text claims they render. This is simultaneously the criterion-2 render failure and a misleading-state defect.
- Note: the committed browser suite's overlay assertions check the LEGEND text and the absence of the SVG (`overlayLegendFound`/`svgPaneRemoved`) — they do not check that anything is actually drawn, which is why 15/15 passed while the overlay renders nothing.

**Criterion 2 ruling (unchanged, independent):** the accepted criterion requires script series/signals rendered ON the chart. At `ce8f875…` nothing renders at all in the host app. **FAIL** (stricter than the previous placement-FAIL: now the render limb itself fails).

## Rerun of unchanged-but-touching checks (all pass)

- Kit suite: **20/20** (`node --test test/g3.test.mjs` after `tsc` build) — incl. the 2 new determinism tests.
- Host: `npm run check` 0 errors (1 warning); `npm run build` clean; production preview served on :5199 (rebuilt BEFORE serving; server restarted after build).
- Builder's committed full browser suite re-run by me at `ce8f875…` on the new build: **15/15** (identical-input identity `e1a0d7b4944f` ×2, one-input flip, runs immutability, refusal+recovery, W1 level regression, 375/768 overflow 0) — with the overlay-assertion caveat above.
- My own host checks (`v13`): crosshair linkage alive (readout O/H/L/C + time at two probes), console: 1 console error = favicon 404 only; 0 page errors.
- W3 surfaces untouched by the remediation diff (`replay.svelte.ts`, `ChartIslandLWC.svelte` — zero changed lines; `chart-api.ts` only re-exports the new overlay types), so my full W3 verification at `685d769` stands; the suite's replay smoke (`favc1-replay-recovery-clears-stale`: refusal → repaired → truthful recovery status) re-confirmed in the new build.
- Kit artifact identity divergence (V-G3-R4 below): fresh kit pack sha512 7661d397… vs recorded a6d4b02a… — verified live.
- cw pack sha512 verified live: fresh npm pack == committed artifact == e4567272… (full value in section 1).

## Carry-over findings status from the original report

- V-G3-3 (QuickJS GC abort after stack exhaustion): unchanged code path — not re-tested here; still recorded.
- V-G3-4 (async silent no-op / false README pumping claim): unchanged (`executePendingJobs` still absent) — still carried.
- V-G3-5 (MAX_RUNS=12 silent eviction): unchanged code — still carried.
- V-G3-6 (F-1 wording): unchanged.
- New findings this cycle:

| ID | Severity | Finding |
|---|---|---|
| V-G3-R1 | **blocker (stage)** | Host overlay wiring dead: `runTimesFor`/`barTimes` (base-bar times incl. the horizon-open bar at time == horizonInstant) never equals run-plot length (live: 250 vs 249) => `setData([])` always => plots/signals render nowhere in the host; the on-chart legend text renders regardless (misleading state). Evidence: v13 pixel scans (0 blue px on 3 runs; candles present), v14 alignment check, v13-shot-01 screenshot. Fix shape (stage manager): compute barTimes from the RUN's own run-bar times (align with kit `assumptions.barsInRun`), or have the kit record run-bar times in the BacktestResult |
| V-G3-R2 | **blocker (stage)** | Determinism contract still breakable via `new Date()` / `String(Date())` (real wall clock; r5 evidence). Fix shape: route the whole Date constructor/`getTime`/`getUTC*` surface through the per-bar `pinTime` value, or freeze Date construction; add a kit test for the constructor path |
| V-G3-R3 | blocker-adjacent (must fix with R1) | cw `addOverlay` same-id re-add STACKS an orphaned series (pixel-proven: both 103 and 108 lines visible from one logical id); `removeOverlay` leaves the orphan unremovable; host never calls `removeOverlay` and adds TWO empty overlays per effect firing (ScriptsIsland lines 48/55). Fix shape: `addOverlay` must replace (remove existing same-id series) before adding; host holds handles and removes before re-add |
| V-G3-R4 | minor (packaging) | Kit source changed at ce8f875 without version bump or artifact refresh: the committed 0.2.0 tarballs no longer correspond to the candidate's kit bytes (a6d4b02a vs fresh-pack 7661d397) and the packed artifact the evidence records does NOT contain the determinism repair (extraction grep: zero prngSeed/pinnedMs). Fix: bump the version (0.2.1) or re-record + refresh the committed artifact at the next candidate |

## ADDENDUM VERDICT: **FAIL** at `ce8f875fbc29e3383bdb097f5af0836eb216cddd`

Both originally-FAIL criteria remain contradicted: criterion 5 (nondeterminism still reachable via the Date constructor inside the guest; the packed kit artifact still lacks even the partial repair) and criterion 2 (the on-chart overlay is dead code in the host — nothing renders anywhere now that the SVG pane was removed — rendering regressed from pane to nothing; legend text claims renders that do not occur). Additionally the extension carries a latent stacking/orphan-series defect and the kit artifact identity diverged at fixed version 0.2.0. All other criteria remain PASS (rerun confirmed, incl. committed suite 15/15, kit 20/20, host check+build clean). Defects precisely identified with fix shapes; verifier repaired nothing. Path forward per D-005/D-006: repair + fresh re-verification at a new SHA.

**Reproduction for this addendum (all verified run):**

```bash
git rev-parse HEAD            # ce8f875fbc29e3383bdb097f5af0836eb216cddd
cd packages/trading-kit && npm run build && node --test test/g3.test.mjs   # 20/20
node docs/evidence/G3/verifier/v10-det.mjs          # criterion-5: r1-r4/r7 pass; r5 FAILS (new Date())
node docs/evidence/G3/verifier/v14-alignment-check.mjs   # barTimesLen 250 vs sma20 249 (overlay dead code)
cd host && npm run check && npm run build; then restart :5199 preview
node docs/evidence/G3/browser-verify.mjs            # committed suite 15/15 (legend-text overlay assertions)
node docs/evidence/G3/verifier/v13-browser.mjs      # pixel probe: blue overlay 0 px x3 runs; candles found
cd packages/chart-workspace && npm pack + sha512sum == e4567272… (committed artifact matches)
node docs/evidence/G3/verifier/v11-chart-consumer.mjs / v12-consumer-page.mjs   # extension consumer proofs + stacking falsification
```

---

# FINAL ADDENDUM — round-3 continuation verification (independent verifier session)

**Candidate tested and verified:** `8a33b00a9bd0c12f7c8a5fc8ebc78ff9e28bb6e6` (HEAD == `origin/main`, verified by `git rev-parse` both; `git fetch` re-run mid-session — no drift). The repair diff under test is `685d769..8a33b00` (round-2 repairs V-G3-R1/R2/R3/R4). This verifier session is independent of the builder; it inherited only UNTRACKED evidence tooling left by a killed prior final instance in `docs/evidence/G3/verifier/` (v15-* harnesses + result files, unfinished v16 harness) — those result files were treated as PRIOR-INSTANCE evidence, RE-RUN ENTIRELY by this session (all results below are this session's own outputs), and the harness files are committed here (v16 completed by this session; nothing in product code touched by the verifier).

## Stage-level FINAL VERDICT: **PASS WITH NON-BLOCKING FINDINGS at `8a33b00a9bd0c12f7c8a5fc8ebc78ff9e28bb6e6`**

Both round-2 blockers are resolved and independently re-broken-attack-tested; no required behavior contradicts evidence; every criterion is demonstrated at a pinned SHA in a real browser or runnable harness. Minor non-blocking findings are listed below and preserved (none repaired, none hidden).

## Round-2 blockers — re-verification (this session's own evidence)

**V-G3-R2 (criterion 5, determinism) — RESOLVED.** My own re-run of the inherited v15 determinism harness at the candidate, all 6 cases: `MR` (guest `Math.random`: several draws × several bars), `DN` (`Date.now()`), `DT` (`new Date().getTime()`), `DS` (`String(Date())` hashed + `Date.parse(String(Date()))` + `Date.parse(new Date().toISOString())`) — in every case two identical-input `runBacktest` runs produce identical identity and bit-identical plots/trades/equity; every time form returns exactly the CURRENT BAR's pinned market close (ms) for all 24 bars (results at `verifier/v15-det-{MR,DN,DT,DS}-results.json`, exit 0). Adversarial extras `M2` (Math.random sizes REAL next-bar-open fills — the round-1 falsification shape: 8 fills, bit-identical incl. sample sizes `1.0037100075278431`, `1.2250308929942548`, …) and `ESC` (Function-constructor Date escape attempt, `performance` probe, `Date.prototype.getTime` on no-arg `new Date`, Date semantics intact) both ALL-OK (`v15-det-{M2,ESC}-results.json`). **Also reproduced end-to-end through the packed 0.2.1 artifact by the independent outside-monorepo consumer (below). The round-2 verdict's own failing probe (`new Date()` wall-clock leak) no longer reproduces.** Carried note: the inherited `MR` script gated orders on `bar.index`, a property the guest bar does NOT expose — its `tradesRunA` is `[]` (the orders silently never fire); this does not weaken the determinism proof (the Math.random plots themselves are asserted bit-identical at every bar, and M2 supplies real, bit-identical fills), but see findings.

**V-G3-R1 + V-G3-R3 (criterion 2, on-chart placement + overlay lifecycle) — RESOLVED; final independent ruling: PASS.** My own browser harness `verifier/v17-browser.mjs` (fresh profile, production preview :5199, build run BEFORE serving) against the live host:

- `v17-run-sma20-on-chart`: inside the workspace chart container itself — **overlay blue (#4ea1ff) pixels = 819**, candle pixels = 7712 (green+red), and the blue trace's vertical band (y 62–205) lies INSIDE the candle band (y 38–382) — the SMA shares the candle PRICE scale/pane. Screenshot `v17-shot-02-sma20.png`: the blue SMA curve hugs the candles and its last-value badge (2647.77, blue) renders on the candle price axis; the legend truthfully reads "Plots on chart — run f01f2563d21f (249 bars, 15m, sma20) · signals as markers at their candle"; the dead-code symptom from round 2 (blue pixels = 0) is GONE (kit now returns authoritative `barTimes` in the run result — `barTimesLen 24 == plotLen 24` verified in my v15 runs — and the host renders from it).
- `v17-crosshair-shared-time-axis`: crosshair readout follows the mouse (`O 2640.31 H 2640.6 L 2639.67 C 2640.04 · 2026-01-27 11:30Z · cursor 2648.09` → different OHLC + timestamp at the second probe, truthful "crosshair off chart" state outside) — shared live time axis, native linkage.
- `v17-stacking-probe-period2`: second run with period=2 → blue pixels 817 → 1219 with a single line's vertical band (replace, not stack; a stacked orphan would roughly double the count). The strict replace/orphan/inert/remove semantics are proven at the extension level by pixel counts through the packed 0.1.2 artifact: `pack-chart-workspace.mjs` → blue 1195 px after add; re-add same id → orphan color gone (0 px) AND replaced color live AND stale handle provably inert (setData through it changes nothing); `removeOverlay` → replacement color 0 px; sub-pane overlay + removal PASS (`consumer-chart-results.json`, screenshot `verifier/cw0312-consumer-overlay.png`).
- `v17-signals-as-markers`: same plot with vs without signals → **marker delta 47 px** for two added markers (575 → 622 blue px); markers land at the plotted key's candle times via `setMarkers` (times[i] = kit barTimes[i], alignment asserted bit-exact in my v15/v16 evidence; screenshot `v17-shot-04-signals.png`). Combined with the pack-consumer marker-at-candle pixel proof (round 2, v12-shot-02) and the round-1-objection resolution, criterion 2 is satisfied ON THE CHART.
- Replay honesty: in W3 replay the scripts legend says "No plot rendered yet — run a backtest · (current-mode chart only; replay charts show their own session)" and **blue pixels in the replay chart = 0 while 14774 candle pixels render** (`v17-shot-05-replay.png`); after Return-to-current the overlay is back (622 px, `v17-shot-06-back-current.png`).
- Legend-truthfulness nuance (recorded): before ANY run the plots block does not exist at all (no claim is displayed — truthful absence); "No plot rendered yet" appears exactly when a run exists but nothing is/draws-applied (e.g. in replay).

## Packaging (criterion 10) — artifact identities re-verified, consumer completed

- sha512 verified by this session: committed `docs/evidence/G3/kit-0.2.1.tgz` == `packages/trading-kit/vict-trading-trading-kit-0.2.1.tgz` == **`12851cb4357103c8f49013899b3a0481b1f077077cdfa60e1a0a6e26278564c8d67555efa648ad38c0c373ec0ee82559bf305b67f84ca6d711f541c4b7e8f4ff`**; fresh `npm pack` reproduced it exactly (`verifier/pack-sha512-round3-verified.txt`). Same for chart-workspace 0.1.2 == **`32e4f929d6d9462f323d2580a400f0276a5cdcaa061acd4475d3f751fe59ae17bb0b37513dda973d62a53d827ecdc73657da782e74443aaa820f4e83a77bf39e`** (fresh pack reproduced). Tarball↔candidate lineage table added: `docs/evidence/G3/README.md` (0.2.0→685d769, 0.2.1→8a33b00; cw 0.1.1→ce8f875, 0.1.2→8a33b00).
- **Independent kit consumer OUTSIDE the monorepo completed** (`verifier/v16-kit-consumer.mjs`, finished + run by this session): installs the packed kit-0.2.1 tarball into `C:/Users/RZ1/Desktop/RZ/g3-v3-verifier-kit-consumer` (import resolved from the consumer's own node_modules, asserted by path); with its OWN synthetic sawtooth data (no repo fixture): two-run bit-identity incl. an entropy-using script (Math.random plots + random-sized orders + Date.now plot + Date() string hash) — PASS with per-bar pinned-Date.now == bar close for every plotted bar (plotLen 119 of 120 bars: the toTime bar is the open bar, honestly not closed); one-input change (period 5→7) flips identity AND results; capped query during a live session (clock advanced into the data; request beyond clock → `capped: true`, 4 bars served, last served close == servedUntil — bounded by the clock, no future leak); one sandbox refusal (`SCRIPT_SYNTAX_ERROR: expecting ';'`) with the failed run's identity preserved; all 24 fills carry `simulated: true`. All checks OK (`v16-kit-consumer-results.json`).
- Kit suite: **22/22** at the candidate (`node --test test/g3.test.mjs` after `tsc` build), incl. the new-Date and barTimes regressions.

## Untouched-but-related spot checks (consolidation evidence)

- **Criterion 7 (poison), FULL sweep re-run at the candidate** — beyond the required spot check: `node docs/evidence/G3/verifier/v2-poison-verify.mjs` exit 0; all 9 rows exact — isolation identical across the committed baseline/alternate pair AND my own variant C at 15m/1h/4h with per-bar oracle match; mid-history-mutation-D invisible at the earlier horizon while naive full-history potency responds (3112.5/3107.25 → 6112.5/6107.25, own variant C 9999/5014.5 — values identical to round 1, confirming reproducibility); own gap shapes: barsInRun == oracle (1995/495/119) with explicit unavailability intervals, none bridged (`v2-poison-verify-results.json` refreshed by this run).
- **Criterion 1 reload limb re-verified** (`verifier/v18-reload.mjs`, `v18b-editor-source.mjs`): draft saved → `g3.scripts.v1` bytes byte-identical after full page reload; draft row restored; opening the restored draft re-shows its exact saved source. Round-1's deeper W2 lifecycle evidence stands (unchanged surfaces; the touched surface re-verified).
- **Criterion 11 narrow widths on the touched ScriptsIsland**: `verifier/v19-narrow.mjs` — horizontal overflow 0 px at 768 AND 375 (screenshots `v19-shot-768.png`, `v19-shot-375.png`); desktop W2/W5 exercised end-to-end in v17; console: 1 benign resource-404 only (favicon, consistent with rounds 1–2), 0 page errors; `host npm run check` 0 errors (1 warning) + `npm run build` clean (run by this session).

## Consolidated claim matrix (criteria 1–12) — with evidence lineage

| # | Criterion | Final verdict | Basis (verifier sessions) |
|---|---|---|---|
| 1 | Free entry + draft lifecycle | PASS | Round 1 at depth (v4: no prerequisite, hide/reopen byte-exact; v6 fresh-session) **+ this session: reload byte-exactness + editor source restore re-run (v18/v18b)** |
| 2 | Plots/signals on chart via capped data | PASS (final ruling, this session) | Capping proven round 1 (capped records, requested/served evidence; poison runs cappedQueryCount>0); placement FAIL at 685d769 and ce8f875 — **now PASS: on-chart overlays sharing candle price scale + time axis + crosshair, markers at candles, truthful legend (v17 pixels + screenshots; pack-consumer replace/orphan/inert/remove pixels)** |
| 3 | Invalid-edit actionability; draft intact; prior version runnable | PASS | Round 1 (v4: SCRIPT_SYNTAX_ERROR rendered, stored failed run, prior run re-runnable; F-G3-4 no-line-numbers stands) — syntax-refusal surfaces also re-proven through the shipped artifact in my v16 consumer |
| 4 | Sandbox boundary + limits + documented subset | PASS (with carried findings) | Round 1's 16-probe pack at depth (containment, OOM/stack/interrupt bounds, authority hijack contained). Touched surfaces = determinism rewiring only; escape re-probed per the DS/ESC cases above (incl. Function-constructor and prototype attacks) — none reach the wall clock |
| 5 | Run identity + pinning + bit-identity | PASS (was FAIL at 685d769, ce8f875) | **This session: all 6 v15 determinism cases + M2/ESC + entropy-using two-run identity through the packed artifact (v16) — bit-identical across Math.random/Date.now/new Date()/Date()-string; one-input flip** |
| 6 | Draft-mutation isolation (no rewrite of completed runs) | PASS | Round 1 (v4 byte-identical runs after draft edit; F-G3-5 MAX_RUNS=12 eviction note stands) — store untouched by the repairs; no re-verification path altered |
| 7 | Future isolation, all TFs + derived (D-005 A1) | PASS | Round 1 beyond depth; **this session: full 9-row sweep re-run at 8a33b00, all exact, potency values reproduce** |
| 8 | Simulated-only authority | PASS | Round 1 import audit + fill `simulated: true`; **this session: import audit re-run clean; all 24 consumer fills simulated:true; no network pathways** |
| 9 | Honest run states | PASS | Round 1 (v4/v5) — surfaces untouched by the repairs except the legend text, re-checked live in v17 (truthful) |
| 10 | Packaging + independent consumer | PASS (was artifact-divergence finding V-G3-R4 at ce8f875) | **This session: kit 0.2.1 + cw 0.1.2 sha512 three-way verified (committed == packages copy == fresh pack), lineage README added, full outside-monorepo consumer completed and passing** |
| 11 | Shared checks (check/build/console/W2/W5 widths/keyboard/W1+W3 regressions) | PASS | Rounds 1–2 at depth (keyboard Enter-run, D-004 FIFO overlap, W1 fresh-profile, W3 full sweep, 15/15 suite at ce8f875); **this session: check+build clean, desktop W2/W5 core live (v17), narrow overflow 0 @768/375 (v19) on the touched surface** |
| 12 | Carried-findings dispositions | EXECUTED | F-AVC-1, F-3, F-C2-2 resolved + verified (round 1, live); F-1 carry judged (wording amended); unchanged here. New carried findings below |

## Findings (round 3; none blocking)

| ID | Severity | Finding | Owner relevance |
|---|---|---|---|
| V-G3-R5 | informational | On-chart legend suffix "signals as markers at their candle" renders even for runs containing ZERO signals (static suffix). No false data is drawn — only wording optimism | Cosmetic; suggest conditional wording at a later cosmetic pass |
| V-G3-R6 | informational | The guest bar passed to `onBar` has NO `.index` property (fields only: time/o/h/l/c by contract of the served bar); scripts must maintain their own counters. Not contradicted by any kit doc (docs never claim `.index`), but round-1's MR probe relied on it and its orders silently never fired (`tradesRunA: []`) — worth one README line about the bar's actual fields | Documentation nicety; no behavioral defect |
| — | carried unchanged | V-G3-3 (QuickJS gc_obj_list stderr abort after stack exhaustion), V-G3-4 (async guest code silent no-op; README pump claim false), V-G3-5 (MAX_RUNS=12 silent eviction), F-G3-1 (dev-mode optimize-deps, environment-only), F-G3-4 (no line numbers on syntax errors), F-1 (upstream regenerator adds `horizonBarIndex`; not consumed by G3) — all still open, bounded, non-blocking; none touched by the repair diff; not re-tested (unchanged surfaces) | Recorded for later stages |

## Not demonstrated / not re-executed (with commands)

- NautilusTrader local evaluation re-run — out of scope (D-006 owner decision: neither; recorded evidence inspected rounds 1–2; command would be `C:/Users/RZ1/Desktop/RZ/g3-nt-eval/Scripts/python.exe docs/evidence/G3/selection/a2-engines/nt_eval2.py`).
- Builder's committed 15/15 browser suite re-run against the 8a33b00 build was NOT repeated by this session (it was re-run at ce8f875; the repair commit's own suite presumably re-ran by the builder, and its 15 steps are superseded for the touched surfaces by my deeper v17 pixel-level checks; the untouched surfaces carry round-1/round-2 evidence). Command if desired: `node docs/evidence/G3/browser-verify.mjs` (requires :5199 preview).

## Reproduction commands (this session, all run)

```bash
git rev-parse HEAD                              # 8a33b00a9bd0c12f7c8a5fc8ebc78ff9e28bb6e6 == origin/main
cd packages/trading-kit && npm run build && node --test test/g3.test.mjs   # 22/22
for c in MR DN DT DS; do node docs/evidence/G3/verifier/v15-det-final.mjs $c; done    # all exit 0
for c in M2 ESC;   do node docs/evidence/G3/verifier/v15-det-extra.mjs $c; done      # all exit 0
node docs/evidence/G3/verifier/v16-kit-consumer.mjs                  # outside-monorepo consumer, all OK
node docs/evidence/G3/pack-chart-workspace.mjs                       # cw 0.1.2 consumer + pixel checks, PASS
npm pack in packages/trading-kit and packages/chart-workspace         # both digests reproduced (pack-sha512-round3-verified.txt)
cd host && npm run check && npm run build            # 0 errors / clean build; preview :5199 after build
node docs/evidence/G3/verifier/v17-browser.mjs       # criterion-2 on-chart pixel + linkage + signals + replay evidence
node docs/evidence/G3/verifier/v18-reload.mjs && node docs/evidence/G3/verifier/v18b-editor-source.mjs
node docs/evidence/G3/verifier/v2-poison-verify.mjs  # full criterion-7 sweep, 9/9 exact
node docs/evidence/G3/verifier/v19-narrow.mjs        # overflow 0 @ 768/375
```

## Scope audit (`git diff 685d769..8a33b00`)

Changed paths confined to `packages/trading-kit/**`, `packages/chart-workspace/**`, `host/**`, `docs/evidence/G3/**` — all within the accepted G3 in-scope paths; exactly the four round-2 repairs + tests + tarballs + reports; nothing in pack product documents modified. Secrets grep clean (only normative rule text mentions "secret"); no network/live/account/order pathway in the diff; npm publish not performed. Import audit re-run: kit↔chart-workspace independence untouched (kit imports nothing from chart-workspace/app; chart-workspace imports nothing from kit; host composes both via public exports).

## Verdict rationale

Every required criterion is demonstrated with reproducible evidence; both prior FAIL verdicts' contradictions were re-attacked with fresh harnesses and no longer reproduce; negative cases (escape attempts, stacking, replay drawing, future leaks, artifact substitution) all fail to break the candidate. OPEN findings exist but are minor, bounded, and carried with dispositions. Per EVALUATION.md: **PASS WITH NON-BLOCKING FINDINGS at `8a33b00a9bd0c12f7c8a5fc8ebc78ff9e28bb6e6`.** STATE.md's G3 status line updated by this verdict; all prior red evidence and verdicts preserved intact.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "This addendum: consolidated criteria-1..12 matrix, this session's own re-runs (v15 x6, v16 consumer finished, pack reproductions, v17 on-chart pixel evidence, v18/v18b reload persistence, v2 full poison sweep, v19 narrow), scope audit, final verdict PASS WITH NON-BLOCKING FINDINGS at 8a33b00"
    }
  ],
  "changedFiles": [
    "docs/evidence/G3/README.md",
    "docs/evidence/G3/verifier-report-G3.md",
    "docs/evidence/G3/verifier/v15-det-final.mjs",
    "docs/evidence/G3/verifier/v15-det-extra.mjs",
    "docs/evidence/G3/verifier/v15-det-MR-results.json",
    "docs/evidence/G3/verifier/v15-det-DN-results.json",
    "docs/evidence/G3/verifier/v15-det-DT-results.json",
    "docs/evidence/G3/verifier/v15-det-DS-results.json",
    "docs/evidence/G3/verifier/v15-det-M2-results.json",
    "docs/evidence/G3/verifier/v15-det-ESC-results.json",
    "docs/evidence/G3/verifier/v16-kit-consumer.mjs",
    "docs/evidence/G3/verifier/v16-kit-consumer-results.json",
    "docs/evidence/G3/verifier/pack-sha512-round3-verified.txt",
    "docs/evidence/G3/verifier/v17-browser.mjs",
    "docs/evidence/G3/verifier/v17-browser-results.json",
    "docs/evidence/G3/verifier/v17-shot-01-initial.png",
    "docs/evidence/G3/verifier/v17-shot-02-sma20.png",
    "docs/evidence/G3/verifier/v17-shot-03-period2.png",
    "docs/evidence/G3/verifier/v17-shot-04-signals.png",
    "docs/evidence/G3/verifier/v17-shot-05-replay.png",
    "docs/evidence/G3/verifier/v17-shot-06-back-current.png",
    "docs/evidence/G3/verifier/v18-reload.mjs",
    "docs/evidence/G3/verifier/v18-reload-results.json",
    "docs/evidence/G3/verifier/v18b-editor-source.mjs",
    "docs/evidence/G3/verifier/v18b-editor-source-results.json",
    "docs/evidence/G3/verifier/v19-narrow.mjs",
    "docs/evidence/G3/verifier/v19-narrow-results.json",
    "docs/evidence/G3/verifier/v19-shot-768.png",
    "docs/evidence/G3/verifier/v19-shot-375.png",
    "docs/evidence/G3/verifier/v2-poison-verify-results.json",
    "docs/evidence/G3/verifier/cw0312-consumer-overlay.png",
    "docs/STATE.md"
  ],
  "testsAddedOrUpdated": [
    "packages/trading-kit/test/g3.test.mjs (pre-existing; re-run 22/22 at the candidate)"
  ],
  "commandsRun": [
    { "command": "sha512sum both tarball pairs + fresh npm pack x2", "result": "passed", "summary": "kit-0.2.1 == 12851cb4…, cw-0.1.2 == 32e4f929…, fresh packs reproduce both exactly" },
    { "command": "node v15-det-final.mjs {MR,DN,DT,DS} + v15-det-extra.mjs {M2,ESC}", "result": "passed", "summary": "all 6 determinism cases ALL_OK (reproducible by this session)" },
    { "command": "node docs/evidence/G3/verifier/v16-kit-consumer.mjs", "result": "passed", "summary": "outside-monorepo kit consumer finished; 9/9 checks incl. entropy forms, flip, capped slice, refusal, simulated fills" },
    { "command": "node docs/evidence/G3/pack-chart-workspace.mjs", "result": "passed", "summary": "cw 0.1.2 consumer: same-id replace/orphan-gone/inert/remove + sub-pane, pixel-proven" },
    { "command": "node --test test/g3.test.mjs (kit, after tsc)", "result": "passed", "summary": "22/22 at the candidate" },
    { "command": "node docs/evidence/G3/verifier/v17-browser.mjs", "result": "passed", "summary": "criterion-2 on-chart PASS: 819 blue px in candle band, price-axis badge, crosshair linkage, marker delta 47px, replay draws nothing" },
    { "command": "node docs/evidence/G3/verifier/{v18-reload,v18b-editor-source}.mjs", "result": "passed", "summary": "reload: bytes byte-identical, draft restored, editor reopens with exact source" },
    { "command": "node docs/evidence/G3/verifier/v2-poison-verify.mjs", "result": "passed", "summary": "full criterion-7 sweep at 8a33b00: 9/9 rows exact, potency reproduces round-1 values" },
    { "command": "node docs/evidence/G3/verifier/v19-narrow.mjs + host check/build", "result": "passed", "summary": "overflow 0 @ 768/375 on touched ScriptsIsland; check 0 errors; build clean" }
  ],
  "validationOutput": [
    "FINAL VERDICT: PASS WITH NON-BLOCKING FINDINGS at 8a33b00a9bd0c12f7c8a5fc8ebc78ff9e28bb6e6",
    "Round-2 blockers V-G3-R1/R2/R3/R4 all resolved under fresh falsification; carried findings V-G3-3/-4/-5, F-G3-1/-4, F-1 remain open, bounded, non-blocking"
  ],
  "residualRisks": [
    "V-G3-R5 informational: legend mentions signal markers even when a run has zero signals (cosmetic wording)",
    "V-G3-R6 informational: guest bar exposes no .index field (scripts should use own counters); one README line would prevent the confusion",
    "QuickJS gc_obj_list stderr abort after stack exhaustion (V-G3-3) and async-guest silent no-op (V-G3-4) remain unchanged, bounded, non-blocking",
    "Builder-committed 15-step browser suite not re-run by this session at 8a33b00 (touched surfaces superseded by deeper v17 pixel checks; recorded as such)"
  ],
  "noStagedFiles": true,
  "diffSummary": "docs-only verifier round-3 continuation: adopted+re-ran the killed prior instance's v15 determinism harnesses (all 6 reproduce PASS), finished and ran the v16 outside-monorepo kit consumer on the packed kit-0.2.1 tarball (9/9), ran cw 0.1.2 replace/orphan/inert/remove pixel consumer, own v17/v18/v19 browser evidence, full v2 poison sweep re-run, lineage README, final addendum verdict; no product code touched",
  "reviewFindings": [
    "no blockers — stage-level PASS WITH NON-BLOCKING FINDINGS at 8a33b00a9bd0c12f7c8a5fc8ebc78ff9e28bb6e6",
    "informational: V-G3-R5 legend wording, V-G3-R6 bar-field docs note; carries V-G3-3/-4/-5, F-G3-1/-4, F-1 unchanged"
  ],
  "manualNotes": "Tested SHA 8a33b00a9bd0c12f7c8a5fc8ebc78ff9e28bb6e6 (HEAD == origin/main, no drift after fetch). The killed prior final instance's untracked v15 tooling was adopted, fully re-executed (all results this session's own), and committed; its unfinished v16 was completed (runtime wiring + per-bar pin comparison over closed bars + meaningful capped-slice check) and run. Evidence tooling edits only — product code untouched, nothing published, no orders, preview server stopped after use."
}
```
