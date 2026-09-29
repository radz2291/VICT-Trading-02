# @vict-trading/trading-kit

Headless **replay capability** for a market-data workspace: a market-time replay clock with a **hard future-guard**, clock-capped data queries, honest availability semantics, drawing-visibility provenance rules, and a replay session persisted **only** through a port the consumer supplies.

- **Renders nothing. Fetches nothing. Owns no storage. Zero runtime dependencies.**
- Never consults the wall clock for market-time decisions — replay time moves only through explicit `advance`/`setFrame` calls.
- Does NOT import `@vict-trading/chart-workspace` and is not imported by it (D-002 rule R4). The consumer app composes both.

> **NOT published to npm.** Install from the packed artifact path only:
> `npm install @vict-trading/trading-kit@file:/absolute/path/to/vict-trading-trading-kit-0.1.0.tgz`

## Precision rules implemented

- **R1 — capped queries.** `dataSession.bars()` is the ONLY bar-returning API. A slice always ends at `min(requestedUntil, clock.now())`; the clock itself can never exceed the configured horizon (`now()` caps, records `requested` vs `applied`). Every query records `{requestedUntil, servedUntil, capped, count}` so evidence can prove capping programmatically.
- **R2 — availability.** A base bar is available iff its close time ≤ clock now. An aggregated larger-timeframe bar is returned only when **every** constituent base bar is available — no unfinished-bar preview. Missing intervals are reported explicitly by `availabilityAt()` as `{status:'missing', from, to}` and are **never bridged**.
- **R3 — provenance (as amended by D-003).** `provenance-unknown` drawings are **HIDDEN in replay**; `replay-stamped` drawings are visible iff `creationStep ≤ currentStep` (and `creationInstant ≤ now`); `market-time-anchored` drawings are visible. The kit defines the rules; the consumer decides display.
- **R4 — dependency direction.** The kit depends on nothing; persistence is an app-supplied `SessionPersistence` port with a **read-before-write acknowledgment gate** (`READ_NOT_ACKNOWLEDGED` until a successful `read()` result is acknowledged).

## API

### `createReplayClock({ horizon, start })`
Market-time tick counter (unix seconds). `now()` (≤ horizon, always), `advance(stepSeconds)` (caller-chosen step, recorded, capped at horizon), `setFrame(t)`, `stepIndex()`, `records()` (operation log), `horizon()`.

### `createDataSession({ clock, source, rules })`
`source` = `{ bars }` (consumer-provided base-granularity series, ascending). `rules` = `{ symbol, baseTimeframe }`.
- `bars({ until, granularity })` → `{ symbol, granularity, bars, requestedUntil, servedUntil, capped }` — capped + recorded.
- `availabilityAt(t)` → `MissingInterval[]` (`{status:'missing', from, to}`).
- `queryRecords()` / `clockRecords()` — the evidence channels.
- `clock()`, `rules()`.

### `ReplaySession`
`new ReplaySession({ clock, persistence }, { onEvent })` — `start(fromInstant)`, `step(stepSeconds)`, `play()`, `pause()`, `restore()`, `reset()`, `returnToCurrent()`, `createLevel(price, note?)` (replay-stamped with `clock.now()` + step), `removeLevel(id)`, `levelsAll()`. Every transition is emitted as a `SessionEvent` (evidence channel) and persisted via the port. Persistence mutations are refused with `READ_NOT_ACKNOWLEDGED` until `acknowledgeState(await persistence.read())` follows a successful read.

### `visibilityAt(drawing, ctx)` / `visibilityInReplay(drawing, clock)`
Returns `{ visible, reason }` per the provenance rules above.

### `stampReplayCreation(instant, step)`
Returns the `{ provenance: 'replay-stamped', creationInstant, creationStep }` stamp for drawings created during replay.

## Consumer example (Node, ESM)

```js
import { createReplayClock, createDataSession, ReplaySession, visibilityInReplay } from '@vict-trading/trading-kit';

// horizon: replay can never see beyond this instant
const clock = createReplayClock({ horizon: 1_800_000_000, start: 1_760_000_000 });

// your own data — the kit never fetches
const data = createDataSession({
	clock,
	source: { bars: myBase15mBars },
	rules: { symbol: 'XAUUSD', baseTimeframe: '15m' }
});

// your own storage — the kit never touches it (read-before-write gate!)
const persistence = {
	read: () => JSON.parse(localStorage.getItem('my.replay.v1') ?? 'null'),
	write: async (record) => { localStorage.setItem('my.replay.v1', JSON.stringify(record)); return { ok: true }; },
	remove: () => localStorage.removeItem('my.replay.v1')
};
const session = new ReplaySession({ clock, persistence });
session.acknowledgeState(persistence.read()); // opens the write gate
await session.start(1_760_000_000);

const capped = data.bars({ until: null, granularity: '1h' }); // ends at clock.now(), recorded
console.log(capped.servedUntil, capped.capped);

// a request beyond the clock: served CAPPED, not an error
const over = data.bars({ until: capped.servedUntil + 86_400 });
console.log(over.requestedUntil > over.servedUntil, data.queryRecords().at(-1));

await session.step(900); // one 15m bar; capped at the horizon automatically
await session.createLevel(2650.5, 'support'); // replay-stamped, visible only at/after this step

const verdict = visibilityInReplay({ id: 'x', provenance: 'provenance-unknown' }, clock);
console.log(verdict); // { visible: false, reason: 'D-003: provenance-unknown …' }
```
