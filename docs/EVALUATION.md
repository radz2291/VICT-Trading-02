# Evaluation and evidence protocol

## Verdict vocabulary

> **D-001 packaging proof requirements (owner-directed, 2026-09-29):** a packaging gate verdict requires, as evidence of *real* reuse (not file moves): a standalone package build; an `npm pack` artifact with recorded contents/integrity; an **independent consumer outside the monorepo workspace** installing that artifact and demonstrating the packaged capability without importing app source or using workspace aliases; exact commands, package contents, dependency identities, an API example, bundle observations, and screenshots. Storage/read-failure behavior of the packaged capability is in scope. Publication is a separate later decision and is not part of any gate.

- **PASS:** every required stage criterion demonstrated with reproducible evidence and a fresh verifier's independent attempt.
- **PASS WITH NON-BLOCKING FINDINGS:** all required behaviors pass; each minor issue is identified, bounded, owned and carried forward.
- **HELD:** a required fact, browser demonstration, owner experience judgment, or external integration proof is missing.
- **FAIL:** a required behavior contradicts observed evidence.
- **BLOCKED:** the stage depends on an unavailable public platform contract, data right, authorization or external service; record the precise dependency.

A builder report is a candidate, not an independent verdict. A screenshot without interaction evidence cannot pass a workflow. Never convert a missing demonstration into a pass by inference. Owner sign-off is a separate final product acceptance unless a stage explicitly requires it, as G6 does for real account activation.

## Shared checks on every stage

| Dimension | Required evidence |
|---|---|
| Provenance | Target repo URL, branch, base and final full SHAs, exact VICT release and external dependency identities, clean or disclosed working tree |
| Build | Fresh install/build/typecheck/lint and relevant tests with commands, versions and results; no unexplained skipped required check |
| Browser | Real-browser task run at agreed desktop and narrow widths, with screen capture or step screenshots showing interaction and recovery |
| Boundary | Public API usage; server/browser separation; no source checkout or private renderer imports in the consumer; no unapproved cross-repo edits |
| Time/data | Relevant data revision, timezone, timeframe, gap behavior and historical availability; future-poison and unfinished-bar cases from G2 onward |
| State | Save/reload/restart and interruption behavior appropriate to the stage, including truthful failure states |
| Authority | No unintended account, secret, publish or live-order authority; negative tests deepen with G4 and G6 |
| Reuse (packaging gate) | Standalone package build; `npm pack` artifact contents + integrity; independent-consumer demo outside the monorepo (no app imports/workspace aliases); public API example; bundle observations; app W1 preserved after consuming the package |
| Product fit | Walkthrough IDs actually attempted, context switches or friction noted, and explicit owner feedback when the gate requires hands-on judgment |

Scope tests to the risk introduced by the stage. Avoid unit tests that only repeat the implementation. A browser interaction, deterministic fixture, or crash/restart proof is more useful when it catches a distinct failure.

## Stage evidence bundle

Each candidate writes one concise report in the new repo under docs/evidence/Gx/ with:

1. **Claim matrix:** criterion ID, PASS/FAIL/NOT DEMONSTRATED, direct evidence path and short explanation.
2. **Reproduction:** exact commands, dataset/input revisions, environment, browser size, and steps.
3. **Artifacts:** screen capture or screenshots, test output, relevant logs with secrets removed, and fixture expected values.
4. **Lineage:** base, final SHA, diff summary, changed dependencies and recorded decisions.
5. **Findings:** severity, user effect, owner, proposed correction, and whether the stage remains held.

The verifier runs against the exact candidate commit from a fresh checkout or isolated worktree, inspects negative cases, and produces a separate report. If the builder remediates after verification, the verifier reruns the affected checks against the new SHA. Preserve red evidence and earlier verdicts rather than rewriting history.

## Experience evaluation

Measure the actual steps in EXPERIENCE.md. Record first-action time only if measured; otherwise use qualitative observations. The evaluator asks:

- Can I act on the chart without a prerequisite form?
- Can I switch tasks without losing instrument, time and drawings?
- Is provisional work cheap to try and recover?
- Do replay/current and simulated/live boundaries remain obvious?
- Can I inspect why a result exists and return to its chart point?

The owner may later identify friction that automated tests miss. Convert that feedback into an observable scenario and fix or explicitly defer it. The independent experience evaluator can hold a stage for concrete friction such as a lost chart context or an imposed prerequisite. Routine stages do not wait for owner feedback. Owner acceptance of the finished product is recorded separately.

## Closure

A stage closes only after candidate report, independent verdict, bounded remediation where needed, and a status update reflecting the verified SHA. A final program report maps G0–G7 verdicts and lists deferred features. It must distinguish a completed research proof, implemented code, independently verified behavior, and owner-approved product fit.
