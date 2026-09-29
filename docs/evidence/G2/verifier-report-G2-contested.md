# G2 CONTESTED-CASES VERIFIER ADDENDUM — R2 aggregate completeness, availability future-gap leak, mid-session persistence failure

- **Verifier:** fresh contested-cases reproduction session (independent of the builder; made none of the candidate changes; wrote none of the contested-case material being reproduced)
- **Baseline HEAD verified:** `e7eae653906fcc19a1211aa0ed7f15c8bb36e470` (clean at start except untracked verifier artifacts added during the run; no tracked file modified; no commits; no pushes)
- **Candidate SHA ruled against:** `5ebe4eeae74bc608ada625feca57ee284a085747` (in lineage; `git diff 5ebe4ee..HEAD` touches docs/evidence and docs only — no product code differs from the candidate)
- **Code import path (per orchestrator instruction):** fresh `tsc` build of `packages/trading-kit` from the committed source, then `npm pack` → fresh tarball **sha256 `38979340d24c22a97c5c4b224b3a27a66b06fb5f37793d88b07a224d4823ed09`** (byte-identical to both committed copy tarballs, i.e. the build is reproducible from the committed code). Ruling imports the kit from `dist` of that build via an independent scratch consumer at `C:/Users/RZ1/Desktop/RZ/g2-contested-consumer` (`npm ls --all`: only `@vict-trading/trading-kit@0.1.0`; no app imports).
- **No repairs made.** Preview server (port 5199, fresh build of the committed candidate) stopped after the run; working tree left as found plus the unpulled untracked `ct-*` artifacts listed at the end.
- **Normative sources:** `docs/EVALUATION.md` (verdict vocabulary), `docs/DECISIONS.md` D-002 R2 (as amended by D-003 for the contested framing), orchestrator's contested-case rule (aggregate requires ALL constituent slots incl. absent → such buckets unavailable, reported by `availabilityAt`, never returned; a public replay query must not reveal a future resumption time; mid-session persistence mutations refused + bytes unchanged).

**Prior verifier-relevant context (NOT re-verified in full here):** the recorded verdict at `5ebe4ee` is PASS WITH NON-BLOCKING FINDINGS (`verifier-report-G2.md`); its poison-future isolation harness (`vfy-isolation-kit.mjs`) compared served slices, readouts, and query records only — **structural mutations (bar insert/remove) and `availabilityAt()` were not in the compared set.** That gap is exactly what Cases 1–2 reopen.

---

## CASE 1 — INCOMPLETE HIGHER-TIMEFRAME CANDLE (R2) — **VIOLATION**

**Reproduction:** `node ct-case1.mjs` (scratch consumer; kit from fresh tarball; committed baseline fixture — bars byte-identical to `host/src/lib/fixtures/g2-fixture.json`, digest-of-array `e6b0b749bc09f9a0` both).

**(i) Committed fixture gap confirmed.** Source bars contain 2026-01-05 04:00Z, **04:30Z, 04:45Z** — slot **04:15Z (time 1767586500) is absent** (generator `SINGLE_DROPS` index 17).

**(ii) 1h aggregate — partial bucket returned as a COMPLETE bar.**
`data.bars({until:null, granularity:'1h'})` at clock fixed 06:00Z (and again at the horizon):

```
bucket 04:00–05:00Z → { time: 1767585600, open: 2646.11, high: 2646.62, low: 2645.36, close: 2646.24 }
constituents actually used: 04:00Z, 04:30Z, 04:45Z   (04:15Z slot missing)
OHLC exactly equals the 3-constituent partial aggregate: open 2646.11 high 2646.62 low 2645.36 close 2646.24 ✓
```

The returned 1h bar is indistinguishable from an honest 4-bar aggregate. `aggregate()` (`packages/trading-kit/src/data.ts`, lines commented "allSourcePresent") checks only that **every EXISTING source bar in the bucket is available**; a slot absent from the source is invisible to the check.

