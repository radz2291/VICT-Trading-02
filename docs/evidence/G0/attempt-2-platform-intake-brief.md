# G0 Platform Intake — Published State of VICT (github.com/radz2291/vict-02)

**Verdict: INTAKE COMPLETE — networked re-run per the attempt-1 protocol (§C), executed verbatim
on 2026-09-27. This brief SUPERSEDES `docs/evidence/G0/attempt-1-platform-intake-blocked.md`
(that brief's §D was a template; every conditional item in it is now resolved by fetched evidence).
All raw HTTP responses are saved under `docs/evidence/G0/raw/` with the fetch manifest
`docs/evidence/G0/raw/00-FETCH-MANIFEST.md` (per-file source URL, HTTP status, HTTP `Date` header).**

Protocol executed: all 12 npm registry doc endpoints from §C (13 packages discovered via search,
4 additional per-package docs fetched), both search endpoints, all raw.githubusercontent fetches
from §C, api.github.com tags/releases/contents/tree, and `git ls-remote --tags`. Fetches that
404'd are recorded as such below, never guessed around.

---

## (a) Verified facts (every fact below is backed by a saved raw response)

### A1. npm publication state (evidence: `raw/npm-*.json`, `raw/npm-search-victframework.json`)

Exactly **13 `@victframework/*` packages are published** on the public npm registry. The search
endpoint (`/-/v1/search?text=@victframework`, fetched 2026-09-27) returns exactly these 13 and
nothing else. All dist-tags are identical across all 13 packages:
`{ latest: "0.3.1", "vict-0.3.0-rc": "0.3.0-rc.1", "vict-0.3.1-rc": "0.3.1-rc.2" }`.

| Package | latest | 0.3.1 published (npm `time`) | peerDependencies | deps (@victframework) |
|---|---|---|---|---|
| `@victframework/sdk` | 0.3.1 | 2026-09-22T04:52:10.054Z | `zod ^3.25.0` | contracts 0.3.1 |
| `@victframework/contracts` | 0.3.1 | 2026-09-22T04:53:06.374Z | `zod ^3.25.0` | — |
| `@victframework/kernel` | 0.3.1 | 2026-09-22T04:52:13.811Z | — | — |
| `@victframework/runtime` | 0.3.1 | 2026-09-22T04:53:19.489Z | — | — |
| `@victframework/store-sqlite` | 0.3.1 | 2026-09-22T04:53:54.875Z | — | — |
| `@victframework/appdata-sqlite` | 0.3.1 | 2026-09-22T04:52:16.064Z | — | — |
| `@victframework/application` | 0.3.1 | 2026-09-22T04:53:28.834Z | — | sdk, contracts |
| `@victframework/renderer-svelte` | 0.3.1 | 2026-09-22T04:52:32.990Z | **`svelte ^5.0.0`** | sdk, application |
| `@victframework/scaffolder` | 0.3.1 | 2026-09-22T04:52:20.125Z | — | — |
| `@victframework/mastra` | 0.3.1 | 2026-09-22T04:53:20.476Z | — | — |
| `@victframework/control` | 0.3.1 | 2026-09-22T04:53:15.957Z | — | runtime, contracts |
| `@victframework/server` | 0.3.1 | 2026-09-22T04:52:13.101Z | — | control, runtime, contracts, application, store-sqlite |
| `@victframework/cli` | 0.3.1 | 2026-09-22T04:53:29.801Z | — | — |

Full version history per package: `0.1.0, 0.1.1, 0.2.0, 0.3.0-rc.1, 0.3.0, 0.3.1-rc.1, 0.3.1-rc.2, 0.3.1`.
Stable `0.3.0` was published 2026-09-21T05:29:08Z; stable `0.3.1` 2026-09-22T04:53:28Z.
Per-package `dist.integrity` SHA-512 values are recorded verbatim in `raw/npm-*.json` (not
reproduced here). The alternative `/-/all` search endpoint **does not exist** — the registry
returns `{"code":"ResourceNotFound","message":"/-/all does not exist"}` (saved verbatim).

### A2. Repository layout (evidence: `raw/gh-contents-packages.json`, `raw/gh-tree-main.json`)

`packages/` on vict-02 `main` contains exactly 14 directories: `appdata-sqlite, application,
builder-kit, cli, contracts, control, kernel, mastra, renderer-svelte, runtime, scaffolder, sdk,
server, store-sqlite`. **There is no `packages/ui` and never a UI package under that name** — the
attempt-1 concern ("UI seam location unknown") is resolved: the public UI seam is
`@victframework/renderer-svelte` (canonical SvelteKit renderer, generic `VitApp` host with
built-in role components including charts) plus `@victframework/application` (neutral definition
compiler + component-registry seam). Repository README (`raw/repo-README.md`) describes
renderer-svelte as: "generic application host (`VitApp`), built-in role components (tables,
charts, forms, tabs, dialogs/drawers, status, conversation, …), responsive navigation, semantic
theme tokens, accessible defaults".

