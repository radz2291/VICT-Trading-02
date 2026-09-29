# G2 async-persistence REPAIR — FRESH VERIFIER report (verifier set `avc-*`)

**Verdict (per docs/EVALUATION.md vocabulary): PASS WITH NON-BLOCKING FINDINGS — G2 async-persistence repair VERIFIED at candidate SHA `91d1df71234d52017ad0e9e7a50d0b23e2514780`; recommended G2 status: PASS WITH NON-BLOCKING FINDINGS, current verified G2 candidate superseding `db66475…` for the async-persistence dimension.**

**Tester:** fresh verifier session, independent of the builder (did not build the candidate; builder report read only to extract claims under test; own consumer, own harness, own expected values).
**Tested SHA:** `91d1df71234d52017ad0e9e7a50d0b23e2514780` — `git rev-parse HEAD` equal; working tree clean at session start; `origin` = https://github.com/radz2291/VICT-Trading-02.git (branch `main`). No code changes, no commits, no pushes, no repairs. Only untracked `avc-*` evidence files added under `docs/evidence/G2/`.
**Session:** 2026-09-29/30 (local). Node v22.13.1, npm 11.19.1, Chrome/154.0.8037.58 headless.

## 0. What this repair was tested against

Prior standing G2 verdict: PASS WITH NON-BLOCKING FINDINGS at `db66475…`. The async-persistence failures were found AFTER that verdict (independent reproduction at `b05e947…`, red evidence `avr-*` + `verifier-report-G2-async-repro.md`): (1) pending-exposure — 7 persisted ops mutated live state before `await persist`, exposing uncommitted replay frames/drawings/flags; (2) overlap — exactly 6/12 rows failed (lost op in storage, live regression below storage, resurrection on reload); (3) out-of-order event emission and events recording discarded ops; (4) docstring-vs-behavior mismatch. This repair candidate (diff `cb9ae91..91d1df7`: `session.ts`, kit README, 2 refreshed tarballs, `ar-*` builder evidence + builder report — scope audit CLEAN, nothing outside expectation) claims: FIFO serialization, commit-strictly-after-own-write, execution-time re-base, queued-behind-reset, events post-commit in call order, truthful docstrings. My job was falsification.

## 1. Method — independence

