# Architecture and selection boundaries

## Dependency direction

New trading app → reusable trading capability or adapter → public, pinned VICT contracts. A specialized chart surface and an external market/simulation engine sit behind explicit interfaces. VICT core never imports trading concepts. The app remains the composition point for provider choice, account identity, presentation, and deployment.

| Owner | Carries |
|---|---|
| **VICT public release** | Verified generic application definition, capabilities, contracts, authorization, data and UI integration at consequential boundaries |
| **Trading domain layer** | Instrument/bar semantics, time and provenance, script/method identity where needed, replay/evaluation contracts, opportunity/decision/evidence records |
| **Engine adapter** | Translation between the domain contracts and a selected external data/simulation/execution engine; no engine type leaks into the product definition |
| **Chart surface** | High-frequency pan/zoom/crosshair/drawing/overlay interaction and chart-specific rendering; registered through the supported VICT UI extension seam |
| **App** | Workspace composition, product text, provider configuration, visual arrangement, account grants, and deployment |

These are ownership boundaries, not a mandate to publish five packages. Extract a package only when isolation, dependency weight, or a second consumer demonstrates value. A capability pack governs coarse operations; it does not run once per bar or implement the chart's pointer interaction.

> **D-001 (owner-directed, 2026-09-29):** The ownership table is now operationalized as a delivery outcome: a **Chart Workspace capability package** (chart interaction, drawings, panels, layouts) is extracted as a real versioned package in this repository, consumed by the app through its public exports — *before* G2 replay work begins, so replay never accumulates inside the app. A **Trading Kit** boundary (data rules, replay, scripts, simulation, risk, evidence) is established as a direction and must be defined at its boundary level before replay code is written. Reuse proof standard: a package must build standalone, produce an `npm pack`-installable artifact, and be demonstrated by an independent consumer outside the monorepo workspace without app imports or workspace aliases. Publication remains a separate release decision. See DECISIONS.md D-001 and the G1-PKG stage record.

## Platform intake at Stage 0

Record the exact public VICT release-set identity, package versions, integrity/provenance, UI extension contract, app-data persistence contract, Builder Kit artifact availability and verification command. Inspect current public packages rather than importing from an in-progress UI branch. The planned roles of @victframework/ui and @victframework/ui-svelte must be checked against published artifacts; do not assume the older renderer is the new canonical path. If a required versioned chart component island cannot be expressed through public APIs, file a narrow upstream gap and mark the corresponding gate blocked. Do not bury the gap inside app-specific renderer internals.

Builder Kit use is conditional on a verified artifact and its accepted task scope. It governs repository work; it is not an app runtime or a trading-agent dependency.

## Chart selection proof

Compare a small number of embeddable chart candidates using the same fixture and Svelte host. Evaluate license/commercial terms, time/price coordinate mapping, drawings and overlays, multi-chart synchronization, replay data window control, keyboard/accessibility affordances, performance on a representative history, bundle and lifecycle behavior, and the public VICT component seam. Record measured or observed results and choose the simplest candidate that passes the required stage. A screenshot is insufficient.

## Market and engine selection proof

Use a pinned small dataset with known gaps and two contrasting mechanical rules. A candidate engine must demonstrate deterministic bar ordering, closed-bar timing, spread/cost/fill assumptions, step/pause/resume for a human decision, future-data isolation, restart/reconstruction, and equivalent rule behavior where backtest and replay overlap. Record license, runtime footprint, supported markets and provider/broker limits. NautilusTrader and LEAN are research candidates, not decisions. If neither passes, define the minimum custom behavior required before implementing it.

The engine runs market-time calculations in batches or its native loop. VICT governs bounded operations such as starting a run, recording a decision, changing an account grant, and reconciling an order. Per-bar framework calls are outside the performance path.

## Time and identity

Historical data carries source, instrument, timezone convention, timeframe, range, revision, gaps and availability. An evaluation pins its exact script/rule revision, data revision, engine revision, inputs, clock policy, and fill assumptions. At historical time T, eligible computations cannot access information later than T. Multi-timeframe calculations explicitly define when a larger bar becomes available. A missing interval is unavailable, never silently replaced with a stale value.

Drafts can mutate. Pinned runs cannot. The evidence system can record human notes without inventing a qualified signal. An enabled detector records its qualified opportunities and any take/decline decision with its exact source revision.

## Execution boundary

Paper, replay and live account endpoints have distinct identities and visible state. Live automation is separately enabled for a particular script revision, account and limits; an emergency stop and post-restart reconciliation are required. Backend-only credentials and order transport stay outside browser bundles. An AI helper may propose or explain, but it cannot acquire builder tools or live order grants through this app.

## Change control

Compatibility upgrades and substitutions are explicit proof tasks. A dependency replacement must rerun the affected walkthroughs and identity/time tests. Document a material departure from this architecture in DECISIONS.md with evidence and changed evaluation criteria before adopting it.
