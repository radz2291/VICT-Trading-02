# App/package ownership audit and realignment

> **2026-10-31 — owner steering / fresh-app recommendation:** the owner has asked to evaluate a fresh trading app on the newer VICT UI foundation while leaving the previous host. [Research and recommendation](NEW-APP-UI-FOUNDATION-RECOMMENDATION-2026-10-31.md) distinguishes accepted VICT mainline from the newer paused snapshot. The earlier ownership findings remain valid, but copying/extracting the old custom UI wholesale is no longer the recommended implementation route. Treat the in-place G3-R UI migration instructions as provisional pending this direction review. No new app target, exact artifact set or implementation acceptance is invented by this note; G4 remains unstarted.

Date: 2026-10-31. Repository: https://github.com/radz2291/VICT-Trading-02.
Audited `main`: `b075c3e086154c84fc10e71d4334cdf027248cea`.

## Result and authority

**Realignment is needed.** Core engines were extracted successfully, but reusable workspace behavior and presentation remain in the app. This is a source ownership audit, not a new G3 implementation verdict or a browser evaluation. G0–G3 evidence and their verdicts remain historical records. G4 is not started.

Owner instruction in this conversation: "I need you to look at the current app. If any from the app should be governed or responsible by packages instead. Please check and we need to do realignment. But if everything is good, then very well. But moving forward, app responsibility has to be low."

This instruction authorizes auditing and correcting existing capability ownership. It does not authorize new G4 trading features. See the G3-R handoff for the bounded implementation cycle. The thin-app requirement is accepted owner direction; the package name and API below are an audit-derived implementation recommendation, not a verbatim owner choice.

## What was inspected

Fetched all twelve `.ts`/`.svelte` host source files and both packages' source at the pinned SHA. Inspected host feature logic and the relevant package boundaries, including the application definition, drawing state, replay controller, script store, panels, chart adapter and data session. Read the product, architecture, experience, stages, evaluation, operating guide, handoff, decisions and state. The remote main ref still matched the audited baseline after inspection.

Source inventory (including comments, styles and types; NOT effort percentages): host 3,038 lines; chart-workspace 873; trading-kit 2,237. Approximately 49% of this measured source is in the host. This alone is not a defect; the ownership examples below establish the problem. Earlier conversational effort percentages were estimates without time accounting and should not guide architecture.

Environment: source snapshot fetched at the pinned SHA through GitHub; Node v24.22.1. The Windows working tree and running local app were not accessible. No full install/build/browser suite or independent gate verdict is claimed by this audit.

## Findings and intended ownership

| ID | Evidence at baseline | Why it matters | Owner after realignment |
|---|---|---|---|
| R-01 | `host/src/lib/fixture.ts:113–135` aggregates partial buckets, while `packages/trading-kit/src/data.ts:100–147` requires every slot | Two implementations of market-data semantics already disagree | Trading-kit owns aggregation/availability; host supplies raw fixture/data only |
| R-02 | `host/src/lib/scripts.svelte.ts:45–166,239–435`: draft/run records, TxStore FIFO, CRUD, run orchestration, immutable-run persistence and recovery | Another consumer must reconstruct correctness rules beyond the existing backtest engine | Headless draft/run lifecycle and persistence rules in trading-kit over injected ports; reactive bindings in workspace UI package |
| R-03 | `host/src/lib/replay.svelte.ts:77–303`: playback timer, mode transitions, session-to-chart refresh and readout calculations | Significant reusable replay controller lives outside the package boundary | Domain lifecycle/invariants in kit; reactive controller and scheduler binding in workspace UI; injected scheduler/disposal |
| R-04 | `host/src/lib/island-state.svelte.ts` plus `islands/ChartIslandLWC.svelte` own selection/edit synchronization, keyboard bindings, chart lifecycle, statuses and drawing toolbar | Chart-workspace's low-level engine is reusable, but its complete user interaction must be rebuilt by a second app | UI bindings, chart lifecycle and toolbar in workspace UI, calling chart-workspace's public API |
| R-05 | `host/src/lib/islands/ScriptsIsland.svelte:2–125`: module-global `chartControllerRef`, overlay lifecycle, run-to-series mapping and comparison | Panels couple through host singleton state; complete workspace reuse is unproven | Explicit per-workspace context in workspace UI; kit produces semantic result/comparison models; chart-workspace renders overlays |
| R-06 | `host/src/routes/+page.svelte` (736 lines) owns drawings persistence helpers, action handlers, replay controls, workspace shell and failure UI | App owns substantial reusable presentation and behavior | Reusable shell/panels/controllers in workspace UI; app retains brand, route, configuration and injected adapters |
| R-07 | `host/src/lib/definition.ts` declares drawings/workspace actions; replay and script UI directly call local stores outside that definition | VICT integration exists but does not prove that every consequential operation is governed by a VICT runtime | Reusable VICT integration exports/command bindings at the workspace boundary; exact coverage documented and tested |

