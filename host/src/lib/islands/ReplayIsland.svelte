<script lang="ts">
	import { createChart } from '@vict-trading/chart-workspace';
	import type { ChartController, ChartCallbacks } from '@vict-trading/chart-workspace';
	import { onMount } from 'svelte';
	import type { ReplayState } from '../replay.svelte.js';

	let { replay, onCreateAtPrice }: { replay: ReplayState; onCreateAtPrice: (price: number) => void } = $props();

	let container: HTMLDivElement | undefined = $state();
	let controller: ChartController | null = null;
	let readout = $state<{ price: number; time: number | null; bar: { open: number; high: number; low: number; close: number } | null } | null>(null);

	// REPLAY chart: bars arrive ONLY through the kit's capped queries (R1) —
	// `replay.bars` is the already-capped slice; nothing else reaches the chart.
	const callbacks: ChartCallbacks = {
		onCrosshairMove: (r) => { readout = r; },
		onCreateAtPrice: (price) => onCreateAtPrice(price),
		onSelectLevel: () => {},
		onLevelMoved: () => {} // replay-stamped levels are not movable in this stage
	};

	onMount(() => {
		if (!container) return;
		controller = createChart({ container }, replay.bars, callbacks);
		controller.setData(replay.bars);
		controller.setLevels(replay.levels);
		return () => { controller?.destroy(); controller = null; };
	});

	$effect(() => {
		void replay.now;
		void replay.timeframe;
		if (controller) controller.setData(replay.bars);
	});
	$effect(() => {
		void replay.now;
		if (controller) controller.setLevels(replay.levels);
	});

	function fmtTime(t: number | null): string {
		if (t === null) return '—';
		return new Date(t * 1000).toISOString().replace('T', ' ').slice(0, 16) + 'Z';
	}
</script>

<div class="island" data-testid="replay-island">
	<div class="readout" data-testid="replay-readout" aria-live="polite">
		{#if readout}
			O <b>{readout.bar?.open ?? '—'}</b> H <b>{readout.bar?.high ?? '—'}</b> L <b>{readout.bar?.low ?? '—'}</b> C
			<b>{readout.bar?.close ?? '—'}</b> · {fmtTime(readout.time)} · cursor {readout.price.toFixed(2)}
		{:else}
			crosshair off chart — XAUUSD {replay.timeframe} · {replay.bars.length} bars (capped slice)
		{/if}
	</div>
	<div class="chart" bind:this={container} data-testid="replay-chart-container"></div>
	<div class="statline" data-testid="replay-slice-stats">
		visible-slice stats (CAPPED slice only): max H {Number.isFinite(replay.stats().max) ? replay.stats().max : '—'} · SMA20
		{Number.isFinite(replay.stats().sma20) ? replay.stats().sma20.toFixed(2) : '—'} · queries {replay.queryCount}
		{#if replay.lastQuery?.capped}&nbsp;· last query CAPPED ({replay.lastQuery.requestedUntil} → {replay.lastQuery.servedUntil}){/if}
	</div>
</div>

<style>
	.island {
		border: 1px solid #b0413e;
		border-radius: 8px;
		padding: 8px;
		background: #120d0d;
		font: 13px system-ui;
		color: #f0d6d6;
		min-width: 0;
	}
	.readout {
		font: 12px ui-monospace, Consolas, monospace;
		color: #f0c9a0;
		min-height: 16px;
		margin-bottom: 4px;
	}
	.readout b { color: #f0e6d6; }
	.chart { width: 100%; height: clamp(320px, 58vh, 560px); }
	.statline {
		font: 11px ui-monospace, Consolas, monospace;
		color: #c98d8d;
		margin-top: 6px;
	}
</style>
