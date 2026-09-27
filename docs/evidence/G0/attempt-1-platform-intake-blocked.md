# Research: G0 Platform Intake — Published State of VICT (github.com/radz2291/vict-02) as of 2026-09-27

## ⚠️ VERDICT: BLOCKED — no network tooling in this session

**This brief could NOT verify any external fact.** The assigned task requires querying the npm registry
(`registry.npmjs.org`) and GitHub (`raw.githubusercontent.com/radz2291/vict-02/...`). This subagent session was
provisioned with only local file `read`/`write` tools — no `web_search`, no HTTP fetch, no shell, no git.
No `contact_supervisor` bridge is available to request tooling.

Per `AGENTS.md` §3.4 ("No invented SHAs, verdicts, owner approvals, **package versions**, or test results. If a
fact is unverified, write 'unverified' and what would verify it"), **no external claim below is presented as
verified.** Every npm/GitHub fact is marked **UNVERIFIED (this session)** with the exact query needed to verify it.
A networked session must re-run this intake before G0 can pass. This is precisely the G0 stop condition:
"package identity/integrity unverifiable → report HELD/BLOCKED with the precise dependency"
(`docs/HANDOFF.md`, Stage handoff record — G0, stop conditions).

What this brief does contribute: (1) the local pack's own assertions about the external platform, with citations;
(2) a complete, ready-to-run verification protocol (exact URLs/commands); (3) explicit not-published/unknown lists
framed honestly; (4) the consumer-path decision *template* pending verification; (5) open risks for the G0 gate.

---

## Summary

The published/consumable state of `radz2291/vict-02` (npm packages, UI extension seam, Builder Kit artifact,
release identity, reference-app dependencies) is **entirely unverified as of this session** — no networked
evidence was obtainable. The local pack (`docs/STATE.md`, `docs/HANDOFF.md`) asserts that a coordinated VICT
public release set exists, that `@victframework/ui` / `@victframework/ui-svelte` were "in progress in parallel on
2026-09-26", and that the Builder Kit is "distributed as an integrity-recorded local artifact" with publication
deferred (D-3) — but none of these are externally confirmed. **G0 intake must be re-run by a tooling-enabled
agent before any consumer dependency is pinned.**

---

## Findings

### A. Verified facts (local pack only — external status still unverified)

1. **G0 is authorized; package identities are deliberately NOT pre-authorized.** The accepted handoff
   (`docs/HANDOFF.md`, "Target and provenance") states: "VICT public release set and Builder Kit artifact
   identity: **to be discovered and recorded during G0** (discovery authority). G0 must pin exact published
   package identities, provenance, and the UI extension seam before any consumer dependency is selected. No
   package versions are pre-authorized by this handoff."

2. **The pack itself flags VICT UI publication as in-flight, not confirmed.** `docs/STATE.md`, "Known external
   status that must be refreshed": "VICT UI work on @victframework/ui and @victframework/ui-svelte was in
   progress in parallel on 2026-09-26; **published compatibility must be checked**." And: "VICT Stage 8 Builder
   Kit documentation describes a scoped external-app bootstrap. **Its distribution and current verified consumer
   path must be checked at G0.**" (Emphasis in original.)

3. **Read-only reference repos and their pin.** `docs/HANDOFF.md`: references are
   `https://github.com/radz2291/vict-02` and `https://github.com/radz2291/VICT-Trading` (the latter pinned at
   `38f654e2ceffa0455fd5e7c2f1b4da24d73aea25`); "Reachability confirmed 2026-09-27. No edits, no vendoring."
   No SHA is pinned for `vict-02` itself — its release identity is a G0 discovery item (Finding 1).

4. **Prior repo task observed a 404** on `raw.githubusercontent.com/radz2291/vict-02/main/packages/ui/README.md`
   (stated in the tasking, not independently re-verifiable this session). Consistent with Finding 2, the UI seam
   may live elsewhere (e.g. `renderer-svelte` role components) or under a different package name — but this is
   **unverified**; the actual layout must be read from the repo.

5. **Expected consumer shape per the pack's G0 demo requirement.** `docs/HANDOFF.md`, "Expected demo": a fresh
   host where "a real chart candidate demonstrates pan, zoom, time/price mapping, and one durable drawing
   **through the public VICT UI seam** in a real browser." So whatever seam is found must be public and
   demonstrable without private source — a hard filter on the intake results.

6. **G0 stop conditions directly implicated** (quoted from `docs/HANDOFF.md`): "indispensable public VICT
   extension unavailable; package identity/integrity unverifiable" → HELD/BLOCKED, do not declare G0 complete.

### B. NOT published / UNAVAILABLE — explicit list (status: unknown, treat as unavailable until proven otherwise)

Nothing below is asserted to exist. Each item is **unknown** as of this session; the verification protocol in §C
resolves each one. Nothing may be treated as published on the strength of this brief:

- `@victframework/sdk`, `@victframework/ui`, `@victframework/ui-svelte`, `@victframework/builder-kit`,
  `@victframework/contracts`, `@victframework/renderer-svelte`, `@victframework/application`,
  `@victframework/control`, `@victframework/server`, `@victframework/cli` — **existence on npm: UNVERIFIED.**
- The full `@victframework` package list (search endpoint) — **UNVERIFIED.**
- Builder Kit artifact location (repo path vs GitHub release asset) and any `verify:builder-kit` command —
  **UNVERIFIED.** The pack only says its "distribution … must be checked at G0" (`docs/STATE.md`).
- Latest release tag / coordinated-release identity / integrity manifests / conformance fixtures of vict-02 —
  **UNVERIFIED.**
- Reference-app and application-proof dependency lists — **UNVERIFIED.**
- Whether an external consumer can obtain the Builder Kit **without cloning** the (private) repo — **UNVERIFIED**;
  if not, that is a candidate G0 blocker ("indispensable public VICT extension unavailable").

### C. Verification protocol for a networked session (exact queries — run these, record raw outputs as G0 evidence)

**NPM (per package; also captures dist-tags, publish dates, description):**
```
https://registry.npmjs.org/-/v1/search?text=@victframework          # full package list
https://registry.npmjs.org/-/all?text=@victframework                # alternative full list
https://registry.npmjs.org/@victframework%2fsdk                     # per-package doc (latest, dist-tags, time)
https://registry.npmjs.org/@victframework%2fui
https://registry.npmjs.org/@victframework%2fui-svelte
https://registry.npmjs.org/@victframework%2fbuilder-kit
https://registry.npmjs.org/@victframework%2fcontracts
https://registry.npmjs.org/@victframework%2frenderer-svelte
https://registry.npmjs.org/@victframework%2fapplication
https://registry.npmjs.org/@victframework%2fcontrol
https://registry.npmjs.org/@victframework%2fserver
https://registry.npmjs.org/@victframework%2fcli
```
HTTP 404 on a package doc = package does not exist on npm (record it explicitly).

**Repo seam / builder-kit / release identity (read, don't guess):**
```
https://raw.githubusercontent.com/radz2291/vict-02/main/README.md                     # footer: independently verified stages
https://raw.githubusercontent.com/radz2291/vict-02/main/packages/renderer-svelte/README.md
https://raw.githubusercontent.com/radz2291/vict-02/main/packages/application/README.md
https://raw.githubusercontent.com/radz2291/vict-02/main/packages/sdk/README.md
https://raw.githubusercontent.com/radz2291/vict-02/main/packages/control/README.md
https://raw.githubusercontent.com/radz2291/vict-02/main/packages/builder-kit/README.md
https://raw.githubusercontent.com/radz2291/vict-02/main/docs/architecture/STAGE-08-BUILDER-KIT-AND-SELF-HOSTING.md
https://raw.githubusercontent.com/radz2291/vict-02/main/examples/reference-app/package.json
https://raw.githubusercontent.com/radz2291/vict-02/main/examples/application-proof/package.json
https://api.github.com/repos/radz2291/vict-02/tags
https://api.github.com/repos/radz2291/vict-02/releases
```
If `packages/ui/` 404s, enumerate the real layout via
`https://api.github.com/repos/radz2291/vict-02/contents/packages` and the repo tree
(`https://api.github.com/repos/radz2291/vict-02/git/trees/main?recursive=1`).
For the custom-component-island contract, extract from `packages/application/README.md` +
`examples/application-proof`: the exact import path, and the id/revision resolution the proof example uses when
registering a non-VICT component (a chart). Record the literal contract text, not a paraphrase.

**Git-side (if shell/git becomes available):** `git ls-remote --tags https://github.com/radz2291/vict-02` for the
tag list without cloning.

All outputs go under `docs/evidence/G0/` with fetch timestamps per `docs/EVALUATION.md`.

### D. Recommended published consumer path (TEMPLATE — conditional on §C verification)

Once §C resolves, the likely path shape for the SvelteKit trading host is:

1. **Install only npm-published `@victframework/*` packages** at the exact versions returned by the registry
   (pin exact versions + record `dist.integrity` in evidence). Do **not** install from a git URL or vendor source —
   `AGENTS.md` §3.7 forbids copying reference-repo code by default, and the handoff requires *published* identities.
2. **Render the VICT application** using the seam documented in the published `renderer-svelte` / `application`
   package READMEs (verify which one is the consumer-facing entry; the `packages/ui` 404 suggests it is not a
   `ui` package).
3. **Register the chart as a custom component island** exactly per the application-proof contract: use whatever
   id/revision resolution mechanism the proof example demonstrates (expected shape: register under a stable
   component id resolved to a specific revision in the application definition — **must be read, not assumed**).
   The chart library itself stays **unselected** (O-03); this brief intentionally pins nothing.
4. **Builder Kit:** only adopt it if (a) the artifact is externally obtainable without cloning the private repo,
   and (b) its integrity-verification command (if any, e.g. `verify:builder-kit`) passes on the obtained artifact.
   Otherwise treat as unavailable → G0 HELD/BLOCKED on that named dependency.
5. Any SvelteKit/Svelte major-version compatibility constraint must come from the published packages'
   `peerDependencies`, not from assumptions.

### E. Open risks for the G0 gate

1. **Publication may be incomplete.** The pack's own state says UI packages were "in progress" the day before G0
   opened; `packages/ui` already 404'd. If `ui`/`ui-svelte` are unpublished or a needed seam is missing, G0 hits its
   explicit stop condition.
2. **Builder Kit external availability unknown.** If it is only a repo-local artifact, an external consumer cannot
   bootstrap without private access — a rights/availability blocker (`AGENTS.md` §4).
3. **No pinned vict-02 release identity.** Without a tag/manifest/integrity record, "published" cannot be
   distinguished from "mutable main-branch state"; the handoff demands pinning exact identity before selection.
4. **Unverified SvelteKit compatibility** — peer ranges unknown; a major-version mismatch could force a host
   framework fork decision (material product fork → stop and report).
5. **Process risk:** if a future agent mistakes this brief's §D template for verified fact, it would violate
   AGENTS.md §3.4/§3.9. This brief must be superseded by a networked re-run before any dependency decision.

---

## Sources

- Kept: `AGENTS.md` (repo) — behavioral constitution; §3.4 no-fabrication rule governs this brief's honesty constraints.
- Kept: `docs/STATE.md` (repo) — authoritative live status; flags UI publication and Builder Kit distribution as must-check-at-G0.
- Kept: `docs/HANDOFF.md` (repo) — ACCEPTED authority record; G0 scope, no-pre-authorized-versions clause, stop conditions, expected demo.
- Dropped: npm registry URLs listed in §C — **not fetched** (no network tool); listed as protocol, not evidence.
- Dropped: all `raw.githubusercontent.com/radz2291/vict-02/...` URLs — **not fetched**; listed as protocol only.

## Gaps

**Everything external.** No npm package data, no vict-02 file contents, no tags/releases, no reference-app
dependencies were observed this session. Next step: re-delegate this intake to a subagent/session with
`web_search`/fetch (or shell `curl`/`git ls-remote`) tooling, using the protocol in §C verbatim, writing raw
responses to `docs/evidence/G0/`. Until then, **G0 platform intake is HELD/BLOCKED on tooling**, exactly matching
the handoff stop condition "package identity/integrity unverifiable".

## Supervisor coordination

No supervisor bridge was available in this session (`contact_supervisor` not among provided tools), so the
tooling gap could not be escalated in-flight; it is escalated here via the returned brief.

---

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Produced exactly the requested intake brief at research.md without modifying any other file; explicitly refused to widen scope by inventing npm/GitHub data per AGENTS.md §3.4, and pinned no chart library or engine (intake facts only)."
    },
    {
      "id": "criterion-2",
      "status": "satisfied",
      "evidence": "Brief cites every local claim to AGENTS.md / docs/STATE.md / docs/HANDOFF.md line items, marks all external facts as UNVERIFIED-THIS-SESSION, and provides an exact, reproducible verification protocol (registry + raw.githubusercontent + GitHub API URLs) so an independent reviewer/networked session can re-run and falsify."
    }
  ],
  "changedFiles": ["research.md"],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "read AGENTS.md; read docs/STATE.md; read docs/HANDOFF.md",
      "result": "passed",
      "summary": "Local pack sources read and cited; confirms G0 authorized, no package versions pre-authorized, UI publication and Builder Kit distribution must be checked at G0."
    },
    {
      "command": "web_search / HTTP fetch of registry.npmjs.org and raw.githubusercontent.com",
      "result": "blocked",
      "summary": "Session has no network tools (only read/write); all external verification deferred with exact protocol recorded in research.md §C."
    }
  ],
  "validationOutput": [
    "No external fact asserted as verified; all npm/GitHub items explicitly marked UNVERIFIED with resolution queries."
  ],
  "residualRisks": [
    "G0 platform intake remains BLOCKED on tooling until a networked session re-runs the §C protocol.",
    "If @victframework/ui or ui-svelte or the Builder Kit artifact are unpublished, G0 hits its codified stop condition (indispensable public VICT extension unavailable).",
    "A future agent must not treat research.md §D as verified fact — it is a template gated on §C evidence."
  ],
  "noStagedFiles": true,
  "notes": "Task as specified cannot be completed truthfully without network tooling; this session escalated via the brief itself (no contact_supervisor tool available). Re-delegate intake to a web-enabled subagent using research.md §C verbatim; raw outputs belong in docs/evidence/G0/ per docs/EVALUATION.md."
}
```