R-03/R-05 include static lifecycle/coupling risks, not reproduced browser defects. E.g. a complete workspace must be safe to mount twice, and dispose every timer/subscription/chart. Do not claim a current leak or cross-instance bug without reproducing it.

### Confirmed aggregation divergence (R-01)

Executed the baseline host fixture generator and host aggregation against the baseline kit data session on **the same XAUUSD source** (2,023 base bars), with the clock/horizon at the last bar's close. Only the kit source import suffixes were changed from `.js` to `.ts` in scratch to allow Node's native TypeScript execution; no algorithms were changed.

| Timeframe | Host candles | Kit candles | Host partial candles |
|---|---:|---:|---:|
| 1h | 506 | 505 | 1 |
| 4h | 127 | 124 | 3 |

At `2026-01-05T04:00:00Z`, the host emits a 1h candle from 3/4 required slots and a 4h candle from 15/16. At `2026-01-08T00:00:00Z` and `04:00:00Z`, it emits 4h candles from 12/16. The kit excludes all four. This shows current-mode host/kit disagreement; it does not establish a replay leak, and the full fixture differs from replay's poison variant. Existing fixtures and timestamps must be understood before consolidation.

The evidence harness and JSON live under `docs/evidence/G3-R/ownership-audit/`. Reproduction copies three kit source modules into a temporary directory and rewrites import extensions only, then runs with Node 24. No npm dependencies are required.

## Recommended architecture

Keep both headless packages independent. Add **one** presentation/composition package, proposed name `@vict-trading/workspace-svelte`, which may import both and the supported VICT UI/application contracts. This avoids adding Svelte, VICT or trading-kit dependencies to chart-workspace and avoids adding chart/Svelte dependencies to trading-kit. Existing R4 independence remains intact.

| Package or app | Owns |
|---|---|
| `chart-workspace` | Chart rendering/controller, drawings and overlay primitives; price/time mapping |
| `trading-kit` | Data/availability, replay/session rules, script draft/run lifecycle and immutable results, sandbox and backtest rules, persistence correctness over ports |
| `workspace-svelte` (to build) | Ready-to-use chart workspace, drawing/replay/scripts/results panels, reactive bindings, chart/kit coordination, scoped state/context, configurable defaults/styles/slots, published VICT integration bindings |
| `host` | Product name/routes/theme/configuration, raw data/provider selection, storage backend and namespace selection, installation/bootstrap |

Example target integration, **illustrative API, not implemented**:

```svelte
<TradingWorkspace config={productConfig} data={marketDataPort}
  persistence={storagePorts} runtime={scriptRuntime} />
```

Ports must distinguish transport from correctness: the host can supply localStorage read/write/remove and its namespace, but must not reimplement transactional queues, read acknowledgement, immutable-run rules, aggregation or overlay lifecycle. Offer a reusable browser adapter parameterized by Storage and namespace inside an appropriate package export; keep browser access out of headless module initialization. Durable guarantees must state adapter assumptions, including external/concurrent writers and rollback failures, truthfully.

Use VICT's existing public UI and application seams. Package reusable resource/action definitions and handlers where supported, parameterized by IDs and ports. Demonstrate real dispatch/validation and failure propagation for coarse commands (drawing, replay session, draft persistence, starting/storing runs). Declared permission metadata alone is not proof of enforcement. Do not run VICT dispatch once per bar or pointer move; do not add a second generic runtime, source-copy the VICT repository, or silently upgrade its pinned release. If a required public contract is unavailable, document the specific boundary/gap and stop that part with evidence.

