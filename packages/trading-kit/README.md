# @vict-trading/trading-kit

Headless **replay capability** for a market-data workspace: a market-time replay clock with a **hard future-guard**, clock-capped data queries, honest availability semantics, drawing-visibility provenance rules, and a replay session persisted **only** through a port the consumer supplies.

- **Renders nothing. Fetches nothing. Owns no storage. Zero runtime dependencies.**
- Never consults the wall clock for market-time decisions — replay time moves only through explicit `advance`/`setFrame` calls.
- Does NOT import `@vict-trading/chart-workspace` and is not imported by it (D-002 rule R4). The consumer app composes both.

> **NOT published to npm.** Install from the packed artifact path only:
> `npm install @vict-trading/trading-kit@file:/absolute/path/to/vict-trading-trading-kit-0.1.0.tgz`

## Precision rules implemented

- **R1 — capped queries.** `dataSession.bars()` is the ONLY bar-returning API. A slice always ends at `min(requestedUntil, clock.now())`; the clock itself can never exceed the configured horizon (`now()` caps, records `requested` vs `applied`). Every query records `{requestedUntil, servedUntil, capped, count}` so evidence can prove capping programmatically.
- **R2 — availability (amended: contested-case ruling, normative).** A base bar is available iff its close time ≤ clock now. An aggregated larger-timeframe bar is returned ONLY when EVERY **required constituent slot** of its bucket (`bucketStart + k·baseSeconds`, `k = 0..factor-1`) is present in the source AND available — read as all REQUIRED slots present-and-available. A bucket missing any slot (unfinished **or** a source gap) is never returned and never fabricated from partials. Gaps are computed ONLY from clock-visible information: interior gaps are detected between consecutive AVAILABLE bars (both endpoints clock-visible), `to` is a number only when the resumption bar's close is already within the clock's availability; otherwise the gap is **open-ended** (`to: null`) — a public replay query never reveals a future resumption time. Gaps are **never bridged**, and none are invented beyond known source extent. The **availability edge** (owner correction-cycle-2 ruling, normative): whenever the last available close precedes the clock, it is reported uniformly as a trailing open-ended interval (`from` = last available close, `to: null`) — availability is computed ONLY from clock-visible information (the available prefix plus the clock itself; NO lookahead into the source beyond that prefix, no existence check on post-clock source bars), so public outputs are identical whether post-clock source bars exist, differ, or were wholesale deleted. When the last available close equals the clock (availability current through now), NO edge entry is emitted — the not-yet-closed next slot is undelivered future, honestly invisible.
- **R3 — provenance (as amended by D-003).** `provenance-unknown` drawings are **HIDDEN in replay**; `replay-stamped` drawings are visible iff `creationStep ≤ currentStep` (and `creationInstant ≤ now`); `market-time-anchored` drawings are visible. The kit defines the rules; the consumer decides display.
- **R4 — dependency direction.** The kit depends on nothing; persistence is an app-supplied `SessionPersistence` port with a **read-before-write acknowledgment gate** (`READ_NOT_ACKNOWLEDGED` until a successful `read()` result is acknowledged).

## API

### `createReplayClock({ horizon, start })`
Market-time tick counter (unix seconds). `now()` (≤ horizon, always), `advance(stepSeconds)` (caller-chosen step, recorded, capped at horizon), `setFrame(t)`, `stepIndex()`, `records()` (operation log), `horizon()`.

