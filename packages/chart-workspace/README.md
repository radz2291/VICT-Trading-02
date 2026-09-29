# @vict-trading/chart-workspace

Headless chart-workspace capability: a [lightweight-charts](https://github.com/tradingview/lightweight-charts) **5.0.8** candlestick chart surface with a horizontal price-level drawing lifecycle (create / select / edit / drag-move / remove / undo / redo) and anchored price-coordinate mapping.

**Boundary:** the package owns headless chart + drawing behavior and its LWC adapter only. It:

- imports **nothing** from any host app,
- owns **no storage** — persistence goes through the `WorkspacePersistence` port you supply (the package never touches storage keys, browsers, or files),
- owns **no fixtures and no product wording** — you provide bar data and all UI text,
- has **no dependency on the VICT framework** (dependency decision recorded in `docs/evidence/G1-PKG/packaging-report.md`); its only runtime dependency is `lightweight-charts@5.0.8`.

## Install

```sh
npm install @vict-trading/chart-workspace
```

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
function refresh(): void {
	const levels = myStorage.readLevels();
	workspace.setSource(levels); // feed the workspace your read
	controller.setLevels(levels); // and the chart
}
refresh();
workspace.subscribe(refresh);

// Anchored price-coordinate mapping (price-axis anchored; survives pan/zoom/timeframe change):
const y = controller.priceToCoordinate(2650);
const price = y === null ? null : controller.coordinateToPrice(y);

// Lifecycle:
// workspace.create({ price, symbol: 'XAUUSD', note: 'resistance' })
// workspace.edit(id, { price, note: 'support' })
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
| `DrawingWorkspace` option/result types (`CreateLevelInput`, `MutationResult`, `WorkspaceOptions`) | types | workspace calls |
| `isBar`, `isPriceLevel`, `isFiniteNumber`, `isNonEmptyString`, `validateCreateInput`, `validateUpdateInput` | functions | minimal input validation owned by the package |

## Read-gate expectation

`WorkspacePersistence.readLevels()` should **throw on failure**. A consumer adapter that refuses writes after a failed read (as the VICT host app does) guarantees stored drawings are never overwritten blind; the workspace additionally re-pushes an undo/redo step whose port op fails, so stacks stay honest.

## License

UNLICENSED — private to the VICT Trading Workspace program. Not published to npm.
