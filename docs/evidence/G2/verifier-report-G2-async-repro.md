# G2 async-persistence challenge — INDEPENDENT verifier reproduction (pre-repair)

**Verifier:** fresh session, independent of the builder (did not build the candidate, did not read builder scripts before writing my own probes; builder's report was read only to extract the claims under test).
**Tested SHA:** `b05e9474b459037ad3425d9c0267e94a2a0dadc7` (HEAD verified equal; working tree clean at start; remote `origin` = https://github.com/radz2291/VICT-Trading-02.git, branch `main`).
**Kit under test:** `@vict-trading/trading-kit@0.1.0` freshly packed at this SHA — sha256 `4316c06860fc84c11f30cde7df0ed7d73840d3669d99120243eac06aace9474b`, **equal to the claimed value and to the committed tarball** (`avr-pack-identity.json`).
**Session:** 2026-09-29 (local clock 21:57+08:00). **No code changes, no commits, no repairs.** Only untracked evidence files added under `docs/evidence/G2/` (the `avr-*` set); tree otherwise untouched.

## Method — what makes this reproduction independent

- My own consumer **outside the monorepo** at `C:/Users/RZ1/Desktop/RZ/avr-g2-consumer` (distinct from the builder's `g2-ap-consumer`), single direct dependency `@vict-trading/trading-kit@0.1.0` installed from the fresh pack artifact; `npm ls` shows exactly one dependency; no app imports, no workspace aliases.
- My **own deferred-write port** (`avr-harness.mjs`, class `DeferredPort`), written from the kit's public `SessionPersistence` contract: `read()` synchronous, throws on failure; `write()` returns a promise — resolving `{ok:false}` = refusal (kit must surface `WRITE_REFUSED`), rejecting = `PORT_ERROR`, resolving `{ok:true}` **commits the call-time-captured record to storage at resolution time**; `remove()` deferred likewise; every call and settle is audited in order.
- My **own probe scripts** (`avr-p1.mjs`, `avr-p2.mjs`, `avr-p3.mjs`), each run **once, no retries**; deterministic `genId`; fixture = committed `docs/evidence/G2/fixture.json` (XAUUSD 15m, 2023 bars; T0 `1767571200` = 2026-01-05T00:00Z; horizon `1770068700` = 2026-02-02T21:45Z). Times are unix seconds; no wall clock used for market time.
- Parameter note: the builder's overlap probe used `step(600)` (finals `…1800`/`…2400`); I independently chose `step(3600)` (finals `…4800`/`…8400`). All row patterns and mechanisms were derived by me from the port contract **before** running; results matched the derivation exactly.

## Rulings summary

| claim | builder says | my ruling | my evidence |
| --- | --- | --- | --- |
| 1. PENDING-EXPOSURE (uncommitted frame/drawing/flag visible while write pending) | FAIL | **REPRODUCED (FAIL confirmed)** | `avr-p1-results.json` rows P1-1, P1-2, P1-3 (+ P1-4a/b same class) |
| 2. OVERLAP (2 unawaited ops, controlled settle order/outcomes) | FAIL 6/12 | **REPRODUCED — exactly 6/12 rows, same rows, same mechanisms** | `avr-p3-results.json` |
| 3. SANITY (refused-write rollback exactness, reset-removal failure, restore refusal/pending) | PASS | **CONFIRMED (PASS)** — the repair must not regress these | `avr-p2-results.json` |
| 3b. docstring-vs-behavior mismatch in `session.ts` | mismatch claimed | **CONFIRMED** (mismatch real for 7 ops; docstring accurate only for `restore()`/`reset()`) | source read + P1 behavioral evidence |
| note-update probe | NOT DEMONSTRATED (no kit surface) | **CONFIRMED** — no note-update op exists in the kit | `packages/trading-kit/src/session.ts` (only `createLevel(price, note)` writes notes) |

---

## Claim 1 — PENDING-EXPOSURE: **REPRODUCED**

Unawaited op, sampled synchronously at issue, after one microtask, and after resolution. Storage = my port's committed bytes.

| my row | op | pre-op live | during pending (sync + microtask) | storage during pending | ruling |
| --- | --- | --- | --- | --- | --- |
| P1-1 | `step(3600)` | `1767571200`, step 1, 0 bars | **`1767574800` (new instant), step 2, 4 bars, last bar time `1767573900`** — identical at microtask granularity | old record `1767571200`/step 1; bytes unchanged | **REPRODUCED** — uncommitted replay frame + extended data slice exposed live |
| P1-2 | `createLevel(2700)` | 0 levels | **1 level visible** (`avr-lvl-001`, price 2700, `creationInstant 1767571200`, `creationStep 1`) | stored levelCount 0 | **REPRODUCED** — uncommitted drawing exposed live |
| P1-3 | `play()` | playing false | **playing true** | stored playing false | **REPRODUCED** — uncommitted transport flag exposed |
| P1-4a | `removeLevel(id)` | 1 level | **0 levels (removal visible pre-commit)** | stored levelCount 1; refusal → level restored byte-identical | **REPRODUCED** (same class) + rollback exact |
| P1-4b | `returnToCurrent()` | false | **true (ended flag exposed pre-commit)** | stored false; refusal → byte-identical rollback | **REPRODUCED** (same class) + rollback exact |
| P1-5a | `restore()` | T0/step1/0 lvl (storage crafted to T0+3600/step2/1 lvl) | **pending window shows PRE-restore state** (T0/1/0) | crafted record intact until ok | **CONFIRMS write-first for restore** (no exposure) — matches builder's PASS |
| P1-5b | `reset()` | T0/step1, record present | **live unchanged, record still present** | removed only at ok | **CONFIRMS write-first for reset** — matches builder's PASS |

Agreement with builder's claimed values: P1-1 instant `1767571200→1767574800`, step `1→2`, bars `0→4` ending at bar time `1767573900` — **identical to my values** (my last bar: `{time: 1767573900, close: 2649.4}`). P1-2 level (creationStep 1, price 2700) — identical. P1-3 — identical.

Event channel during pending: `eventCount` stayed at the setup value (1 = committed `start`) in every P1 row; the kit emits only after the write resolves. So "emit reflects committed state" holds per-op — the exposure is through the **live-state getters** (`clock.now()`, `currentState()`, `data.bars()`, `levelsAll()`, `isPlaying`, `hasReturnedToCurrent`), not through events.

Mechanism (from source, consistent with my measurements): `start/step/play/pause/createLevel/removeLevel/returnToCurrent` mutate live state (clock, counters, arrays, flags) **synchronously, before `await this.persist(...)`**; snapshot/restore only repairs on failure. `restore()` persists first and adopts on success; `reset()` removes first and clears on success.

## Claim 2 — OVERLAP: **REPRODUCED (6/12, same rows, same mechanisms)**

A issued unawaited, B issued immediately after (B's synchronous phase runs while A's write is pending); writes settled in controlled order/outcome. `f` = port resolves `{ok:false}` (`WRITE_REFUSED`).

| kind | resolve | combo | op results | final LIVE | final STORAGE | fresh reload adopts | ruling |
| --- | --- | --- | --- | --- | --- | --- | --- |
| step-step | A-first | s,s | both ok | `1767578400`/3 | `1767578400`/3 | same | CONSISTENT |
| step-step | A-first | s,f | A ok, B refused | `1767574800`/2 | `1767574800`/2 | same | CONSISTENT (but see exposure note below) |
| step-step | A-first | f,s | A refused, B ok | **`1767571200`/1** | `1767578400`/3 | `1767578400`/3 | **REPRODUCED — live regressed to pre-A/pre-B while B succeeded; reload resurrects the op live discarded** |
| step-step | B-first | s,s | both ok | `1767578400`/3 | **`1767574800`/2** | `1767574800`/2 | **REPRODUCED — last-resolved (older) write overwrote B's record; committed op B lost from storage; reload regresses below live** |
| step-step | B-first | s,f | A ok, B refused | `1767574800`/2 | `1767574800`/2 | same | CONSISTENT |
| step-step | B-first | f,s | A refused, B ok | **`1767571200`/1** | `1767578400`/3 | `1767578400`/3 | **REPRODUCED** (same divergence as A-first f,s) |
| step-create | A-first | s,s | both ok | `…4800`/2, 1 lvl | `…4800`/2, 1 lvl | same | CONSISTENT |
| step-create | A-first | s,f | A ok, B refused | `…4800`/2, 0 lvl | same | same | CONSISTENT |
| step-create | A-first | f,s | A refused, B ok | **`…1200`/1, 0 lvl** | `…4800`/2, **1 lvl** | `…4800`/2, 1 lvl | **REPRODUCED — storage keeps a drawing created on top of a step live rolled back; reload resurrects it** |
| step-create | B-first | s,s | both ok | `…4800`/2, 1 lvl | `…4800`/2, **0 lvl** | 0 lvl | **REPRODUCED — the created drawing is LOST in storage (A's pre-drawing record overwrote B's)** |
| step-create | B-first | s,f | A ok, B refused | `…4800`/2, 0 lvl | same | same | CONSISTENT |
| step-create | B-first | f,s | A refused, B ok | **`…1200`/1, 0 lvl** | `…4800`/2, 1 lvl | `…4800`/2, 1 lvl | **REPRODUCED** |

My 6 disagreement rows sit at exactly the same matrix positions as the builder's 6 FAIL rows, with the same three mechanisms: (1) **lost op in storage** (last-resolved older write wins: step-step B-first s,s; step-create B-first s,s — drawing lost); (2) **live regression below storage after a failure under a pending op** (every f,s row — reload resurrects the op live discarded); (3) **no serialization** of overlapping awaited ops anywhere in the kit (confirmed by source: no queue exists). Two mechanisms are lost-op/regression in the direction the task asked me to record: B-first s,s = **lost op B (storage regression)**; f,s = **live regression + resurrection**. No row contradicted the builder's table.

Additional observations from the audit trail (`avr-p3-results.json`, `writeCallOrder`/`settleOrder`/`eventEmissionOrder`):

- **Events can emit out of call order**: step-create B-first s,s emitted `['start', 'level-created', 'step']` — B's event before A's, because commit order followed resolution order, not issue order.
- **Events can record ops whose effect live discarded**: every f,s row ends with B's event in the log (`step`/`level-created`) while final live state is BELOW the event's claim (`…1200`/1) — the event stream permanently asserts an op that the live session no longer reflects.
- Even the CONSISTENT s,f rows pass through an exposed uncommitted frame mid-window (mid sample `…8400`/3 before B's refusal rolled live back to `…4800`/2) — settlement consistency does not imply pending safety (Claim 1 applies during the window).

## Claim 3 — SANITY: **CONFIRMED (PASS)**

| my row | scenario | outcome code | exact rollback? | stored bytes untouched? | no event? | fresh adopts last successful write? |
| --- | --- | --- | --- | --- | --- | --- |
| P2-1 | step → write refused | `WRITE_REFUSED` | TRUE (every field: instant, stepIndex, playing, returnedToCurrent, levels) | TRUE | TRUE | TRUE (`…1200`/1) |
| P2-2 | step → write threw | `PORT_ERROR` (truthful message) | TRUE | TRUE | TRUE | TRUE |
| P2-3 | createLevel → refused | `WRITE_REFUSED` | TRUE | TRUE | TRUE | TRUE |
| P2-4 | returnToCurrent → refused | `WRITE_REFUSED` | TRUE | TRUE | TRUE | TRUE |
| P2-5 | removeLevel → refused | `WRITE_REFUSED` | TRUE (level restored byte-identical) | TRUE | TRUE | n/a (record unchanged) |
| P2-6 | reset → removal rejected | `PORT_ERROR` ("failed to remove the session record — no state change") | TRUE (live unchanged) | record still present (`…1200`) | TRUE | n/a |
| P2-7 | restore → write refused | `WRITE_REFUSED` | TRUE (live byte-identical at pre-restore) | TRUE (crafted record intact) | TRUE | n/a |
| P2-8 | restore → success | ok | — (adopted exactly: instant/step/level/playing) | bytes unchanged | n/a | TRUE |
| P2-9 | reset → success | ok | — (record cleared; live cleared) | cleared | n/a | n/a |
| P2-10 | reverify read throws | `READ_FAILED` | TRUE (live untouched) | TRUE | TRUE | n/a |

Extra exactness checks the builder did not report: the **clock operation log length** is restored after a failed step (`clockOpLogRestored: true` — snapshot/restore truncates the op log correctly), so even the evidence channel is rolled back exactly. The repair must preserve all of this: truthful codes, exact state+bytes+op-log rollback, silent-on-failure events, correct fresh adoption, restore/reset write-first behavior.

### Docstring-vs-behavior mismatch: **CONFIRMED**

`packages/trading-kit/src/session.ts` header claims: "every persisted operation computes its NEXT state …, **PERSISTS THE NEXT-STATE RECORD FIRST**, and only on a successful write commits the live state" and "Order in every persisted operation: gate → re-verify → compute next state → persist(next) → commit → emit." Measured order for `start`, `step`, `play`, `pause`, `createLevel`, `removeLevel`, `returnToCurrent` is: gate → re-verify → snapshot → **mutate live state** → persist(next) → on failure restore snapshot → on success emit. The docstring describes write-first-commit-after; the code implements mutate-then-rollback-on-failure. The mismatch is real but **partial**: `restore()` and `reset()` genuinely do persist/remove first and commit after (my P1-5a/5b rows). Rollback on failure is real; pending-window safety is not. Finding recorded, not repaired.

### Builder raw-evidence nit (informational, does not change any verdict)

`ap-kit-probes-1-4.json` P1-1 carries `"eventCountDuringPending": 2` while the builder's report text says the count stayed at 1 during pending. My measurements support the report text (count 1 = committed `start` during the window; 2 only after the write resolves and `step` emits) — the raw field appears to have been sampled post-resolution. Naming/semantics nit only; the builder's verdict does not depend on it.

---

## Repair-semantics assessment (for the repair spec — no code changed by me)

Owner-required semantics, assessed against the reproduced evidence:

**(a) Committed-frame-only exposure.** Live state must mutate strictly after the op's own write resolves; during the pending window every public read (`clock.now()`, `currentState()`, `currentStep()`, `levelsAll()`, `isPlaying`, `hasReturnedToCurrent`, and every `data.bars()`/`availabilityAt()` query) must reflect only the last committed frame. Contract subtleties the spec should pin:
- *What `step()` returns while queued:* the returned promise must resolve only after the op **executes and settles**, with the outcome computed at **execution time** (re-based state, current capping, current refusal), never a call-time prediction. An unawaited caller therefore cannot observe anything but committed state before resolution — which is the point.
- *Computing next-state without observable mutation:* the clock exposes only mutating `advance`/`setFrame` plus `snapshot`/`restoreSnapshot`. Options, all compatible with the public API: (i) compute the capped target purely from `now()`+`horizon()` (risks duplicating R1 capping logic), (ii) advance+capture+`restoreSnapshot` entirely inside the op's synchronous prefix (net-zero observable exposure since the caller regains control only after the prefix; reuses the existing transactional primitive), or (iii) a new pure clock query. The spec should REQUIRE the invariant ("no observable state may differ from committed between issue and settle") and leave the mechanism to the implementer; note that `persist()` currently builds records from live state and must instead build from the explicit committed next-state.
- `restore()`/`reset()` already satisfy (a) — verified, must be preserved.

**(b) Call-order serialization.** Overlapping persisted ops must serialize in call order; each op builds its next-state only after the previous op settles.
- *Failure re-basing:* a failed op leaves the session at its **pre-op committed state**; a later queued op then applies **on top of that re-based state**. Concretely (my step-step f,s): A refused → B must produce `T0+3600`/step 2, NOT `T0+7200`/step 3. The spec must state this **non-composition** property explicitly: a consumer issuing B while A is unsettled cannot assume B composes onto the state B observed at call time; B's effect depends on A's outcome. (The alternative — failing B with a conflict code — was not chosen by the owner; the re-base rule is the requirement.)
- *Reverify timing:* under serialization, `reverify()` naturally executes at the op's execution time and reads the latest bytes — keep it there (not at call time). Cross-session/concurrent-consumer races on the same storage remain outside the kit's control (single-port contract); the spec should say the serialization guarantee is per-session-instance.
- *Evidence events:* with serialization, commit order == call order, so events emit in call order; failed ops emit nothing; the event stream then always matches final live state. This eliminates both observed anomalies (out-of-call-order events; events recording discarded ops). No out-of-commit-order emission is possible once (a)+(b) hold, because an op can only emit after its own commit and commits are FIFO.

**(c) reset/removal and restore follow the same rules.** Both already write-first (verified); they must join the same queue so a `reset()` cannot interleave with a queued write. Subtlety for the spec: an op queued behind a `reset()` re-derives from the **post-reset cleared state** (stepCounter 0, no record) — the current kit would then allow e.g. `step()` producing step 1 without a prior `start()`. The spec should explicitly decide whether queued ops after a reset execute on the cleared session (and what a subsequent write persists) or are refused; today's kit permits them, so either answer is a deliberate choice to record, not an implementation accident.

**Severity / user effect of the reproduced FAILs (kit level):**
- F-AVR-1 (pending exposure): **major for slow or failing ports** — the trader can see, act on, and draw at a replay frame that never commits (instant, bars slice, drawing, playing flag), and the kit's own docstring contradicts the behavior. With the app's synchronous-fast localStorage port the window is far below human perception (builder probe 5, PASS-as-observed — consistent with my mechanism analysis; I did not re-run the app path, out of scope for this kit-level challenge).
- F-AVR-2 (overlap divergence): **major for any port that can fail or resolve out of order** (the port contract explicitly allows both): silent loss of a committed op from storage, live/storage divergence, and resurrection of discarded ops after reload — i.e., state corruption that survives restart, in the exact dimension (session persistence honesty) G2's corrected verdict rests on.

**Verdict on the claims under test:** all claimed failures **REPRODUCED** at the pinned SHA; the claimed sanity behaviors **CONFIRMED**; the docstring mismatch **CONFIRMED**. In EVALUATION.md vocabulary: the probed persistence behaviors FAIL the transactional-persistence requirement (D-004 / correction-cycle-2 model: persist-next-before-commit) under a contract-legal deferred-write port. This is pre-repair evidence for the pending repair; it does not by itself re-open the recorded G2 verdict (app path not re-tested here) — that judgment belongs to the orchestrator/repair cycle and a fresh verdict at the repaired SHA.

## Reproduction

```text
# provenance (at repo root, pinned SHA b05e9474b459037ad3425d9c0267e94a2a0dadc7, clean tree)
git rev-parse HEAD  &&  git status --porcelain
cd packages/trading-kit && npm pack --pack-destination C:/Users/RZ1/Desktop/RZ/avr-g2-consumer/pkgs
sha256sum C:/Users/RZ1/Desktop/RZ/avr-g2-consumer/pkgs/vict-trading-trading-kit-0.1.0.tgz   # 4316c068…

# consumer (outside the monorepo)
cd C:/Users/RZ1/Desktop/RZ/avr-g2-consumer && npm install --no-audit --no-fund && npm ls
node avr-p1.mjs   # pending-exposure rows   -> avr-p1-results.json
node avr-p2.mjs   # failure-sanity rows    -> avr-p2-results.json
node avr-p3.mjs   # 12-row overlap matrix  -> avr-p3-results.json
```

Node v22.13.1, npm 11.19.1. One pass each, no retries, no servers or long-lived processes started. Harness and probe sources are committed as evidence (`avr-harness.mjs`, `avr-p1.mjs`, `avr-p2.mjs`, `avr-p3.mjs`).

## Artifacts and lineage

- `avr-pack-identity.json` — provenance, pack identity, port model, hygiene.
- `avr-p1-results.json` (8 rows), `avr-p2-results.json` (10 rows), `avr-p3-results.json` (12 rows) — raw measurements incl. write/settle order, event order, fresh adoption.
- Base = tested SHA = `b05e9474b459037ad3425d9c0267e94a2a0dadc7`; no commits made; changed files = the new `avr-*` evidence files only. `docs/STATE.md` deliberately untouched (live G2 status remains the recorded verdict at `db66475…`; this report is repair-cycle input, and status updates belong to the repair/orchestration flow).

## Not done / out of scope for this report

- No browser/app-path run (kit-level task; builder's app-path observations neither confirmed nor contradicted here — mechanistically consistent with my findings).
- No note-update probe (no kit surface exists — confirmed from source; consumer-side concern).
- No repairs, no fixes, no commits, no pushes; nothing published; no orders; no secrets.
