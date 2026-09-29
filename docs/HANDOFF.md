# Repository-specific autonomous handoff — VICT Trading Workspace

**STATUS: ACCEPTED.** Owner acceptance recorded 2026-09-27 for this file as committed at `5ed125aa222c4b2f17832e5a5dbad8140b3638e4` (owner instruction: "Ok then please proceed", given after review of the draft). This handoff is the authority record for the stages it covers, currently **G0 only**.

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
- **G1–G7 — NOT YET AUTHORIZED.** Each requires its own stage handoff record appended to this file (or a successor), with scope, prohibited paths, expected demo, and stop conditions, accepted by the owner before work begins. A new or changed scope requires its own acceptance; the builder must not self-extend.

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

After each candidate: exact branch/full SHA, diff summary, commands/results, browser walkthrough evidence, decision changes, unresolved findings; then a fresh verifier verdict against that exact SHA. Continue through already-authorized passing gates (currently G0 only). Stop at HELD/FAIL/BLOCKED dependencies, a changed scope, a material product fork, live account activation, or a missing external right. Final program report maps every G0–G7 gate to an evidenced verdict and names every unbuilt feature; owner product acceptance remains separate.

## Owner acceptance

**ACCEPTED 2026-09-27** by the owner (radz2291) in the orchestration session, following preparation and review of this draft. The owner authorized autonomous stage-by-stage execution with the orchestrator delegating implementation to subagents. Acceptance covers the G0 stage scope above; G1–G7 remain unauthorized until individually scoped and accepted. Accepted-at SHA (handoff bytes): `5ed125aa222c4b2f17832e5a5dbad8140b3638e4`.