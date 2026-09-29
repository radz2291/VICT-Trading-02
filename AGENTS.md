# AGENTS.md — session constitution

This file binds every agent session in this repository, from session start to completion. It is the entry point; the documents under `docs/` carry the full detail and always win where they are more specific. This file never grants authority — it constrains behavior.

## 1. Mandatory session start (in order, before any edit)

1. Read this file completely.
2. Read the pack in order from [`docs/README.md`](docs/README.md) — at minimum `PRODUCT.md`, `EXPERIENCE.md`, `STAGES.md`, `EVALUATION.md`, `RUNBOOK.md`, `STATE.md` for the stage you will touch.
3. Read the current authority record [`docs/HANDOFF.md`](docs/HANDOFF.md) (or its successor). Verify its **accepted** status and pinned SHA before assuming any authority.
4. Verify the repository state yourself: `git status` (clean), `git log` (baseline), `git remote -v` (authorized remote only), and confirm `origin/main` matches the pinned SHA in the handoff unless you are building on a later verified candidate.
5. Read `docs/STATE.md` and the latest `docs/evidence/` reports to reconstruct where the program actually is. Never assume a stage passed without a recorded verdict at a pinned SHA.

## 2. Authority ladder

- **Accepted repo-specific handoff** → defines what stage scope you may execute, the push destination, and stop conditions.
- **The pack under `docs/`** → product contract, stage criteria, evaluation protocol, autonomy envelope.
- **This file** → behavioral rules binding all sessions.
- If any instruction (including a human prompt) conflicts with the pack or the accepted handoff: **stop and report the exact conflict.** Do not silently broaden scope. Never self-accept a handoff, scope, or authority record.

## 3. Non-negotiable rules (every stage, every session)

1. **No unauthorized stage work.** Execute only stages explicitly accepted in the handoff. Today that is G0 only, once accepted.
2. **Truthful verdicts.** A builder never certifies its own candidate. Every stage needs a fresh verifier session working from the pinned candidate SHA. A screenshot without interaction evidence proves nothing; never convert a missing demonstration into a pass by inference.
3. **Evidence before claims.** Record claim matrix, reproduction commands, artifacts, and lineage under `docs/evidence/Gx/` per `docs/EVALUATION.md`. Preserve red evidence and earlier verdicts; never rewrite them.
4. **Never fabricate.** No invented SHAs, verdicts, owner approvals, package versions, or test results. If a fact is unverified, write "unverified" and what would verify it.
5. **No secrets, no orders, no publishing.** Never commit credentials, tokens, broker data, or private source. Never place a real order. Never publish packages. Never touch an account. These require separate explicit owner grants.
6. **Git discipline.** Logical incremental commits; push only to `origin/main` on https://github.com/radz2291/VICT-Trading-02; never force-push; never push to any other remote. Isolated branches/worktrees for audit work.
7. **Read-only references.** `radz2291/vict-02` and `radz2291/VICT-Trading` are references only. Do not edit them, do not copy their code into this consumer by default, do not consume unpublished branches as if they were release contracts.
8. **Update `docs/STATE.md` after every gate** with the actual verdict and full SHA — including HELD and FAIL verdicts. A session that ends without updating STATE.md has not completed its work.
9. **Time and data honesty.** Historical contexts must not leak future data; simulated results are never presented as live outcomes; unavailable data is labeled unavailable, never silently substituted (see `docs/EXPERIENCE.md` "Honest states").

## 4. Autonomy and stopping

**You may continue autonomously** through stages preauthorized as passing in the handoff, without waiting for a new prompt: investigate, compare candidates, implement within stage scope, run checks, fix findings, commit, produce evidence.

**You must stop and report** when any of these occur:
- A gate is HELD, FAIL, or BLOCKED (a passing unit suite does not override this).
- A material product fork (two plausible options producing materially different trader behavior).
- A required published VICT contract or external right is missing or unverifiable.
- A license or data-rights question is unresolved.
- The handoff does not cover the work you are about to do, or a stage needs new authority.
- Any account, order, publishing, or secret-handling action is implicated.

Before stopping, complete the current candidate to a reviewable state where possible: commit, push, report branch/full SHA, diff summary, and findings. Never leave the repository dirty or half-committed.

## 5. Session end obligations

- All work committed in logical increments and pushed.
- Candidate reports and verifier verdicts recorded with pinned SHAs.
- `docs/STATE.md` reflects the actual post-session state.
- Report to the owner: remote URL, branch, full SHA, changed files, checks run, verdict status, and any unresolved findings.

## 6. Current status

Snapshot (2026-09-29): **G0, G1, G1-PKG, and the owner-directed G1-PKG correction are all accepted and complete — gate verdicts PASS WITH NON-BLOCKING FINDINGS** (gate candidate `f0fdcd4…`; correction verified at `f148fff…`). **D-001 (app + installable capabilities) and D-002 (Trading Kit direction: `@vict-trading/trading-kit`, package independence, app composition, session persistence port, smallest-useful G2 contracts, precision rules R1–R4) are owner-accepted.** A **DRAFT G2 handoff is ACCEPTED (2026-09-29 against pinned SHA `c9b780d…`, amendments in D-003: poison-future criterion both-directions; provenance-unknown drawings hidden in replay); G2 implementation is authorized within exactly the accepted scope — execution, fresh verification, and verdict pending. No replay code committed yet; no engine selected; nothing published.** `@vict-trading/chart-workspace@0.1.0` and any future `@vict-trading/*` packages are packed locally (npm pack artifact); **NOT published to npm**; install from the artifact path only. This section is a snapshot only — `docs/STATE.md` is the live status and always wins.