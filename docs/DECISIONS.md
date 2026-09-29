# Decision register

Concise decision entries per RUNBOOK.md: question, options, chosen path, evidence, impact, authority, date/SHA. Earlier verdicts and evidence are retained; superseded decisions remain listed with their status.

## D-001 — Delivery outcome: composed app AND independently installable capabilities (SUPERSEDING, owner-directed)

- **Date/authority:** 2026-09/29, direct owner instruction (this run), baseline `1596c4c696d1788bde07987a50dc78f760a13f75`.
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