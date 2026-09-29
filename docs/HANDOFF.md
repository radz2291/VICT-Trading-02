# Repository-specific autonomous handoff — VICT Trading Workspace

**STATUS: ACCEPTED.** Owner acceptance recorded 2026-09-27 for this file as committed at `5ed125aa222c4b2f17832e5a5dbad8140b3638e4` (owner instruction: "Ok then please proceed", given after review of the draft). This handoff's stage records have since progressed: **G0, G1, and G1-PKG were each accepted, executed, and closed (verdicts PASS WITH NON-BLOCKING FINDINGS); the D-001 and D-002 decisions are owner-accepted; the G2 record below is DRAFT and NOT accepted** — each later stage record carries its own acceptance note and baseline SHA.

## Target and provenance

- New app repository: https://github.com/radz2291/VICT-Trading-02
- Default branch: `main`
- Base full SHA: `3e7535f0788f612de8509043c6e8ae9eafcfc4ff` (B0 root commit; remote `origin/main` verified equal to local HEAD at B0 completion)
- Authorized work branch / push remote: push to `origin/main` on the repository above. Agents may create short-lived working branches (e.g. `g0/...`, `stage/...`) merged into `main`; audit/verifier work may use isolated worktrees. **No force-push. No push to any other repository.**
- Read-only references: https://github.com/radz2291/vict-02 and https://github.com/radz2291/VICT-Trading (VICT-Trading pinned snapshot `38f654e2ceffa0455fd5e7c2f1b4da24d73aea25`). Reachability confirmed 2026-09-27. No edits, no vendoring of their code into this consumer by default.
- Accepted pack revision/digest: the agent development pack under `docs/` as committed at the base SHA above (the B0 commit pins the exact pack bytes; `docs/B0-BOOTSTRAP-REPORT.md` records the inventory). Any later pack edit supersedes this handoff and requires re-acceptance.
- VICT public release set and Builder Kit artifact identity: **to be discovered and recorded during G0** (discovery authority). G0 must pin exact published package identities, provenance, and the UI extension seam before any consumer dependency is selected. No package versions are pre-authorized by this handoff.

## Mandate and scope

Implement the accepted G0–G7 program defined in `docs/STAGES.md` to the extent covered by the stage scopes below. Follow `docs/PRODUCT.md` and `docs/EXPERIENCE.md` as the product contract; `docs/EVALUATION.md` for proof and verdicts; `docs/RUNBOOK.md` for roles, autonomy, and stopping. Do not import the older product flow (no Research→Practice→Operate→Review navigation, no Program/Method prerequisite).

**Stage scopes accepted by this handoff:**

- **G0 (technology intake and selection proof) — PRE-AUTHORIZED** upon owner acceptance of this handoff. Scope: repository/package bootstrap needed for a minimal verification host; chart-candidate comparison on a fixture; simulation-engine evidence review or explicit deferral with a proof task; publication of `docs/evidence/G0/` claim matrix, reproduction steps, and lineage; STATE.md updates. Prohibited: selecting a final chart or engine without the written selection proof; copying old Trading OS code or private VICT source; publishing packages; any account, order, or secret handling.
- **G1–G7 — each requires its own stage handoff record accepted by the owner before work begins.** G1 (2026-09-28) and G1-PKG (2026-09-29) were subsequently accepted and closed; **G2 was accepted on 2026-09-29 against pinned SHA `c9b780d…` (see its record below; amendments in D-003)**. A new or changed scope requires its own acceptance; the builder must not self-extend.

**Authority boundaries (all stages):** no live account connection, no real orders, no publishing of packages, no edits outside the authorized remote, no secrets in source/fixtures/logs/screenshots. Where the verified Builder Kit requires accepted-scope records tied to exact handoff bytes, obtain and preserve them; never self-accept.

## Stage handoff record — G1-PKG (ACCEPTED 2026-09-29, owner-directed) — CAPABILITY PACKAGING PROOF, G2 depends on this

