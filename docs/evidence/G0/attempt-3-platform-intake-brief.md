# G0 Platform Intake — attempt-3 (re-run against the CURRENT npm registry and vict-02 repo state)

**Fetched: 2026-09-28, 14:15-14:21 GMT (npm registry `Date` headers this session).**
**Verdict: INTAKE COMPLETE — attempt-3 SUPERSEDES `docs/evidence/G0/attempt-2-platform-intake-brief.md`
(2026-09-27). The owner's report is confirmed by fetched evidence: two NEW UI packages
(`@victframework/ui`, `@victframework/ui-svelte`) plus a coordinated `0.4.0-rc.1` candidate set are
now published, and the published UI seam has MOVED from `renderer-svelte` to `ui-svelte`. The
attempt-2 raw files under `docs/evidence/G0/raw/` are untouched; every fact in this brief is backed
by a saved raw response under `docs/evidence/G0/raw2/` with the manifest
`raw2/00-FETCH-MANIFEST.md` (per-file HTTP status + registry `Date` header).**

This is intake only: no package is selected or pinned, no decision is recorded.

---

## (a) Verified facts (every fact backed by a saved raw response in `raw2/`)

### A1. npm namespace state — 15 `@victframework/*` packages (attempt-2: 13)

Search endpoint `https://registry.npmjs.org/-/v1/search?text=@victframework&size=250`
(`raw2/npm-search-victframework.json`, HTTP 200, Date 2026-09-28T14:15:34Z): `total: 15`,
exactly these 15 names, nothing else:

`application, sdk, control, contracts, runtime, kernel, mastra, server, cli, scaffolder,
renderer-svelte, store-sqlite, appdata-sqlite, ui, ui-svelte`.

**NEW since attempt-2 (2026-09-22 fetch): `@victframework/ui` and `@victframework/ui-svelte`.**

### A2. Package identity table (per-package registry docs `raw2/npm-*.json`, fetched 2026-09-28)

| Package | latest (dist-tag) | latest published | 0.4.0-rc.1 published | peerDependencies | deps (@victframework) at latest |
|---|---|---|---|---|---|
| `@victframework/ui` | **`0.0.0-bootstrap.1`** | 2026-09-28T12:04:50.172Z | 2026-09-28T13:24:58.515Z | none | none |
| `@victframework/ui-svelte` | **`0.0.0-bootstrap.1`** | 2026-09-28T12:05:03.863Z | 2026-09-28T13:24:47.802Z | **`svelte ^5.33.0`** | ui 0.4.0-rc.1, sdk 0.4.0-rc.1, application 0.4.0-rc.1 (+ runtime deps `bits-ui ^2.19.3`, `@internationalized/date ^3.12.4`) |
| `@victframework/sdk` | `0.3.1` | 2026-09-22T04:52:10.054Z | 2026-09-28T13:24:22.982Z | `zod ^3.25.0` | contracts 0.3.1 |
| `@victframework/contracts` | `0.3.1` | 2026-09-22T04:53:06.374Z | 2026-09-28T13:25:55.585Z | `zod ^3.25.0` | none |
| `@victframework/kernel` | `0.3.1` | 2026-09-22T04:52:13.811Z | 2026-09-28T13:24:47.705Z | none | none |
| `@victframework/runtime` | `0.3.1` | 2026-09-22T04:53:19.489Z | 2026-09-28T13:24:56.517Z | none | none |
| `@victframework/store-sqlite` | `0.3.1` | 2026-09-22T04:53:54.875Z | 2026-09-28T13:25:52.948Z | none | none |
| `@victframework/appdata-sqlite` | `0.3.1` | 2026-09-22T04:52:16.064Z | 2026-09-28T13:26:05.558Z | none | none |
| `@victframework/application` | `0.3.1` | 2026-09-22T04:53:28.834Z | 2026-09-28T13:27:57.514Z | none | sdk 0.3.1, contracts 0.3.1 |
| `@victframework/renderer-svelte` | `0.3.1` | 2026-09-22T04:52:32.990Z | **NOT PRESENT** (no 0.4.0-rc.1) | `svelte ^5.0.0` | sdk 0.3.1, application 0.3.1 |
| `@victframework/scaffolder` | `0.3.1` | 2026-09-22T04:52:20.125Z | 2026-09-28T13:26:38.774Z | none | none |
| `@victframework/mastra` | `0.3.1` | 2026-09-22T04:53:20.476Z | 2026-09-28T13:25:46.425Z | none | none |
| `@victframework/control` | `0.3.1` | 2026-09-22T04:53:15.957Z | 2026-09-28T13:25:18.034Z | none | none |
| `@victframework/server` | `0.3.1` | 2026-09-22T04:52:13.101Z | 2026-09-28T13:25:04.467Z | none | none |
| `@victframework/cli` | `0.3.1` | 2026-09-22T04:53:29.801Z | 2026-09-28T13:24:49.198Z | none | none |

