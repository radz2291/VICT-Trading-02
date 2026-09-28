/**
 * Candidate A: TradingView lightweight-charts.
 * Pan/zoom: native (mouse drag + wheel). Crosshair: native.
 * Levels: price lines (series.createPriceLine) diffed by level id.
 */
import {
	createChart,
	CandlestickSeries,
	type IChartApi,
	type ISeriesApi,
	type IPriceLine,
	type UTCTimestamp,
	type MouseEventParams
} from 'lightweight-charts';
import type { Bar } from './fixture.js';
import type { ChartCallbacks, ChartController, ChartHost, CrosshairRead, Level } from './chart-api.js';

export function createLwcChart(host: ChartHost, bars: Bar[], cb: ChartCallbacks): ChartController {
	const chart: IChartApi = createChart(host.container, {
		width: host.width,
		height: host.height,
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
		latest = { price: price as number, time: param.time as UTCTimestamp as unknown as number };
		cb.onCrosshairMove(latest);
	});

	// click adds a level at the clicked price
	chart.subscribeClick((param: MouseEventParams) => {
		if (param.point === undefined) return;
		const price = series.coordinateToPrice(param.point.y);
		if (price !== null) cb.onAddLevelAtPrice(price as number);
	});

	const drawn = new Map<string, IPriceLine>();
	function setLevels(levels: Level[]): void {
		const wanted = new Map(levels.map((l) => [l.id, l]));
		for (const [id, line] of drawn) {
			if (!wanted.has(id)) {
				series.removePriceLine(line);
				drawn.delete(id);
			}
		}
		for (const [id, level] of wanted) {
			if (!drawn.has(id)) {
				drawn.set(
					id,
					series.createPriceLine({
						price: level.price,
						color: '#e0c96b',
						lineWidth: 1,
						lineStyle: 2,
						axisLabelVisible: true,
						title: level.note ?? 'level'
					})
				);
			} else {
				const line = drawn.get(id)!;
				if (line.options().price !== level.price) {
					line.applyOptions({ price: level.price, title: level.note ?? 'level' });
				}
			}
		}
	}

	return {
		setData(b2: Bar[]) {
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
		readCrosshair: () => latest,
		destroy: () => chart.remove()
	};
}