**Package READMEs do not exist in the repo** for `application`, `renderer-svelte`, `sdk`,
`control` (raw.githubusercontent 404; `packages/ui/README.md` also 404) and the npm `readme`
field of all published packages is the literal string
`"ERROR: No README data found!"` (saved in `raw/npm-*.json`). Only the root `README.md`,
`packages/builder-kit/README.md`, and `examples/reference-app/README.md` exist as documents.
The authoritative consumer contract therefore lives in the shipped examples + architecture docs
(fetched and quoted in §C below), not in package READMEs.

### A3. vict-02 main tip (evidence: `raw/gh-repo-main-commit.json`)

`main` HEAD at fetch: **`e86d03234e9a603ac30de0331488515aebd8ae7c`**, committed
**2026-09-26T10:57:21Z** — "docs(stage8-g3): file the bounded F6 authority review on d4feedb …
G3 disposition HELD, nothing Verified, no G4 — stop". Full commit message saved in the raw file;
it records that the Stage 8 G3 (greenfield proof) evaluation found `F6 FAIL literal` and that
"component trace: TaskTable/TaskForm/OpenTasksCount are behavior-carrying islands (TaskTable
takes no props, self-fetches) while 0.3.1 ships definition-driven table/form surfaces;
PriorityBadge is the only declared-props-only island".

### A4. Git tags / GitHub releases (evidence: `raw/gh-tags.json`, `raw/gh-releases.json`, `raw/git-ls-remote-tags.txt`)

