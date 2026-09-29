# Product intent

> **D-001 (owner-directed, 2026-09-29, supersedes in part):** The delivery outcome is **both** a working chart-first trading app **and** reusable capabilities that a future version of the app can install (identified directions: a Chart Workspace capability — chart interaction, drawings, panels, layouts — and a Trading Kit direction — data rules, replay, scripts, simulation, risk, evidence). The app composes these capabilities through public VICT contracts. Package *publication* is a later release decision; *proving an independently installable package* is part of the development outcome. See DECISIONS.md D-001.

## Promise

Build a personal, chart-first trading workspace for discovering, practising, testing, and eventually operating discretionary and scripted ideas. The working surface should feel native and free to approach: the trader may start with a bare XAUUSD or EURUSD chart and decide what to do next. The product supports exploration without requiring a Trading Program, Method, formal Session, or preselected mode.

The initial audience is one desktop trader. XAUUSD and EURUSD are the first representative instruments. A broader market and mobile experience are later product decisions. This is a product vision, not a claim about currently available feeds, history, brokers, or chart libraries.

## Non-negotiable experience properties

- **Chart as place:** The visible market and its relevant context persist while tools, code, replay controls, orders, and results appear around it.
- **Free entry:** A new workspace opens to a useful chart with an instrument and timeframe; no formal object-creation wizard blocks drawing, inspection, or replay.
- **Multiple approaches:** The trader can start from a drawing, an observation, a script, a replay, or a manual simulated trade. None is the privileged starting route.
- **Provisional work:** Drawings, drafts, and notes can remain experiments. The app asks for formal identity when the user wants a reproducible comparison or grants operational authority.
- **Continuity:** Symbol, timeframe, drawings, panel arrangement, relevant script inputs, and historical time remain intelligible across tool changes and reloads.
- **Truthful time:** Historical and current contexts are visibly distinct. A future bar cannot influence a historical decision or computed output.
- **Mechanical and discretionary coexist:** Scripts may produce signals and orders for simulation; manual decisions remain possible in the same workspace. Their records distinguish source and authority.
- **Earned structure:** Versioning, evidence, and risk rules add reliability at their point of use. They do not prescribe the user's exploration sequence.

## Modes of commitment

1. **Explore:** Open charts, draw, inspect, draft code, and annotate. Saving is lightweight. No claim of strategy performance follows from this state.
2. **Test:** Pin exact script/rule revision, data revision, timeframe, range, execution assumptions, and engine revision. Results are reproducible and inspectable.
3. **Practise:** Run blind historical replay and simulated decisions, or current-market paper trading. The clock and fill model are explicit.
4. **Operate:** Connect live data and an account only with an explicit grant. Assisted orders require confirmation. Automated live trading is a distinct, opt-in capability with limits and stop control.

These are authority and evidence states, not required top-level destinations or a sequential onboarding path.

## Product boundary

The application chooses its identity, workspace defaults, layout, instruments, providers, account connections, and wording. VICT supplies generic contracts, application meaning, permission and governed operation boundaries where its verified public APIs support them. A trading package may supply reusable domain contracts, data/replay adapters, simulation, evidence, and specialized surfaces. An existing engine is preferred when a bounded proof shows that it supports the required human-paced and scripted behaviors.

The app does not inherit the previous Trading OS's Research → Practice → Operate → Review navigation, governing Program prerequisite, or Method-first user flow. The previous T1–T3 work can inform tests, especially deterministic data identity and time fences, after its actual status is checked.

## Success test

From one saved workspace, the trader can discover a boundary on XAUUSD, draw it, prototype a rule or script, rewind to an earlier point, take or decline a simulated opportunity, inspect what followed, and return to current data. They can change direction at each step without rebuilding context or completing a formal workflow.

This is a task demonstration, not a promise that every feature arrives in Stage 1. The stages grow toward it while keeping the same interaction grammar.

## Deliberately open decisions

The chart library, scripting language, simulation engine, data sources, broker adapters, package count, and precise navigation remain open until demonstrated by the relevant gate. Pine Script compatibility is not implied. No live broker authority is created by this document.