### `createDataSession({ clock, source, rules })`
`source` = `{ bars }` (consumer-provided base-granularity series, ascending). `rules` = `{ symbol, baseTimeframe }`.
- `bars({ until, granularity })` → `{ symbol, granularity, bars, requestedUntil, servedUntil, capped }` — capped + recorded.
- `availabilityAt(t)` → `MissingInterval[]` (`{status:'missing', from, to}` — `to` is `number | null`; `null` = open-ended, resumption not yet within the clock's availability).
- `queryRecords()` / `clockRecords()` — the evidence channels.
- `clock()`, `rules()`.

### `ReplaySession`
`new ReplaySession({ clock, persistence }, { onEvent })` — `start(fromInstant)`, `step(stepSeconds)`, `play()`, `pause()`, `restore()`, `reset()`, `returnToCurrent()`, `createLevel(price, note?)` (replay-stamped with `clock.now()` + step), `removeLevel(id)`, `levelsAll()`. Every transition is emitted as a `SessionEvent` (evidence channel) and persisted via the port. Persistence mutations are refused with `READ_NOT_ACKNOWLEDGED` until `acknowledgeState(await persistence.read())` follows a successful read. Additionally, EVERY persisted mutation (start/step/play/pause/restore/createLevel/removeLevel/returnToCurrent/reset) **re-reads the stored record first** (per-operation re-verification): on read failure the operation is REFUSED with `READ_FAILED`, nothing is written, the stored bytes are untouched, and the live session state stays consistent. Recovery: once a successful read completes (the next operation's re-verification, or an explicit `acknowledgeState` after a successful consumer read), subsequent operations work again — `acknowledgeState` itself is only required once, at construction.

### Persistence execution semantics (async-persistence repair, normative)

- **FIFO serialization.** EVERY persisted operation (start, step, play, pause, drawing create/remove, returnToCurrent, restore, reset) enqueues on a per-session promise chain in CALL order; each op executes only after the previous op settles. The guarantee is per-session-instance; concurrent `ReplaySession` instances on the same storage are outside the kit's control (single-port contract).
- **Write-first, commit-after-own-write.** At EXECUTION time (not call time) an op computes its next-state record WITHOUT observable mutation (snapshot → draft → capture → restore back, all synchronous), awaits `persist(next)`, and only on a successful write re-applies the mutation to live state and emits. During a pending write every public read (`clock.now()`, `currentState()`, `bars()`, `levelsAll()`, `isPlaying`, `hasReturnedToCurrent`) exposes the LAST COMMITTED frame only — never an uncommitted replay frame, drawing, or transport flag. Failures return truthful codes (`WRITE_REFUSED` / `PORT_ERROR`), mutate nothing, emit nothing — the live state and stored bytes were never touched.
- **Execution-time re-base (explicit non-composition).** Because the next state is computed AT EXECUTION TIME, an op queued behind a FAILED op re-bases on the pre-op committed state of the failed op. Example: A `step()` is refused, then B `step(3600)` executes → B produces `T0+3600`/step 2, NOT `T0+7200`/step 3. A consumer issuing B before A settles cannot assume B composes onto the state B observed at call time — B's outcome depends on A's outcome.
- **Queued-behind-reset.** Ops queued behind a `reset()` re-base on the post-reset cleared state and pass through the same existing gates (acknowledgment, re-verify, horizon, input validation); there is no additional invalidation mechanism.
- **Events.** Emitted only post-commit; with FIFO serialization call order == commit order == event order, and failed ops emit nothing — the event stream always matches the final committed state.

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

// your own storage — the kit never touches it (read-before-write gate!).
// The kit is TRANSACTIONAL: the next-state record is written FIRST and live
// state commits only on a successful write. A failing port (ok:false
// resolved as WRITE_REFUSED, or throw, resolved as PORT_ERROR) leaves the
// session state completely unchanged:
let failWrites = false;
const persistence = {
	read: () => JSON.parse(localStorage.getItem('my.replay.v1') ?? 'null'),
	write: async (record) => {
		if (failWrites) return { ok: false, code: 'STORAGE_VERIFY_FAILED', message: 'write verification failed' };
		localStorage.setItem('my.replay.v1', JSON.stringify(record));
		return { ok: true };
	},
	remove: () => localStorage.removeItem('my.replay.v1')
};
const session = new ReplaySession({ clock, persistence });
session.acknowledgeState(persistence.read()); // opens the write gate (required once)
await session.start(1_760_000_000);
// Every persisted mutation re-reads the record first. If the stored bytes
// become unreadable mid-session, the op is REFUSED with READ_FAILED
// (ok:false), stored bytes stay untouched, and the session keeps working
// once reads succeed again:
//   const r = await session.step(900);
//   if (!r.ok && r.code === 'READ_FAILED') showUser('step unavailable: storage read failed');

const capped = data.bars({ until: null, granularity: '1h' }); // ends at clock.now(), recorded
console.log(capped.servedUntil, capped.capped);

// a request beyond the clock: served CAPPED, not an error
const over = data.bars({ until: capped.servedUntil + 86_400 });
console.log(over.requestedUntil > over.servedUntil, data.queryRecords().at(-1));

failWrites = true;
{
	// refused write: truthful failure, ZERO live-state change (clock instant,
	// step index, drawings, playing all identical before/after), stored bytes
	// untouched. A subsequent healthy write works (recovery):
	const r = await session.step(900);
	if (!r.ok && r.code === 'WRITE_REFUSED')
		showUser('step failed: next state could not be persisted — nothing changed');
}
failWrites = false;
await session.step(900); // works again; state was never corrupted
await session.createLevel(2650.5, 'support'); // replay-stamped, visible only at/after this step

const verdict = visibilityInReplay({ id: 'x', provenance: 'provenance-unknown' }, clock);
console.log(verdict); // { visible: false, reason: 'D-003: provenance-unknown …' }
```

## Script contract (bounded backtests — SYNC-ONLY, as of 0.2.2)

The user script must define **`onBar(bar, api)` as a synchronous function**.
`async`/`await` and `Promise` are **not supported** and are **refused, never silently skipped**:

- If `onBar` returns a promise (e.g. it is an `async function` or returns one), the run
  **fails** with `SCRIPT_ASYNC_FORBIDDEN` and an actionable message.
- If the script schedules asynchronous work (`Promise.resolve().then(...)`,
  `new Promise(...)`, queueMicrotask-style continuations), the run **fails** with
  `SCRIPT_ASYNC_FORBIDDEN` — pending guest jobs are never pumped, so scheduled work
  would otherwise be silently dropped while the run reported success (V-G3-4, owner
  contested check 2026-09-30; red evidence: `docs/evidence/G3/verifier/RED-NOTE.md`).

Call `api.plot` / `api.signal` / `api.order` **directly inside `onBar`** (synchronously).
Failed runs keep their identity and full recorded assumptions, so a refused script is
always distinguishable from an executed one.