Owner instruction (2026-09-29, baseline `1596c4c`): superseding decision D-001. Delivery outcome = composed app AND independently installable capabilities; Trading Kit boundary established before replay code. Publication is a later decision — **npm publish is prohibited in this run**; `npm pack` + independent-consumer install is the proof standard.

**Part A — close outstanding G1 review findings (precede packaging work):**
1. A failed **read** of saved drawings must prevent save/update/delete from overwriting existing stored data or reporting success: reproduce with valid stored drawings + induced read failure (corrupt key and getter-throw); verify the original storage bytes survive byte-for-byte; statuses must show failure, not success.
2. Demonstrate **loading** and **unavailable** states in a browser (throttle/force as needed; unavailable = e.g. storage read failure). Record screenshots.
3. Correct the “absolute price+time anchoring” claim: `createdAt` is wall-clock metadata, NOT a market-time coordinate. Describe precisely what a horizontal price level anchors to (price-axis coordinate; renders across all market time; instrument context). Verify precisely; if the G1 time-anchor requirement is judged unmet by the verifier, keep that criterion **HELD** (do not silently call it passed).
4. Preserve all prior verifier reports; append the correction + fresh verdict to the G1 evidence (do not rewrite).
5. Exercise the **reset** interaction with a proper browser-dialog handler; record result.

**Part B — packaging proof (after findings closure):** extract the proven Chart Workspace into a real versioned package **within this repository** (e.g. `packages/chart-workspace/`): reusable chart + drawing behavior, small documented public API, must NOT import from the app; fixtures, product wording, provider choices, browser storage keys, and app composition stay in the app; the app consumes via public exports with W1 behavior preserved (desktop + narrow). Evidence: standalone build, `npm pack` artifact (contents + integrity), **independent consumer OUTSIDE the monorepo workspace** installing the packed artifact and demonstrating chart + drawing save/reload without app imports or workspace aliases; record exact commands, dependency identities, API example, bundle observations, screenshots.

**In-scope paths:** `packages/**` (new), `host/**`, `docs/evidence/G1-PKG/**`, plus this record, STATE.md, and the doc updates in DECISIONS.md D-001. **Prohibited:** G2 work, replay, simulation engine, npm publish, VICT edits, accounts, secrets. **Verifier:** fresh agent vs exact candidate SHA — especially the independent-consumer proof and storage-failure behavior. **Exit:** commit + push corrections and packaging proof, report SHA + verdict, stop for owner review.