## Implementation sequence — G3-R before G4

1. Capture existing app W1/W2/W3/W5, package tests and data/storage baselines. Read the prior verifier evidence. Preserve raw fixture bytes and existing `g1.*`, `g2.*`, `g3.*` stored records.
2. Consolidate data semantics in trading-kit. The host supplies raw bars and metadata. Current/replay/backtest use the same documented slot-completeness/availability rules; time caps differ by explicit context, never by separate aggregation algorithms. Record the R-01 visible candle changes as an intentional correctness correction, not an invisible refactor.
3. Extract headless draft/run lifecycle and persistence guarantees into kit factories with injected data, runtime, IDs/time and storage ports. Keep edit buffers distinct from last committed records. Preserve successful run identity/results for identical pinned inputs; any unavoidable identity/version change must be explained and tested.
4. Extract existing UI/controllers into workspace-svelte using instance-scoped context and explicit chart handles. Move the existing behavior first, with no redesign or new trading features. Configurable instrument/timeframe lists, labels, theme and sensible slots support reuse without building a generic page builder.
5. Package VICT integration and reduce host to composition/configuration/adapters. Remove redundant host implementations after the host consumes public exports. Add disposal for all charts/timers/subscriptions. Keep exact current/replay and overlay-eligibility behavior unless a correction is explicitly evidenced.
6. Verify the full packaged workspace from an external consumer; repair/reverify in-scope findings. Record a new candidate and verdict for G3-R; prior G3 evidence remains untouched. G4 follows only after G3-R passes and G4 gets its own accepted scope.

## Exit criteria

1. **Ownership:** line-by-line disposition for the seven findings. Host has no aggregation, draft/run correctness rules, replay scheduling/coordination, trading panels, overlay lifecycle or package command handlers. Host-specific configuration/adapters are allowed. Record remaining executable host code by responsibility; a line budget or effort percentage is not the gate.
2. **Real reuse:** standalone builds and fresh `npm pack` digests for changed/new packages. A consumer outside the repository installs packed artifacts and mounts the complete workspace with its own dataset/instrument, storage namespace and product configuration; no host source, workspace aliases or copied controller/panel implementations. Chart-workspace and kit still work independently.
3. **Isolation/lifecycle:** two workspace instances have separate selection, drafts, runs, clocks and overlays; unmount/remount leaves no active timer/subscription/chart from the destroyed instance. No module singleton for mutable workspace state.
4. **Data consistency:** hand-checked required-slot oracle confirms the four R-01 partial buckets are absent; current/replay/backtest agree over identical closed-bar inputs/timeframe/clock and report missing data. Existing poison potency/isolation and unfinished-HTF rules pass on touched paths. Do not reframe raw-fixture differences as an algorithm mismatch.
5. **Persistence:** existing saved records load without loss or silent rewrite. In the external consumer, delayed/overlapping/refused/throwing writes and unreadable storage show only committed state; exact bytes survive where the adapter contract guarantees it; recovery/reload agrees with the last committed record. Test one shared primitive deeply plus each integration path, not every Cartesian product blindly.
6. **Experience:** W1/W2/W3/W5 on host and the external workspace consumer; desktop and 375/768 widths; keyboard/failure states, reload, overlay lifecycle and context behavior preserved. Tests use actual clicks/keys for affected UI. Source-only evidence is insufficient to close this criterion.
7. **VICT seam:** demonstrate the actual coarse-command path and bounds of enforcement using pinned public packages. Input refusals cannot bypass into mutation; failures propagate truthfully. The app registers/configures exported integration; engines remain outside per-bar framework dispatch.
8. **Proportionate verification:** check/build, existing kit tests, affected packaging/storage/time tests and product walkthroughs, then fresh verifier at the exact candidate. Repeat only changed checks and relevant regressions after repairs. No feature-count or arbitrary percentage acceptance metric.

## Current completion boundary

Audit, source inventory, reproduced R-01 and this implementation contract are complete. **No source extraction or UI package has been implemented; no app build/browser rerun or independent G3-R verdict exists yet.** This document must not be cited as a passing packaging gate. Publication, G4 features, accounts, real orders, upstream VICT edits and dependency upgrades remain outside this correction.
