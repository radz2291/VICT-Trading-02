# New trading app on the newer VICT UI foundation — recommendation
Date: 2026-10-31. Status: researched recommendation; no new app, implementation acceptance, deployment or upstream changes.

## Source baselines examined
- Trading: `dce36893b980cd5c7f53754daa1f315d03132a39`, after the ownership audit. Its existing host remains on older installed VICT 0.4.0-rc.1 dependencies.
- VICT accepted mainline: `d7401bef6e48330796c74ec00c86db9622d48cdf`.
- VICT newer sanitized source snapshot: `1fa7c392401bfb6581aae30a1e6d33ba305c2662`, branch `codex/paused-vict-clean-20261030`. Its publication is not acceptance or an install-ready consumer release.

Owner steering: "we already have a different UI foundation for VICT ... I think I want to make a new app based on this and leave this previous app ... check this yourself ... suggest what is best." This is a request to investigate and recommend the new direction, not an acceptance of the architecture proposed below.

## Findings
The accepted mainline includes much more than primitive controls: canonical UI documents, compilation/source identity, typed component props/slots/outputs, local presentation state and action bindings, catalog registration, shared renderer, theme/portal scope, and reusable authoring/preview modules. Ordinary application UI can be authored in the same canonical model rather than implemented as custom Svelte panels. Human/agent source inspection and edits then retain a shared authority.

Mainline foundation records describe scoped acceptance for 38 catalog families plus AppShell, retained plan-tier/deferred coverage, and no blanket SSR/performance promise. The October 22 integration record reports ten isolated package artifacts and sixteen consumer checks. Those are existing recorded results; this investigation inspected source/records and did not independently rebuild or rerun them.

The newer snapshot additionally contains Rhea/shadcn-derived presentation and native canonical recipes, application patterns (drawer/navigation/filtering etc.), AI/media/flow packages, owned overlays and scoped-slot authoring. Its handoff explicitly says PAUSED/HELD, not delivered/accepted. Actual-agent graph authoring was not demonstrated successfully; integrated acceptance remains open. These limits do not prove every general UI component is unusable, and this trading app should not depend on Studio graph/agent authoring simply to render controls. The newer checkpoint needs a focused external-consumer proof for whichever subset is selected.

Both source baselines still label core UI packages 0.4.0-rc.1. Mainline's local pack manifest contains concrete hashes for the newer source. The existing trading host's version declaration alone cannot identify those newer artifacts; no new npm availability or same-version registry update is established by this investigation.

## Recommendation
Build a fresh consumer app around the newer VICT UI model, retain the old host as a frozen reference/behavior oracle, and carry forward the two trading packages after targeted ownership/data corrections. Do not spend the next implementation cycle preserving the old custom panel system.

Refine the preceding G3-R recommendation: any reusable trading UI package should provide canonical VICT trading compositions/recipes, component descriptors and action/data integration, plus the small specialist Svelte adapter genuinely required by the financial chart. It should consume the selected VICT catalog/theme/renderer. It should not recreate menus, input controls, dialogs, layout/state engines or a private generic renderer. Packaging the old UI unchanged would preserve its obsolete assumptions.

### Ownership
| Owner | Responsibility |
|---|---|
| VICT UI foundation | General controls, theme/tokens, overlays, layouts/composition, canonical UI source/renderer and supported state/action bindings |
| chart-workspace | Financial chart/drawings/overlays, price/time coordinates and a typed specialist integration surface |
| trading-kit | Market-data/replay/script/run/simulation rules and durable correctness over explicit ports |
| Reusable trading UI/integration package (only justified surface) | Canonical trading workspace documents/compositions, domain-specific view/action adapters and specialist component registrations; may compose both independent cores |
| New app | Product identity, application composition/configuration, selected providers/data, storage backend/namespace, routes and bootstrap |

Core package independence remains. General presentation state (e.g. open panel) is distinct from market/replay state and from durable trading records. UI documents must not become an alternate domain database. Coarse application mutations use the established VICT data/action contracts. Chart pan/zoom/per-bar loops stay in the specialist/domain layer. A dependency or permission declaration is not proof of enforced governance.