**Correction in progress (owner-directed, 2026-09-29, baseline `964038b…`):** bounded G1-PKG correction — (1) note preservation on price-only edits + documented explicit clear (`note: ''`); (2) persistence-contract resolution: intrinsic read-acknowledgment gate (`acknowledgeRead`, code `READ_NOT_ACKNOWLEDGED`) on top of the unchanged adapter-side read-gate; (3) status/npm-availability wording fixes. No commit/push/publish by the correcting builder; final gate-record update belongs to the fresh verifier + orchestrator.
> **Correction verified (fresh verifier, 2026-09-29):** all claims proven at `f148fff…` per `docs/evidence/G1-PKG/verifier-report-correction.md`; gate verdict unchanged (PASS WITH NON-BLOCKING FINDINGS).
> **G2 verified (fresh verifier, 2026-09-29):** candidate `5ebe4ee…` — **PASS WITH NON-BLOCKING FINDINGS** per `docs/evidence/G2/verifier-report-G2.md`. Poison-future both directions proven independently (potency 3112.5→6112.5; isolation 42/42 slices + in-app across-variant identity); clock cap + hard horizon verified in browser (Step disabled at horizon); HTF completed-buckets-only; 5 gaps explicit, zero fabricated bars; D-003 drawings: provenance-unknown hidden, replay-stamped visible ≥ creation step (real-mouse-click creation), reset accept/dismiss behavior correct; session restore exact after full page reload (return-to-current is the reload state; restore deliberate); kit pack sha512 reproduced (86b53ccb…) matching both committed tarballs; fresh-profile W1 + 375/768 pass; keyboard Step works. Findings F-1/F-2/F-3 all minor (regenerator pretty-print mismatch; corrupt-replay-storage refusal not surfaced in UI; stale G1 gap-bridging wording) — carried, none repaired. **G2 stage closed.**
> **G2 verdict CONTESTED by the owner → correction cycle (2026-09-29):** fresh-verifier addendum `docs/evidence/G2/verifier-report-G2-contested.md` ruled all three contested cases **VIOLATION** at `5ebe4ee…` (absent-slot HTF aggregates returned as complete; `availabilityAt()` leaked future resumption time; one-shot stale-ack gate let post-corruption persistence overwrite bytes, refusals not rendered) — **G2 status HELD**. Remediation builder (FIX A–D) produced candidate `8cb55d6…`: slot-complete HTF aggregation; `availabilityAt()` open-ended (`to: null`) with no future revelation, edge semantics accepted and recorded as D-004; per-operation read re-verify before every persisted mutation; replay refusals rendered with truthful explanations. Fresh remediation verifier `verifier-report-G2-remediation.md`: **all three cases RESOLVED** (slot oracle 8 instants × 1h/4h; independent 45/45 mutation-sweep identity; browser refusals rendered with byte-identical storage + recovery). **Amended G2 verdict: PASS WITH NON-BLOCKING FINDINGS at `8cb55d6…`** (supersedes the HELD, earlier verdict retained as history). Carried: F-1 (fixture regenerator pretty-print), F-3 (stale gap wording), F-RV-2 (minor: current-mode refusals during corrupt-at-start not rendered), F-RV-1 rationale note (corrected in D-004); prior verdicts and evidence preserved append-style. **G2 stage closed.**
> **G2 correction cycle 2 (2026-09-29, owner-directed):** two NEW owner counterexamples + one record discrepancy challenged the amended verdict; fresh verifier reproduced BOTH at prior candidate `8cb55d6…` (VIOLATION confirmed: future-existence-sensitive `availabilityAt()`; failed writes silently advanced live state incl. clock/step/drawings/reset-clears) — remediated: clock-visible-only availability (zero lookahead; equality-edge both directions; 19/19 mutation-identity rows; potency real) and transactional persistence (persist-next-before-commit; 17/17 refused rows with truthful codes, state/bytes preserved); browser flows verified live by the verifier (refusals render mid-corruption AND current-mode — **F-RV-2 CLOSED**; W1/keyboard/return-to-current/console clean). **G2 amended verdict at cycle 2: PASS WITH NON-BLOCKING FINDINGS at `db66475a66186f0f1c5dd5f52a18b834fc94ae43`** (supersedes the cycle-1 amended status; pack sha256 4316c068… == both committed tarballs). **D-004 recorded NOW with erratum** (f23b886 message-only; see DECISIONS.md). Findings carried: F-C2-2 (WRITE_REFUSED display kit-path-only — no live production refuser yet), F-1, F-3; unproven items listed in the cycle-2 report; all prior verdicts/evidence preserved.

## Stage handoff record — G2 (ACCEPTED 2026-09-29 by owner against pinned SHA `c9b780d5f127998ae82948a0e2f517dfb89294b2`, with two amendments recorded in DECISIONS.md D-003) — blind replay in the workspace

> **This record was PREPARED AS A DRAFT and is now ACCEPTED** — owner instruction 2026-09-29 (against pinned SHA `c9b780d5f127998ae82948a0e2f517dfb89294b2`), with two corrections applied at acceptance and recorded as **D-003**: (1) poison-future criterion corrected to the both-directions form in pass criterion 2; (2) R3 amended — provenance-unknown drawings are hidden in blind replay (the present-day-label treatment recorded in D-002 is superseded; its original wording is preserved in DECISIONS.md and the boundary proposal as superseded history).