Dist-tags (`raw2/npm-*.json`):

- 12 historical members: `{ latest: "0.3.1", "vict-0.3.0-rc": "0.3.0-rc.1",
  "vict-0.3.1-rc": "0.3.1-rc.2", "vict-0.4.0-rc": "0.4.0-rc.1" }` — i.e. `latest` is UNCHANGED at
  `0.3.1` and every member except `renderer-svelte` gained `0.4.0-rc.1` under the new candidate tag
  `vict-0.4.0-rc`.
- `@victframework/renderer-svelte`: `{ latest: "0.3.1", "vict-0.3.0-rc": "0.3.0-rc.1",
  "vict-0.3.1-rc": "0.3.1-rc.2" }` — **no 0.4.0-rc.1 exists and no new tag; the package was
  RETIRED from the candidate set** (retained on npm as published, installable by exact pin).
- `@victframework/ui` and `@victframework/ui-svelte`:
  `{ latest: "0.0.0-bootstrap.1", bootstrap: "0.0.0-bootstrap.1", "vict-0.4.0-rc": "0.4.0-rc.1" }`.
  The `0.0.0-bootstrap.1` placeholder (published 2026-09-28T12:04-12:05Z under a `bootstrap` tag)
  is npm-platform-forced: `latest` is mandatory once a package exists and was auto-initialized to
  the first published version (owner-authorized one-time first-publication bootstrap;
  `raw2/doc-RELEASE-EXEC-R2.md`). It is a **placeholder marker, not the candidate**; the candidate
  is reachable ONLY via `vict-0.4.0-rc` or an exact `0.4.0-rc.1` pin.
- `@victframework/builder-kit`: registry doc endpoint -> **HTTP 404** (`raw2/npm-builder-kit.json`,
  `raw2/npm-builder-kit.headers.txt`).

**Integrity (dist.integrity, recorded verbatim from `raw2/npm-*.json`)** — the three fetched
tarballs were downloaded and byte-verified: `ui` 0.4.0-rc.1
`sha512-7q+fTa358Kszxb2/LCWSdIIQQ/jFjwxYytQ3GBXZBMP/A4y3elhJ4X1zaNC0SlQFAHs/nhBlePLRuKRnM481nw==`
(recomputed == registry), `ui-svelte` 0.4.0-rc.1
`sha512-Mh1Tl5fswJ0jf8uAYRh3gIwjBdpNfj5AujiPpU0Kl9m/jkfzor5IRt5wM4KHpB1f92oUAH4+QVGjz1z2yCWg0A==`
(match), `application` 0.4.0-rc.1
`sha512-y+LXBZeJPiEOmJRpOrognvx5cHECuIdw1zBDl4wzQIPh4Q1kWc+TKPNDf4WdJCJ8QAwaOJe2qmyW8NdcDe6e4g==`
(match). All 15 packages' full integrity values are in the saved registry docs. The three
tarballs are extracted for reading under `raw2/tarball-inspect/`.

