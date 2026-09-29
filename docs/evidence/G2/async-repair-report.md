# G2 async-persistence REPAIR — report (repair cycle `ar-*`)

**Task:** kit-level smallest-correct repair of the independently reproduced async-persistence failures (baseline `cb9ae91813d93bdea285c9f5c7d7634277f6a4a0`, clean tree at start; kit code == `db66475`). Owner requirement verbatim: *"A pending or failed step must not expose an uncommitted replay frame or leave storage and live state disagreeing. Apply the same reasoning to other persisted mutations that share the mechanism."*
**No commits made.** Changed files: `packages/trading-kit/src/session.ts`, `packages/trading-kit/README.md`, plus refreshed packed tarballs and new `ar-*` evidence. Fix A (availability) untouched.

## Repair implemented (spec items 1–6)

All in `packages/trading-kit/src/session.ts` (host needs ZERO changes — verified below):

1. **FIFO serialization** — new private `queue: Promise<void>` + `enqueue()`; every persisted op (`start`, `step`, `play`, `pause`, `createLevel`, `removeLevel`, `returnToCurrent`, `restore`, `reset`) enqueues its full body on the per-session promise chain in CALL order; the op executes only after the previous op settles. Guarantee is per-session-instance (documented).
2. **Commit strictly after own write resolves** — every persisted op runs through `persistViaRecord(draft, emit)`: at EXECUTION time it snapshots, drafts the mutation, captures the full next record (`recordFromLive()`), and restores back to the pre-op committed state — all synchronously (one op slice, no await in the window) — then `await persist(next)`; on success the identical `draft` closure re-applies the mutation (COMMIT) and the event is emitted; on failure nothing was ever mutated. `persist(record)` now takes the explicit next-state record (the old built-from-live fallback was removed). Truthful codes unchanged (`WRITE_REFUSED` / `PORT_ERROR`); no new codes.
3. **Execution-time re-base (explicit non-composition)** — next-state computed at execution time means an op queued behind a FAILED op re-bases on the pre-op committed state. Documented in README + session.ts header/docstrings.
4. **Queued-behind-reset** — reset joins the same queue; queued ops re-base on the post-reset cleared counters and pass through the SAME existing gates (no new invalidation mechanism). Documented.
5. **Events** — emitted only post-commit; FIFO ⇒ call order == commit order == event order; failures emit nothing (verified).
6. **Docstrings** — `session.ts` header + `persist` docstring now state the real order: enqueue → gate → re-verify → validate → draft+capture → restore → persist(next) → commit → emit; restore()/reset() join the queue.

`restore()` and `reset()` keep their existing write-first semantics (industrially verified pre-repair) and now go through the same queue; `restore()` still persists the READ record explicitly.

## Proof A — fresh pack identity

| item | value |
| --- | --- |
| fresh `npm pack` (after repair, from `packages/trading-kit`, with `prepare` build) sha256 | `975e5a5b0b8c8f6f8994d6d9b1c9db952a5d5152c44e878cb84d549f8d1876de` |
| committed tarball `packages/trading-kit/vict-trading-trading-kit-0.1.0.tgz` | byte-identical (`975e5a5b…`) |
| committed tarball `docs/evidence/G2/consumer/vict-trading-trading-kit-0.1.0.tgz` | byte-identical (`975e5a5b…`) |
| external consumer OUTSIDE monorepo (`C:/Users/RZ1/Desktop/RZ/ar-g2-consumer`) | single direct dep `@vict-trading/trading-kit@0.1.0` from the fresh tarball; `npm ls` clean (`ar-pack-sha256.txt`, `npm-ls.txt`) |

## Proof B — ASYNC matrix (own harness, `ar-harness.mjs` DeferredPort + `ar-matrix.mjs`; raw: `ar-matrix-results.json`)

18/18 rows pass, 0 failing.

**B1 pending-exposure (live reads during a pending deferred write):**

| row | op | during pending (sync + microtask) | storage during pending | verdict |
| --- | --- | --- | --- | --- |
| P-1 | `step(3600)` | live == pre-op exactly: instant `1767571200`, step 1, 0 bars, lastBarTime null | pre-op record (instant `1767571200`, step 1), bytes untouched | **PASS** |
| P-2 | `createLevel(2700,'pending')` | 0 levels live | stored levelCount 0 | **PASS** |
| P-3 | `removeLevel(id)` | level STILL VISIBLE (count 1) | stored 1 | **PASS** |
| P-4 | `play()` | `playing == false` live | stored false | **PASS** |
| P-5 | `returnToCurrent()` refused after pending | RTC never flips; refused → byte-identical; no event | unchanged | **PASS** |

No uncommitted instant, step index, bars slice, drawing, playing flag, or ended flag is exposed at synchrony or microtask granularity while a write is pending; exactly one pending port write exists at a time.

**B2 overlap consistency (adapted matrix, both kinds × 3 outcome combos):** under FIFO the kit cannot ISSUE B's write while A's write is pending (measured `pendingWhileA = 1`, `pendingWhileB = 1` in every row; 3-queued-steps row shows exactly one unresolved write at all times) — the pre-repair "resolve B before A" rows are structurally excluded, so settle order == call order == commit order. All consistent rows end live == storage == record:

