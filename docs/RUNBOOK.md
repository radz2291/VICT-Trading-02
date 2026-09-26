# Agent operating guide

## Roles and separation

**Program steward:** maintains the current-state record, checks that the next stage has authority and prerequisites, coordinates bounded work and collects evidence. This can be the builder; it is not a new product runtime service.

**Builder:** implements within the accepted new-repo scope, chooses routine techniques, runs checks, fixes findings, commits and reports a candidate. It does not certify its own stage as independently verified.

**Fresh verifier:** works from the pinned candidate SHA in an independent checkout/session, tries to falsify the claims, records direct evidence and issues a verdict. It does not silently repair the candidate while auditing.

**Product evaluator:** a fresh agent/session tests the actual experience against the walkthroughs and records friction. The owner makes material product choices and judges the final hands-on experience. An agent can prepare the demo and record observations; it cannot invent owner approval.

Use the smallest number of concurrent agents needed. Parallel implementation is allowed only where files and authority do not overlap; one integrator reconciles a candidate before verification.

## Autonomy envelope

Within an accepted stage scope, the builder may investigate documentation, compare libraries, implement, refactor, add relevant tests, repair failed checks, and revise non-semantic details without another prompt. It may make a product choice only when the pack gives a clear criterion and the evidence selects one option. Record that choice in STATE.md or a decision entry.

Pause and present a concrete, reviewable choice when: two plausible options produce materially different trader behavior; the required VICT public API is absent; an external license or data right is unresolved; a stage requires new repo authority; a scope/policy acceptance record must be created by the owner; or a live account/order/publishing action is involved. Routine passing stages continue without owner review. Report completed independent work before asking.

The overall pack describes the program. Actual repository authority comes from the accepted, repo-specific handoff and its stage scopes. If the verified Builder Kit requires an accepted-scope record tied to exact handoff bytes, obtain and preserve that record; do not generate an apparently valid task pack that lacks authority. Stage scopes can be prepared together for owner review, but a new or changed scope requires its own accepted authority. The builder must not grant itself broader privileges.

## Repository rules

- Work in the user-supplied new trading repo. VICT and the former Trading OS are read-only references unless a separate instruction grants a narrowly scoped change.
- Verify remote, default branch, base SHA, clean state and applicable AGENTS.md before editing. Use isolated branches/worktrees for parallel or audit work.
- Consume pinned public VICT artifacts and record release identity. Do not copy packages from a local VICT checkout to make a consumer gate pass.
- Commit logical increments; push only to the authorized target branch/remote. Report the full SHA and URL. Preserve audit evidence and red runs.
- Never put credentials, broker tokens or private data in source, screenshots, logs, prompts or fixtures. Do not place a real order during development verification.

## Stage loop

1. Verify authority, baseline and stage prerequisites.
2. Write a short implementation plan tied to criterion IDs; keep architecture decisions open until the required proof.
3. Build the smallest complete user slice; include truthful empty, loading and error states.
4. Run meaningful automated checks and the relevant real-browser walkthrough.
5. Produce a candidate commit and evidence report.
6. Have a fresh verifier try the stage independently. Repair failures within scope and reverify changed behavior.
7. Update STATE.md with the actual verdict and SHA. Continue to the next preauthorized stage; pause at a defined owner/authority boundary.

An agent can continue autonomously through preauthorized stages after PASS or PASS WITH NON-BLOCKING FINDINGS. A HELD, FAIL or BLOCKED gate prevents claiming the next dependent capability. It may still investigate independent work that does not rely on the failed gate.

## Scope changes and decisions

Use concise decision entries: question, options demonstrated, chosen path, evidence, impact on experience and stages, authority, date and SHA. Do not manufacture certainty about the scripting language, chart or engine during G0. A reusable trading package is justified when real reuse or isolation is demonstrated; moving app code into a differently named package alone is not proof.

When a VICT platform gap blocks a required interaction, describe a minimal public contract and an isolated upstream proof. Keep the consumer held at that gate until a verified released path or accepted product rescope exists. The app should not depend on an unpublished UI branch.
