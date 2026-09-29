# Decision register

Concise decision entries per RUNBOOK.md: question, options, chosen path, evidence, impact, authority, date/SHA. Earlier verdicts and evidence are retained; superseded decisions remain listed with their status.

## D-001 — Delivery outcome: composed app AND independently installable capabilities (SUPERSEDING, owner-directed)

- **Date/authority:** 2026-09-29, direct owner instruction (this run), baseline `1596c4c696d1788bde07987a50dc78f760a13f75`.
- **Question:** Is the program's delivery outcome a single composed app, or an app plus reusable installable capabilities?
- **Chosen path (owner):** **Both.** The owner intends a working chart-first trading app **and** reusable capabilities a future version of the app can install. Identified capability directions: a **Chart Workspace capability** (chart interaction, drawings, panels, layouts) and a separate **Trading Kit direction** (data rules, replay, scripts, simulation, risk, evidence). The app composes capabilities through public VICT contracts. Package **publication** to npm is a later release decision; **proving an independently installable package is part of the development outcome**.
- **Impact:** A bounded packaging gate (**G1-PKG**) is added between G1 and G2; **G2 depends on it**. Moving files into a folder does **not** prove reuse — the gate requires a standalone build, an `npm pack`-installable artifact, and an independent consumer outside the monorepo workspace. The Trading Kit boundary must be established **before replay code is added**, so replay does not accumulate inside the app and require a second extraction.
- **Supersedes:** the prior framing (STATE.md O-06 "Package extraction boundary… G3–G5") — that proposal is retained below as superseded context; the boundary work is pulled forward and narrowed to the Chart Workspace capability first.
- **Provenance:** owner instruction recorded verbatim (repository session); docs updated: PRODUCT, ARCHITECTURE, STAGES, EVALUATION, HANDOFF, STATE.

## Superseded context (retained from pack, not yet decided)

- O-06 as originally proposed: "Package extraction boundary — Consumer dependency and second-use evidence, G3–G5" — superseded by D-001's earlier, narrower gate.

### Decision entries retained for the record

- O-03 (chart component): lightweight-charts 5.0.8 selected at G0 (verifier-confirmed); unchanged.
- O-05 (simulation engine): explicitly open; NT LGPL-3.0 owner license question pending; unchanged by D-001 (Trading Kit *boundary* is established before replay code; engine *selection* remains evidence-gated).
## D-002 — Trading Kit direction accepted; package name, independence, composition, session persistence; G2 scope = smallest useful contracts (owner-accepted)

- **Date/authority:** 2026-09-29, direct owner instruction, baseline verified `298cb3bafaa90ee9eff112d157e9f4649ed53013`.
- **Question:** Should the proposed Trading Kit boundary (docs/TRADING-KIT-BOUNDARY-PROPOSAL.md) be adopted, and on which architectural choices?
- **Chosen path (owner):** The **Trading Kit direction is accepted** with these choices:
  1. Name: **`@vict-trading/trading-kit`**.
  2. **Independence:** trading-kit stays independent of `@vict-trading/chart-workspace` — neither package imports the other or the app; the **app consumes both through public exports**.
  3. **Session persistence:** replay sessions use an **app-supplied persistence port** (kit owns the session rules; the app owns storage — the pattern proven by `WorkspacePersistence` in chart-workspace).
  4. **G2 scope:** implement the **smallest useful clock, data, replay, and evidence contracts**. Scripts, simulation engines, risk, and orders remain later work.
  5. The four precision rules below are part of the boundary and normative for G2 once accepted.
- **Precision rule R1 — every public data query is capped by the replay clock:** Any data query against a replay data session returns at most what the clock allows: served slice ends at `min(requested instant, clock.now())`, regardless of what the caller asks for. There is no public API that can bypass the cap; a request beyond the clock is not an error but is observably capped (results record requested vs served instants so evidence can prove capping). The chart must receive bar data only through capped queries — feeding it a full history plus a hidden mask during replay is explicitly insufficient and prohibited. Every derived calculation (indicators, readouts, stats) must consume the same capped slices; calculating over data obtained outside the capped API during replay is a recorded violation.
- **Precision rule R2 — availability semantics:** A base-granularity bar is available at clock instant `t` iff its close time ≤ `t` (a bar covering [a,b) becomes available exactly at t=b). An aggregated larger-timeframe bar is available only when **all** constituent base bars are available — an unfinished larger-timeframe bar at the clock instant is **not returned** and may not be previewed; the resulting absence is visible to the consumer as data time, never as a partial bar. Missing intervals are **never bridged** — by the kit or by the chart rendering: each gap is reported as explicit unavailability (interval, status `missing`), and display shows an explicit unavailable state, never implied continuity.
- **Precision rule R3 — historical visibility for drawings and annotations:** Drawings carry provenance classes. (a) `market-time-anchored` — holds a market-time coordinate; **none exists today** for horizontal levels. (b) `replay-stamped` — a drawing created during replay is stamped with the replay-clock instant at creation; that stamp is a market-time coordinate by construction and is the only provable basis for historical visibility. (c) `provenance-unknown` — carries only wall-clock metadata; **all currently persisted levels are class (c)**, since `createdAt` is wall-clock and cannot prove existence at a market time. Honest treatment: class-(c) drawings shown during replay must carry an explicit present-day marker ("added today — not timestamped to market time") and never present themselves as historical; every such display is recorded on the evidence channel. A class-(b) drawing created at step N must not be visible at steps < N. Consumers invent no provenance classes of their own; adding a class is a separate recorded decision.
- **Precision rule R4 — dependency direction (shown, not implied):** the app imports both packages through their public exports; `trading-kit` does NOT import `chart-workspace`; `chart-workspace` does NOT import `trading-kit`; neither imports the app; any time the chart needs is injected by the app as a port value, not a dependency.
- **Impact / status:** The draft G2 stage handoff (HANDOFF.md) is prepared for owner review — **it is DRAFT and UNAUTHORIZED; this D-002 does not authorize G2 implementation**. No replay code, engine selection, or publication is authorized by this record.
- **Provenance:** owner instruction recorded verbatim (repository session); boundary proposal revised to reflect acceptance; this register is the decision record.
