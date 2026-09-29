# @vict-trading/chart-workspace

Headless chart-workspace capability: a [lightweight-charts](https://github.com/tradingview/lightweight-charts) **5.0.8** candlestick chart surface with a horizontal price-level drawing lifecycle (create / select / edit / drag-move / remove / undo / redo) and anchored price-coordinate mapping.

**Boundary:** the package owns headless chart + drawing behavior and its LWC adapter only. It:

- imports **nothing** from any host app,
- owns **no storage** — persistence goes through the `WorkspacePersistence` port you supply (the package never touches storage keys, browsers, or files),
- owns **no fixtures and no product wording** — you provide bar data and all UI text,
- has **no dependency on the VICT framework** (dependency decision recorded in `docs/evidence/G1-PKG/packaging-report.md`); its only runtime dependency is `lightweight-charts@5.0.8`.

## Install

This package is **NOT published to npm**. It is distributed as a locally packed artifact (`npm pack`); install from the artifact path only:

```sh
npm install ./vict-trading-chart-workspace-0.1.0.tgz
```

**Publish status:** packed locally (npm pack artifact); **NOT published to npm**; install from the artifact path only.

## API example

```ts
import {
	createChart,
	DrawingWorkspace,
	type Bar,
	type PriceLevel,
	type WorkspacePersistence
} from '@vict-trading/chart-workspace';

// 1. Consumer-provided data (your fixtures, your feed, your tests — anything).
const bars: Bar[] = [
	{ time: 1767228000, open: 2650.1, high: 2652.0, low: 2649.4, close: 2651.2 },
	{ time: 1767228900, open: 2651.2, high: 2653.1, low: 2650.8, close: 2652.6 }
	// ...
];

// 2. YOUR persistence adapter — storage is entirely your concern.
//    The package never reads or writes storage itself and owns no keys.
const myStorage: WorkspacePersistence = {
	readLevels(): PriceLevel[] {
		const raw = window.localStorage.getItem('my.own.key'); // your key, your format
		return raw ? (JSON.parse(raw) as PriceLevel[]) : [];
	},
	async apply(op) {
		const levels = this.readLevels();
		if (op.type === 'save') {
			const next = [...levels.filter((l) => l.id !== op.level.id), op.level];
			window.localStorage.setItem('my.own.key', JSON.stringify(next));
		} else if (op.type === 'update') {
			const next = levels.map((l) =>
				l.id === op.id ? { ...l, price: op.price, note: op.note } : l
			);
			window.localStorage.setItem('my.own.key', JSON.stringify(next));
		} else {
			const next = levels.filter((l) => l.id !== op.id);
			window.localStorage.setItem('my.own.key', JSON.stringify(next));
		}
		return { ok: true };
	}
};

// 3. Headless workspace: create/select/edit/move/remove/undo/redo.
const workspace = new DrawingWorkspace(myStorage);
// NOTE: until you acknowledge a successful read (step 5), every mutation
// is refused with ok:false / code READ_NOT_ACKNOWLEDGED.

// 4. Chart surface (headless controller — render it wherever you want).
const controller = createChart(
	{ container: document.getElementById('chart')! },
	bars,
	{
		onCrosshairMove: (read) => console.log(read?.price),
		onCreateAtPrice: (price) => void workspace.create({ price }), // click empty space
		onSelectLevel: (id) => workspace.select(id),
		onLevelMoved: (id, price) => void workspace.move(id, price) // drag a line
	}
);
controller.setData(bars);

// 5. Keep the chart in sync with your own persisted truth (read stays yours).
// acknowledgeRead both feeds the workspace your read AND opens its intrinsic
// read gate — call it after YOUR adapter's read succeeded (initial load and
// every recovery read).
function refresh(): void {
	const levels = myStorage.readLevels();
	workspace.acknowledgeRead(levels); // feed + acknowledge the successful read
	controller.setLevels(levels); // and the chart
}
refresh();
workspace.subscribe(refresh);

// Anchored price-coordinate mapping (price-axis anchored; survives pan/zoom/timeframe change):
const y = controller.priceToCoordinate(2650);
const price = y === null ? null : controller.coordinateToPrice(y);

// Lifecycle:
// workspace.create({ price, symbol: 'XAUUSD', note: 'resistance' })

// NOTE SEMANTICS on edit — three distinct cases:
// (a) price-only edit: omit `note` (undefined) → the existing note is
//     PRESERVED in workspace state, the persisted update op, and undo/redo:
await workspace.edit(id, { price: 2655 }); // note stays 'resistance'
// (b) explicit note clear: `note: ''` (empty string) → the note is CLEARED
//     (persisted as ''); undo restores the prior note with the prior price:
await workspace.edit(id, { price: 2655, note: '' });
// (c) set: any other string replaces the note:
await workspace.edit(id, { price: 2655, note: 'support' });

// workspace.remove(id)
// await workspace.undo(); await workspace.redo();
controller.destroy();
```

Anchoring note: a level anchors to a **price-axis coordinate** of the instrument it was drawn on; it renders across all market time and survives pan, zoom, and timeframe change. `createdAt` is wall-clock metadata, **not** a market-time coordinate.

## Public surface

| Export | Kind | Purpose |
| --- | --- | --- |
| `createChart` | function | LWC 5.0.8 chart surface; returns a `ChartController` |
| `DrawingWorkspace` | class | headless drawing lifecycle over your `WorkspacePersistence` |
| `Bar`, `PriceLevel`, `CrosshairRead`, `ChartCallbacks`, `ChartController`, `ChartHost` | types | chart/data contracts |
| `WorkspacePersistence`, `PersistenceOp`, `PortResult` | types | persistence port (your storage adapter) |
| `DrawingWorkspace.acknowledgeRead(levels, symbol?)` | method | acknowledge a SUCCESSFUL consumer read; opens the intrinsic mutation gate |
| `DrawingWorkspace` option/result types (`CreateLevelInput`, `MutationResult`, `WorkspaceOptions`) | types | workspace calls |
| `isBar`, `isPriceLevel`, `isFiniteNumber`, `isNonEmptyString`, `validateCreateInput`, `validateUpdateInput` | functions | minimal input validation owned by the package |

## Read-gate: responsibility split (two layers, defense-in-depth)

1. **Your adapter (byte protection — required).** If the stored collection cannot be read (corrupt JSON, throwing storage), your adapter must refuse every write, so stored drawings are never overwritten blind. The package cannot do this for you — it never sees your storage. The VICT host app implements this (its read-gate + write-verify logic stayed app-side).
2. **Workspace intrinsic gate (defense-in-depth).** The workspace refuses every persistence mutation (`create`/`edit`/`move`/`remove`/`undo`/`redo`) until you call `acknowledgeRead(levels)` with the result of a SUCCESSFUL read — before that it returns `ok:false` with code `READ_NOT_ACKNOWLEDGED`. So no consumer gets silent blind-write behavior against data the workspace never saw. The workspace still never touches storage; the gate enforces ordering over data it was fed.

Additionally every undo/redo step whose port op fails is re-pushed, so stacks stay honest.

## License

UNLICENSED — private to the VICT Trading Workspace program. Not published to npm.
