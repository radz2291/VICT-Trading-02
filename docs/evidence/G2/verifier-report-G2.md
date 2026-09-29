# G2 FRESH VERIFIER REPORT — blind replay in the workspace

- **Verifier:** fresh verification session (independent of the builder; wrote none of the candidate code)
- **Tested SHA:** `5ebe4eeae74bc608ada625feca57ee284a085747` — verified `git rev-parse HEAD` == SHA; working tree clean at start (only `docs/evidence/G2` additions by this verifier during the run)
- **No commits, no pushes, no repairs by the verifier.** Candidate left untouched; fixture mutations performed and reverted.
- **Environment:** Windows, Chrome 154 (fresh profile `g2-vfy-chrome-profile`), Node v22.13.1, app served via `npm run preview` (port 5199) from the committed build; kit driven directly via its `/dist` public exports and via a fresh packed tarball.

## Normative sources

`docs/HANDOFF.md` G2 record (ACCEPTED, pinned SHA `c9b780d…`, D-003 amendments), `docs/DECISIONS.md` D-002/D-003 (R1–R4), `docs/STAGES.md` G2, `docs/EXPERIENCE.md` W3 + honest states, `docs/evidence/G2/builder-report.md` (claims treated as UNPROVEN).

## D-003 amendment rulings (both explicitly)

