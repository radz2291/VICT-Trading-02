# G2 async-persistence challenge — diagnostic probe report

Session date: 2026-09-29. **Diagnostic only: no code changes, no commits, no pushes.** Worktree left exactly as found plus the untracked `ap-*` artifacts listed at the end. Session-owned processes (preview 5263, headless Chrome 9346) stopped after capture.

Baseline: working tree at `497b8a40f3af88dd00aec294238e71f94bbf8ed8` (kit code identical to candidate `db66475…`). Harness: kit-level, independent consumer OUTSIDE the monorepo at `C:/Users/RZ1/Desktop/RZ/g2-ap-consumer` — fresh `npm pack` of `packages/trading-kit`, installed from the artifact path.

## Pack + consumer setup

| item | value |
| --- | --- |
| fresh pack sha256 | `4316c06860fc84c11f30cde7df0ed7d73840d3669d99120243eac06aace9474b` |
| committed tarball (`packages/trading-kit/vict-trading-trading-kit-0.1.0.tgz`) sha256 | identical (`4316c068…`) → fresh pack EQUALS committed artifact |
| kit runtime deps | 0 (npm ls: single direct dep `@vict-trading/trading-kit` file:tgz) |
| fixture | committed `docs/evidence/G2/fixture.json` (XAUUSD 15m, 2023 bars, horizon `1770068700`, T0 `1767571200` = 2026-01-05T00:00Z) |
| harness port semantics | `read()` sync per port contract (throws on demand); `write()` returns a deferred promise whose captured record is recorded at CALL time and whose BYTES commit only at success resolution; `{ok:false}` resolution and rejections leave stored bytes untouched; `remove()` deferred likewise. Probe scripts: `C:/Users/RZ1/Desktop/RZ/g2-ap-consumer/ap-harness.mjs`, `ap-probes.js`, `ap-browser.mjs`. Raw results: `ap-kit-probes-1-4.json`, `ap-browser-results.json`. |

## Probe 1 — PENDING EXPOSURE: what is visible while a persisted write is pending

Sampled synchronously right after issuing without awaiting, and after one microtask. Events subscribed before the call.

| row | op | pre-op live | sample during pending | storage during pending | verdict |
| --- | --- | --- | --- | --- | --- |
| P1-1 | `step(3600)` | instant `1767571200` (00:00Z), step 1, 0 bars | instant **`1767574800` (01:00Z — NEW)**, stepIndex **2 — NEW**, bars slice extended from 0 to **4 bars, last close time `1767573900` — NEW frame served** | still old record: instant `1767571200`, step 1 | **FAIL — uncommitted replay frame + extended data slice exposed live** |
| P1-2 | `createLevel(2700)` | 0 levels | levels **1 (the new drawing, creationStep 1, price 2700)** | stored levelCount 0 | **FAIL — uncommitted drawing exposed live** |
| P1-2b | `createLevel` then write refused | 0 levels | levels 1 visible | stored 0 levels | drawing rolled back after refusal (post-failure state equals pre-op exactly) |
| P1-3 | `play()` | playing false | playing **true** exposed | stored playing false | **FAIL — uncommitted transport flag exposed live** |

Event channel: NO event was emitted during the pending window (event count stayed at 1 = the committed `start`); kit emits only after write success — that part matches "Emit reflects COMMITTED state only".

Microtask sample (P1-1) after one `await Promise.resolve()`: instant still `1767574800`, step 2 — same exposure, not transient even at microtask granularity.

**Probe 1 verdict: FAIL.** The requirement under test ("a pending step must NOT expose an uncommitted replay frame") is violated concretely: synchronously and on microtasks, `clock.now()` returns the NEW instant and `data.bars()` serves the NEW capped slice while the storage record still holds the pre-op state. Root cause in `session.ts`: `step()` executes `this.clock.advance(...)` and `this.stepCounter += 1` BEFORE `await this.persist(...)`, and `createLevel()`/`play()`/`removeLevel()` mutate `this.levels`/`this.playing` likewise. What the code implements is mutate-then-snapshot-rollback-on-failure, not write-first-then-commit.

