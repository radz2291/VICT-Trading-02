/**
 * Candidate B: uPlot.
 * Pan/zoom: NOT native — implemented here (wheel = x-zoom, drag = x-pan,
 * double-click = reset). Crosshair: native cursor. Price/time readback via
 * uPlot.posToIdx + scale inversion. Levels: one extra series per level
 * (2-point horizontal span), rebuilt when the level set changes.
 *
 * Spike note: series-per-level + full re-init on change is the simple
 * correct approach; a cursor-draw plugin could avoid re-init (deferred).
 */
import uPlot, { type Options } from 'uplot';
import type { Bar } from './fixture.js';
import type { ChartCallbacks, ChartController, ChartHost, CrosshairRead, Level } from './chart-api.js';

const LEVEL_BASE = 8; // series index of the first level series

export function createUplotChart(host: ChartHost, bars: Bar[], cb: ChartCallbacks): ChartController {
	let data: Bar[] = bars;
	let levels: Level[] = [];
	let uplot: uPlot | null = null;
	let lastRead: CrosshairRead | null = null;

	function xValues(): number[] {
		return data.map((b) => b.time);
	}

	function seriesConfigs(): Partial<uPlot.Series>[] {
		const out: Partial<uPlot.Series>[] = [
			{}, // x
			{
				label: 'close',
				stroke: '#4f9ee3',
				width: 1.5,
				points: { show: false }
			}
		];
		for (const l of levels) {
			out.push({
				label: l.note ?? 'level',
				stroke: '#e0c96b',
				width: 1.5,
				dash: [6, 4],
				points: { show: false },
				spanGaps: false
			});
		}
		return out;
	}

	function seriesData(): uPlot.AlignedData {
		const close: Array<number | null> = data.map((b) => b.close);
		const out: unknown[] = [xValues(), close];
		for (const l of levels) {
			// two-point horizontal span across the visible x-range
			const t0 = data[0]?.time ?? 0;
			const t1 = data[data.length - 1]?.time ?? 1;
			out.push([t0, t1].map(() => l.price));
		}
		return out as uPlot.AlignedData;
	}

	function make(): void {
		const opts: Options = {
			width: host.width,
			height: host.height,
			title: undefined,
			cursor: { sync: undefined },
			series: seriesConfigs() as Options['series'],
			hooks: {
				setCursor: [
					(u: uPlot) => {
						if (u.cursor.idx === null || u.cursor.idx === undefined) {
							lastRead = null;
							cb.onCrosshairMove(null);
							return;
						}
						const t = data[u.cursor.idx]?.time ?? null;
						// price at cursor y: invert y pixel through the close-series scale
						const price = u.posToVal(u.cursor.top ?? 0, 'y');
						lastRead = { price, time: t };
						cb.onCrosshairMove(lastRead);
					}
				],
				setSelect: [
					(u: uPlot) => {
						// drag-select = pan-to-region; also treat as zoom (x only)
						if (u.select.width < 4) return;
						const min = u.posToVal(u.select.left, 'x');
						const max = u.posToVal(u.select.left + u.select.width, 'x');
						u.setScale('x', { min, max });
					}
				]
			}
		};
		uplot = new uPlot(opts, seriesData(), host.container);

		// wheel zoom (x only) + double-click reset
		host.container.onwheel = (ev: WheelEvent) => {
			ev.preventDefault();
			const u = uplot;
			if (!u) return;
			const scale = ev.deltaY < 0 ? 0.85 : 1.18;
			const minX = u.scales.x.min ?? 0;
			const maxX = u.scales.x.max ?? 1;
			const cx = u.posToVal(ev.offsetX, 'x');
			u.setScale('x', {
				min: cx - (cx - minX) * scale,
				max: cx + (maxX - cx) * scale
			});
		};
		host.container.ondblclick = () => {
			uplot?.setScale('x', { min: data[0]?.time ?? 0, max: data[data.length - 1]?.time ?? 1 });
		};
		// click (without drag) adds a level at the clicked price
		host.container.onclick = (ev: MouseEvent) => {
			const u = uplot;
			if (!u || u.select.width > 4) return;
			cb.onAddLevelAtPrice(u.posToVal(ev.offsetY, 'y'));
		};
	}

	function rebuild(): void {
		if (uplot) {
			uplot.destroy();
			uplot = null;
		}
		make();
	}

	make();

	return {
		setData(b2: Bar[]) {
			data = b2;
			rebuild();
		},
		setLevels(l2: Level[]) {
			levels = l2;
			rebuild();
		},
		readCrosshair: () => lastRead,
		destroy: () => {
			host.container.onwheel = null;
			host.container.ondblclick = null;
			host.container.onclick = null;
			uplot?.destroy();
			uplot = null;
		}
	};
}