- **Consumer OUTSIDE the monorepo:** `C:/Users/RZ1/Desktop/RZ/avc-g2-consumer` (distinct from the builder's `ar-g2-consumer` and the prior verifier's `avr-g2-consumer`). Single direct dep `@vict-trading/trading-kit@0.1.0` installed from MY fresh pack artifact; `npm ls` clean; no app imports, no workspace aliases (`avc-pack-identity.json`).
- **My own harness** (`avc-harness.mjs`): own `DeferredPort` (read synchronous/throws-on-failure; write returns promise — `{ok:false}`=WRITE_REFUSED, reject=PORT_ERROR, `{ok:true}` commits call-time-captured bytes AT RESOLUTION TIME; remove deferred), own `BasicPort` (mode-switching, for the failed-write table), own concurrency tracker (max concurrent port ops), ordered call/settle audit log, process-level unhandled-rejection trap, fresh-adopt reload simulator, independent availability oracle. Patterns adapted from the prior `avr-*` verifier set with NEW expected values derived by me from the repaired contract before running.
- **One pass per probe; no retry loops** (harness-code syntax/logic fixes before a probe's first valid run are disclosed in §6; final runs are the recorded evidence). Unique ports: vite preview 5381, Chrome debug 9341; killed only my own processes (vite PID 13744, Chrome PID 18660) after capture. Bounded: browser pass 8.3 s wall, per-step 15 s caps (load 30 s).

## 2. Falsification attempt 1 — PENDING-EXPOSURE: **BROKEN (invariant holds)**

`avc-p1.mjs` → `avc-p1-results.json` — **16/16 rows PASS** (step / createLevel / removeLevel / play / returnToCurrent × settle {ok, refuse, throw}), plus re-entrant port probe.

- Unawaited op; sampled at **sync, microtask ×2, macrotask ×2** granularities. In EVERY sample of EVERY row: `clock.now()`, `currentState().instant`, `currentStep()`, `data.bars()` slice (count + last bar), `levelsAll()`, `isPlaying`, `hasReturnedToCurrent`, and the **clock op-log length** are byte-identical to the pre-op committed frame; stored bytes untouched; **no event emitted mid-pending**. Any observation of the uncommitted frame would have falsified — none found.
- Exactly **one** pending port op during each window (`pendingDuringWindow === 1`, `maxConcurrentOps <= 1` everywhere).
- Op result resolves **strictly after its own write settles** (settle log index < promise-resolution marker in the port audit, all rows).
- Refused and thrown writes: live never moves, bytes unchanged, zero events, **no promise ever rejects** (failures are truthful `WRITE_REFUSED`/`PORT_ERROR` outcomes) and **zero unhandled rejections** (process trap silent across all probes).
- **Re-entrant adversarial port**: `write()` itself samples live state at call time (the only consumer-reentrant point inside the op slice) — sees the committed frame, never the draft (draft→capture→restore is synchronous inside the op slice; at write-call time the restore has already run).

## 3. Falsification attempt 2 — OVERLAP: **BROKEN (invariant holds)**

`avc-p2.mjs` → `avc-p2-results.json` — **25/25 rows PASS**: 6 pair kinds (step+step, step+create, create+remove, step+returnToCurrent, play+pause, reset+step-queued-behind-reset) × 4 outcome combos (s,s / s,f / f,s / f,f) + a 3-queued-steps row. Pairs issued in call order, both unawaited; adversarial settlements.

- **FIFO proven, not assumed**: after issuing A+B, exactly ONE new port op exists (A's; `pendingIds===1`, `totalOps === setup+1`) — B's write is never issued while A is pending. A second concurrent write was never observed anywhere (`maxConcurrentOps === 1` in every row). The pre-repair "resolve second-first" rows are structurally excluded — measured, not inferred.
- **After settle: live == storage == fresh-reload record ALWAYS** (every row). No lost ops (s,s always accumulates both ops), no storage regression, no resurrection.
- **Re-base exact (non-composition)**: step+step f,s → final `T0+3600`/step 2 — **NOT** `T0+7200`/step 3; step+create f,s → level stamped `T0`/step 1 (drawing NOT created on top of the rolled-back step); play+pause s,f → pause refusal does **not** roll back the committed play (live stays playing=true, record playing=true) — the exact re-base-on-pre-op-committed-state rule.
- create+remove f,s → `removeLevel` returns truthful `NOT_FOUND` and issues **no write** (`writeCalls` unchanged).
- **reset+step (queued-behind-reset)**: reset ok → record removed + live cleared; queued step executes on cleared counters (stepCounter 0→1) from the pre-reset clock position → record `{T0+3600, step 1}`; reset removal-throw → live kept, queued step re-bases on kept state (`T0+3600`/step 2), truthful `PORT_ERROR`. No new invalidation mechanism.
- **Events**: call order == commit order == event order in every row; failed ops emit nothing (`finalEvents` exact-matched per row, e.g. f,s → `['step']` only).
- Fresh adoption of ENDED records (rtc=true): fresh consumer reads the exact record; `restore()` refuses `SESSION_ENDED` (recorded rule: return-to-current IS the reload state) — asserted per row.

## 4. Falsification attempt 3 — READ-PATH: **BROKEN (invariant holds)**

`avc-p3.mjs` → `avc-p3-results.json` — **6/6 rows PASS**.

- **Committed-frame reads while a write is pending**: `data.bars({15m|1h|4h})`, `availabilityAt()`, `availabilityAt(now)` sampled at 4 granularities mid-pending are IDENTICAL to an independent reference session parked at the committed instant (Fix A oracle still exact); after the write settles, readouts move exactly to the new committed frame.
- **Corrupt bytes DURING a pending write → queued op refuses `READ_FAILED`** (no silent success): storage remains exactly the pending op's committed record; live matches it; B emits nothing; B issues no write. Recovery after healing works (subsequent step ok).
- **Execution-time reverify proven both directions**: corruption healed before a queued op's execution → the op succeeds (a call-time gate would have refused); corruption present at execution → `READ_FAILED`.
- Boundary recorded (informational, F-AVC-2): corruption landing during an op's OWN pending write, with the write then succeeding, commits over the corrupt bytes — consistent with the documented order (re-verify is pre-write; the successful write replaces bytes wholesale) and not a silent success of a read-gated op.

## 5. Falsification attempt 4 — REGRESSIONS: **all hold**

| regression | my result | evidence |
| --- | --- | --- |
| kit `tsc --noEmit` | PASS (0 errors) | `npm run check` in `packages/trading-kit` |
| 17-row failed-write table (state+bytes+codes+op-log truncation exactness) | **17/17 PASS** (+recovery row = 18/18): {refuse→`WRITE_REFUSED`, throw→`PORT_ERROR`} × {start, step, createLevel, removeLevel, play, pause, returnToCurrent} + reset(removal-throw, `PORT_ERROR`) + restore×2 — every row: refused, truthful code, live state bitwise-unchanged (incl. `clockOps` log length), stored bytes unchanged, NO event | `avc-p4.mjs` → `avc-p4-results.json` |
| recovery (ghost-op absent from bytes, real op lands, fresh session adopts last successful write exactly) | PASS (ghost absent / real present / record==live / reload levels+step exact) | `avc-p4-results.json` |
| FIX A two-sources identity incl. equality edge + oracle + potency | PASS — identity over {15m,1h,4h} bars + `availabilityAt()` + queryRecords + stats at 5 clocks (incl. mid-gap and horizon), full vs prefix-deleted source AND committed poison alternate; **independent oracle matches**; **equality edge both directions** (clock == lastAvailableClose `1767574800` → NO open-ended entry; clock `1767574799` → `{from: 1767573900, to: null}`); **potency real**: naive full-history max 3112.5 vs 2657.81 (prefix@horizon), vs **6112.5** (committed poison alternate); SMA20 3107.25 vs 2647.537 / **6107.25**; post-clock-only mutation sweep 20 applicable rows all identical | `avc-fixA.mjs` → `avc-fixA-results.json` |
| host `npm run check` | PASS — `svelte-check found 0 errors and 1 warning` (the pre-existing `workspaceState(props)` warning) | run log |
| host `npm run build` | PASS — clean fresh production build (served for §6) | run log |
| scope audit `git diff cb9ae91..91d1df7 --stat` | CLEAN — exactly `session.ts`, kit `README.md`, 2 tarballs, `ar-*` evidence + builder report `async-repair-report.md`. Nothing else. | `git diff` |

## 6. Falsification attempt 5 — BROWSER (real Chrome, one pass): **all pass**

One headless Chrome (debug port 9341, temp profile), app served by MY fresh production build via `vite preview --port 5381 --strictPort`; total run 8.3 s; steps capped 15 s; my server+browser stopped after capture. `avc-browser-run.mjs` → `avc-browser-results.json`, screenshots `avc-br-01…07.png`.

| step | result |
| --- | --- |
| load + enter replay + Step | PASS — screen `step 2 · 00:15Z` == stored record (stepIndex 2, instant 1767572100) |
| rapid double-Step (2nd click while 1st pending) | PASS — settled screen `step 4 · 00:45Z` == storage stepIndex 4 / instant 1767573900; mid-flight samples: screen **never ahead of storage** (no flash of an uncommitted frame); no lost/duplicated step |
| Play ticks (8×120 ms) | PASS — `gapless` (storage step ≥ screen step always), equal-instant rows exact, settled consistent; paused cleanly |
| corrupt-key step refusal | PASS — `role=alert` rendered, text exactly "step unavailable: storage read failed"; screen state unchanged; **corrupt bytes NOT overwritten** |
| recovery after healing | PASS — step advances (6→7), screen == storage. NEW finding F-AVC-1: the stale refusal message stays visible after recovery (display-only, see §8) |
| return-to-current | PASS — banner CURRENT, stored `returnedToCurrent: true` |
| W1 create/edit/undo/redo | PASS — created note 'level' → edited 'edited' → undo → 'level' → redo → 'edited' (`g1.levels.v1` verified) |
| reload adopts last write | PASS — panel shows 'edited' after reload; banner CURRENT (ended replay record, per recorded rules) |
| console | PASS — 0 non-favicon entries (favicon 404 pre-existing/benign) |

## 7. Falsification attempt 6 — PACK IDENTITY: **holds**

- My fresh `npm pack` (prepare rebuilt dist; `dist` gitignored, tree stayed clean): sha256 **`975e5a5b0b8c8f6f8994d6d9b1c9db952a5d5152c44e878cb84d549f8d1876de`** == claimed value == **both** committed tarballs (`packages/trading-kit/…tgz`, `docs/evidence/G2/consumer/…tgz`) — byte-verified by my own `sha256sum`.
- External consumer outside the monorepo installs from that exact artifact and imports cleanly (`ReplaySession, TF_SECONDS, createDataSession, createReplayClock, stampReplayCreation, visibilityAt, visibilityInReplay`); single dependency, no app imports, no workspace aliases. `avc-pack-identity.json`, `npm-ls-avc.txt` (consumer-side).

## 8. Findings

| ID | severity | user effect | ruling |
| --- | --- | --- | --- |
| F-AVC-1 | minor / non-blocking (app display, host) | After a corrupt-key refusal is rendered and the storage key is healed, the refusal message (role=alert, "step unavailable: storage read failed") REMAINS visible even though ops work again — `step()`'s success path never calls `okStatus`. History is truthful but stale as "current state". | NEW this cycle; carry to G3 (same family as F-C2-2). Kit behavior correct; display-only. Evidence: `avc-browser-results.json` `recovery-after-heal.staleStatusAfterRecovery: true`, screenshot `avc-br-05-recovered.png` |
| F-AVC-2 | informational (documented boundary) | Corruption landing during an op's OWN pending write, followed by a successful write, replaces the corrupt bytes (re-verify is pre-write per the documented order). Not a silent success of a read-gated op; recovery verified. | Consistent with docstrings; no action |
| F-AVC-3 | informational (documented boundary, evidence-backed) | `acknowledgeState()` is a synchronous consumer API OUTSIDE the FIFO queue. Calling it with a STALE record while an op write is pending desynchronizes live drawings from the committed record (probe: live levelCount 0 vs stored 1) until the next commit. The docstring scopes it to "after your read succeeds"; the app never does this. FIFO guarantee is per-session-instance over persisted ops, exactly as documented. | Boundary evidence: `avc-p5.mjs` → `avc-p5-results.json`; no action |
| harness disclosures | — | Two of my own probe-script bugs were fixed BEFORE their first valid run (p2: cumulative-write-counter and ended-session adoption assertions were mine, not kit failures — all 25 rows' kit data was already consistent; browser script: in-page helper scoping + Svelte input-event binding). The final runs are the recorded evidence; no candidate behavior was re-run-to-pass. | disclosed |

**Not demonstrated / out of scope:** cross-session-instance races on the same storage (single-port contract; per-session-instance guarantee documented — untested here, matches README scope); the 375/768 narrow sweep and per-op 17-cell browser sweep remain carried from the cycle-2 report (unchanged scope; not re-run); no real orders, no publishing, no secrets anywhere.

## 9. Rulings per original failure class (required)

| original failure class (at `b05e947…`, red `avr-*` evidence) | ruling |
| --- | --- |
| pending-exposure (uncommitted frame/drawing/flag visible while write pending) | **RESOLVED** — §2 |
| overlap loss / storage regression / live regression + resurrection on reload | **RESOLVED** — §3 |
| out-of-order event emission; events recording discarded ops | **RESOLVED** — §3 (call order == commit order == event order; failures emit nothing) |
| docstring-vs-behavior mismatch | **RESOLVED** — session.ts header + `persist`/`persistViaRecord`/`enqueue` docstrings + README normative section now describe exactly the implemented and measured order (enqueue → gate → re-verify → validate → draft+capture → restore → persist(next) → commit → emit) |

## 10. Reproduction

```text
# provenance (repo root, pinned SHA 91d1df71234d52017ad0e9e7a50d0b23e2514780, clean tree at start)
git rev-parse HEAD && git status --porcelain
cd packages/trading-kit && npm pack --pack-destination C:/Users/RZ1/Desktop/RZ/avc-g2-consumer/pkgs
sha256sum C:/Users/RZ1/Desktop/RZ/avc-g2-consumer/pkgs/vict-trading-trading-kit-0.1.0.tgz   # 975e5a5b…
cd C:/Users/RZ1/Desktop/RZ/avc-g2-consumer && npm install --no-audit --no-fund && npm ls
node avc-p1.mjs   # pending-exposure            -> avc-p1-results.json  (16/16)
node avc-p2.mjs   # overlap matrix              -> avc-p2-results.json  (25/25)
node avc-p3.mjs   # read-path / corruption gate -> avc-p3-results.json  (6/6)
node avc-p4.mjs   # failed-write table          -> avc-p4-results.json  (18/18)
node avc-fixA.mjs # Fix A identity/potency      -> avc-fixA-results.json
node avc-p5.mjs   # informational boundary      -> avc-p5-results.json
# browser: cd <repo>/host && npm run build && npx vite preview --port 5381 --strictPort
#          chrome --headless=new --remote-debugging-port=9341 --user-data-dir=<temp>
#          node avc-browser-run.mjs              -> avc-browser-results.json (all pass)
```

## 11. Verdict

Every claimed behavior of the async-persistence repair was attacked and survived: pending-exposure falsification failed (16/16), overlap falsification failed (25/25), read-path falsification failed (6/6), all regressions hold (18/18 table, Fix A identity/oracle/equality-edge/potency, kit tsc, host check/build), the browser walkthrough passes live with clean console, and pack identity is byte-exact end to end. Scope audit clean. Findings F-AVC-1 (minor, carried), F-AVC-2/F-AVC-3 (informational boundaries).

**Recommended G2 status per evidence: PASS WITH NON-BLOCKING FINDINGS at `91d1df71234d52017ad0e9e7a50d0b23e2514780`** — the async-persistence repair RESOLVES all four original async failure classes; the standing G2 verdict's non-async findings (F-1, F-3, F-C2-2) remain carried unchanged. This report is the verifier's alone; STATE.md updates belong to the orchestrator flow.
