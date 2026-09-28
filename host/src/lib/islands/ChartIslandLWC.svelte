<script lang="ts">
	import { createLwcChart } from '../lwc.js';
	import { islandState } from '../island-state.svelte.js';

	let props = $props();

	const st = islandState({ candidate: 'lightweight-charts', factory: createLwcChart }, props);
</script>

<div class="island" data-candidate="lightweight-charts" data-symbol={props.symbol ?? ''}>
	<div class="head">
		<strong>lightweight-charts</strong> · {props.symbol} {props.timeframe} · status: {st.status}
		<span class="hint">drag = pan · wheel = zoom · crosshair = read · click = add level</span>
	</div>
	<div class="readout" data-testid="lwc-readout">
		{#if st.readout}
			price {st.readout.price.toFixed(2)} · time {st.readout.time ?? '—'}
		{:else}
			crosshair off chart
		{/if}
	</div>
	<div class="chart" bind:this={st.container} style="width:100%;height:360px"></div>
	<ul class="levels" data-testid="lwc-levels">
		{#each st.levels as l (l.id)}
			<li>level {l.price.toFixed(2)} {l.note ?? ''} <button onclick={() => st.removeLevel(l.id)}>remove</button></li>
		{/each}
	</ul>
</div>

<style>
	.island {
		border: 1px solid #2f7dd1;
		border-radius: 8px;
		padding: 10px;
		background: #0d1117;
		font: 13px system-ui;
		color: #d6e2f0;
	}
	.head { margin-bottom: 4px; }
	.hint { color: #7d8b99; margin-left: 8px; }
	.readout { font: 12px ui-monospace, Consolas, monospace; color: #9fe3b0; min-height: 16px; }
	.levels { margin: 6px 0 0; padding-left: 18px; }
</style>
