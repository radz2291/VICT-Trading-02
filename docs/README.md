# VICT Trading Workspace — Agent Development Pack

**Edition:** 0.1, 2026-09-26. **Status:** proposed product and execution specification for owner review. It becomes repository authority only through a repo-specific, accepted handoff. No new repository URL or release identity has been supplied.

## Start here

This pack defines a new chart-first trading application. It is a fresh product. The earlier Trading OS repository is a read-only source of lessons and candidate semantics, not an implementation base or a source of binding product flow.

Read in order:

1. [PRODUCT.md](PRODUCT.md) — purpose, freedom, and product boundaries.
2. [EXPERIENCE.md](EXPERIENCE.md) — observable trader tasks and interaction principles.
3. [ARCHITECTURE.md](ARCHITECTURE.md) — ownership, seams, and selection proofs.
4. [STAGES.md](STAGES.md) — dependency-aware slices and exact exit criteria.
5. [EVALUATION.md](EVALUATION.md) — evidence, verdicts, and review method.
6. [RUNBOOK.md](RUNBOOK.md) — agent roles, autonomy, scope, and failure handling.
7. [STATE.md](STATE.md) — accepted context, proposals, and unresolved facts.
8. [HANDOFF-TEMPLATE.md](HANDOFF-TEMPLATE.md) — binding repo-specific kickoff.

[AGENTS.md](AGENTS.md) is a short entry point for agents after these files are installed in the new repository. Avoid copying the same rules into multiple locations.

## Destination in one paragraph

The trader opens a chart immediately and can draw, inspect, add an indicator or script, replay history, test an idea, place simulated trades, and review outcomes in a persistent workspace. The order of these actions belongs to the trader. VICT governs consequential operations and durable meaning; specialized chart, data, and execution components provide the domain machinery. A reproducible test pins its inputs; live automation requires an explicit account-specific grant. The application should remain light by consuming proven reusable components.

## Execution model

An authorized builder works through the stages, fixes objective failures within scope, and produces evidence. A fresh verifier challenges each candidate against the written criteria, including experience walkthroughs. The builder may continue through preauthorized passing gates without waiting for a new prompt. The owner decides material product forks, controls any real account activation, and judges the final hands-on experience. A stage cannot be marked independently verified by its implementer.

The pack is a standing reference, not blanket authority to edit VICT, publish packages, connect an account, or place an order. The target repository, baseline SHA, platform release set, scoped task authority, and permitted push destination belong in an accepted handoff. The Builder Kit's task-pack and accepted-scope rules apply where the verified release provides them.

## Source references

- VICT framework: https://github.com/radz2291/vict-02
- Builder Kit contract: https://github.com/radz2291/vict-02/blob/main/packages/builder-kit/README.md
- Earlier Trading OS, reference only: https://github.com/radz2291/VICT-Trading/tree/38f654e2ceffa0455fd5e7c2f1b4da24d73aea25

The published VICT release, UI package state, and Builder Kit distribution must be rechecked at Stage 0. Work on a branch is not a published consumer contract.