Do not include ui-editor, ui-preview, Studio, AI or flow in the finished trading bundle unless a product requirement actually needs them. Authoring elsewhere and shipping the same compiled UI is sufficient; the normal product renderer does not require embedding the Designer.

## Small first delivery
1. Select/pin a consumable foundation package closure: exact source SHA, package list, tarball digests and lockfile. Default candidate: accepted mainline. If the newer Rhea/pattern behavior is required immediately, compare only that needed subset from the paused snapshot with a consumer smoke; do not silently treat the entire snapshot as accepted or resume/edit upstream VICT.
2. Build one fresh chart-first screen with canonical VICT controls: instrument/timeframe, drawing action, collapsible panel and honest storage status. Register the real chart package; no screenshot mockup or old-host source imports.
3. Demonstrate drawing/save/reload and a replay step over kit-capped data, plus refusal/error behavior and desktop/narrow usability. Check actual source edit -> visible output through the normal renderer; inspect the finished bundle for editor/Studio leakage.
4. Expand to script drafts/backtests using extracted headless lifecycle rules and reusable VICT compositions. Preserve old successful run identity for unchanged pinned inputs where compatible, explain intentional corrections (especially aggregation), and define saved-data import separately if wanted.
5. Reassess G4 only after the replacement baseline is usable. Existing G0–G3 evidence informs reuse but does not automatically certify the new consumer.

This is a short baseline/vertical-slice proof, not a requirement to re-run the entire foundation program or finish all paused Studio work.

## Treatment of the old app and saved records
Keep old source/evidence and local data intact. Do not migrate or delete owner browser storage as a side effect of a fresh app. Use a separate app identity/storage namespace/origin; any import is explicit. Repository location/name for the new consumer and its exact foundation artifact baseline remain to be chosen. No replacement application has been created by this investigation.

## Effect on the earlier handoff
The source ownership audit and reproduced data discrepancy remain valid. The in-place old-host UI extraction path in the G3-R handoff is now provisional while the owner reviews this fresh-app recommendation. Do not start copying the old UI into a new package under stale instructions. Package domain corrections are still relevant; a final execution handoff must name the new consumer target and selected foundation artifacts before coding that app.

## Primary repository references
- [UI foundation state / scoped acceptance](https://github.com/radz2291/vict-02/blob/d7401bef6e48330796c74ec00c86db9622d48cdf/docs/ui-foundation/STATE.md)
- [October 22 mainline integration and packed consumer](https://github.com/radz2291/vict-02/blob/d7401bef6e48330796c74ec00c86db9622d48cdf/docs/studio/DESIGNER-MAIN-INTEGRATION-2026-10-22.md)
- [Artifact identity manifest](https://github.com/radz2291/vict-02/blob/d7401bef6e48330796c74ec00c86db9622d48cdf/docs/studio/integration-2026-10-22/pack-manifest.json)
- [Canonical catalog component integration](https://github.com/radz2291/vict-02/blob/d7401bef6e48330796c74ec00c86db9622d48cdf/docs/ui-foundation/U4-COMPONENT-INTEGRATION-DESIGN.md)
- [Catalog usage](https://github.com/radz2291/vict-02/blob/d7401bef6e48330796c74ec00c86db9622d48cdf/packages/ui-svelte/CATALOG-USAGE.md)
- [Paused snapshot and explicit limits](https://github.com/radz2291/vict-02/blob/1fa7c392401bfb6581aae30a1e6d33ba305c2662/docs/studio/VICT-PAUSED-PUBLIC-HANDOFF-20261030.md)
- [Newer Rhea presentation](https://github.com/radz2291/vict-02/blob/1fa7c392401bfb6581aae30a1e6d33ba305c2662/packages/ui-svelte/RHEA.md)
- [Newer reusable application patterns](https://github.com/radz2291/vict-02/blob/1fa7c392401bfb6581aae30a1e6d33ba305c2662/packages/ui-patterns-svelte/README.md)