**npm `readme` fields:** `ui`/`ui-svelte`/`application` — the `readme` field is **absent
(undefined)**; `renderer-svelte` — the literal string `"ERROR: No README data found!"`. No new
package ships a README through npm. Repo raw READMEs `packages/ui/README.md` and
`packages/ui-svelte/README.md` -> **HTTP 404, do not exist** (`raw2/pkg-ui-README.md`,
`raw2/pkg-ui-svelte-README.md`). The authoritative contract lives in the published tarballs
(inspected here), the repo docs, and the shipped examples (all quoted below).

### A3. vict-02 repo state (`raw2/gh-repo-main-commit.json`, `raw2/gh-contents-packages.json`, `raw2/gh-tree-main.json`)

- `main` HEAD at fetch: **`e92c8b73832144a886550618423dbc2fe50673c7`**, committed
  **2026-09-28T14:07:11Z** — "docs: record published 0.4.0-rc.1 candidate and verification caveat".
- `packages/` now contains **16 directories**: the previous 14 plus **`ui`** and **`ui-svelte`**
  (`packages/renderer-svelte` is REMOVED from the workspace; it remains only as published npm
  artifacts). `packages/ui` ships `src/{index,composition,feedback}.ts`; `packages/ui-svelte`
  ships the full Svelte renderer (`VitApp.svelte`, `ComponentSlot.svelte`, `Chart.svelte`,
  catalog, etc. — tree: `raw2/gh-tree-main.json`).
- Git tags: **none** (`raw2/gh-tags.json` = `[]`; `raw2/git-ls-remote-tags.txt` = empty output).
  GitHub releases: **none** (`raw2/gh-releases.json` = `[]`). Release identity remains
  content-derived only.

### A4. What the two new packages ARE (fetched source + published tarballs)

- `@victframework/ui` — description (registry doc, `raw2/npm-ui.json`): *"Transient,
  framework-neutral presentation intent derived from an Application Plan."* Zero internal deps,
  zero peers, environment-neutral. Source (`raw2/pkg-ui-src-index.ts`): portable composition types
  (`UiTableIntent`, `UiShellLink/Group`, `UiFormField`, `UiChartPoint`, `UiPlan` ...), default
  resolution and closed runtime validators; `deriveUiPlan(plan)` derives table intents from the
  compiled plan, including per-table-cell islands:
  `component?: { componentId, revision, props: Readonly<Record<string, string>> }`
  ("Versioned registered island rendered in this cell; props map prop name -> row field.").
- `@victframework/ui-svelte` — description (registry doc, `raw2/npm-ui-svelte.json`): *"The
  permanent Svelte renderer for Vict Application Plans: the canonical ApplicationRenderer
  (mount/update/unmount machinery, generic VitApp host, recursive surface traversal,
  table/form/overlay adapters, route + structural validation, presentation normalization...)"*.
  Ships `src` (Svelte components) and `styles.css` by design; exports subpaths
  `./dates, ./controls, ./primitives, ./styles.css, ./catalog.css, ./catalog/*, ./component-actions`
  (40+ catalog entry points). `RENDERER_ID = 'renderer.svelte-kit'`,
  `RENDERER_REVISION = '5.0.0'` — the renderer's semantic identity is UNCHANGED by the package move
  (`raw2/doc-UI-FACADE-RETIREMENT.md` §2).

---

## (b) Explicit diff vs attempt-2 (2026-09-27 fetch)