1. **Poison-future, both directions — RULED WITH PROOF.**
   - **Potency (my own recomputation, not the builder's script):** full-history naive max baseline **3112.5** vs alternate **6112.5**; SMA20-final **3107.25** vs **6107.25** → changing ONLY bars after the horizon changes the naive full-history calc. (Repro: `node docs/evidence/G2/vfy-check-readouts.cjs` section + `vfy-isolation-kit.mjs` final lines; values match `fixture-meta.json` `naiveCalculations`.)
   - **Isolation (my own kit-API harness, `vfy-isolation-kit.mjs`):** 14 uneven clock steps × {15m, 1h, 4h}, each query deliberately requesting BEYOND the clock (`until = now + 1h`) → **42 served slices byte-identical across baseline/alternate variants** (digest `263186ea…`); 0 cap violations; 0 clock records above horizon. Plus **in-app** both-variant run: identical restored session at the same horizon instant — max H **2657.81**, SMA20 **2647.54**, **1998 bars** under both baseline and alternate builds (`gv2-17` vs `gv2-19`; panel shows "Fixture variant: alternate" in the alternate shot, proving the swap took effect). In-app readouts at 13 successive instants matched my fixture-derived oracle exactly (`vfy-check-readouts.cjs`: "ALL-IN-APP-SLICE-VALUES MATCH OWN ORACLE: PASS").
2. **Provenance-unknown drawing treatment (R3 amended) — RULED WITH PROOF.** With a pre-existing `g1.levels.v1` level (2649.5): replay view shows panel note "Existing saved levels are NOT shown in replay — provenance unknown. (1 hidden)" and **no level rendered** on the replay chart (`gv2-06`; the yellow g1 level line present in current mode is absent, `gv2-01` vs `gv2-06`). Kit predicate verdict: provenance-unknown HIDDEN in replay / VISIBLE in current (`vfy-consumer-results.json`). Replay-stamped level created at step 4 via a real chart mouse-click (`gv2-07`); **invisible at steps 2 and 3** after crafted-record restore, **visible at step ≥ 4** (`vfy-steps/rp-9-step-back-visibility.js`, `gv2-08` visible vs `gv2-09` hidden). Current-mode drawing behavior unchanged throughout.

## Per-check verdicts

| # | Check | Verdict | Direct evidence |
|---|---|---|---|
| 1a | Generator reproducibility + fixture identity | **PASS** (one formatting caveat below) | Regenerated in place: `g2-fixture-baseline.json` `5a0f4c1d…`, `g2-fixture-alternate.json` `13560efa…`, `fixture-meta.json` `a1addd…` byte-identical to committed; all values match `fixture-meta.json` `sha256` block (digest-of-array form) and `builder-report.md` (file-byte form). |
| 1b | Bars ≤ horizon identical (diff) | **PASS** | 1998 bars ≤ horizon identical across variants (my filter + JSON compare); prefix digest `c51a4e38…` matches meta; 25 tail bars differ only in values, identical times. |
| 1c | POTENCY (redo) | **PASS** | max 3112.5 → 6112.5; SMA20 3107.25 → 6107.25 (my recomputation, exact meta match). |
| 1d | ISOLATION (redo, kit + app) | **PASS** | `vfy-isolation-kit.mjs` (42/42 slices identical), in-app `gv2-17` vs `gv2-19` identical at horizon; 13-instant readout-oracle match. |
| 2 | Clock cap + no bypass | **PASS** | UI has no custom-instant input; horizon start + step: instant == horizon exactly, then **Step/Play disabled**, forced click no-op (`vfy-steps/rp-24-at-horizon.js`); kit-level: 1y-ahead advance/setFrame applied = horizon, `capped:true`; consumer beyond-horizon query `requestedUntil 1799143200 → servedUntil 1767604500` recorded. Rightmost chart bar at horizon = 21:30Z (close == horizon); series sweep shows nothing beyond the clock (JS crosshair sweep `vfy-steps` + readouts). Banner labelled and contexts mutually exclusive: CURRENT has `chart-island` and no `replay-island`; REPLAY has `replay-island` and **no** `chart-island` (`mutual-excl.js`/`mutual-excl-2.js`). Return-to-current intact: `g1.levels.v1` preserved, record marked `returnedToCurrent: true` (`gv2-18`). |
| 3 | HTF + gaps | **PASS** | 1h at mid-bucket instants 17:15Z/17:30Z: **375 buckets, last bucket unchanged (O 2645.37 H 2645.75 L 2644.38 C 2644.76 @ 16:00Z)**; no forming 17:00Z bucket; at 18:00Z boundary a completed 17:00Z bucket appears (376 buckets) (`rp-19…21`, `gv2-15/16`); 4h: 125 buckets, stats identical max (2657.81) from slice (`gv2-25`). Gaps: app shows "5 missing interval(s) — shown, never bridged" at ≤ Jan 26 — matches my fixture-derived oracle exactly (5 of 6 total gaps within served interval); gapped/incomplete 1h buckets dropped, never fabricated (`vfy-consumer-results.json` honest-aggregation count match). Chart data range contains no invented bars. |
| 4 | Drawings/annotations (D-003) | **PASS** | See amendment ruling 2 above; reset accept clears (`gv2-14`, key removed, mode CURRENT), dismiss-negative keeps everything (`gv2-13`, record byte-identical). |
| 5 | Session reload/restore/reset exact | **PASS** | Full page reload in replay → no auto-resume (CURRENT, `gv2-10`); Restore → exact step 5 · instant 18:15Z · level (creationStep 4) restored+visible, `chart-island` absent (`rp-13-restore-exact.js`, `gv2-11`). |
| 6 | Kit packaging proof (redo) | **PASS** | Fresh `npm pack`: reproducible — sha256 `38979340…`, **sha512 `86b53ccbec16f2bb02b9c00446e5aa4064eb4c62b47cebcb931fd230944c51dcb08621d5d6f8c85e0b26a17311a1b396cf9fef12e88dcb63ee9c78dcf3bf3600`** — matches BOTH committed tarballs (`packages/trading-kit/…tgz` and `docs/evidence/G2/consumer/…tgz`, sha256 `38979340…` each). Fresh consumer OUTSIDE the monorepo (`C:/Users/RZ1/Desktop/RZ/g2-vfy-consumer`) with OWN sin-series data + OWN in-memory adapter: beyond-horizon query capped+recorded; start/step/createLevel/restore exact; visibility predicates; read-failure → `READ_FAILED` (continuing session) and `READ_NOT_ACKNOWLEDGED` (fresh session) refusals; write-failure → ok:false QUOTA; stored bytes survived all refusals — **ALL 15 checks PASS, exit 0** (`vfy-consumer-results.json`). `npm ls --all`: only `@vict-trading/trading-kit@0.1.0`, no app/chart-workspace/VICT deps (`vfy-consumer-npm-ls.txt`). Import audit both directions: kit `dist` import specifiers are self-references only (single comment mention of the boundary text); chart-workspace has zero `trading-kit` references; kit runtime `dependencies: {}`. |
| 7 | Current-mode regression + width | **PASS** | W1 on a brand-new Chrome profile (zero storage): bare chart + CURRENT banner (zero keys) → create (+Level, saved) → edit 2647.77→2649.5 (saved, store bytes correct) → undo (2647.77) → redo (2649.5) → full reload persists 2649.5 (`gv2-02/03`). Narrow 375/768 in current (`gv2-04/05`) and replay (`gv2-23/24`): stacked layout, no data/dialog loss. Replay controls keyboard-accessible: real Tab-order in `[data-testid]` order, real **Enter keypress** on focused Step button advanced step 1→2 (`gv2-21`). Corrupt-key: corrupt `g2.replay.v1` → reload no crash → start/restore refused, corrupt bytes survive byte-for-byte (32 bytes) (`gv2-22`). |
| 8 | Checks + scope + console | **PASS** | `npm run check` 0 errors / 1 warning (pre-existing baseline `state_referenced_locally`, ChartIslandLWC — matches builder disclosure); `npm run build` PASS (re-ran twice); console clean (zero errors/warnings) at every checkpoint (`vfy-console-final.json`; my in-page interceptor + CDP console). Scope audit `git diff 429e395..5ebe4ee`: exactly `packages/trading-kit/**` (16 files), `host/{package.json,package-lock.json,src/lib/fixtures/g2-fixture.json,src/lib/islands/ReplayIsland.svelte,src/lib/replay.svelte.ts,src/routes/+page.svelte}`, `docs/evidence/G2/**` — ChartIslandLWC **untouched**; host/package.json adds only `@vict-trading/trading-kit: file:../packages/trading-kit`. Nothing outside authorized paths. |

## Findings (all non-blocking; none repaired by the verifier)

| ID | Severity | Finding | User effect |
|---|---|---|---|
| F-1 | minor | `generate.mjs` writes the host copy as **compact** JSON; the committed `host/src/lib/fixtures/g2-fixture.json` is **pretty-printed** (indent-1). The documented one-command regenerator therefore produces a byte-DIFFERENT host copy (git reports the file modified). Bars/meta content verified semantically identical (2023 bars, `e6b0b749…` digest), and both evidence-fixture variants ARE byte-identical on regeneration. | A future regeneration produces a spurious one-file diff; harmless today. |
| F-2 | minor | `replay.status` honest-state strings (`unavailable: storage read failed…`, `READ_NOT_ACKNOWLEDGED: …`, etc.) are **never rendered anywhere in the UI**. With a corrupt `g2.replay.v1`, start/restore are correctly refused and bytes survive, but the user sees NO visible explanation (panel pill still reads "ready"; that pill covers current-mode drawings only). | Silent refusal UX in the corrupt-store edge case; behavior is safe, display is not honest enough per EXPERIENCE.md. |
| F-3 | minor | Stale current-mode wording carried from G1: panel DATA note "The chart bridges gaps visually — treat as a known limitation until G2" and chart footer "(known limitation → G2)". In G2 these are outdated (the kit never bridges; replay has an explicit R2 missing-intervals note), though in the current-mode chart LWC still compresses over gaps. | Confusing text; no correctness effect. |
| F-4 | cosmetic | At 375/768 the readout line and tool hint overlap slightly (text collision, no interaction blocked). | Cosmetic only. |
| F-5 | cosmetic | Current-mode Instrument/Timeframe panel selects remain visible in replay and still persist `g1.workspace.v1` when changed; they do not affect the replay chart. | Mildly confusing; no data leak either direction. |
| F-6 | cosmetic | Browser tab title shows "VICT G0 Chart Spike" (layout default title beats the page title). | Cosmetic. |

## Unverified items (per protocol)

- None of the required demonstrations were converted to passes by inference; every claim above was executed by this verifier. The builder's own proof scripts and `g2-rp-*`/`g2-w1-*` screenshots were **not** relied on for any pass (they exist at the same SHA and are consistent with my independent results).
- STATE.md / HANDOFF gate-record update intentionally NOT done by this verifier (belongs to the orchestrator's gate-record step per the established pattern in prior stages).

## Verdict

**PASS WITH NON-BLOCKING FINDINGS**
(F-1..F-6 above; every G2 pass criterion 1–8 was demonstrated independently by this verifier, including both D-003 amendments. No stop condition observed.)

## Evidence inventory (this verifier)

- Screenshots: `docs/evidence/G2/gv2-01…gv2-25` (25 files, `gv2-` prefix)
- Kit-API isolation harness: `docs/evidence/G2/vfy-isolation-kit.mjs`
- Readout oracle: `docs/evidence/G2/vfy-check-readouts.cjs`
- Consumer proof (outside monorepo): `C:/Users/RZ1/Desktop/RZ/g2-vfy-consumer/consumer-vfy.mjs` → copied as `docs/evidence/G2/vfy-consumer-results.json`
- Browser steps: `docs/evidence/G2/vfy-steps/*.js`; CDP driver `docs/evidence/G2/vfy-cdp.mjs`
- Console capture: `docs/evidence/G2/vfy-console-final.json` (empty)
- npm-ls: `docs/evidence/G2/vfy-consumer-npm-ls.txt`

**Left in the working tree:** only the untracked verifier artifacts listed above (no tracked file modified; no commits; no pushes).