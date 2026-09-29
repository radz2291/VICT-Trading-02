# G2 BOUNDED REMEDIATION REPORT — R2 absent-slot aggregates, availabilityAt future-leak, per-op persistence re-verify, honest refusal display

- **Builder:** remediation worker session (this session). **Not self-accepted:** every fix below requires fresh verification by an independent verifier before any gate status changes.
- **Baseline HEAD:** `e7eae653906fcc19a1211aa0ed7f15c8bb36e470` (clean at start; the contested-cases addendum's `ct-*` artifacts were committed by the orchestrator as `319bd9a` before this work began).
- **Authority:** owner-directed remediation of the G2 HELD status per `docs/evidence/G2/verifier-report-G2-contested.md` (all three cases VIOLATION). Scope held to: `packages/trading-kit/**`, `host/**`, `docs/evidence/G2/**` (new `rm-` prefixed artifacts only). No commit/push by this session (orchestrator integrates). No publish. No G3 code.
- **Normative interpretation (recorded per owner's contested-case ruling, now binding for R2):** "all constituent base bars are available" (D-002 R2) is read as **all REQUIRED slots present-and-available** — a bucket slot absent from the source is treated exactly like an unavailable constituent. Additionally: **a public replay query must not reveal a future resumption time** — gaps are computed only over source bars with close ≤ the clock instant, and a gap whose resumption is not yet within the clock's availability is reported **open-ended** (`to: null`). These interpretations come from the owner's ruling on the contested cases; they are now the normative reading, not a builder choice.

---

## FIX A — R2 absent-slot aggregates (`packages/trading-kit/src/data.ts`)

**Change:** `aggregate()` was rewritten. For every bucket touched by available bars it now enumerates the REQUIRED slots `bucketStart + k*baseSeconds (k = 0..factor-1)` and returns an aggregated bar **only** when every required slot exists in the source AND is available. The old `allSourcePresent` check (every EXISTING source bar in the bucket available — invisible to absent slots) is removed. `factor === 1` (base granularity) still returns the available slice unchanged — base output is bit-identical to before.

**Oracle & proof (`rm-fix1-results.json`, harness `rm-fix1.mjs` in the external consumer):**
- Independent source-level bucket audit: affected 1h buckets = 1 (`2026-01-05 04:00Z`, 3/4 slots); affected 4h buckets = 3 (`2026-01-05 04:00Z`, `2026-01-08 00:00Z`, `2026-01-08 04:00Z`) — exactly the buckets the contested addendum named.
- Previously-violating queries now refuse: 1h `04:00–05:00Z` bucket absent at clock 06:00Z; all 3 incomplete 4h buckets absent at the horizon. PASS.
- Engine output equals a from-source computed oracle (complete-bucket enumeration) at 5 clock instants × {1h, 4h}: bar-for-bar JSON equality. PASS.
- Base 15m output unchanged (equals available source prefix) at all tested clocks. PASS.
- **In-app:** replay stepped to 06:00Z, 1h view — crosshair sweep of the whole chart shows exactly 5 bars (00:00Z…03:00Z, 05:00Z); **no 04:00Z bar exists** and the partial OHLC (O 2646.11 H 2646.62 L 2645.36 C 2646.24) never appears (`rm-htf-1h-no-fabricated-0400.png`); 4h view shows no incomplete bucket (`rm-htf-4h-incomplete-hidden.png`); gaps explicit in the gapnote.

## FIX B — availabilityAt future-leak (`packages/trading-kit/src/data.ts`, `types.ts`)

**Change:** `availabilityAt()` now computes gaps ONLY over source bars with close ≤ `at` (= min(t, clock.now())). `MissingInterval.to` is now `number | null` (`types.ts`, documented): `to` is a number ONLY when the resumption bar is already within the clock's availability; otherwise the gap is OPEN-ENDED (`to: null`). No gaps are invented beyond known source extent: the trailing interval requires a further source bar to exist.

**Availability-edge semantics (uniform rule, recorded):** the interval from the last available bar's close onward is always reported open-ended while any later source bar exists. This is required for honesty AND for the both-directions mutation criterion: with the edge suppressed, removing the edge bar would CREATE a new reported gap (a structural future leak); with the uniform rule, adding/removing/modifying post-clock bars changes nothing public. The edge entry says only "no available data known from this instant onward" — it never names a future instant.

**Proof (`rm-fix2-results.json`, harness `rm-fix2.mjs`):**
- At clock 04:15Z (mid-gap): `{status:'missing', from:04:15Z, to:null}` — identical under (i) removal of the 04:30Z resumption bar and (ii) insertion of a post-clock bar at 04:15Z. PASS.
- Resumption WITHIN the clock (clock 04:45Z): `{from:04:15Z, to:04:30Z}` — `to` is a number and equals the resumption bar's open. PASS.
- Full mutation sweep (clocks 04:00Z, 04:14:30Z, 04:15Z, 05:00Z, 07:00Z, horizon × variants: remove 2 earliest post-clock bars, remove last post-clock bar, add gap bar @04:15, remove 04:30Z resumption bar, change all post-clock values): **every variant identical to baseline on every public output** — bars() 15m/1h/4h, availabilityAt, queryRecords, maxH/SMA20 (JSON-string compare). PASS (all identical).
- Horizon: 6 named source gaps (all `to` non-null, resumptions historical) + trailing open-ended availability edge; no invented gaps beyond source extent. PASS.

## FIX C — persistence re-read-verify per persist op (`packages/trading-kit/src/session.ts`)

**Change:** the one-shot construction-time acknowledgment no longer opens the write gate forever. EVERY persisted mutation — `start`, `step`, `play`, `pause`, `restore` (via its own read), `createLevel`, `removeLevel`, `returnToCurrent`, `reset` — first **re-reads (re-verifies readability of) the stored record** (`reverify()` before any state mutation). On read failure the op is REFUSED with `{ok:false, code:'READ_FAILED'}`, no write occurs, no in-memory state changes, stored bytes untouched. `READ_NOT_ACKNOWLEDGED` corrupt-at-start behavior is intact. Recovery: once a successful read completes (the next op's re-verification, or an explicit `acknowledgeState` after a successful consumer read), subsequent ops work; `acknowledgeState` remains required only once at construction. README + consumer example updated with the semantics.

**Proof (`rm-fix3-results.json`, harness `rm-fix3.mjs`):** valid session (start/step/createLevel ok) → corrupt `g2.replay.v1` in place → step / save / play / pause / restore / returnToCurrent / reset ALL refused with `READ_FAILED`; stored bytes byte-identical; live state consistent (step 2, 1 level, clock unmoved by the refused step); recovery after restoring valid bytes works (step + level ok); reset-refusal preserves the corrupt key bytes; getter-throw and corrupt-at-start variants still gate with `READ_NOT_ACKNOWLEDGED`. PASS.

## FIX D — honest refusal display in host (`host/src/lib/replay.svelte.ts`, `host/src/routes/+page.svelte`)

**Change:** every refused replay action now sets a truthful, action-specific status (`refused()` helper, EXPERIENCE.md wording), rendered in the replay panel as `<p data-testid="replay-status" role="alert">` (red when failed). Statuses verified in-app against corrupt `g2.replay.v1` (byte-diffs around each op):
- Restore → "restore unavailable: storage read failed" (`rm-refused-restore.png`)
- Step → "step unavailable: storage read failed" (`rm-refused-step.png`)
- Drawing save (real chart click) → "save unavailable: storage read failed" (`rm-refused-drawing-save.png`)
- Reset (dialog accepted) → "reset unavailable: storage read failed" (`rm-refused-reset.png`)
In all four cases stored bytes stayed byte-identical and the session position/state stayed honest. Recovery: restoring valid bytes + Restore → "restored", step 3 · 00:30Z exact (`rm-recovery-restored.png`).
**Gapnote updated:** open-ended intervals render as "missing from `<time>` — still missing" without an end (e.g. `rm-openended-gap-midclock.png` at clock 04:00Z; named intervals render "…from 04:15Z to 04:30Z" at 06:00Z).

## FIX E — full contested-case rerun (this session, fresh build) + regression

- Kit-level proofs: all three harnesses PASS against a fresh `npm pack` installed into an independent scratch consumer (`C:/Users/RZ1/Desktop/RZ/g2-contested-consumer`, `npm ls --all`: only `@vict-trading/trading-kit@0.1.0` — see `rm-consumer-npm-ls.txt`; results: `rm-fix1-results.json`, `rm-fix2-results.json`, `rm-fix3-results.json`).
- **Fresh pack:** `vict-trading-trading-kit-0.1.0.tgz` — sha256 `ed1af86a57e715a15b52911579f406d196720bc44266f8ed2d3fe0c28d9f79e0`, sha512 `d5c5b5eb979232144cfa1aad9e17fc95c3e34094155d3fc3cc5ff9eb6b714a94527008e8e92edb59c6e2930a88d878e2fa274f15bbf3c736d6b95aa31d9362b7`. Committed tarballs updated in BOTH locations (`packages/trading-kit/`, `docs/evidence/G2/consumer/`) — byte-identical to each other (sha256 verified equal), so byte-identity checking stays possible. Zero runtime deps unchanged.
- External consumer rerun: all three rm-fix harnesses PASS from the fresh tarball; import audit unchanged (no new dependencies).
- `npm run check` (host): **0 errors / 1 warning** (pre-existing baseline `state_referenced_locally`, ChartIslandLWC). `npm run build`: **PASS** (final kit build; preview served from this build for ALL browser evidence).
- W1 regression: fresh storage → create → edit 2649.50 → undo → redo all "saved" (`rm-w1-level-saved.png`); reload → level persisted (`rm-03` readout: levelsAfterReload 1).
- Replay smoke: enter at 00:00Z → steps → restore (exact step 3 · 00:30Z) → return-to-current → CURRENT banner, record `returnedToCurrent:true`, g1 level intact (`rm-replay-smoke-return-current.png`).
- Console: **clean (0 errors / 0 warnings)** across the whole browser run (`rm-console-final.json`).

## Commands (reproduction)

```
# kit build + pack
cd packages/trading-kit && npm run build && npm pack
# node proofs (external consumer with fresh tarball installed)
cd C:/Users/RZ1/Desktop/RZ/g2-contested-consumer
node rm-fix1.mjs && node rm-fix2.mjs && node rm-fix3.mjs
# host checks + app evidence
cd host && npm run check && npm run build && npx vite preview --port 5199
node docs/evidence/G2/vfy-cdp.mjs goto http://localhost:5199 1280 900
# then the steps in docs/evidence/G2/rm-steps/ (rm-01…rm-16) via vfy-cdp.mjs eval/shot/hover
```

## Interpretation notes for the verifier (ruling-derived, please confirm)

1. **Required-slots reading of R2 is now normative** (owner's contested-case ruling) — implemented as such.
2. **Open-ended `to: null` semantics** incl. the uniform availability-edge entry (documented in kit README, types, and above). The edge entry means "no available data known from this instant onward"; it never reveals a future instant and is what makes post-clock structural mutations publicly invisible.
3. At any clock, `availabilityAt()` therefore ends with the open-ended edge interval when further source bars exist; at the horizon that is the sanctioned "gap extending past the horizon stays open-ended".
4. Unverified here (out of scope): the prior verifier's full independent battery (fixture regeneration pretty-print, width checks). Prior reports preserved untouched.

## Artifact inventory (`rm-` prefix, all new; no prior report edited)

- Reports/results: `remediation-report-G2.md`, `rm-fix1-results.json`, `rm-fix2-results.json`, `rm-fix3-results.json`, `rm-consumer-npm-ls.txt`, `rm-console-final.json`.
- Screenshots: `rm-w1-level-saved.png`, `rm-refused-restore.png`, `rm-refused-step.png`, `rm-refused-drawing-save.png`, `rm-refused-reset.png`, `rm-recovery-restored.png`, `rm-htf-1h-no-fabricated-0400.png`, `rm-htf-4h-incomplete-hidden.png`, `rm-openended-gap-midclock.png`, `rm-replay-smoke-return-current.png`.
- Steps: `rm-steps/rm-01…rm-16` (CDP-driven via the existing unmodified `vfy-cdp.mjs`).
- Harnesses (external consumer, not committed to this repo): `rm-fix1.mjs`, `rm-fix2.mjs`, `rm-fix3.mjs` in `C:/Users/RZ1/Desktop/RZ/g2-contested-consumer/`.
- Tarballs (updated, byte-identical): `packages/trading-kit/vict-trading-trading-kit-0.1.0.tgz`, `docs/evidence/G2/consumer/vict-trading-trading-kit-0.1.0.tgz` (sha256 `ed1af86a…`).
- No secrets, no orders, no publishing; storage artifacts contain fixture price levels only.
