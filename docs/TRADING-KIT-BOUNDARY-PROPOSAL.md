# Trading Kit boundary — ACCEPTED DIRECTION (D-002); implementation pending G2 acceptance

**Status: direction ACCEPTED by the owner on 2026-09-29 as decision D-002 (DECISIONS.md). The architectural choices and the four precision rules below are normative for G2 once a G2 handoff is accepted. This document is a boundary design, NOT a G2 authorization: no replay code may be written until the G2 stage handoff is accepted. Nothing is published.**

**Authority chain:** D-001 (delivery = composed app + installable capabilities) → D-002 (Trading Kit choices + precision rules) → draft G2 stage handoff (HANDOFF.md, DRAFT — not accepted) → G2 work only after owner acceptance.

---

## 1. Why a Trading Kit, in one paragraph

The app's credibility rests on *honesty of time*: replay is a simulation of the past that must never lie about what the trader could have known (G2's poison-future criterion). That discipline — one clock, no future leakage, named unavailable states, recorded sessions — is not an app feature; it is a *contract* that every consumer of the data (chart, derived calculations, later scripts/simulation) must obey. D-001 says capabilities a future app installs, not `host/` source. So the clock, the data rules, and the evidence of "what was known when" belong in a separate capability package whose guarantees are testable without the app. That is the Trading Kit.

## 2. Accepted decisions (D-002)

1. **Name:** `@vict-trading/trading-kit`.
2. **Independence:** trading-kit is independent of `@vict-trading/chart-workspace` — neither package imports the other or the app.
3. **Composition:** the app consumes both packages through public exports.
4. **Session persistence:** replay sessions use an **app-supplied persistence port** (kit owns session *rules*, app owns *storage*) — the pattern proven by `WorkspacePersistence` in chart-workspace.
5. **G2 scope:** smallest useful **clock**, **data**, **replay**, and **evidence** contracts. Scripts, simulation engines, risk, and orders remain later work — the kit reserves ports but designs nothing about them now.

## 3. The four precision rules (D-002, normative)

### R1 — Every public data query is capped by the replay clock

- Any query against a replay data session returns data ending at **`min(requested instant, clock.now())`** — regardless of the time the caller requests. The replay clock is the *only* source of "now"; no capability may read wall-clock for market-time decisions.
- There is **no public API that bypasses the cap**. Requesting beyond the clock is not an error — it is observably capped: results carry `requestedUntil` and `servedUntil` so tests and evidence can prove capping actually happened.
- **The chart receives bar data only through capped queries.** A hidden chart mask over full future data is explicitly insufficient and prohibited: the chart's series must not *contain* future bars during replay, not merely fail to show them.
- Every derived calculation (indicators, readouts, statistics) must consume the same capped slices. Calculating over data obtained outside the capped API during replay is a recorded violation.

### R2 — Availability semantics

- **Base bars:** a base-granularity bar is available at clock instant `t` iff its close time ≤ `t` (a bar covering [a,b) becomes available exactly at `t = b`).
- **Unfinished larger-timeframe bars:** an aggregated bar (1h, 4h…) becomes available only when **all** its constituent base bars are available. An unfinished larger-timeframe bar at the clock instant is **not returned and never previewed** — the resulting absence appears as data time (series simply ends at the last fully-formed bar), never as a partial or provisional bar.
- **Missing intervals:** gaps are **never bridged** — not by the kit, and not by chart rendering. Each gap is reported as explicit unavailability (`{ status: 'missing', from, to }`), and the display shows an explicit unavailable state. Nothing anywhere implies continuous data. (Carries the G0/G1 recorded finding forward.)

### R3 — Historical visibility for drawings and annotations

- Provenance classes:
  - **(a) `market-time-anchored`** — holds a market-time coordinate. *None exists today* for horizontal levels.
  - **(b) `replay-stamped`** — a drawing created during replay is stamped with the **replay-clock instant at creation**; that stamp is a market-time coordinate by construction, and it is the only provable basis for historical visibility.
  - **(c) `provenance-unknown`** — carries only wall-clock metadata. **All currently persisted levels are class (c)**: `createdAt` is wall-clock and cannot prove a drawing existed at any market time.