| Aspect | attempt-2 (fetched 2026-09-27) | attempt-3 (fetched 2026-09-28) | Evidence |
|---|---|---|---|
| Package count | 13 | **15** (`ui`, `ui-svelte` added) | `raw2/npm-search-victframework.json` |
| `@victframework/ui` | NOT on npm (404) | **PUBLISHED** — `0.0.0-bootstrap.1` (latest, `bootstrap` tag) + `0.4.0-rc.1` (`vict-0.4.0-rc`) | `raw2/npm-ui.json` |
| `@victframework/ui-svelte` | NOT on npm (404) | **PUBLISHED** — same tag pattern; peer `svelte ^5.33.0` | `raw2/npm-ui-svelte.json` |
| New version line | all members ended at `0.3.1` | **12 of 13 historical members gained `0.4.0-rc.1`** (published 2026-09-28T13:24-13:28Z) under new dist-tag `vict-0.4.0-rc` | `raw2/npm-*.json` |
| `renderer-svelte` | member of the 13-set, latest 0.3.1 | **RETIRED from the candidate set**; no `0.4.0-rc.1`; stays at latest `0.3.1`, installable by exact pin | `raw2/npm-renderer-svelte.json`, `raw2/doc-UI-FACADE-RETIREMENT.md` |
| `application` 0.4.0-rc.1 deps | (n/a) | now depends on **`@victframework/ui`** 0.4.0-rc.1 + sdk + contracts | `raw2/npm-application.json` |
| `sdk` 0.4.0-rc.1 deps | (n/a) | now depends on **`@victframework/ui`** 0.4.0-rc.1 + contracts | `raw2/npm-sdk.json` |
| Release-set identity | `vict-release-set@1/0.3.1` / `v1_1c695280...` (13 members; recomputed MATCH in attempt-2) | **`vict-release-set@1/0.4.0-rc.1` / `v1_2a70a29af12fa887d18e7099b027a11f86bd2f6a70a756446fb43844e41d9399` (14 members, published 2026-09-28; recomputed MATCH this session)** | `raw2/repo-doc-RELEASE-COMPATIBILITY.md` §2 + recomputation below |
| `RELEASE-COMPATIBILITY.md` location | repo root | **MOVED to `docs/RELEASE-COMPATIBILITY.md`** (root path now HTTP 404) | `raw2/repo-RELEASE-COMPATIBILITY.md` (404 body), `raw2/repo-doc-RELEASE-COMPATIBILITY.md` |
| vict-02 `main` HEAD | `e86d0323...` (2026-09-26, "G3 disposition HELD") | **`e92c8b73...`** (2026-09-28, "docs: record published 0.4.0-rc.1 candidate and verification caveat") | `raw2/gh-repo-main-commit.json` |
| `packages/` dirs | 14 | **16** (ui, ui-svelte added; renderer-svelte removed from workspace) | `raw2/gh-contents-packages.json` |
| Builder Kit | npm 404; `"private": true` in repo | **UNCHANGED** — npm 404; `"private": true` | `raw2/npm-builder-kit.json`, `raw2/pkg-builder-kit-package.json` |
| npm READMEs | all packages "ERROR: No README data found!" | new packages: `readme` field absent (undefined); no repo package README for ui/ui-svelte (404) | `raw2/npm-ui.json`, `raw2/pkg-ui-README.md` |
| release-doc narrative | header prose said "`latest` remains `0.3.0`" (stale) while §2 said 0.3.1 | §2 now records the PUBLISHED `0.4.0-rc.1` candidate; the "0.3.1 prepared, NOT published" records are annotated as superseded/unpublished lineage; the prior inconsistency is resolved | `raw2/repo-doc-RELEASE-COMPATIBILITY.md` |

**Island-contract diff (detail in §c):** the island registry path (`createComponentRegistry` from
`@victframework/application/renderer`, exact id/revision, outside the manifest) is UNCHANGED. At
the `0.4.0-rc.1` schema (`vict.application@2`) the island domain EXPANDED: (1) prop values may be
bounded primitives (unchanged) OR closed route-context source bindings `{param|record|view}`;
(2) a new `input` member maps action-input fields to the same closed sources; (3) islands can call
declared actions through `useVictActions()` (Svelte context) — the behavior-carrying-island
limitation of `0.3.1` is lifted for declared actions. The attempt-2 "declared-props-only" reading
is superseded for the candidate set.

---

## (c) CURRENT published consumer path — SvelteKit host + custom chart component island

No selection decision is made here; this is the literal published contract at `0.4.0-rc.1`.

### C.1 Host dependencies (published, exact-pin candidate set)