**Owner direction feeding this draft:** D-001 (Trading Kit boundary precedes replay) + D-002 (accepted choices: `@vict-trading/trading-kit`; independence from chart-workspace; app composes both; app-supplied session persistence port; smallest useful clock/data/replay/evidence contracts; the four precision rules R1–R4 are normative).

### Scope (if and as accepted)

- New package **`packages/trading-kit/`** (`@vict-trading/trading-kit@0.1.0`): smallest useful contracts per D-002 — `createReplayClock` (hard future-guard; now/advance/setFrame; R1 capping), `createDataSession` (R1 capped queries + R2 availability semantics; consumer-provided source; no fetching), `ReplaySession` (start/restore/reset/return-to-current with recorded rules; **app-supplied persistence port**), `visibilityAt` provenance predicates (R3), minimal evidence hooks (R1 requested/served records are part of evidence). No scripts, no simulation runtime, no risk, no order pathway, no wall-clock use for market-time decisions.
- App integration **`host/**`**: replay mode composing kit + existing Chart Workspace — choose a historical start on the chart, step/play/pause, switch supported timeframes, restore or deliberately reset a session, **return to current data**. Replay and current contexts unmistakably labelled. Chart and derived calculations receive data only via capped queries (R1); explicit unavailable states for missing intervals (R2); drawing visibility per provenance classes (R3). W1 functionality and current-mode behavior unaffected.
- Pinned **poison-future fixture** (consumer data, app-provided): derived deterministically from seed `20260927` (XAUUSD, 2023 bars, 15m) by generator command recorded in the evidence; a named replay horizon plus **poison later bars containing values that would change a naive calculation's result if they were visible** (e.g. a spike that would flip a naive maximum or a simple moving average); fixture identity pinned by recorded generation command + SHA-256 committed under `docs/evidence/G2/fixture/`. Baseline and poison variants share all bars ≤ horizon (only the future differs).
- Evidence **`docs/evidence/G2/**`**: builder report, claim matrix, reproduction commands, screenshots, fixture identity, kit artifact identity.
- Kit packaging proof at this stage (same G1-PKG standard): standalone build, `npm pack` artifact with recorded sha512, **independent consumer OUTSIDE the monorepo** with the consumer's OWN data and OWN storage/session adapter demonstrating: capped query behavior (requested beyond clock → capped + recorded), refusal semantics, and a replay slice lifecycle. No npm publish.

### Product test

**W3** (docs/EXPERIENCE.md) as the main test on the poison-future fixture; W1 unaffected-current-mode check; desktop (≥1280) **and narrow (375 and 768)** real-browser interaction.

### Pass criteria (candidate only if accepted)

