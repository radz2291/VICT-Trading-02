# G2 CORRECTION-CYCLE-2 FRESH VERIFIER REPORT — challenge to the standing remediated verdict

- **Verifier:** fresh cycle-2 verification session, fully independent of the cycle-2 repair builder. I did not build the candidate and I repaired nothing during this audit (kit/host untouched; my scratch directories live outside the repo).
- **Tested SHA (verified):** `git rev-parse HEAD` == `db66475a66186f0f1c5dd5f52a18b834fc94ae43` == `git log -1` == G2 correction-cycle-2 candidate; `git status` clean at start and at end (only new `ccv-` untracked evidence added); remote = `https://github.com/radz2291/VICT-Trading-02` (fetch+push), branch `main`.
- **Standing status being challenged:** amended verdict **PASS WITH NON-BLOCKING FINDINGS at `8cb55d6…`** (remediation verifier report preserved untouched). This cycle runs two NEW owner counterexamples against that status and re-verifies the resulting repair.
- **Method note:** every harness below is newly written by this verifier (not the builder's code); the availability oracle and the failed-write port emulation are my own constructions. A mid-session mistake in my own tooling (parallel-packed tarball race caused two prior-kit results to land in the "candidate" run) was caught by pack-identity verification, redone cleanly, and is documented here — no candidate-behavior evidence is affected.

## Environment and pack identities (checks 1, 4, 6)

| Pack | sha256 (fresh `npm pack` from fresh `tsc` build) | Matches |
|---|---|---|
| PRIOR candidate `8cb55d6…` (fresh git worktree `C:/Users/RZ1/Desktop/RZ/g2cc2-prior`) | `ed1af86a57e715a15b52911579f406d196720bc44266f8ed2d3fe0c28d9f79e0` | prior remediation verifier's recorded digest — reproduced |
| CANDIDATE `db66475a…` (fresh build of `packages/trading-kit`) | **`4316c06860fc84c11f30cde7df0ed7d73840d3669d99120243eac06aace9474b`** | **byte-identical to BOTH committed tarballs** (`packages/trading-kit/vict-trading-trading-kit-0.1.0.tgz`, `docs/evidence/G2/consumer/vict-trading-trading-kit-0.1.0.tgz`) |
- Fixture: committed `docs/evidence/G2/fixture.json`, 2023 bars, digest-of-array `e6b0b749bc09f9a0…` (matches all prior evidence); horizon 2026-02-02T21:45Z; source holes: 2026-01-05 04:15Z slot; 2026-01-08 03:00–05:00Z block; 4 weekend breaks; fixture last bar extends past the horizon (Feb 3 03:45Z).
- Scratch consumers OUTSIDE the monorepo: `C:/Users/RZ1/Desktop/RZ/g2cc2-prior-consumer` and `C:/Users/RZ1/Desktop/RZ/g2cc2-vfy-consumer` (fresh `npm init` + `npm install <tarball>` each; `npm ls --all` shows only `@vict-trading/trading-kit@0.1.0` — `ccv-fixA` consumer copy in `docs/evidence/G2/npm-ls.txt` is the candidate consumer's).
- Browser: dedicated headless Chrome 154.0.8037.58, own debug port 9345, fresh profile dir `C:/Users/RZ1/Desktop/RZ/g2cc2-chrome-profile`; app served from a FRESH production build of the candidate tree on port 5278 (`vite preview --strictPort`, stopped after the run). Hydration completed normally (the cycle-2 builder's headless hydration failure did not reproduce).

## CHECK 1 — Counterexample A at PRIOR candidate `8cb55d6…` — **VIOLATION CONFIRMED (repaired at candidate)**

**Reproduction** (`ccv-prior-CE.mjs` → `ccv-prior-CE-results.json`, prior pack `ed1af86a…`): two sources with an IDENTICAL available prefix (and byte-identical public history) — variant A = committed fixture; variant B = same fixture with every bar whose close > clock deleted. Compared ALL public outputs at 8 clocks.

- **Confirmed at 8/8 clocks (incl. 04:15Z, 05:00Z, 06:00Z, 07:15Z, Jan-8 06:00Z, horizon, both strict-greater instants):** `availabilityAt()` DIFFERS between A and B while `bars()` (15m/1h/4h) is identical. Traced to the prior `nextSource` lookahead: the trailing open-ended entry is emitted **iff a further source bar exists** — deleting the clock-invisible future remainder makes the trailing entry DISAPPEAR (e.g. at 04:15Z: A → `[{from:04:15, to:null}]`, B → `[]`; at 21:30:00.5Z: A trailing `{from:21:30, to:null}`, B none).
- Ruling from the remediation verifier had accepted this as "never names a future instant" — accepted because nothing future-VALUED leaks — but the OWNER's counterexample is precisely that the entry is **future-EXISTENCE-sensitive**: outputs are not a function of clock-visible information. The old semantics violates the strengthened rule (future-free availability). **Violation stand at `8cb55d6…` confirmed with direct mechanical evidence.**

## CHECK 2 — Counterexample B at PRIOR candidate `8cb55d6…` — **VIOLATION CONFIRMED (repaired at candidate)**

**Reproduction** (same harness, same prior pack): healthy session, then port flip → `write() {ok:false}` / `throw`.

- **Confirmed silent state advance after refused writes** (`ccv-prior-CE-results.json → ceB`): refused **step** → clock advanced (00:30Z→00:45Z) and stepIndex 3→4 despite `ok:false`; refused **createLevel** → ghost drawing present in live state despite refusal; refused **start** → levels discarded/frame reset despite refusal; refused **play** → `playing:true` stuck on; refused **returnToCurrent** → session marked ended despite refusal; **reset with throwing remove** → live state cleared despite refusal (extra cell `ccv-prior-reset-cell.mjs` output captured in report text). In every case the port's refusal was returned truthfully as `ok:false` (code echo), yet **commit-before-write** left live state inconsistent with storage. Violation class owner-cited: step/clock advanced, drawings added. **Confirmed.**

## CHECK 3 — Repair A at candidate `db66475a…` (future-free availability) — **RESOLVED / PASS**

Harness `ccv-fixA.mjs` → `ccv-fixA-results.json` (candidate pack `4316c068…`; the "lookahead" code is mechanically absent from the candidate dist — `grep nextSource dist/data.js` → 0):

1. **Owner's exact discriminating case, now INVERTED:** at all **9 clocks** (04:14:30Z, 04:15Z, 04:15:01Z, 05:00Z, 06:00Z, 07:15Z, Jan-8 06:00Z, 21:30:00.5Z, horizon 21:45Z) — `bars()` 15m/1h/4h, `availabilityAt(t)` and `availabilityAt()`, `queryRecords` (seq-stripped) are **ALL IDENTICAL** between future-present and future-removed sources. The owner counterexample no longer reproduces.
2. **My own clock-visible oracle** (interior gaps between consecutive AVAILABLE bars with numeric `to` = resumption bar's open; trailing `{from: lastAvailableClose, to: null}` **iff lastAvailableClose < now**; nothing otherwise) matches the engine `availabilityAt` **exactly at 9/9 clocks × both variants**.
3. **`lastAvailableClose === now` equality edge, BOTH directions:** at exactly 04:15Z → `[]` (no trailing entry — availability current through the clock); at 04:15:01Z → trailing `{from:04:15, to:null}`; also at horizon 21:45Z (bar 21:30 closes 21:45 == clock) → no trailing entry. All three asserted against the engine directly. PASS.
4. **Potency is real:** naive full-history max-high **3112.5** vs **2657.81**, SMA20-of-closes **3107.25** vs **2647.537**, bar count 2023 vs 1998 (full vs future-deleted at horizon); at the 06:00Z clock-visible view: naive max-high 3112.5 (full-history source) vs 2650.34 (prefix), SMA20 3107.25 vs 2646.9715, 25 fewer bars. The two sources genuinely differ in future content; identity of replay outputs is therefore meaningful. Numbers match the builder's recorded values exactly.
5. **Focused mutation sweep (my own, protocol: mutations must touch ONLY bars with close > clock):** 7 mutation kinds (remove resumption 04:30Z; ADD bar inside the 04:15Z slot; remove 04:30Z+04:45Z; value-change +5 on ALL post-clock bars; remove far-future 07:00/07:15Z; remove horizon-edge bars; add bar beyond fixture end) × 5 clocks (04:15Z, 05:00Z, 07:15Z, Jan-8 06:00Z, horizon) → **19 applicable rows, 19/19 identical** across every public output; **16 not-applicable rows recorded explicitly** (mutation touches a clock-visible bar — those differ on the CHANGED history, which is correct engine behavior, not a leak). This exceeds and includes the builder's 9/9 set.
6. **Historical interior gap preserved:** `{from: 04:15Z, to: 04:30Z}` is still reported at every clock where it is clock-visible (05:00Z, 06:00Z, 07:15Z, Jan-8, horizon — checked in every applicable sweep row too). No over-suppression.

**Repair A ruling: RESOLVED.** Future-existence no longer influences any public output; semantics = pure clock-visible oracle both directions.

## CHECK 4 — Repair B at candidate `db66475a…` (transactional persistence) — **RESOLVED / PASS**

Harness `ccv-fixB.mjs` → `ccv-fixB-results.json` + live-session continuation cell `ccv-fixB-live.mjs` (printed in this report's run log):

1. **17-row failed-write table — 17/17 PASS:** ops start / step / createLevel / removeLevel / play / pause / returnToCurrent / restore × {`{ok:false}`→`WRITE_REFUSED`, `throw`→`PORT_ERROR`} + reset-removal(`throw`→`PORT_ERROR`; `{ok:false}` is **not applicable** for removal — the port's `remove()` contract has no `ok:false` value channel, recorded in the results JSON). For EVERY row: op refused (`ok:false`), **state-before == state-after** (clock instant, step index, levels, playing, returnedToCurrent, clock operation-log length), **stored bytes unchanged**, code truthful.
2. **Live-session continuation (stronger than the adopted-state rows):** healthy session at a real instant (01:00Z, step 3, 1 level) → refused step/createLevel/returnToCurrent → **clock instant, step index, level list, storage bytes all identical before/after** — no silent advance, no ghost, session not falsely ended; then a healed step succeeds (step 4) and the stored record reflects exactly the successful writes.
3. **Recovery:** healing the port then re-issuing refused ops succeeds.
4. **RELOAD adopts exactly the LAST SUCCESSFUL write:** in the ghost scenario the level created during the failing phase (`ghost`, price 888) is **absent** from the stored record; only `seed-level` + `post-heal` present, stepIndex = successful count (4). A fresh session + fresh clock adopting the stored bytes matches **exactly** (`reloadExact: true`, full field-by-field comparison). No phantom steps, no ghost drawings.
5. **restore() write-first commit:** a refused restore leaves the live session untouched (fresh session did NOT adopt the record — verified in rows 15–16 — no silent overwrite either direction).

**Repair B ruling: RESOLVED.** Commit-before-write is inverted to write-commit-first everywhere; prior-kit violations (checks 1–2 above) no longer reproduce.

## CHECK 5 — Browser flows (real Chrome, real interactions) — **PASS**

Served from the fresh candidate build (port 5278); dedicated tab; real button clicks / REAL input-pipeline mouse + keyboard (CDP `page.mouse`, `page.keyboard`); `replay-status` verified for role, visibility-on-screen, and text at every refusal.

1. **Enter replay + real steps:** start select (index 0) → banner REPLAY-labelled "historical fixture data as of 2026-01-05 00:00Z · NOT current", position step 1 · 00:00Z; 3 REAL Step clicks → step 4 · 00:45Z (`ccv-07-replay-stepped.png`).
2. **Replay-stamped drawing via REAL chart mouse click:** level 2649.86 at step 4 persisted in `g2.replay.v1` (`ccv-09-replay-level-created.png`).
3. **Corrupt `g2.replay.v1` mid-session → refusals render:**
   - Step → alert `role="alert"` **visible on screen**: "step unavailable: storage read failed"; position unchanged (step 4 · 00:45Z); bytes unchanged (ccv-12).
   - Restore → "restore unavailable: storage read failed", same checks (ccv-14).
   - Drawing save (real chart click) → "save unavailable: storage read failed", no ghost level, bytes unchanged (ccv-16).
   - Reset (real confirm dialog accepted) → "reset unavailable: storage read failed", corrupt bytes survived (ccv-18).
4. **In-browser failed write (REAL storage protocol failure: `Storage.prototype.setItem` patched to throw):** Step → **"step failed: storage write could not be completed — no state change"** (PORT_ERROR path), alert visible, position + bytes + g1 unchanged. Recovery after healing: real click Step → advances normally (step 4→5 after restore-exact). *Honesty note:* the `{ok:false}` → WRITE_REFUSED host wording is code-verified (mapping in `host/src/lib/replay.svelte.ts`) and proven at kit level (17-row table), but cannot be produced via storage manipulation alone in a live browser (the host port has no `{ok:false}` production path) — demonstrated once at kit level with byte-identical storage port, not claimed as an interactive demo.
5. **Recovery restore works:** valid bytes restored → Restore → **"restored · step 4 · instant 00:45Z"** exact with the level back (ccv-20); and in the corrupt-at-start state after healing: "restored · step 5 · 01:00Z" (ccv-33).
6. **F-RV-2 class verified FIXED live:** corrupt-at-start → page reload → app sits in CURRENT mode → real Restore click → **`replay-status` (role="alert") IS rendered outside `replay.active`** with "restore unavailable: storage read failed" (ccv-31); Reset click corrupt bytes survived. The former carried finding is closed with interactive evidence.
7. **W1 regression:** create → edit to 2649.50 → undo → redo all "saved", 1 level, before any replay (ccv-03); reload → level persisted, CURRENT banner, no auto-resume (ccv-05).
8. **Return-to-current exact:** real click → CURRENT banner, `returnedToCurrent: true` persisted, step-5 record kept, g1 level intact, replay controls gone (ccv-28).
9. **Keyboard:** REAL keyboard focus + Enter on Step advances step 5→6 (ccv-35).
10. **Console: clean** — 0 errors / 0 warnings across the whole browser session (`ccv-console-final.json` = `[]`).
11. **Narrow width:** 375×760 renders current mode without overlap (ccv-36).

## CHECK 6 — Consumer + pack — **PASS**

- Candidate consumer outside the monorepo installs the fresh candidate tarball (`npm ls --all` → kit only). All kit harnesses above ran against that fresh install.
- Import audit (mechanical, all 12 dist js/d.ts files): **zero non-relative imports**; **zero runtime deps / zero peer deps**; tarball contents = dist + README + package.json only.

## CHECK 7 — Checks / scope — **PASS / PASS**

- Kit `tsc` build clean (fresh full build + `npm pack`). Host `npm run check`: **0 errors / 1 warning** (pre-existing baseline `state_referenced_locally`). Host `npm run build`: **PASS** (38.7s; preview served from this exact build).
- Scope audit `git diff 8cb55d6..db66475 --stat`: product-code changes are exactly `packages/trading-kit/src/**` (data, session, clock, types, index), `packages/trading-kit/README.md`, `host/src/lib/replay.svelte.ts`, `host/src/routes/+page.svelte`, both tarballs ×2, plus evidence/docs-with-cc2-prefix. The doc deltas beyond evidence (AGENTS.md status line, HANDOFF.md append, STATE.md append, STAGES.md status note, SESSIONS.md session record) are the orchestrator-style append-only recording of the ALREADY-VERIFIED remediation history — they introduce no unverified claims (their content matches the preserved reports). No product code outside kit/host touched.

## Findings

- **F-C2-1 (minor, non-blocking, record-keeping):** `docs/DECISIONS.md` still has NO D-004 entry (mechanically re-verified this session: grep → no match; file ends at D-003), while STAGES/HANDOFF/STATE cite D-004 normatively. Additionally the NEW cycle-2 ruling (clock-visible-only availability; no-entry at `lastAvailableClose === now`) is documented only in kit `types.ts`/README — not as a decision record. Owner/orchestrator action; no code defect.
- **F-C2-2 (minor, non-blocking, honesty of display scope):** the host `WRITE_REFUSED` wording is code-verified + kit-proven but has no live-browser production path (the host port never resolves `{ok:false}`); PORT_ERROR wording was verified live. Bounded; no user effect found.
- **F-C2-3 (informational):** fixture last bars extend past the horizon (Feb 3) — post-horizon rows are unreachable by the capped clock; harmless, but fixture consumers should note it.
- **F-C2-4 (informational, environment):** the cycle-2 builder's headless hydration failure did NOT reproduce (fresh profile on my unique port hydrated fine); its artifacts (`cc2-01-current-smoke.png`, `cc2-02-UNUSABLE-hydration-incomplete.png`) remain correctly labeled as unusable evidence.

## Unverified / not demonstrated

- **In-browser failed-write TABLE × 8 ops × both failure shapes with UI walkthrough:** the kit-level 17-row table is complete and authoritative for state/bytes guarantees; the browser walkthrough demonstrated the refused-step + refusal display + recovery + reload-exact via REAL interactions (restore path), and PORT_ERROR live. Per-op × per-shape browser sweep was not run (kit-level evidence + spot browser checks stand in; explicitly recorded).
- **WRITE_REFUSED live-browser rendering:** code + kit-level only (see F-C2-2).
- Prior candidates' unrelated battery (regenerator pretty-print, 375/768 W3 sweeps beyond my 375 current-mode check): not re-run; prior reports preserved.

## VERDICT SUMMARY (docs/EVALUATION.md vocabulary)

| Item | At prior `8cb55d6…` | At candidate `db66475a…` |
|---|---|---|
| Counterexample A — future-sensitive availability (trailing entry) | **VIOLATION confirmed** (8/8 clocks) | **RESOLVED** — 9/9 clocks fully future-free; own oracle exact both directions; equality edge both directions; interior gap preserved |
| Counterexample B — failed-write silent state advance | **VIOLATION confirmed** (step/clock, ghost drawing, returnToCurrent, reset) | **RESOLVED** — 17/17 rows state+bytes unchanged with truthful codes; recovery works; reload = last successful write exactly |
| FIX C — refusal display incl. F-RV-2 current mode | (prior F-RV-2 open) | **RESOLVED live** — corrupt-at-start current-mode refusals render `role=alert` visible on screen |

## Recommended G2 status

**PASS WITH NON-BLOCKING FINDINGS** at candidate `db66475a66186f0f1c5dd5f52a18b834fc94ae43` — both new owner counterexamples are confirmed real defects at the standing `8cb55d6…` candidate and resolved with fresh independent kit-level and real-browser evidence. The amended verdict at `8cb55d6…` is thereby superseded; earlier verdicts and red evidence remain preserved. Carry F-C2-1 (record D-004 + cycle-2 ruling in DECISIONS.md) and F-C2-2 alongside the existing F-1/F-3 minors. STATE.md/orchestration updates belong to the orchestrator, not this verifier session.

## Working-tree discipline

No tracked file modified; nothing committed; nothing pushed; nothing repaired; no secrets, orders, publishing. Session-owned processes (preview 5278, Chrome 9345) stopped after evidence capture; prior sessions' server (5199) and Chrome (9222) untouched. Scratch dirs + prior worktree `g2cc2-prior` live outside the repo at `C:/Users/RZ1/Desktop/RZ/`.

## Artifact inventory (all `ccv-` prefix, new; no prior artifact edited)

- `ccv-prior-CE.mjs` (in scratch consumer) → `ccv-prior-CE-results.json` — CHECKS 1–2.
- `ccv-fixA.mjs` (in scratch consumer) → `ccv-fixA-results.json` — CHECK 3 (incl. sweep + oracle + potency).
- `ccv-fixB.mjs`, `ccv-fixB-live.mjs` (in scratch consumer) → `ccv-fixB-results.json` — CHECK 4.
- `ccv-cdp.mjs`, `ccv-steps/*`, `ccv-console-final.json` — CHECK 5 driver/steps/console.
- Screenshots: `ccv-01-current-desktop.png`, `ccv-03-w1-recreated.png`, `ccv-07-replay-stepped.png`, `ccv-09-replay-level-created.png`, `ccv-12-refused-step.png`, `ccv-14-refused-restore.png`, `ccv-16-refused-save.png`, `ccv-18-refused-reset.png`, `ccv-20-recovery-restored.png`, `ccv-22-refused-write-port-error.png`, `ccv-28-return-current.png`, `ccv-31-frv2-currentmode-refusal.png`, `ccv-33-recovery-after-corrupt-start.png`, `ccv-35-kb-step6.png`, `ccv-36-narrow375-current.png`.
- `ccv-fixB.mjs` also copied here for lineage reproducibility.