**Doc/behavior discrepancy found:** the header comment of `session.ts` claims "it persists the NEXT-state record FIRST ... and only on a successful write commits the live state" and "Order in every persisted operation: gate → re-verify → compute next state → persist(next) → commit → emit". The measured order is actually: gate → re-verify → snapshot → **mutate live state** → persist(next) → on failure restore snapshot → on success emit. The docstring describes a write-first-commit model that the code does not implement; rollback on failure is real, but the pending window is exposed. (Comment-vs-behavior mismatch recorded as a finding; deliberately not repaired here.)

**Probe 1 verdict: FAIL (mechanism is rollback-safe but NOT pending-safe).**

## Probe 2 — PENDING → FAILURE

Refuse (`{ok:false}` → kit code `WRITE_REFUSED`) or reject (throw → kit code `PORT_ERROR`) the deferred write after sampling.

| row | op | outcome code | during-pending live | after-failure live | live == pre-op (every field: instant, stepIndex, playing, returnedToCurrent, levels) | stored bytes unchanged | fresh session adopts last successful write |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P2-1 | step (refuse) | WRITE_REFUSED ("no state change") | instant 1767574800/step 2 (exposed, see P1-1) | exactly pre-op `1767571200`/step 1 | TRUE | TRUE | restore ok, record instant `1767571200`, step 1 — correct |
| P2-2 | step (reject) | PORT_ERROR, truthful message | same exposure | exactly pre-op | TRUE | TRUE | same — correct |
| P2-3 | createLevel (refuse) | WRITE_REFUSED | 1 level visible | 0 levels, byte-identical | TRUE | TRUE | same — correct |
| P2-4 | returnToCurrent (refuse) | WRITE_REFUSED | exposed returnedToCurrent=true pre-commit (see P1 exposure class) | returnedToCurrent false, byte-identical | TRUE | TRUE | same — correct |
| P2-5 | removeLevel (refuse) | WRITE_REFUSED | level already hidden live pre-commit (levels 0) | level restored byte-identical | TRUE | TRUE | n/a (same record) |
| P2-6 | reset (removal rejected) | PORT_ERROR ("failed to remove the session record — no state change") | live unchanged at pre-op | unchanged | TRUE | record still present (`instant 1767571200`) | n/a |

**Probe 2 verdict: PASS.** Failed writes are truthful (`WRITE_REFUSED` / `PORT_ERROR`, never silently ok), failure rollback restores every live field exactly, stored bytes never change, and a fresh session from storage adopts exactly the last successful write (pre-op record).

## Probe 3 — OVERLAPPING OPS