- Honest treatment (**AMENDED by D-003, owner 2026-09-29** — class-(c) drawings are **HIDDEN in blind replay**; the earlier present-day-marker wording, retained below, is superseded because a marker cannot keep a drawing's **price level** from revealing future information):
  - **Current rule:** class-(c) drawings are withheld from the replay view entirely. Replay-stamped drawings are visible only at or after their creation step. Current-mode behavior is unchanged. The kit exposes `visibilityAt(marketInstant)` predicates per class; consumers invent no provenance classes of their own.
  - **Superseded history (retained verbatim):** ~"a class-(c) drawing displayed during replay must carry an explicit present-day marker (e.g. 'added today — not timestamped to market time') and never present itself as historical; every such display is recorded on the evidence channel."~
- Back-leak rule: a class-(b) drawing created at step N must not be visible at steps < N.

### R4 — Dependency direction (shown, not implied)

```
        ┌─────────────────────────────────────────────┐
        │                  host app                   │
        │  fixtures · wording · storage · composition │
        └──────┬──────────────────────────────┬───────┘
               │ imports                      │ imports
               │ public exports               │ public exports
               ▼                              ▼
   @vict-trading/trading-kit     @vict-trading/chart-workspace
   (clock, data rules, session,  (chart surface, drawings,
    replay contract, evidence)    anchors, undo/redo)
               │                              ▲
               │      ✗ NO imports either way  │
               └──────────── time PORT ────────┘
                       (app-injected value)
```

- The app imports both packages through their public exports; **neither package imports the other or the app** (import audit is a standard gate check).
- The chart stays time-agnostic: any time it needs arrives as an app-injected port value (same injection pattern as the persistence port), so one Chart Workspace serves replay (historical clock) and current (live) contexts without knowing which.
- Both packages may depend on pinned published VICT contract packages only where genuinely required — decided per package with a recorded decision (chart-workspace currently ships with none; default for trading-kit is none unless a capability truly requires one).

## 4. Public interfaces (proposed shape, smallest useful set — designed at G2, not now)

Mirroring the Chart Workspace's proven pattern (`createX` + headless object + injected ports):

- `createReplayClock(config)` — historical clock with `now()`, `advance(step)`, `setFrame(t)`, and a **hard future-guard** (requests beyond the current instant cap per R1).
- `createDataSession({ clock, source, rules })` — slices consumer-provided data per R1+R2 (`bars(until)`, `availabilityAt(t)`, instrument/timeframe identity checks). The kit never fetches.
- `ReplaySession` — start/restore/reset/return-to-current with versioned, recorded rules; every transition emitted on the evidence channel.
- `visibilityAt` predicates + evidence recorder interface (R3; consumer supplies the recorder sink).

## 5. How G2 blind replay would consume the kit (for the draft handoff)

Wire `createDataSession` + `createReplayClock` into the existing Chart Workspace composition, with the app providing origin fixtures (including a pinned poison-future fixture) and the session-persistence adapter per D-002 choice 3. The historical-clock injection replaces the app's implicit "now = last bar" in the replay context only; current mode is untouched; the two contexts are unmistakably labelled (G2 pass criterion). Because the boundary precedes replay code, replay lands in the capability package — not inside `host/`.

## 6. Explicitly later (named in D-001, out of every current authorization)

Scripts and the scripting runtime choice (G3), simulation engines and risk models (G3–G5), order pathways and account anything (G5+; kit sessions cannot express an order, ever).

## 7. Open items (non-blocking; owner guidance optional)

- **Package naming for VICT contract deps of the kit** — default "none" (see R4 note) unless a recorded need arises at G2.
- **Evidence-hook completeness at G2** — the boundary names hooks minimally; their full contract is reviewed at G2 planning, not hardcoded here.
- Whether the kit's clock also serves the *current* (live later) context — deferred with the engine/live decisions; replay-only for now.