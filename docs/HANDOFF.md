# Repository-specific autonomous handoff — VICT Trading Workspace

**STATUS: DRAFT — NOT YET ACCEPTED.** This handoff grants no authority until the owner records acceptance (see "Owner acceptance" below). If accepted, this file at the pinned commit SHA becomes the authority record for the stages it covers.

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

## Stage handoff record — G0

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

To activate this handoff, the owner records acceptance of this exact file at a pinned commit SHA, e.g. by replying: **"Handoff accepted at SHA <full SHA>."** Partial acceptance (e.g. accepting only G0) is valid; anything not accepted remains unauthorized. This draft was prepared 2026-09-27 by the bootstrap session; it has not been accepted by the owner and confers no execution authority yet.