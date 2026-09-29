# Trading Kit — proposed boundary (design proposal for owner review)

**Status: PROPOSAL — not authority. Not implementation of replay. Nothing here authorizes G2.**
**Written:** 2026-09-29, after G1-PKG closure (`964038b…` lineage; correction run on that head).
**Authority chain it serves:** DECISIONS.md **D-001** (delivery = composed app + installable capabilities; Trading Kit boundary must be established before replay code) → STAGES.md owner-directed insertion (G2 depends on G1-PKG and on this boundary) → this proposal is the boundary design for the owner to accept, amend, or reject.

---

## 1. Why a Trading Kit, in one paragraph

The app's credibility rests on *honesty of time*: replay is a simulation of the past that must never lie about what the trader could have known (G2's poison-future criterion). That discipline — one clock, no future leakage, named unavailable states, recorded sessions — is not an app feature; it is a *contract* that every consumer of the data (chart, scripts, eventual simulation, eventual risk) must obey. D-001 says capabilities a future app installs, not `host/` source. So the clock, the data rules, and the evidence of "what was known when" belong in a separate capability package whose guarantees are testable without the app. That is the Trading Kit.

## 2. Responsibility split

### The Trading Kit owns (in-package, proven by stages)

| Responsibility | What it means | Where it first bites |
|---|---|---|
| **H.1 Clock** | A single time authority the kit hands to every capability: the only source of "now". In replay it is the historical clock; live clock is a separate mode. No capability may read wall-clock for market-time decisions. | G2: one historical clock for data, drawings, tooltips |
| **H.2 Data rules** | Instrument/timeframe model, bar-interval integrity, **missing-interval semantics** (explicit unavailable states — never bridged into implied continuity), **future-data isolation** (any slice handed out contains only bars ≤ clock-instant). Served from **consumer-provided sources** (the package owns no data, no feeds, no secrets — it *validates and slices*). | G2: poison-future fixture; G1 findings: gap bridging honesty |
| **H.3 Session** | A replay session: chosen start, restore/deliberate-reset, and an explicit transition back to "current". Session state is **serialisable and replayable** by documented rules. A session never issues orders or touches accounts — it is a data-timeframe construct. | G2: restore/reset; G5+ order pathway must go through a different, explicit route |
| **H.4 Replay contract** | Step/play/pause over H.2 data under H.1 clock, with recorded step/reload rules ("Play rules" record). Consumables (data, drawings, readouts) receive only the historical slice. | G2 acceptance |
| **H.5 Evidence hooks** | Deterministic recording points: which slice of data was visible at each step, so verification can assert no-leak programmatically (feeds G2's "recorded rules" and later stage verdicts). | G2 verification; evidence protocol EVALUATION.md |

Explicitly **later directions, named in D-001 but outside this proposal's scope:** scripts (G3), simulation engines and risk models (G3–G5). The boundary reserves ports for them but designs nothing about them now.

### Stays app-side (never enters the Kit)

- **Instrument catalogue, fixtures, product wording** (XAUUSD/EURUSD seeds, panel labels) — product identity.
- **Storage keys and persistence adapters** — same pattern the Chart Workspace proved (package owns a port; app owns storage).
- **Chart rendering, islands, VICT seam composition** — the Chart Workspace package owns chart interaction; the app composes Chart Workspace + Trading Kit via public exports.
- **Anything account/order/broker** — prohibited by standing rule; a Kit session cannot express an order.

### Dependency direction (the load-bearing rule)

```
trading-kit (kit core: clock, data rules, session, replay contract, evidence hooks)
   │ may import only: types/stdlib + the pinned published VICT contract packages
   │     where a contract is genuinely required (same recorded-decision pattern
   │   as @vict-trading/chart-workspace shipping with no VICT dep by default)
   ▼
chart-workspace (@vict-trading/chart-workspace)  ←— consumes kit time via a
   │   TIME PORT injected by the app (kit never imports chart-workspace)
   ▼
host app — composes: kit data slices → chart workspace rendering → panels
```

- **Kit → Chart Workspace: zero imports.** The chart stays time-agnostic: every timestamp it needs arrives as data, so the same Chart Workspace serves replay (historical clock) and current (live) without knowing which. When chart-workspace later needs time, the app injects a small time port (package-consumed, not package-dependency).
- **Kit does not import the app.** App owns adapters; kit owns rules. Same import audit standard as G1-PKG.
- **The app composes both packages via public exports** — no capability imports the app.

## 3. Public interfaces (proposed shape, not implemented)

The kit exposes a small surface mirroring the Chart Workspace's proven pattern (`createX` + headless object + injected ports):

- `createReplayClock(config)` → historical clock with explicit `now()`, `advance(step)`, `setFrame(t)`, and a **hard future-guard**: requests beyond the current instant resolve as "unavailable at replay time" (this is what makes the poison-future criterion passable by construction).
- `createDataSession({ clock, source, rules })` → slices the consumer-supplied source: `bars(untilInclusive)`, `availabilityAt(t)` (explicit gap states), instrument/timeframe identity checks. Source and rules are consumer-provided; the kit never fetches.
- `ReplaySession` — start/restore/reset/to-current with recorded, versioned rules; every transition is emitted on the evidence channel.
- `EvidenceRecorder` interface — consumer supplies the sink (the app may route it to `docs/evidence` conventions or a session file; the kit only defines the shape).

Ports over which the app retains ownership (same philosophy as `WorkspacePersistence`): **data source, storage, evidence transport, and — via injection — time for the chart layer.**

## 4. How G2 blind replay would consume the kit

G2 would then be, in capability terms: *wire `createDataSession` + `createReplayClock` into the existing Chart Workspace composition*, with the app providing the origin fixture set and the session restore/reset persistence. The historical-clock injection replaces the app's current implicit "now is whatever the data's last bar is" for the replay context only — current mode is untouched, and the two contexts are unmistakably labelled (a G2 pass criterion). This is why the boundary precedes replay: replay code written before the kit exists would put the clock inside `host/`, and D-001's reuse promise would be gone on day one.

## 5. What I am NOT doing

This document is a proposal. It implements nothing, starts no G2 stage, touches no simulation-engine selection (O-05 remains open, LGPL question pending for G3), and publishes nothing. If the owner accepts/amends it, the G2 stage record in HANDOFF.md must then encode: G2 scope, the kit package(s) it authorises, the poison-future fixture provenance, and the fresh-verifier requirement — per the standing acceptance discipline.

## 6. Open items the owner should weigh in on

1. **Package naming:** `@vict-trading/trading-kit` (mirrors chart-workspace) vs a VICT-prefixed name. My recommendation: `@vict-trading/*` until publication decisions land.
2. **Session restore/reset persistence:** a kit port (consumer storage) like the chart's, versus app-managed session state for now. Recommendation: port, so the app keeps its storage rules.
3. **Scope of "first bite":** should G2 deliver *all five kit responsibilities* from day one, or clock+data+replay first (H.4 evidence hooks minimal, H.5 fuller at G3)? Recommendation: the boundary names all five, but the G2 stage record may slice H.5 minimally — evidence hooks are cheap to stub wrongly, so their contract should be reviewed at G2 planning rather than hardcoded now.
4. Whether the Trading Kit proposal should be recorded as a decision (D-002) upon acceptance, mirroring D-001's treatment of the packaging gate.