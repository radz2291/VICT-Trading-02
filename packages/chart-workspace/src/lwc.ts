/**
 * Chart implementation: TradingView lightweight-charts 5.0.8 (G0 selection).
 *
 * Package-internal LWC adapter behind the public `createChart` export.
 * Imports NOTHING from any host app; bars and levels come from the caller.
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
	createSeriesMarkers,
	AreaSeries,
	CandlestickSeries,
	HistogramSeries,
	LineSeries,
	LineStyle,
	type IChartApi,
	type ISeriesApi,
	type IPriceLine,
	type UTCTimestamp,
	type MouseEventParams
} from 'lightweight-charts';
import type { Bar, ChartCallbacks, ChartController, ChartHost, CrosshairRead, OverlayHandle, OverlayMarker, OverlayPoint, OverlaySpec, PriceLevel } from './types.js';

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
	const drawn = new Map<string, { line: IPriceLine; level: PriceLevel }>();
	let selectedId: string | null = null;

	function styleLine(entry: { line: IPriceLine; level: PriceLevel }): void {
		const selected = entry.level.id === selectedId;
		entry.line.applyOptions({
			color: selected ? LEVEL_SELECTED : LEVEL_COLOR,
			lineWidth: selected ? 2 : 1,
			title: entry.level.note ?? 'level'
		});
	}

	function setLevels(levels: PriceLevel[]): void {
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
				try {
					host.container.setPointerCapture(e.pointerId);
				} catch {
					// synthetic/inactive pointer ids throw; drag still works while the
					// pointer stays over the container
				}
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
			try {
				host.container.releasePointerCapture(e.pointerId);
			} catch {
				// ignore: capture may not be held (see pointerdown)
			}
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

	// ---- overlay series (G3 bounded extension, D-006-pre-authorized) ----- 
	type MarkerPlugin = ReturnType<typeof createSeriesMarkers>;
	const overlays = new Map<
		string,
		{ series: ISeriesApi<'Line'> | ISeriesApi<'Area'> | ISeriesApi<'Histogram'>; markers: MarkerPlugin | null; spec: OverlaySpec; dead: boolean }
	>();

	function addOverlay(spec: OverlaySpec): OverlayHandle {
		// REPLACE semantics (V-G3-R3): a same-id re-add must not stack an
		// orphaned series — the previous entry's series is removed first, and
		// its handle is marked DEAD so stale references can never draw again.
		const existing = overlays.get(spec.id);
		if (existing) {
			try { chart.removeSeries(existing.series as never); } catch { /* chart gone */ }
			existing.dead = true;
		}
		const def = spec.kind === 'area' ? AreaSeries : spec.kind === 'histogram' ? HistogramSeries : LineSeries;
		const options: Record<string, unknown> = {};
		if (spec.color) options.color = spec.color;
		if (spec.lineWidth) options.lineWidth = spec.lineWidth;
		if (spec.pane === 'sub') options.priceScaleId = ''; // forces a separate scale inside the lower pane
		const s = (spec.pane === 'sub' ? chart.addSeries(def, options, 1) : chart.addSeries(def, options)) as ISeriesApi<'Line'>;
		const entry: { series: ISeriesApi<'Line'> | ISeriesApi<'Area'> | ISeriesApi<'Histogram'>; markers: MarkerPlugin | null; spec: OverlaySpec; dead: boolean } = { series: s, markers: null, spec, dead: false };
		overlays.set(spec.id, entry);
		const guard = <T>(fn: () => T): T | undefined => {
			if (entry.dead) return undefined; // replaced/removed handle: inert by contract
			return fn();
		};
		return {
			setData(points: OverlayPoint[]): void {
				guard(() => {
					// ascending unique times; null value renders as a whitespace gap
					let last: number | null = null;
					const rows: Record<string, unknown>[] = [];
					for (const p of points) {
						if (p.time === last) continue;
						if (last !== null && p.time < last) continue; // refuse out-of-order rather than corrupt the series
						last = p.time;
						rows.push(p.value === null ? { time: p.time as UTCTimestamp } : { time: p.time as UTCTimestamp, value: p.value });
						}
					s.setData(rows as never);
				});
			},
			setMarkers(markers: OverlayMarker[]): void {
				guard(() => {
					if (!markers.length) {
						entry.markers?.setMarkers([]);
						return;
					}
					if (!entry.markers) {
						entry.markers = createSeriesMarkers(s as never, []);
					}
					entry.markers.setMarkers(
						markers.map((m) => ({
							time: m.time as UTCTimestamp,
							position: (m.shape === 'arrowUp' ? 'aboveBar' : 'belowBar') as 'aboveBar' | 'belowBar',
							shape: m.shape,
							color: spec.color ?? '#e0c96b',
							text: m.text ?? ''
						}))
					);
				});
			},
			remove(): void {
				guard(() => {
					try { chart.removeSeries(s); } catch { /* already removed with the chart */ }
					if (overlays.get(spec.id) === entry) overlays.delete(spec.id);
					entry.dead = true;
				});
			}
		};
	}

	function removeOverlay(id: string): void {
		const e = overlays.get(id);
		if (!e) return;
		try { chart.removeSeries(e.series as never); } catch { /* chart may be gone */ }
		overlays.delete(id);
	}

	return {
		coordinateToPrice: (y: number) => series.coordinateToPrice(y) as number | null,
		priceToCoordinate: (price: number) => series.priceToCoordinate(price),
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
		addOverlay,
		removeOverlay,
		destroy: () => {
			host.container.removeEventListener('pointerdown', onPointerDown);
			host.container.removeEventListener('pointermove', onPointerMove);
			host.container.removeEventListener('pointerup', onPointerUp);
			chart.remove();
		}
	};
}