1. No future data leaks through **any** channel: chart series content, larger-timeframe aggregates, unfinished bars, drawings/annotations created later, derived calculation output, current quote, or any future-derived value. Detection is by **programmatic assertion** on the kit's requested/served records plus content comparison, not UI observation alone.
2. **Poison-future proof, both directions (amended at acceptance, D-003):** (a) **Potency** — changing only bars after the replay clock MUST change a deliberately naive full-history calculation (e.g. a naive maximum or simple moving average computed over the entire fixture changes when poison bar values change); (b) **Isolation** — every result derived from the historical-visible slice (chart series content in replay mode, aggregates, indicator/readout values) remains IDENTICAL across that poison change. (a) without (b) is a leak and fails; (b) without (a) means the fixture was not actually poison and the proof is void — retry with a stronger poison until both hold.
3. Unfinished larger-timeframe bars never returned (R2); missing intervals explicit, never bridged (R2).
4. Drawing provenance honest per the amended R3 (D-003): in replay, existing drawings with **unknown historical provenance are HIDDEN** (not displayed with a present-day label — a label cannot keep the drawing's price level from revealing future information); replay-stamped drawings visible only at or after their creation step; a drawing created at step N invisible at steps < N. Current-mode (non-replay) drawing behavior is unchanged.
5. Session restore/reset exact and replayable by recorded rules; reload matches the recorded rules; return-to-current works and is labelled.
6. Replay vs current unmistakably labelled; replay controls cannot reach a current-market endpoint.
7. Kit builds and packs independently; external-consumer proof passes; import audit both directions (no kit↔chart-workspace, no app imports).
8. `npm run check` + build clean; console clean; keyboard access for replay controls; desktop + narrow passes.

### Stop conditions (candidate fails if seen)

Chart masking while calculations see future data; any leak channel demonstrated; a future query returning uncapped data; replay controls reaching a current-market endpoint; unsupported timeframe silently substituted; kit not buildable/packable standalone or consumer resolving to app; replay/current contexts confused in UI; session state lost on reload; any prohibited work (below).

### Verifier instructions (fresh agent, exact candidate SHA)

Challenge-first walkthrough of W3 and the pass criteria: **direct future queries** (beyond clock, beyond horizon), **changed future bars** (mutate poison values; verify historical results unchanged), **unfinished larger-timeframe bars**, **gaps**, **later annotations** (create at step N, revisit steps < N), **derived output** (indicator over visible slice vs over full history must differ exactly when future data would matter), **session reload** (restore exact state), **return to current context** (correctness + labelling). Plus: kit standalone build + own `npm pack` + fresh external consumer with own data/adapter; import audit; app W1 at desktop + narrow; check/build/console; scope audit of the candidate diff. Verifier writes `docs/evidence/G2/verifier-report-G2.md` with EVALUATION.md vocabulary; builder never self-certifies.

### Prohibited (as accepted G2 scope would define)

Scripting runtime or script features; simulation engine selection or runtime inclusion (O-05 stays open; LGPL question pending for G3); risk models; any order or account pathway; live feeds; npm publish; VICT/Trading OS repo edits; secrets; modifying pack product documents without a superseding decision; starting G3+.

### Exit (once accepted and executed)

Candidate commit + push, fresh verifier verdict, STATE.md verdict + SHA, report to owner, **stop for review**.

---

## Stage handoff record — G1 (ACCEPTED 2026-09-28, COMPLETED 2026-09-29)

Owner accepted the G1 scope below by direct instruction on 2026-09-28 (baseline `74da07c4bfd7a130b0d5c0dd6cbecdeffcdd05c4`), including: G0 technical choices carry into G1 (lightweight-charts 5.0.8, published VICT `0.4.0-rc.1` set, published `ui-svelte` extension path); **owner accepts the release candidate for G1 development** — recheck compatibility when stable `0.4.0` is published; VICT and Trading OS repos remain read-only; uPlot spike stays as historical G0 evidence.

- **Pre-close work in this run (owner-directed):** close two G0 evidence gaps — (1) fresh clone or isolated worktree: install, build, run the documented host; (2) narrow-browser-width check of the G0 host. Record in a short G0 addendum; preserve the original G0 report and its red uPlot findings; fix any failing check and re-verify before G1 work. Correct stale opening lines in `docs/STATE.md`.
- **Outcome:** the first real workspace experience on the G0 spike foundation — open a useful chart immediately; choose XAUUSD or EURUSD and a timeframe; inspect candles; pan and zoom; create, select, edit, move, remove, undo and redo a drawing anchored to market price and time; save the workspace so symbol, timeframe, drawings and arrangement survive reload and a fresh browser session; clear saving/saved/failed/unavailable states; chart remains usable with a tool panel open.
- **Product test:** W1 walkthrough (docs/EXPERIENCE.md) as the main test. No Program, Method, Session or account prerequisites. Keyboard access for essential controls. Desktop + narrow-width browser checks. Real interaction screenshots/recording. Restrained visual design; routine layout choices may be made and improved on walkthrough friction.
- **Carry-forwards from G0:** LWC visual bridging of missing data remains a recorded finding for G2 — missing intervals must not be presented as verified continuous data.
- **In-scope paths:** `host/**` (the consumer app — the G0 spike host evolves into the workspace), `docs/evidence/G1/**`, `docs/STATE.md` (status updates), `docs/HANDOFF.md` (this record), `.gitignore` if needed.
- **Prohibited:** replay, scripting, backtesting, trading engine, live feeds, brokers, accounts, G2 work; modifying pack product documents; publishing; any VICT/Trading OS repo edits; secrets.
- **Required checks:** build + typecheck; W1 real-browser walkthrough (fresh profile, no prerequisites); persistence across reload AND fresh browser session; desktop + narrow width; keyboard access for essential controls; interaction screenshots/recording.
- **Verifier:** fresh agent/session against the exact candidate commit; includes persistence and narrow-layout testing. Builder cannot self-certify.
- **Stop conditions:** drawing lost after reload/fresh session; prerequisite form blocking the bare chart; static chart mockup; drawing stored only as screen pixels; time/price anchoring broken by pan/zoom/timeframe change; or any prohibited-capability temptation — record HELD/FAIL and stop.
- **Exit:** candidate commit + verifier verdict + STATE.md verdict+SHA + report to owner. G2 NOT authorized by this record.

## Stage handoff record — G0 (COMPLETED)

- **Prerequisite candidate SHA:** `3e7535f0788f612de8509043c6e8ae9eafcfc4ff` (clean tree)
- **Criterion source:** `docs/STAGES.md` G0 pass/stop conditions; `docs/ARCHITECTURE.md` platform intake and chart/engine selection proofs; `docs/EVALUATION.md` shared checks.
- **In-scope paths:** repository root config files, minimal app/host scaffold for candidate verification, `docs/evidence/G0/**`, `docs/STATE.md` (gate-status updates only), `docs/DECISIONS.md` (create if a selection is recorded).
- **Prohibited paths:** modification of pack product documents (`docs/PRODUCT.md`, `docs/EXPERIENCE.md`, `docs/STAGES.md`, `docs/EVALUATION.md`, `docs/RUNBOOK.md`, `docs/ARCHITECTURE.md`, `docs/README.md`, `docs/AGENTS.md`, `docs/HANDOFF-TEMPLATE.md`) without an explicit superseding decision record; anything outside this repository.
- **Expected demo:** fresh checkout installs/builds/runs via documented commands; a real chart candidate demonstrates pan, zoom, time/price mapping, and one durable drawing through the public VICT UI seam in a real browser; dependency/license/bundle observations recorded; engine decision supported by runnable proof or explicitly open with a named proof task.
- **Required checks:** EVALUATION.md shared checks applicable to G0; Builder Kit verification command if used.
- **Evidence path:** `docs/evidence/G0/`
- **Verifier:** a fresh agent/session independent of the builder, working from the pinned candidate SHA; builder cannot self-certify.
- **Stop conditions:** indispensable public VICT extension unavailable; package identity/integrity unverifiable; chart license blocks intended use; proposed engine fails future-time isolation with no evaluated alternative → report HELD/BLOCKED with the precise dependency; do not declare G0 complete.

## Reports and stop

After each candidate: exact branch/full SHA, diff summary, commands/results, browser walkthrough evidence, decision changes, unresolved findings; then a fresh verifier verdict against that exact SHA. Continue through already-authorized passing gates (live status: see STATE.md — G0, G1, G1-PKG closed; G2 accepted 2026-09-29 at `c9b780d…`). Stop at HELD/FAIL/BLOCKED dependencies, a changed scope, a material product fork, live account activation, or a missing external right. Final program report maps every G0–G7 gate to an evidenced verdict and names every unbuilt feature; owner product acceptance remains separate.

## Owner acceptance

**ACCEPTED 2026-09-27** by the owner (radz2291) in the orchestration session, following preparation and review of this draft. The owner authorized autonomous stage-by-stage execution with the orchestrator delegating implementation to subagents. Acceptance covers the G0 stage scope above; G1–G7 remain unauthorized until individually scoped and accepted. Accepted-at SHA (handoff bytes): `5ed125aa222c4b2f17832e5a5dbad8140b3638e4`.