| kind | combo | opA | opB | final live / stored / record | verdict |
| --- | --- | --- | --- | --- | --- |
| step-step | s,s | ok | ok | `1767578400`/step 3 (T0+7200) | **PASS** |
| step-step | s,f | ok | WRITE_REFUSED | `1767574800`/step 2 (A survives B's failure) | **PASS** |
| step-step | f,s | WRITE_REFUSED | ok | `1767574800`/step 2 — **re-based** (NOT T0+7200/step 3); no live regression, no storage/live divergence | **PASS** |
| step-create | s,s | ok | ok | `1767574800`/step 2, 1 level (creationStep 2, creationInstant T0+3600) | **PASS** |
| step-create | s,f | ok | WRITE_REFUSED | `1767574800`/step 2, 0 levels | **PASS** |
| step-create | f,s | WRITE_REFUSED | ok | `1767571200`/step 1, 1 level stamped `T0`/step 1 (re-based create on the pre-op committed state); drawing NOT created on top of a rolled-back step | **PASS** |

**B3 re-base headline case:** A `step(3600)` refused → B `step(3600)` ok → `T0+3600`/step 2 (`1767574800`), NOT `T0+7200`/step 3 — verified issued BOTH sequentially-after-A-settles and queued-while-A-pending (identical result).

**B4 queued-behind-reset:** `reset()` ok then queued `step(600)` executes on the post-reset cleared counters (stepCounter → 1) from the pre-reset clock position (existing semantics: reset clears counters/levels/flags but not the clock) → step 1, record written truthfully. `step` ok + queued `reset()` with removal THROWN → live stays step 2, record kept, truthful `PORT_ERROR`. No new invalidation mechanism.

**B5 events:** op A refused + op B ok → only B's event in the stream (matches final committed state); call order `step → NOT_FOUND(no write) → level-created` → event order `['step','level-created']`, failures emit nothing.

## Proof C — regressions (all re-run against the repaired tarball, same consumer)

| regression | result |
| --- | --- |
| kit `tsc --noEmit` | PASS (0 errors) |
| 17-row failed-write table (FIX B pattern, incl. clock op-log truncation exactness via `clockOps` length before==after) | **17/17 PASS**, allPass:true (`ar-fixB-results.json`; all codes truthful WRITE_REFUSED/PORT_ERROR, state+bytes before==after, recovery works) |
| FIX A two-sources identity (all public outputs identical incl. equality edge; availabilityAt oracle) | PASS — `identity: true`, `potency differs: true true` (mutation sweep still potent), `sweepAllOk: true` (`ar-fixA-results.json`) |
| host `npm run check` | PASS — `svelte-check found 0 errors and 1 warning in 1 file` (the pre-existing `workspaceState(props)` warning) |
| host `npm run build` | PASS (clean production build) |
| BROWSER (ONE Chrome, debug port 9357, temp profile, served by FRESH production build via `vite preview --port 5347 --strictPort`, per-step 15s cap, total 12.4s, no retry loops; server + browser stopped after capture) | ALL PASS (`ar-browser-results.json`, screenshots `ar-br-01…07.png`): entered replay stepped consistent (screen step 2 · 00:15Z == localStorage); rapid double-Step (2nd click before 1st settles): settled screen step 4 · 00:45Z == storage stepIndex 4 `1767573900`, no lost/duplicated step, mid-flight storage never behind screen; Play 8×120 ms samples: `gaplessDuringPlay: true` (storage step ≥ screen step always; equal-instant rows exact), settled consistent; corrupt-key step → `role=alert` "step unavailable: storage read failed" truthful + alert element present; recovery after healing works; return-to-current exact (banner CURRENT, stored `returnedToCurrent: true`); W1 create/edit/undo/redo/`reload-adopts-last-write` all true; console has only the pre-existing benign `/favicon.ico` 404 |

## Proof D — docs

- `packages/trading-kit/README.md`: new normative section **"Persistence execution semantics (async-persistence repair)"** — FIFO serialization (per-session-instance), write-first-commit-after with committed-frame-only pending window, execution-time re-base (non-composition, with the T0+3600/step-2 example), queued-behind-reset, event ordering.
- `packages/trading-kit/src/session.ts` header + `persist`/`persistViaRecord`/`enqueue` docstrings updated to the real order (FIFO; commit-after-own-write; re-base on failure; queued-behind-reset).

## Hygiene / lineage

- No trailing whitespace, no EOF blank lines in changed files. No commits made. Working tree at end: modified `session.ts` + `README.md`, refreshed 2 tarballs, new untracked `ar-*` evidence artifacts. My own processes (vite preview PID 3624, headless Chrome port 9357) stopped after capture.
- Kit dist rebuilt; tarballs packed from the repaired tree; external consumer installed from that exact sha256.

## Requirements NOT demonstrated / notes

- The pre-repair B1 "out-of-order resolve" rows (B settled before A) are now structurally impossible (the kit holds at most one pending persisted write); B2 records `pendingWhileA/pendingWhileB = 1` as the proof instead — the honest adapted answer to the 12-row matrix.
- Note-level drawing mutation: still no kit op writes notes except `createLevel` (unchanged scope; not in the repair spec's repair list beyond the 7 persisted mutations).
- Cross-session-instance races on the same storage remain outside the kit's control (single-port contract; per-session-instance guarantee documented).