**Zero git tags** (`git ls-remote --tags` exits clean with empty output; tags API returns `[]`)
and **zero GitHub releases** (`releases` API returns `[]`). Release identity is content-derived,
not tag-based (confirmed by `docs/RELEASE-COMPATIBILITY.md`: "no version-tag publication path;
the content-derived identity is the immutability anchor").

### A5. Release-set identity — independently recomputed and MATCHED

Evidence: `raw/repo-RELEASE-COMPATIBILITY.md`; recomputation recorded in this session's shell
transcript (sha256 over the sorted newline-joined `name@version` list of the 13 members, prefixed
`v1_`). The doc records **`vict-release-set@1/0.3.1`**, contentId
`v1_1c695280d3afec5e91bfc75d3c99a5a85bc27f6d91127c4d0ce7bd51563c2583`.
Recomputation this session produced **exactly that contentId — MATCH**. The registry state
(13/13 `latest = 0.3.1`) is consistent with the §2 set record.

---

## (b) NOT published / unavailable — explicit list (HTTP 404 or API-verified absence)

- `@victframework/ui` — **NOT on npm** (registry doc endpoint 404; also no `packages/ui` dir in repo). The UI seam does not live here.
- `@victframework/ui-svelte` — **NOT on npm** (404).
- `@victframework/builder-kit` — **NOT on npm** (404). This is by design, not an accident: the package is `"private": true` in-repo and the STAGE-08 dispositions D-1′/D-3 record publication as deliberately deferred (`raw/doc-STAGE-08.md` §8).
- `@victframework/notes-pack` — **NOT on npm** (404), although the in-repo `examples/reference-app/package.json` declares a dependency on `@victframework/notes-pack@1.0.0` (it is a workspace pack in the VICT repo, `packs/notes-pack`; the published example manifest cannot be installed as-is from npm alone).
- GitHub release assets — **none exist** (releases API `[]`); no Builder Kit artifact is downloadable there.
- Git tags — **none** (empty `ls-remote --tags`).
- npm READMEs — no `readme` on any published package (`"ERROR: No README data found!"`); no `packages/{application,renderer-svelte,sdk,control}/README.md` in the repo (404).

---

## (c) Published consumer path for a SvelteKit host with a custom chart component island

All quotes below are **literal** from fetched sources (file paths under `raw/`).

### C.1 Surface declaration (definition side)

`docs/architecture/STAGE-05-APPLICATION-DELIVERY.md` surface-vocabulary table
(`raw/doc-STAGE-05.md`, line 118):

> | `component` | Custom code-island slot | `componentId`, `revision`, bounded primitive `props` |

Live example, `examples/application-proof/src/lib/application/definition.ts`
(`raw/app-proof-definition.ts`):

```ts
{
  role: 'component',
  id: 'sc.badge',
  componentId: 'cmp.badge',
  revision: '1',
  props: { label: 'custom component' },
},
```

and at the application level:

```ts
components: [{ componentId: 'cmp.badge', revision: '1' }],
```

with bindings passed to the compiler:

```ts
const result = compileApplication({
  application: proofApplication,
  resources: [noteResource],
  contracts: proofBindings.contracts,
  capabilities: proofBindings.capabilities,
  components: proofBindings.components,   // [{ componentId: 'cmp.badge', revision: '1' }]
});
```

`examples/reference-app/src/lib/application/definition.ts` shows the same island on a dashboard
alongside the built-in chart role (`raw/ref-app-definition.ts`): a `role: 'chart'` surface
(`viewId: 'v.chartProjects', kind: 'bar', xField: 'status', yField: 'budget'`) and a separate
`role: 'component'` surface with `componentId: 'cmp.health', revision: '1',
props: { label: 'workspace health island' }`.

### C.2 Registration (consumer side) — id/revision resolution

`examples/application-proof/src/lib/host/proof-renderer.ts` and
`examples/reference-app/src/lib/components/registry.ts` (`raw/app-proof-proof-renderer.ts`,
`raw/ref-app-registry.ts`), literal:

```ts
import { createComponentRegistry } from '@victframework/application/renderer';
import type { ComponentRegistry } from '@victframework/application/renderer';

export function createProofComponentRegistry(): ComponentRegistry {
  const registry = createComponentRegistry('registry.proof', '1');
  registry.register({ componentId: 'cmp.badge', revision: '1', implementation: Badge });
  return registry;
}
```

(reference-app is identical in shape: `createComponentRegistry('registry.reference', '1')` +
`registry.register({ componentId: 'cmp.health', revision: '1', implementation: HealthBadge })`.)

The host resolves components **by exact id/revision from the registry before rendering** —
`examples/application-proof/src/lib/host/ApplicationHost.svelte` (`raw/app-proof-ApplicationHost.svelte`):

> "every custom component is resolved through the registry by exact id/revision BEFORE anything is
> rendered (fail fast, fail safe, structured diagnostics)."

> "Components come EXPLICITLY from the supplied bindings — the host never consults a global or
> implicit registry."

The registry lives **outside the serializable manifest** (`raw/app-proof-page.svelte`):

> "The trusted local component registry lives OUTSIDE the serializable definition; the plan
> carries only cmp.badge@1. The registry factory is shared with the server-side release
> compilation so the deployed component identity always comes from the SAME actual registry."

The island `props` type bound, from the same host's `SurfaceShape`:

```ts
props?: Record<string, string | number | boolean>;
```

## (d) Builder Kit availability verdict

**NOT obtainable by an external consumer from any self-serve public channel.** Verified absence:

- npm: `https://registry.npmjs.org/@victframework%2fbuilder-kit` -> **404** (`raw/npm-builder-kit.json`, `raw/npm-builder-kit.headers.txt`).
- GitHub releases: `[]` -> **no release asset** (`raw/gh-releases.json`).
- Git tags: none -> **no tagged artifact** (`raw/gh-tags.json`, `raw/git-ls-remote-tags.txt`).
- Only acquisition path: the **repo path** `packages/builder-kit/**` (+ repo root
  `BUILDER-KIT.md`, `docs/builder-kit/*`, `scripts/verify-builder-kit.mjs`) — i.e., a
  clone/download of the reference repository, which our authority rules permit for reading but
  which the kit's own distribution design treats differently.

The distribution **design** (D-1', `raw/doc-STAGE-08.md` §8, disposition RESOLVED/ADOPTED):

> "the 13 platform packages from the existing published `vict-release-set@1/0.3.1` (registry,
> lockfile integrity — the clean-consumer discipline is preserved) plus the new
> `@victframework/builder-kit` as an integrity-recorded local artifact (recorded SHA-256; exact
> `0.3.1` pins; no-checkout-leakage probe retained)"

and the builder-kit README: "The path is checkout-independent: install the packed kit artifact
into the app and run it from there." The artifact itself must be **handed over out-of-band**
(packed tarball + recorded SHA-256, consumed via `vict-builder-kit init-app --release-set <id>
--kit-artifact <spec> --kit-sha256 <hex>`); no public download URL exists anywhere in the fetched
sources. **Verdict: unavailable to this consumer until the owner provisions the artifact; not a
G0-chart-demo blocker (G0's public seam is the 13 published packages), but a named dependency for
any later stage that requires the kit.**

**`verify:builder-kit` exists.** It is an npm script in the vict-02 repo root
(`raw/repo-package.json` line 39: `"verify:builder-kit": "node scripts/verify-builder-kit.mjs"`)
and a CLI subcommand (`vict-builder-kit verify`). What it checks (builder-kit README,
`raw/pkg-builder-kit-README.md`, literal summary): "the freshness gate: regenerate-and-compare
for both layers, identity recomputation with the §3.3 exclusions, catalog completeness/dangling
checks, schema validation, canary hygiene, and the baseline comparison (committed, renamed, and
untracked changes versus the task pack's pinned `baseTree` through the ignore manifest)."
For external applications there is a separate **app-level** gate: `vict-builder-kit verify --app
[--app-dir <dir>]`, which "checks the pack schema, the canonical identity rule (packId over
canonical bytes with packId omitted), the bootstrap<->pack binding, per-input content drift /
unregistered inputs, and — once platform packages are installed — the installed
`@victframework/*` versions against the recorded release set".

---

## (e) Latest vict-02 release identity and verified stages

**Release identity: `vict-release-set@1/0.3.1`** — contentId
`v1_1c695280d3afec5e91bfc75d3c99a5a85bc27f6d91127c4d0ce7bd51563c2583` (independently recomputed
this session, MATCH), all 13 members at exact `0.3.1`, registry `latest` = `0.3.1`, published
2026-09-22 (0.3.0 predecessor set live 2026-09-21; candidate tags `vict-0.3.0-rc` ->
`0.3.0-rc.1` and `vict-0.3.1-rc` -> `0.3.1-rc.2` also present). No git tag, no GitHub release —
the contentId **is** the immutability anchor.

**Independently verified stages per the repo README footer** (`raw/repo-README.md`):

- **Stages 1-4**: independently verified (Stage 4 "VERIFIED WITH NON-BLOCKING ISSUES — STAGE 05 PERMITTED").
- **Stage 5** (application delivery layer): "independently verified and formally closed
  (2026-09-04, VERIFIED WITH NON-BLOCKING ISSUES)".
- **Stage 06A** (product-agent foundation): "independently verified and formally closed (2026-09-06 ...)".
- **Stage 06B**: "implemented and awaiting fresh independent audit ... Stage 06 remains In Progress
  and is not yet Verified; Stage 07 remains blocked."
- Per `raw/repo-RELEASE-COMPATIBILITY.md`: Stage 07A (public release set) "independently verified
  and live (2026-09-09) ... Stage 07A is formally closed".
- Stage 8 (Builder Kit): the STAGE-08 doc is the ratified/frozen spec; the **latest commit on
  main (2026-09-26) records Stage 8 G3 disposition HELD, F6 FAIL literal, "nothing Verified,
  no G4"** — i.e., Stage 8 is not verified and has an open island-contract finding.
---

## (f) Open risks for the G0 gate

1. **Internal inconsistency in vict-02 docs (resolved toward registry):**
   `repo-RELEASE-COMPATIBILITY.md`'s header narrative still says "`latest` remains `0.3.0` and
   stable `0.3.1` is NOT published" while its own §2 records `vict-release-set@1/0.3.1` and the
   live registry shows `latest = 0.3.1` on all 13 packages (fetched 2026-09-27). The header is
   stale prose; the registry + the §2 contentId (recomputed, matched) are the authority. Any
   consumer pin must cite the registry state, not the stale narrative.
2. **Island contract friction (upstream, open):** the vict-02 tip commit (2026-09-26) records
   Stage 8 G3 **HELD** with `F6 FAIL literal` because behavior-carrying islands are unsupported on
   `0.3.1` (only declared-props-only islands work; 0.3.1 "ships definition-driven table/form
   surfaces" with no extension API). Our chart wrapper must be declared-props-only. If a chosen
   chart library needs richer props (callbacks, instances), that is a platform limitation to
   surface at chart-candidate comparison, possibly forcing a fork decision.
3. **Builder Kit provisioning:** not self-serve obtainable (see (d)). G0's chart-demo scope does
   not require it; any later stage that does require it needs an owner-granted artifact transfer
   with recorded SHA-256.
4. **`@victframework/notes-pack` unpublished:** the in-repo reference-app manifest cannot be
   installed from npm as-is; the example's pack dependency must come from the repo workspace.
   Any "run the reference app as published" claim is therefore limited.
5. **Repo examples pin stale versions:** both fetched example `package.json` files pin
   `@victframework/*` at `0.2.0` while the registry's latest set is `0.3.1` (published
   2026-09-22). Contract details quoted from those examples (island registration,
   `createComponentRegistry`) must be conformance-checked against the 0.3.1 tarballs during G0
   selection proof — treat the examples as documentation of the seam, not as 0.3.1-verified
   consumer code.
6. **No git tag/release anchor:** release identity is content-derived only; our evidence must pin
   the contentId + per-package `dist.integrity` (recorded) rather than a tag.
7. **Node/Svelte constraints:** Node `>=22.13.0` (built-in `node:sqlite`), renderer peer
   `svelte ^5.0.0`; examples use SvelteKit 2 / Vite 6 / adapter-node 5. A host on different
   majors is unverified.
8. **npm README absence:** no published package ships a README; documentation comes from the
   shipped docs + examples quoted above. Any doc not fetched here (e.g. STAGE-06B reports) is
   **unverified this session**.

## Supersession note

`docs/evidence/G0/attempt-1-platform-intake-blocked.md` (BLOCKED on tooling) is superseded by
this brief. Its §D template items are all resolved: the UI seam is `renderer-svelte` +
`application` (no `ui` package exists); the Builder Kit is not self-serve obtainable; the
release identity is `vict-release-set@1/0.3.1` with a recomputed contentId; peer requirements
are `svelte ^5.0.0` (renderer) and `zod ^3.25.0` (sdk/contracts).
