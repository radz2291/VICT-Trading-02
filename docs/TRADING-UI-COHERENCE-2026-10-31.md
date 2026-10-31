# Trading packages and VICT UI coherence — review and implementation contract
Date: 2026-10-31. Trading baseline: `e9be91b398b2f5225e2dc314781877055c44df62`.
Status: source/API review complete; integration changes and visual acceptance pending.

## Confirmed delivery direction
The owner confirms a fresh app assembled from reusable packages and the newer VICT UI foundation. Recover behavior from the old app where useful and place reusable responsibilities in their capability packages. The old host supplies reference behavior and evidence; its custom UI is not the replacement frontend. The new app retains product configuration, composition and data/storage/provider wiring. Coherence with VICT includes interaction, authoring, state, theme and accessibility as well as appearance.

Owner text: "we're gonna develop a new app, which assemble from the packages and also transfer from the old app, whichever capabilities should be created inside capabilities will be created inside the packages capabilities" and "review the current trading UI packages ... coherent with our UI foundation and flexible ... looks like a coherent one system rather than two different systems glued together."

## What actually exists
- `@vict-trading/chart-workspace@0.1.2`: chart/drawings/overlay implementation and headless drawing store; UI controls/panels are not packaged.
- `@vict-trading/trading-kit@0.2.2`: headless data/replay/script/backtest capabilities; no rendered controls.
- `@vict-trading/workspace-svelte`: previously recommended name only. No implementation, manifest or packed artifact exists at this baseline.

Thus a finished coherent trading UI package cannot yet be judged by rendering it. This review inspects source/APIs and maps the concrete work required. No full app build/browser suite or visual pass is claimed.

## Reusable foundation examined
Accepted VICT main `d7401bef6e48330796c74ec00c86db9622d48cdf` exposes canonical document authoring/compilation, typed component ABI, catalog controls, theme variables and shared rendering. Newer snapshot `1fa7c392401bfb6581aae30a1e6d33ba305c2662` adds Rhea/patterns and other authoring work, explicitly PAUSED/HELD at integrated scope. Do not infer readiness from package version 0.4.0-rc.1; artifact hashes and source identity matter. See [foundation research](NEW-APP-UI-FOUNDATION-RECOMMENDATION-2026-10-31.md).

## Findings
| ID | Source evidence | Assessment / correction |
|---|---|---|
| C-01 | `packages/chart-workspace/src/lwc.ts`: LEVEL_COLOR/LEVEL_SELECTED; fixed layout background/text, grid, candle/wick colors; `ChartHost` only accepts container | Chart does not follow a consumer's VICT theme. Add a neutral public chart presentation contract and update API. A VICT adapter resolves tokens from the owning workspace and supplies values; keep VICT imports out of chart core. |
| C-02 | `types.ts`: no price precision/minMove, price formatter, locale/time-label policy in chart configuration | Instrument/time/format policy must be explicit and configurable; do not rely on an implicit two-decimal market default. Actual incorrect displayed precision was not browser-tested in this audit. |
| C-03 | `lwc.ts` `setData()` unconditionally calls `fitContent()`; public API has no viewport policy | Give callers explicit initial-fit/context-change/preserve viewport behavior. Replay updates and refreshes should not implicitly override a trader's chosen range. Default compatibility versus new-context behavior must be documented. |
| C-04 | Public chart exports are controller/types/validation/store; no canonical VICT component descriptor/renderer registration | Add a small typed specialist adapter with props, outputs, style targets and honest inspection limits. General panels remain canonical compositions. The generic VICT value/label Chart is not assumed to replace financial candlesticks. |
| C-05 | Old host owns plain controls/styles, scripts/results panel and replay panel; ScriptsIsland reaches a global chartControllerRef | Recompose ordinary UI from the selected VICT catalog instead of transferring old controls/CSS. Use scoped instance context and explicit bindings; no global mutable workspace handle. |
| C-06 | Core packages depend on no app and do not import one another; persistence/data are injected | Preserve these good boundaries. Put general controls/theme in VICT, domain truth in kit, graphics in chart, and cross-package adapter/recipes in integration. |
| C-07 | Old drawings use published action contracts; replay/scripts use local stores; core ports do not constitute VICT capability registration | Package coarse-command/data adapters with validation and actual enforcement/failure evidence. Distinguish contract-validation from runtime authorization. Canonical source binds actions; it does not create a second dispatcher/domain store. |
| C-08 | Chart autoSize uses a consumer-sized container; old host fixes most layout and style in component CSS | Preserve autoSize and let the authored workspace allocate the container. Trading compositions expose configurable layout/slots/conditions, not a required toolbar/sidebar shell. Verify both inline and narrow/drawer presentation with the same behaviors. |

C-01/C-03 are direct observations of implementation behavior, not fresh browser reproductions. C-02/C-04/C-05 identify missing public integration/portability coverage. Prior R-01 data aggregation divergence remains a reproduced correction independent of visual alignment.

## Ownership and one coherent system
| Concern | Single authority |
|---|---|
| General buttons, inputs, menus, tabs, dialogs, typography, spacing, focus and overlay mechanics | Selected VICT UI catalog/theme |
| Presentation composition, panel selection/open state and declared UI bindings | Canonical VICT UI documents and supported state contracts |
| Market clock, data availability, replay provenance, draft/run rules and simulation results | Trading-kit |
| Price/time coordinates, candle/drawing/overlay rendering and pointer geometry | Chart-workspace |
| Domain-specific document recipes, public component descriptor and kit/chart-to-VICT adapters | Reusable trading integration surface |
| Product identity/defaults, selected ports/providers, storage namespace and bootstrap | Fresh app |