From `docs/RELEASE-COMPATIBILITY.md` §2 (`raw2/repo-doc-RELEASE-COMPATIBILITY.md`, §2 JSON block):
the 14-member candidate set at exactly `0.4.0-rc.1` — `appdata-sqlite, application, cli,
contracts, control, kernel, mastra, runtime, scaffolder, sdk, server, store-sqlite, ui,
ui-svelte` — reachable ONLY via `vict-0.4.0-rc` or exact `0.4.0-rc.1` pins (`latest` remains
`0.3.1`). The doc's §5: *"the latest published stable set is `0.3.1` for its 13 members, whereas
this candidate requires explicit `0.4.0-rc.1` pins or `vict-0.4.0-rc`."*

### C.2 Host page — literal contract (SvelteKit, Svelte 5 runes)

`examples/reference-app/src/routes/[...vict]/+page.svelte` on vict-02 `main`
(`raw2/ref-app-host-page.svelte`, fetched 2026-09-28):

```svelte
import { VitApp, type ActionResult } from '@victframework/ui-svelte';
import '@victframework/ui-svelte/styles.css';
import { createReferenceRegistry } from '$lib/components/registry';
...
<VitApp
  plan={data.plan as never}
  {registry}
  {dispatch}
  path={page.url.pathname}
  viewData={data.viewData as never}
  record={data.record}
  onInvalidate={() => void invalidateAll()}
  navigate={(target) => void goto(target)}
/>
```

The `VitApp` props contract from the PUBLISHED `ui-svelte@0.4.0-rc.1` tarball
(`raw2/tarball-inspect/ui-svelte/src/VitApp.svelte`, integrity-verified):

```ts
interface Props {
  plan: VictPlanView;
  registry: ComponentRegistry;
  dispatch: (actionId: string, input?: unknown) => Promise<ActionResult>;
  path?: string;
  viewData?: Readonly<Record<string, ViewDatum>>;
  onInvalidate?: () => unknown;
  record?: Record<string, unknown> | null;
  navigate?: (path: string) => void;
}
```

### C.3 Island registration — id/revision (unchanged shape)

`examples/reference-app/src/lib/components/registry.ts` (`raw2/ref-app-registry.ts`, literal):

```ts
import { createComponentRegistry } from '@victframework/application/renderer';
import type { ComponentRegistry } from '@victframework/application/renderer';
export function createReferenceRegistry(): ComponentRegistry {
  const registry = createComponentRegistry('registry.reference', '1');
  registry.register({ componentId: 'cmp.health', revision: '1', implementation: HealthBadge });
  return registry;
}
```

From the published `application@0.4.0-rc.1` tarball (`raw2/tarball-inspect/application/dist/renderer.d.ts`):

> "A versioned component registry: trusted local code registered OUTSIDE the serializable
> definition, resolved by exact id/revision."

`registry.resolve()` fails closed with codes `'UNKNOWN_COMPONENT' | 'COMPONENT_REVISION_MISMATCH'`.

### C.4 Island props typing — EXPANDED at `vict.application@2` (candidate set)

The declared prop domain, from the published `application@0.4.0-rc.1` compiler
(`raw2/tarball-inspect/application/dist/compile.js`, `collectComponentPropsIssues`):

