/**
 * Chart implementation: TradingView lightweight-charts 5.0.8 (G0 selection).
 *
 * Pan/zoom: native (mouse drag + wheel). Crosshair: native.
 * Levels: series.createPriceLine, diffed by level id; selection highlight;
 * drag-to-move implemented client-side via coordinate conversion
 * (priceToCoordinate / coordinateToPrice) with chart panning suppressed
 * (handleScroll) for the duration of a level drag, so LWC never fights
 * the drag gesture.
 * Creation/select: pointerup hit-testing — a short press (< 4 px movement)
 * on empty space creates; a press within 6 px of a level's line selects it
 * and arms a drag.
 * Live resize: chart autoSize (ResizeObserver-driven) — carried-forward G0
 * gap-closure item.
 */
import {
	createChart,
	CandlestickSeries,
	LineStyle,
	type IChartApi,
	type ISeriesApi,
	type IPriceLine,
	type UTCTimestamp,
	type MouseEventParams
} from 'lightweight-charts';
import type { Bar } from './fixture.js';
import type { ChartCallbacks, ChartController, ChartHost, CrosshairRead, Level } from './chart-api.js';

const HIT_PX = 6;
const CLICK_MAX_PX = 4;
const LEVEL_COLOR = '#e0c96b';
const LEVEL_SELECTED = '#ffd54a';