Op A issued without awaiting, op B issued immediately after (B starts while A's write is pending). Writes resolved in both orders × three outcome combos (A-s/B-s, A-s/B-f, A-f/B-s). Sequential-by-contract expectation stated per row: if ops are strictly sequential (B issued only after A settles), B's snapshot would include A's COMMITTED state, and a failure can only ever roll back B alone; expected finals: ss → step 3/instant `1767572400`; sf → state after A only; fs → state after B (step 2 for step-step, since A is refused).

| kind | resolve order | combo | op results | final LIVE | final STORAGE | fresh reload | disagreement |
| --- | --- | --- | --- | --- | --- | --- | --- |
| step-step | A-first | s,s | both ok | 2400/step3 | 2400/step3 | 2400/step3 | none — PASS |
| step-step | A-first | s,f | A ok, B WRITE_REFUSED | 1800/step2 | 1800/step2 | 1800/step2 | none — matches sequential "after A"; PASS |
| step-step | A-first | f,s | A WRITE_REFUSED, B ok | **1200/step1** | 2400/step3, stepIndex 3 | 2400/step3 | **FAIL: live regressed to pre-A pre-B (step 1) while B succeeded; reload resurrects B, live disagrees until reload** |
| step-step | B-first | s,s | both ok | 2400/step3 | **1800/step2 (A's older record overwrote B's — last-resolved write wins)** | 1800/step2 | **FAIL: storage lost op B; reload regresses to step2 while live shows step3 — out-of-order adoption** |
| step-step | B-first | s,f | A ok, B refused | 1800/step2 | 1800/step2 | 1800/step2 | none — PASS (coincides with sequential expectation) |
| step-step | B-first | f,s | A refused, B ok | **1200/step1** | 2400/step3 | 2400/step3 | **FAIL: same live/storage/reload divergence as A-first f,s** |
| step-create | A-first | s,s | both ok | 1800/step2, 1 level | 1800/step2, 1 level | 1800/step2 | none — sequential expectation met (step2 + drawing); PASS |
| step-create | A-first | s,f | A ok, B refused | 1800/step2, 0 levels | same | same | none — drawing rolled back correctly; PASS |
| step-create | A-first | f,s | A refused, B ok | **1200/step1, 0 levels** | 1800/step2, **1 level** | 1800/step2, 1 level | **FAIL: live regressed, storage keeps the drawing created on top of a rolled-back step** |
| step-create | B-first | s,s | both ok | 1800/step2, 1 level | 1800/step2, **0 levels** | 1800/step2 | **FAIL: the created drawing is LOST in storage (A's pre-drawing record overwrote B's)** |
| step-create | B-first | s,f | A ok, B refused | 1800/step2, 0 levels | same | same | none — PASS |
| step-create | B-first | f,s | A refused, B ok | **1200/step1, 0 levels** | 1800/step2, 1 level | 1800/step2, 1 level | **FAIL** |

**Probe 3 verdict: FAIL — 6 of 12 rows produce a concrete disagreement.** Three distinct counterexample mechanisms, all reproducible with exact values above:

1. Lost/resurrected ops: with both writes successful but resolved B-before-A, the LAST resolved write overwrites the record with the OLDER state; fresh reload adopts it and a committed op silently disappears from storage (step-step B-first s,s; step-create B-first s,s — drawing lost).
2. Live/storage divergence after a failure on top of an uncommitted op (every f,s row): A's failure rolls the clock back under B's feet; live ends at a state BELOW B's snapshot origin while storage holds B's post-A record; reload resurrects the op that live already (from the user's view) discarded.
3. The kit has no serialization queue for overlapping awaited ops — correct only if the consumer guarantees sequential issue; the port contract does not impose that.

## Probe 4 — OTHER PERSISTED MUTATIONS

| op | pending-window exposure | failure rollback | bytes | reload | verdict |
| --- | --- | --- | --- | --- | --- |
| createLevel | drawing visible pre-commit (P1-2/2b) | exact rollback | untouched | adopts last successful write | exposure FAIL (probe-1 class), rollback PASS |
| removeLevel | removal visible pre-commit (level hidden while write pending) | exact rollback (level returns) | untouched | n/a | exposure FAIL class, rollback PASS |
| update(note) | **NOT APPLICABLE / NOT DEMONSTRATED** — the kit exposes no note-update operation; `ReplayLevel` notes are only written via `createLevel`. A note mutation would be a consumer-side record rewrite, which the kit's session does not own. | — | — | — | NOT DEMONSTRATED (no kit surface exists to probe) |
| returnToCurrent | ended-flag exposed pre-commit | exact rollback | untouched | adopts last successful write | exposure FAIL class, rollback PASS |
| reset (removal) | live unchanged while removal pending | port rejection → PORT_ERROR, live unchanged, record kept | correct | correct | PASS |
| restore | pending window shows the PRE-restore state (correct: restore writes first, adopts only on success) | refused write → WRITE_REFUSED, live byte-identical, stored record intact | untouched | correct | PASS |

**Probe 4 verdict: MIXED — restore/reset/failure semantics PASS; create/remove/returnToCurrent share probe 1's pending-exposure FAIL; note-update has no kit surface (NOT DEMONSTRATED).**

## Probe 5 — APP PATH (bounded browser)

ONE headless Chrome (own debug port 9346, temp profile), app served by a FRESH production build of the baseline tree via `vite preview --port 5263 --strictPort` (own server, stopped after capture). Per-step 15 s race caps, total well under 480 s. All steps completed first-try except none. Console during the whole run: a single 404 for `/favicon.ico` (benign, pre-existing, unrelated to replay); no replay-related errors/warnings/pageserrors.

| item | observation | verdict |
| --- | --- | --- |
| enter replay + step (settled consistency) | screen `step 2 · instant 2026-01-05 00:15Z` vs stored instant `1767572100`, stepIndex 2 — consistent | PASS |
| rapid double-Step (second click BEFORE the first settles) | sync phase right after click 1: storage already committed step 3 (`1767573000`) while screen shows step 2 (screen updates after await — storage momentarily ahead, not an uncommitted-frame flash); at 30 ms: storage step 4 `1767573900`, screen `step 4 · 00:45Z`; settled: storage step 4 `1767573900` == screen step 4 — no lost/duplicated step, final screen == storage consistent | PASS (as observed) |
| Play with fast ticks (sampled at ~120 ms, 8 samples) | every sample: stored stepIndex <= screen step and equal in all except transient sub-sample updates; `storedBehindScreen` never true — screen never shows an instant whose write is missing from storage; settled `step 3 · 00:30Z` == storage step 3 | PASS (as observed) |
| uncommitted-frame flash | NOT OBSERVED within the sampling cadences used (30 ms mid-flight, 120 ms during play). Storage in the app path is synchronous-fast (localStorage + read-back verify), and each click is issued through an awaited async handler, so the race window is far below the sampling floor. Cannot be ruled out for slower ports — that is exactly the failing condition of probes 3/1; NOT DEMONSTRATED as an app-visible flash. | NOT DEMONSTRATED |
| screenshots | `ap-browser-01-entered.png`, `ap-browser-02-double-step.png`, `ap-browser-03-play.png` | captured |

Note this is CONSISTENT with probe 3's FAILs, not a contradiction: the app's double-click does not hit the failure/overlap divergence because (a) both writes succeed and each `write()`'s read-back is effectively synchronous before the next op's re-verify, and (b) the app awaits each handler (`void`-wrapped but serialized by the button flow in the observed runs). The divergence appears when writes actually fail or resolve out of order — conditions the browser run could not ethically induce without changing app code (out of scope for a diagnostic).

## Overall verdict

| probe | verdict |
| --- | --- |
| 1 pending exposure | **FAIL** — pending step/create/play expose UNCOMMITTED live state (new instant, new step index, new bars slice, new drawing, playing flag) while storage holds the old state |
| 2 pending→failure | **PASS** — truthful codes, exact rollback, bytes untouched, correct fresh adoption |
| 3 overlapping ops | **FAIL** — 6/12 rows: lost op in storage (regressed record, drawing lost), live/reload resurrection, out-of-order last-write-wins |
| 4 other persisted mutations | **MIXED** — restore/reset/rollback PASS; create/remove/returnToCurrent share the probe-1 class exposure; note-update NOT DEMONSTRATED (no kit op exists) |
| 5 app path | **PASS as observed** — settled consistency everywhere; no uncommitted-frame flash observed at the used sampling cadence; NOT DEMONSTRATED as an absolute (sub-cadence race window cannot be captured without code changes) |

Summary: the kit's transactional failure handling (probes 2, 4, and the sf success+failure rows) is genuinely safe — truthful outcome codes, exact rollback, untouched bytes. The two FAILs are (a) the pending window: live state mutates BEFORE the write resolves, exposing uncommitted frames/drawings/flags (contradicting both the "must NOT expose an uncommitted replay frame" requirement AND the kit's own documented write-first order), and (b) overlapping awaited ops: no serialization, producing concrete lost-op / resurrected-op / out-of-order-adoption counterexamples when a write fails under another pending op or when writes resolve out of issue order. All FAILs reproduce at exactly the pinned values recorded in `ap-kit-probes-1-4.json`.

## Requirements NOT demonstrated / not applicable

- Probe 1 pending-window drawing exposure was demonstrated kit-level only (no browser-level pending window exists with the app's synchronous-fast storage).
- Note-level drawing mutation (update of `note`): no kit operation exists; not demonstrated (consumer-side concern).
- App-visible uncommitted-frame flash: not observed and cannot be fully ruled out at sub-cadence granularity without a slow-storage injection that would require changing app code (out of scope).
- Probe 5 was executed against a fresh production build (`vite preview`) served from the baseline tree, matching the established verifier pattern. One environment note: a `vite dev` server on this machine failed hydration due to a corrupted pre-bundle of `@victframework/ui-svelte` (esbuild "xport interface ... Unexpected token"); deleting `host/node_modules/.vite` (a cache, regenerated automatically, NOT source) did not restore dev-mode hydration — production preview works and was used. Source files are intact; `git status` shows only the new `ap-*` artifacts.