> "`Component surface '<id>' props must be a plain object of primitive values when present`" and
> "`Component surface '<id>' prop values must be strings, finite numbers (excluding negative
> zero), or booleans`" — **plus** (same function, comment): *"Declared route-context source
> bindings (@2) are closed plain objects (`{ param }` / `{ record }` / `{ view }`); their shape is
> validated by collectComponentSourceIssues."*

The closed source-binding type, from the published `ui-svelte@0.4.0-rc.1` tarball
(`raw2/tarball-inspect/ui-svelte/dist/logic.d.ts` lines 179-199):

> "Closed route-context source for component-surface props and action inputs (@2): a route
> parameter, a route record field, or a declared view's rows. Exactly one member with a non-empty
> string value — no expressions, no executable code."

```ts
export type ComponentSourceBinding = { readonly param: string } | { readonly record: string } | { readonly view: string };
```

Rendering: `Surface.svelte` (published tarball, `raw2/tarball-inspect/ui-svelte/src/Surface.svelte`)
resolves by exact id/revision from the supplied registry, resolves props via
`resolveComponentProps(...)` ("Static scalars pass through; declared route-context sources
resolve"), and renders the island inside `ComponentSlot`, which provides
`provideComponentActions({ run })` — so a registered island can dispatch DECLARED actions:

```svelte
{:else if sn.role === 'component'}
  {@const resolved = resolveComponent(sn)}
  {#if resolved !== undefined}
    <ComponentSlot surfaceId={sn.id} componentId={str(sn.componentId)} run={runComponentAction}>
      <resolved.Component {...(componentProps(sn) as Record<string, never>)} />
    </ComponentSlot>
  {:else}
    <Feedback kind="error" message="The custom component could not be resolved." surfaceId={sn.id} />
  {/if}
```

Island-side action access (`raw2/tarball-inspect/ui-svelte/src/component-context.ts`, exported as
`@victframework/ui-svelte/component-actions`):

> "`export function useVictActions(): VictComponentActions` — Call at component initialization
> inside a registered VICT component." with `run(actionId, input?)` "Runs an action already
> declared by the owning application, through its host."

The compile-time `input` member (action-input binding), from the published compiler
(`raw2/tarball-inspect/application/dist/compile.js`):

> "Declared route-context bindings (@2): props values may be static primitives (unchanged
> meaning) or closed ComponentSource objects, and `input` maps action-input fields to the same
> closed sources. Unknown sources, unknown route parameters, undeclared views and unknown record
> fields are rejected at compile time where determinable — no expressions, no executable code."

**Answer to the props question:** NOT merely `Record<string, string|number|boolean>` anymore. At
`vict.application@2` (the candidate set's current schema) the domain is: static strings, finite
numbers (excluding -0), booleans, PLUS closed `{param|record|view}` source bindings; plus the new
`input` action-input mapping and the `useVictActions()` dispatch channel. Callbacks, chart
instances, or arbitrary objects are still NOT expressible as declared props.

### C.5 What a consumer imports (literal surface)

From the published `ui-svelte@0.4.0-rc.1` `dist/index.d.ts`
(`raw2/tarball-inspect/ui-svelte/dist/index.d.ts`): `VitApp`, `ComponentSlot`, `Chart` (built-in),
`createVictRenderer`, `renderVictApplication`, `resolveRoute`, `validatePlanForRenderer`,
`BUILT_IN_ROLES` (includes `'chart'`), `resolveComponentProps`, `resolveComponentSource`,
`resolveComponentActionInput`, `useVictActions` (via the `./component-actions` export), types
`ActionResult`, `ComponentSourceBinding`, `ComponentSourceContext`, `ViewDatum`, `VictPlanView` —
plus `@victframework/ui-svelte/styles.css` and the catalog subpaths.

The built-in chart vocabulary is still minimal — `CHART_KINDS = new Set(['bar', 'line'])` in the
published compiler (`raw2/tarball-inspect/application/dist/compile.js`) and `BUILT_IN_ROLES`
includes `'chart'` but no kind beyond bar/line. A custom chart island remains expressed as a
`role: 'component'` surface with `componentId`/`revision`/`props` (+ optional `input`), declared
via `components: [{ componentId, revision }]` at the application level and registered in the
host-side `ComponentRegistry`.

---

## (d) Builder Kit status (re-checked, current only)

- **npm: NOT published.** `https://registry.npmjs.org/@victframework%2fbuilder-kit` -> **HTTP 404**
  (fetched 2026-09-28T14:16:21Z; `raw2/npm-builder-kit.json`, `raw2/npm-builder-kit.headers.txt`).
  Consistent with the owner's statement that it remains in development.
- **Repo state:** `packages/builder-kit/` exists on `main`; its `package.json` is
  `"private": true` (`raw2/pkg-builder-kit-package.json`, fetched 2026-09-28); README states it is
  "NOT a member of the current coordinated release set (publication deferred, architecture D-3);
  it is distributed as an integrity-recorded local artifact" (`raw2/pkg-builder-kit-README.md`).
  No git tags, no GitHub releases (`raw2/gh-tags.json`, `raw2/gh-releases.json`) -> no downloadable
  artifact. No acquisition-channel change since attempt-2.

---

## (e) Release identity — advanced past `vict-release-set@1/0.3.1`

**Current identity: `vict-release-set@1/0.4.0-rc.1`**, contentId
**`v1_2a70a29af12fa887d18e7099b027a11f86bd2f6a70a756446fb43844e41d9399`** — independently
recomputed this session from the 14 sorted `name@version` members with the frozen algorithm
(sha256 over the sorted newline-joined list, prefixed `v1_`): **MATCH**
(`raw2/repo-doc-RELEASE-COMPATIBILITY.md` §2 JSON block; recomputation in this session's shell).

Member list (14, all at exactly `0.4.0-rc.1`): `appdata-sqlite, application, cli, contracts,
control, kernel, mastra, runtime, scaffolder, sdk, server, store-sqlite, ui, ui-svelte`.
`renderer-svelte` is RETIRED from the set (its published `0.3.1` artifacts remain untouched).

Publication facts (`raw2/doc-RELEASE-EXEC-R3.md`): published 2026-09-28 via GitHub Actions run
36427806906 from source `d7bd003047a648738a4d1d824b0c4e4a442c0da3`, dist-tag `vict-0.4.0-rc` on
every member; the run's terminal state is `failure` ONLY because the in-run read-only registry
verify step timed out on npm CDN propagation (documented caveat); R3 records "14/14 registry
`dist.integrity` values byte-match" and a passing public-registry consumer check; this session's
own three-tarball integrity recheck (ui, ui-svelte, application) independently confirms
registry-side integrity. `latest` is UNTOUCHED: 12 historical members at `0.3.1`; `ui`/`ui-svelte`
carry the platform-forced `0.0.0-bootstrap.1` marker under `latest`/`bootstrap`
(`raw2/doc-RELEASE-EXEC-R2.md`). Stable `0.4.0` is a later, separate decision. The `0.3.1`
line's amended 14/15-member prepared records were NEVER published (superseded before
publication; recorded lineage in the release doc).

Verified-stage status (repo README footer, `raw2/repo-README.md`): Stages 1-4 verified;
Stage 5 verified and formally closed (2026-09-04); Stage 06A verified and closed (2026-09-06);
Stage 06B implemented, not Verified; Stage 07A (public release set) verified and live (2026-09-09)
per the release doc header. Stage 8 (Builder Kit): G3 remains HELD per R3 ("G3 remains HELD —
publication does not move the Stage 8 gate; the fresh P2 proof against the PUBLISHED candidate is
a separate, open operator procedure"). The new-member verdict in-repo: `ui-svelte` "independently
verified in P5 with verdict `P5 ARCHITECTURE VERIFIED — RELEASE INTEGRATION PERMITTED`"
(`raw2/repo-doc-RELEASE-COMPATIBILITY.md`, amendment prose).

---

## (f) Breaking changes / requirements for a SvelteKit 2 + Svelte 5 host

1. **Svelte peer floor moved UP:** `renderer-svelte` (old) peers `svelte ^5.0.0`
   (`raw2/npm-renderer-svelte.json`); `ui-svelte` (new, candidate) peers **`svelte ^5.33.0`**
   (`raw2/npm-ui-svelte.json`). A host must run Svelte >= 5.33.0 to install the candidate cleanly.
   SvelteKit 2 is fine (fixtures use Svelte 5 + Vite 6; `raw2/ref-app-package.json`,
   `raw2/qa4-consumer-package.json`).
2. **Package rename for all renderer imports:** `@victframework/renderer-svelte` ->
   `@victframework/ui-svelte`; styles: `@victframework/renderer-svelte/theme.css` ->
   `@victframework/ui-svelte/styles.css` (`raw2/doc-UI-FACADE-RETIREMENT.md` §4 migration guide).
   The published facade remains installable by exact pin but has no `0.4.0-rc.1` and is retired
   going forward.
3. **Node:** `engines.node >= 22.13.0` on every 0.4.0-rc.1 manifest (`raw2/npm-*.json`), for the
   `node:sqlite` floor.
4. **Candidate is NOT on `latest`:** `latest` = `0.3.1` (12 members) / `0.0.0-bootstrap.1`
   (ui, ui-svelte). A bare `npm i @victframework/ui-svelte` resolves the **placeholder marker**
   `0.0.0-bootstrap.1`, which is NOT the renderer. Any consumer trial must pin exact
   `0.4.0-rc.1` or use the `vict-0.4.0-rc` tag — a mixed-resolution hazard unique to this release.
5. **Exact internal pins:** all intra-set deps are exact `0.4.0-rc.1` (no ranges); consumers must
   adopt the complete set, never a mix with `0.3.1` members (release doc §3/§5).
6. **Schema:** current definition schema is `vict.application@2` (optional additions accepted only
   by @2; @1 stays closed — `raw2/doc-UI-COMPOSITION-SLICE-1.md`).

---

## (g) Open risks for the G0 gate (chart spike)

1. **Candidate vs stable asymmetry:** the UI seam exists ONLY in the unpublished-as-stable
   `0.4.0-rc.1` candidate (tag `vict-0.4.0-rc`). `latest` on `ui`/`ui-svelte` is a non-functional
   placeholder. A G0 host must pin `0.4.0-rc.1` exactly and lockfile-pin integrity; a later
   stable `0.4.0` may differ (semver rc caveat). Pinning `latest` is a trap.
2. **Release-evidence caveat:** the publication workflow's terminal state is `failure` (verify-step
   CDN timeout), remediated by R3's independent registry checks ("14/14 integrity byte-match").
   Evidence lineage should cite R3 + this session's own integrity recheck, not the workflow's
   terminal state.
3. **Candidate integrity anchor:** no git tags, no GitHub releases; the release identity is
   content-derived (`v1_2a70a29a...`, recomputed MATCH) + per-package `dist.integrity`. G0 evidence
   must pin both.
4. **Island contract is now richer but still closed:** props remain compiler-bounded
   (primitives + closed `{param|record|view}` bindings; `input` maps action inputs). Islands CAN
   now dispatch declared actions via `useVictActions()` — which may make a behavior-carrying chart
   island feasible on the candidate set — but arbitrary object/callback props remain inexpressible.
   The attempt-2 F6 friction (behavior-carrying islands unsupported on 0.3.1) is plausibly
   addressed at `0.4.0-rc.1`, but that is an INFERENCE from source, not a demonstrated fact: G0's
   chart spike must demonstrate it, not assume it.
5. **Unverified upstream verification status:** the 0.4.0-rc.1 set's own fresh independent
   verification is outstanding (in-repo verdicts: P5 verified the ui-svelte architecture; Stage 8
   G3 HELD; stable 0.4.0 "a later decision"). A G0 pin on the candidate inherits rc risk.
6. **Repo docs lag:** repo root `README.md` still documents `packages/renderer-svelte` as the
   Stage 05 canonical renderer and does not mention `packages/ui`/`packages/ui-svelte`
   (`raw2/repo-README.md`); package READMEs for ui/ui-svelte do not exist (404). The authoritative
   seam documentation is the release doc + the published tarballs (inspected here) + the migration
   doc. Any doc claim must be taken from those, not the README.
7. **Svelte peer floor:** `svelte ^5.33.0` — our host scaffold must satisfy it (see (f)).
8. **Stage 07A lineage semantics:** the release doc's header explicitly marks the attempt-2-era
   "0.3.1 13-member contentId `v1_1c695280...`" as superseded-unpublished history (never a registry
   lineage entry). Attempt-2's release-set paragraph is superseded by this brief.

## Supersession note

`docs/evidence/G0/attempt-2-platform-intake-brief.md` (and the blocked attempt-1) are superseded
by this brief. Their §(c) consumer path (`renderer-svelte` + `createComponentRegistry` +
`Record<string, string|number|boolean>` props) described the `0.3.1` stable set and remains
true for that set; the CURRENT published candidate seam is `ui-svelte` + the expanded @2 island
domain described in §(c) above.