export function createLwcChart(host: ChartHost, bars: Bar[], cb: ChartCallbacks): ChartController {
	const chart: IChartApi = createChart(host.container, {
		autoSize: true,
		layout: { background: { color: '#101418' }, textColor: '#d6e2f0' },
		grid: {
			vertLines: { color: '#1c232b' },
			horzLines: { color: '#1c232b' }
		},
		timeScale: { timeVisible: true, secondsVisible: false },
		crosshair: { mode: 0 }
	});
	const series: ISeriesApi<'Candlestick'> = chart.addSeries(CandlestickSeries, {
		upColor: '#2f9e63',
		downColor: '#d05050',
		borderVisible: false,
		wickUpColor: '#2f9e63',
		wickDownColor: '#d05050'
	});

	let data: Bar[] = bars;
	let latest: CrosshairRead | null = null;
	chart.subscribeCrosshairMove((param: MouseEventParams) => {
		if (param.point === undefined || param.time === undefined) {
			latest = null;
			cb.onCrosshairMove(null);
			return;
		}
		const price = series.coordinateToPrice(param.point.y);
		if (price === null) {
			latest = null;
			cb.onCrosshairMove(null);
			return;
		}
		const t = param.time as UTCTimestamp as unknown as number;
		latest = { price: price as number, time: t, bar: data.find((b) => b.time === t) ?? null };
		cb.onCrosshairMove(latest);
	});

	// ---- levels ----------------------------------------------------------
	const drawn = new Map<string, { line: IPriceLine; level: Level }>();
	let selectedId: string | null = null;

	function styleLine(entry: { line: IPriceLine; level: Level }): void {
		const selected = entry.level.id === selectedId;
		entry.line.applyOptions({
			color: selected ? LEVEL_SELECTED : LEVEL_COLOR,
			lineWidth: selected ? 2 : 1,
			title: entry.level.note ?? 'level'
		});
	}

	function setLevels(levels: Level[]): void {
		const wanted = new Map(levels.map((l) => [l.id, l]));
		for (const [id, entry] of drawn) {
			if (!wanted.has(id)) {
				series.removePriceLine(entry.line);
				drawn.delete(id);
			}
		}
		for (const [id, level] of wanted) {
			const existing = drawn.get(id);
			if (!existing) {
				const line = series.createPriceLine({
					price: level.price,
					color: LEVEL_COLOR,
					lineWidth: 1,
					lineStyle: LineStyle.Dashed,
					axisLabelVisible: true,
					title: level.note ?? 'level'
				});
				const entry = { line, level };
				drawn.set(id, entry);
				styleLine(entry);
			} else if (existing.level.price !== level.price || existing.level.note !== level.note) {
				existing.level = level;
				existing.line.applyOptions({ price: level.price });
				styleLine(existing);
			}
		}
	}

	function setSelected(id: string | null): void {
		selectedId = id;
		for (const entry of drawn.values()) styleLine(entry);
	}

	// ---- pointer interaction: select / drag-move / create ----------------
	let dragId: string | null = null;
	let dragStartY = 0;
	let dragOrigPrice = 0;
	let dragMoved = false;
	let downX = 0;
	let downY = 0;
	let downOnLevel = false;

	function levelAtY(y: number): string | null {
		let bestId: string | null = null;
		let bestDist = HIT_PX;
		for (const [id, entry] of drawn) {
			const ly = series.priceToCoordinate(entry.level.price);
			if (ly === null) continue;
			const dist = Math.abs(ly - y);
			if (dist <= bestDist) {
				bestDist = dist;
				bestId = id;
			}
		}
		return bestId;
	}

	function onPointerDown(e: PointerEvent): void {
		if (e.button !== 0) return;
		const rect = host.container.getBoundingClientRect();
		downX = e.clientX - rect.left;
		downY = e.clientY - rect.top;
		dragMoved = false;
		dragId = levelAtY(downY);
		downOnLevel = dragId !== null;
		if (dragId !== null) {
			const entry = drawn.get(dragId);
			if (entry) {
				dragOrigPrice = entry.level.price;
				dragStartY = downY;
				// suppress chart panning while a level drag is armed; restored on pointerup
				chart.applyOptions({ handleScroll: false });
				host.container.setPointerCapture(e.pointerId);
			}
		}
	}

	function onPointerMove(e: PointerEvent): void {
		const rect = host.container.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		if (Math.abs(x - downX) > CLICK_MAX_PX || Math.abs(y - downY) > CLICK_MAX_PX) dragMoved = true;
		if (dragId === null) return;
		const price = series.coordinateToPrice(y);
		const entry = dragId !== null ? drawn.get(dragId) : undefined;
		if (price !== null && entry) {
			// live local preview; the store (and other views) update on pointerup
			entry.line.applyOptions({ price: price as number });
		}
	}

	function onPointerUp(e: PointerEvent): void {
		const rect = host.container.getBoundingClientRect();
		const y = e.clientY - rect.top;
		const wasDrag = dragId;
		if (dragId !== null) {
			chart.applyOptions({ handleScroll: true });
			const entry = drawn.get(dragId);
			if (entry) {
				if (dragMoved) {
					const price = series.coordinateToPrice(y);
					if (price !== null && (price as number) !== dragOrigPrice) {
						cb.onLevelMoved(dragId, price as number);
					} else {
						entry.line.applyOptions({ price: dragOrigPrice }); // snap back
					}
				} else {
					entry.line.applyOptions({ price: entry.level.price }); // no move: snap back
					cb.onSelectLevel(dragId);
				}
			}
			host.container.releasePointerCapture(e.pointerId);
			dragId = null;
			return;
		}
		void wasDrag;
		// empty-space short press → create; anything that moved is a pan
		if (!downOnLevel && !dragMoved && e.button === 0) {
			const price = series.coordinateToPrice(y);
			if (price !== null) cb.onCreateAtPrice(price as number);
		}
	}

	host.container.addEventListener('pointerdown', onPointerDown);
	host.container.addEventListener('pointermove', onPointerMove);
	host.container.addEventListener('pointerup', onPointerUp);

	return {
		setData(b2: Bar[]) {
			data = b2;
			series.setData(
				b2.map((b) => ({
					time: b.time as UTCTimestamp,
					open: b.open,
					high: b.high,
					low: b.low,
					close: b.close
				}))
			);
			chart.timeScale().fitContent();
		},
		setLevels,
		setSelected,
		readCrosshair: () => latest,
		destroy: () => {
			host.container.removeEventListener('pointerdown', onPointerDown);
			host.container.removeEventListener('pointermove', onPointerMove);
			host.container.removeEventListener('pointerup', onPointerUp);
			chart.remove();
		}
	};
}
