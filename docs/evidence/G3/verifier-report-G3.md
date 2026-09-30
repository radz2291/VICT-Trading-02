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