The integration surface may become `workspace-svelte` once its reuse is demonstrated. Its scope is trading compositions/adapters, not another generic design system or a copy of the old frontend. Use public package boundaries and preserve independent core use. Generic infrastructure missing from VICT should be reported upstream rather than privately rebuilt inside trading packages.

## Public flexibility requirements
### Shared chart presentation
Introduce an engine-neutral chart presentation configuration (API name to be decided during implementation) carrying background/text/grid/border colors, font family/size, candle rise/fall colors, selection/drawing colors, overlay palette defaults, locale/time formatting and instrument precision/minMove. Expose an update operation so a workspace theme change updates chart/price lines/default series without discarding data, drawings or view.

VICT already defines e.g. `--vict-color-bg`, `--vict-color-surface`, `--vict-color-text`, `--vict-color-border`, `--vict-color-focusRing`, `--vict-font-family` and `--vict-font-sizeBase`. Resolve these from the mounted owner scope in the UI adapter, not global :root. Financial rise/fall and user-selected indicator colors are domain semantics: use explicit configurable trading roles mapped to compatible defaults, not an assumption that every rising candle means success. Preserve explicit user overlay choices when changing shared defaults.

Canvas graphics require values passed into the chart engine; CSS inheritance alone will not recolor the canvas. Document what changes dynamically and what requires reconstruction. No DOM/token reads should occur at headless module import, and no CSS should leak onto sibling apps.

### Canonical specialist registration
Expose explicit typed inputs for chart data/context/presentation and outputs for crosshair/selection/drawing intentions. Props/outputs that enter authored source must use its supported serializable value types; controller handles/functions stay in instance-scoped integration code. The adapter must forward declared style/ownership/source targets and state which canvas internals cannot be edited or inspected.

Use the existing VICT component ABI. Do not fabricate a new UI schema or put hidden service/runtime authority inside a visual component. High-frequency pointer/data rendering stays local; coarse durable actions pass through declared integration commands.

### Flexible composition
Offer a sensible starting trading composition plus smaller reusable fragments: chart, drawing actions, replay controls, script editor/results. General widgets come from VICT. Panels may be docked/collapsed/reordered/omitted through supported composition and configuration. Configuration of defaults should not require copying a component or rebuilding its store.

Instance state must distinguish transient UI state, committed trading state and persisted records. Layout/theme changes must not silently reset a replay or rewrite a run. Two mounted workspaces must remain independent.

## First proof and pass criteria
Use one fresh consumer with installed, pinned artifacts and real chart/kit features. These are targeted acceptance scenarios, not a request to rerun the entire VICT foundation program.

1. **Single foundation:** visible generic controls resolve to selected public VICT components/recipes. No old host palette, handwritten duplicate menu/dialog engine or private Studio imports. Check source and actual rendered controls.
2. **Theme:** render the trading composition beside ordinary VICT controls under one scope. Change light/dark tokens and density/font settings in that scope; chart canvas, labels, panel controls and owned popups remain coherent. Two differently themed instances do not affect each other. Preserve chart data, drawings and chosen viewport.
3. **Format/context:** demonstrate at least two instruments with distinct price precision, explicit UTC/time labels, different timeframes and safely matched overlay data/context. Never show an XAUUSD result as an EURUSD overlay simply because the panel has a latest run.
4. **Layout:** use the same public composition fragments in two arrangements, including 375/768 width. Controls, portal ownership, scrolling and chart autoSize remain usable; layout changes require no new domain controller.
5. **Interaction:** keyboard/focus/disabled/loading/error patterns use the selected VICT foundation. Touch has a visible equivalent for context-only actions. Domain restrictions and data unavailability use explicit shared feedback; do not promise fully accessible chart internals without evidence.
6. **Canonical continuity:** a UI document edit reaches normal rendering through the shared compiler/renderer. It changes presentation while preserving domain truth. Durable actions show validated, truthful success/refusal; an invalid output/input cannot bypass into mutation.
7. **Reuse/isolation:** a second external consumer installs packages and uses the same controls/bindings with its own product config/data/storage; no copied host UI/controllers. Mount two workspaces and dispose/remount one without disturbing the other or leaving timers/listeners.
8. **Core regressions:** preserve price anchoring, overlay lifecycle, capped replay and run identity semantics. Correct the previously reproduced current-mode partial-bucket disagreement through the kit's authoritative data rules. Select tests for those touched boundaries and use one fresh verifier at the exact candidate.

A source review cannot mark these browser/product criteria PASS. Record observed results and any limits at the implementation candidate.

## Execution boundary
The fresh-app direction and thin-app/coherence principles are owner-confirmed (D-008). The existing app is reference material, not the frontend to polish or copy wholesale. The package corrections and reusable VICT integration contract are prepared; no theme API, UI package or new app has been implemented by this review.

The new repo/path and exact VICT artifact closure are still unspecified. Prepare the smallest baseline-selection/vertical-slice handoff when the target is supplied. Do not choose a release by a stale version string, silently adopt the entire paused Studio checkpoint, or implement G4 features during this alignment.