**(iii) 4h aggregation.** At clock 06:00Z the 04:00–08:00Z 4h bucket is correctly NOT returned (still unfinished — late constituents unavailable; R2's clock side works). **At the horizon (or any clock ≥ bucket end), the engine returns all 3 source-incomplete 4h buckets as "complete" bars:**

| 4h bucket | existing/required | returned | engine OHLC | equals partial-constituent aggregate |
|---|---|---|---|---|
| 2026-01-05 04:00Z | 15/16 | **yes** | O 2646.11 H 2647.07 L 2644.47 C 2644.84 | true |
| 2026-01-08 00:00Z (block gap [300..307]) | 12/16 | **yes** | O 2654.72 H 2656.48 L 2654.26 C 2656.02 | true |
| 2026-01-08 04:00Z | 12/16 | **yes** | O 2656.02 H 2657.81 L 2655.49 C 2656.57 | true |

**(iv) Full-fixture bucket audit (computed from source, not the engine).** 1h: 1 affected bucket (Jan 5 04:00Z, 3/4). 4h: 3 affected (above). The 1h buckets spanning the Jan 8 gap have **zero** existing bars and are therefore never returned (honest absence — reported by `availabilityAt`). Weekend-only single drops (idx 499, 1200) produce no weekday bucket defects. **Source edges:** first bar is 1h-aligned (fine); data ends at a slot that is the last 15m of its 1h bucket, but at clock=horizon the last available 1h/4h buckets are correctly withheld as unfinished (03:45/03:45-slot constituents lie beyond the horizon) — clock-side edge handling is correct. The violation is specifically the **interior source-missing-slot case**.

**(v) Internal contradiction.** At the horizon, `availabilityAt()` simultaneously reports `{status:'missing', from:1767586500(04:15), to:1767587400(04:30)}` — naming the interval as unavailable — **while `bars('1h')` and `bars('4h')` still return the covering buckets as complete bars** whose OHLC spans the very interval declared missing. The kit answers "this interval never existed (do not bridge)" AND "here is the bar covering it" in the same session.

**(vi) In-app browser confirmation (real crosshair interaction).** Replay entered at 00:00Z, stepped to **step 25 · instant 06:00Z**, timeframe 1h (6 bars in capped slice; gapnote renders "1 missing interval(s) — shown, never bridged"). Crosshair scan (`ct-case1-inapp-scan.json`): hovering the 04:00Z bar reads **O 2646.11 H 2646.62 L 2645.36 C 2646.24 · 2026-01-05 04:00Z** — exactly the partial-3 aggregate — rendered as a normal candle indistinguishable from the complete 00:00–05:00Z neighbors (`ct-case1-inapp-0430-bucket-hover.png`, reference neighbor `ct-case1-inapp-0330-reference.png`).

**RULE:** Against the ruling supplied with this case ("an aggregate requires ALL constituents incl. absent slots → such buckets are unavailable, reported by availabilityAt, never returned"): **VIOLATION.** For honesty: the committed R2 wording in D-002 ("all constituent base bars are available") is ambiguous about absent slots; the committed code resolves that ambiguity in the permissive direction, and the orchestrator's supplied amended framing rules it as a violation. Every affected bucket is *also* named by `availabilityAt()`, so the kit knows about the gap and still returns the bar.

---

## CASE 2 — FUTURE GAP INFORMATION via `availabilityAt()` — **VIOLATION (leak)**

**Reproduction:** `node ct-case2.mjs` + focused diff script (inline in addendum notes; outputs in `ct-case2-results.json`).

**(i) Direct leak.** Clock pinned exactly **04:15Z (1767586500, mid-gap)**:

```
availabilityAt() → [{ status: 'missing', from: 1767586500 (04:15Z), to: 1767587400 (04:30Z) }]
```

`to` = open time of the source bar at 04:30Z whose **close (04:45Z) is in the FUTURE** relative to the clock. `availabilityAt()` clamps only `at = min(t, clock.now())`, never `to` — the future resumption instant is served from a source bar beyond the clock. Per the rule "a public replay query must not reveal a future resumption time": **LEAK.**

**(ii) D-003-style mutation sweep** (clock pinned; ONLY bars with close > clock mutated; public outputs: `bars()` 15m/1h/4h, `availabilityAt()`, `queryRecords()`, consumer-visible max-H/SMA20; base idempotence self-check passed at every instant):

| Clock | Variant | Public outputs identical to baseline? | availabilityAt |
|---|---|---|---|
| 04:00Z | (a) removed 2 post-clock bars (04:00Z+04:30Z) | **false** | gained gap `[04:00Z → 04:30Z)` — new gap with future resumption revealed |
| 04:14:30Z | (a) same | **false** | gained gap `[04:00Z → 04:30Z)` |
| 04:15Z (mid-gap) | (a) removed the 04:30Z resumption bar | **false** — bars15/1h/4h + queryRecords all IDENTICAL; `availabilityAt` differs | `to` changed **04:30Z → 04:45Z** |
| 04:15Z | (a) removed 04:30Z+04:45Z | **false** | `to` became 05:00Z |
| 04:15Z | (b) added bar inside gap @04:15Z | **false** — bars identical; `availabilityAt` stopped reporting the gap entirely | `[]` |
| 04:15Z | (c) changed post-clock values, (a3) removed far-future bar | **true** | unchanged `{04:15Z → 04:30Z}` |
| 05:00Z | (a) removed 2 post-clock bars (05:00Z+05:15Z) | **false** | gained gap `[05:00Z → 05:30Z)` |
| 05:00Z / 07:00Z / horizon | (a3) far-future removal, (c) value changes | **true** | unchanged |
| horizon | (a) removed 2 post-clock bars (21:45Z+22:00Z) | **false** | gained 7th gap `[21:45Z → 22:15Z)` — future gap invented by the removal, revealed at the horizon clock |

**Precise scope of the leak (verified by field-by-field diff):** when availabilityAt differs, `bars()` at ALL granularities, `queryRecords()` payloads, and consumer-visible stats remain **identical** — the R1 slice isolation and the D-003 "isolation" proof hold for the outputs the prior verifier compared. The leak channel is **exclusively `availabilityAt()`**: it is driven by gap *structure* of post-clock source bars, so any structural mutation of the future (remove/add the resumption bar) changes what the public API reports about the historical region behind the clock. The prior verifier's poison sweep mutated only **values**, which is why 40/42-slice-style checks could not see this.

**RULE:** "If availabilityAt's `to` changes when the future resumes differently → LEAK, FAIL" — it does, at mid-gap and at every tested instant (new-gap variants). **VIOLATION.** (Note: the **current host app** renders only the *count* of missing intervals (`{replay.missing.length} missing interval(s)` in `+page.svelte`), not the interval endpoints — so the app does not display the resumption time today. But `availabilityAt` is the designated R2 public contract ("each gap is reported as explicit unavailability (interval …)"), and the contract itself carries future information. The kit-level ruling stands independent of the host's current rendering.)

---

## CASE 3 — MID-SESSION PERSISTENCE FAILURE — **VIOLATION (bounded: restore path correct, 3 of 4 mutations not refused)**

**Environment:** host served from a **fresh build** of the committed candidate via `npm run preview` (port 5199; `npm run check` → 0 errors/1 pre-existing warning; build PASS). CDP Chrome 154, dedicated tab, storage wiped first, `g1.levels.v1` created at 2649.5 via the real W1 flow before replay (W1 create/edit/undo/redo smoke: all "saved" — regression unaffected; `ct-case3-01`, `ct-case3-07`).

**Sequence:** replay session started at 00:00Z via the real select → 2 real Step clicks → **step 3 · instant 00:30Z**, valid record in `g2.replay.v1` (114 bytes) (`ct-case3-02`). Successful READ + acknowledgment happened at construction (app acknowledges after a successful `read()`); session active with a persisted record. Storage `g2.replay.v1` then **corrupted in place** (truncated record 60 bytes; `g1.levels.v1` untouched). Byte-diffs of `g2.replay.v1` and `g1.levels.v1` (and any other key present) taken before/after EVERY operation.

| Attempt | Refused as (a) demands? | Stored bytes unchanged? | Explanatory failure status visible in UI? |
|---|---|---|---|
| **Restore** | **REFUSED ✓** (READ path throws → catch) | **yes ✓** (corrupt bytes survive byte-for-byte; g1 levels unchanged) | **NO — nothing rendered anywhere** (DOM-wide search for `unavailable`/`READ_FAILED`/`unreadable`/`corrupt`: all absent; screenshot `ct-case3-03-restore-refused-corrupt.png`). Re-verifies prior finding F-2: the honest `replay.status` string is set internally but is never rendered in any element of `+page.svelte`/`ReplayIsland.svelte`. The user sees the panel pill "saved" (current-mode panel status, unrelated) and a replay banner that still says step 3 — **no signal at all that restore failed or why.** |
| **Step** | **NOT refused — proceeded** (step 3→4, instant 00:30→00:45Z, UI actively shows the advance = success-looking) | **NO — corrupt bytes REPLACED** by a fresh valid record (write `STORAGE_VERIFY_FAILED`-style check cannot fire because the kit's one-shot read-acknowledgment gate already passed at construction) | n/a — it claims success |
| **Drawings save** (real chart mouse-click → replay level) | **NOT refused — succeeded**; level "2649.789648329626 replay level step 4" persisted into the record | **NO** (record rewritten, now valid) | success display (level in panel) — `ct-case3-04` |
| **Reset** (with freshly corrupted bytes, 60 B) | **NOT refused** (confirm dialog accepted like a user); mode → CURRENT claimed | **NO — corrupt record DESTROYED** (key `g2.replay.v1` removed; only `g1.levels.v1` left) | claims success — `ct-case3-05` |
| Recovery (restore valid pre-corruption bytes, click Restore) | works: exact step 3 · 00:30Z restored, stored bytes match original, console clean | — | `ct-case3-06` |

**Root cause (code, not speculation):** the read-before-write gate is **one-shot** — `acknowledgeState()` at construction opens the write gate forever; `step()`/`createLevel()`/`returnToCurrent()`/`reset()` never re-read or re-verify the stored bytes before `persist()`. The adapter's write then overwrites (step/drawings) or removes (reset) contents the app can no longer read. Restore alone re-reads and therefore refuses. Per the criterion "(each must be REFUSED (no false success), stored bytes UNCHANGED": step, drawings-save and reset fail it; restore passes it. **UI refusal display: NOWHERE** (c) fails across all four — no flow claims a false *restored* state, but step/drawings/reset visibly claim success against unreadable stored bytes.

---

## Full-session regression snapshot (reproduction-only, no repairs)

- `npm run check`: **0 errors / 1 warning** (pre-existing baseline `state_referenced_locally`, ChartIslandLWC). `npm run build`: **PASS**.
- W1 smoke: level 2647.77 → edit 2649.5 → undo → redo all "saved" with correct store bytes; reload → no auto-resume (CURRENT), g1 level persisted (`ct-case3-07`).
- Replay smoke (browser): enter at index 0, steps to 06:00Z, 1h switch, crosshair readouts sane, gapnote rendering — unaffected (nothing repaired).
- CDP console: clean (zero errors/warnings) at all checkpoints of this run.

## Verdict (this addendum, per docs/EVALUATION.md vocabulary)

| Case | Verdict |
|---|---|
| CASE 1 (R2 incomplete HTF candle) | **VIOLATION** |
| CASE 2 (future gap info via `availabilityAt`) | **VIOLATION (leak)** |
| CASE 3 (mid-session persistence failure) | **VIOLATION** (bounded: restore-only correct; step/drawings/reset succeed against unreadable bytes; no UI refusal signal anywhere) |

## Recommendation to the orchestrator (amended status)

**G2 → HELD** pending a bounded remediation candidate and fresh verification. Rationale: the contested cases target **required G2 behaviors** (R2 availability semantics, poison-future "every result derived from the historical-visible slice remains identical" in D-003's both-directions criterion, honest refusal under storage failure per EXPERIENCE.md). The recorded PASS WITH NON-BLOCKING FINDINGS at `5ebe4ee` predates these cases and must be treated as contestable: Cases 1–2 are direct rule-level violations against the amended framing supplied with the contested-cases instruction (Case 2 being the sharper one — a leak channel the D-003 isolation proof structurally could not catch, because it compared only value mutations and never swept structural post-clock mutations). If the orchestrator rules the absent-slot reading differently (i.e., accepts the committed "all EXISTING source bars" interpretation of R2 and a `to` clamp exception), the cases collapse to documented rule-boundary findings instead — that adjudication is exactly why the verdict stays CONTESTED until ruled. Remediation sketch (for the orchestrator, not executed here): (1) `aggregate()` requires all `bucketSeconds/baseSeconds` slots present in the source AND available; (2) `availabilityAt()` must not reveal post-clock resumption instants — either clamp `to ≤ clock.now()` or report such gaps as open-ended unavailable regions (a one-shot decision should be recorded in DECISIONS.md); (3) per-persist re-verify readability of `g2.replay.v1` and refuse `READ_FAILED` on step/drawings/reset while bytes remain intact, plus render `replay.status` in the UI (carrying F-2).

## Unverified / out of scope in this run

- No new run of the prior verifier's full independent battery (fixture regeneration, consumer pack proof, width checks) — this addendum re-verified build health, W1, replay smoke, and console cleanliness only; the prior report remains preserved and unreplaced.
- `docs/STATE.md` intentionally NOT updated (belongs to the orchestrator's gate-record step; this is a reproduction-only, verdict-CONTESTED task; nothing committed or pushed).

## Artifact inventory (this addendum, `ct-` prefix)

- Kit-level: `docs/evidence/G2/ct-case1-results.json`, `ct-case2-results.json` (full outputs incl. the sweep table); harnesses in `C:/Users/RZ1/Desktop/RZ/g2-contested-consumer/` (`ct-case1.mjs`, `ct-case2.mjs`; kit installed from the fresh `npm pack` artifact, sha256 `38979340…`).
- In-app Case 1: `ct-case1-inapp-scan.json`, `ct-case1-inapp-0430-bucket-hover.png`, `ct-case1-inapp-0330-reference.png`, `ct-case1-inapp-1h-0430-bucket.png`.
- Case 3: `ct-case3-01…07` screenshots (7 files, browser walkthrough incl. corrupt-restore no-signal state, healed-by-step bytes, reset destruction, recovery, W1 reload).
- Steps: `docs/evidence/G2/ct-steps/*` (12 interaction scripts, CDP-driven via `vfy-cdp.mjs`).
- No secrets in any artifact; storage values are session records with price-level fixtures only (no credentials).