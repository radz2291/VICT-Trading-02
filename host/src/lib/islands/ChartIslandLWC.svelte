<script lang="ts">
	import { createChart } from '@vict-trading/chart-workspace';
	import { workspaceState } from '../island-state.svelte.js';

	let props = $props();

	const st = workspaceState(props);

	function applyEdit(): void {
		const p = Number(st.editPrice);
		if (Number.isFinite(p)) void st.editSelected(p, st.editNote);
	}

	function fmtTime(t: number | null): string {
		if (t === null) return '—';
		return new Date(t * 1000).toISOString().replace('T', ' ').slice(0, 16) + 'Z';
	}
</script>

<svelte:window onkeydown={st.onKeydown} />

<div class="island" data-testid="chart-island" data-symbol={st.symbol} data-timeframe={st.timeframe}>
	<div class="toolbar" role="toolbar" aria-label="Drawing tools">
		<button data-testid="btn-add-level" onclick={() => st.addLevelAtLastClose()} aria-label="Add level at last close" title="Add level at last close (A)">
			+ Level
		</button>
		<button data-testid="btn-undo" onclick={() => void st.undo()} disabled={!st.canUndo} aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)">Undo</button>
		<button data-testid="btn-redo" onclick={() => void st.redo()} disabled={!st.canRedo} aria-label="Redo (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)">Redo</button>
		<button
			data-testid="btn-delete"
			onclick={() => void st.removeSelected()}
			disabled={st.selectedId === null}
			aria-label="Delete selected level (Del)"
			title="Delete selected level (Del)"
		>
			Delete
		</button>
	</div>

	<!-- F-V2 fix: both bands ALWAYS exist with fixed min-heights — selection
		 fields appear inside a reserved row, the hint inside another. The chart
		 never shifts vertically on create/select/deselect. -->
	<div class="fieldsrow">
		{#if st.selectedId !== null}
			<label class="field">
				price
				<input data-testid="edit-price" data-field="edit-price" type="number" step="any" bind:value={st.editPrice} onchange={applyEdit} aria-label="Selected level price" />
			</label>
			<label class="field">
				label
				<input data-testid="edit-note" data-field="edit-note" type="text" bind:value={st.editNote} onchange={applyEdit} aria-label="Selected level label" />
			</label>
			<span class="sel-id">selected {st.selectedId}</span>
		{/if}
	</div>
	<div class="hintline">
		{#if st.selectedId === null}
			<span class="hint">click chart = add level · click a line = select · drag a line = move · Del removes · Ctrl+Z / Ctrl+Shift+Z</span>
		{/if}
	</div>

	<div class="readout" data-testid="readout" aria-live="polite">
		{#if st.readout}
			O <b>{st.readout.bar?.open ?? '—'}</b> H <b>{st.readout.bar?.high ?? '—'}</b> L <b>{st.readout.bar?.low ?? '—'}</b> C
			<b>{st.readout.bar?.close ?? '—'}</b> · {fmtTime(st.readout.time)} · cursor {st.readout.price.toFixed(st.symbol === 'EURUSD' ? 4 : 2)}
		{:else}
			crosshair off chart — {st.symbol} {st.timeframe} · {st.bars.length} bars
		{/if}
	</div>

	<div class="chart" bind:this={st.container} data-testid="chart-container"></div>

	<div class="statusline">
		<span class="status {st.status}" data-testid="mutation-status">{st.status}{st.statusDetail ? ': ' + st.statusDetail : ''}</span>
		<span class="note">data gaps are explicit unavailable intervals — never bridged in data · the chart line may still bridge them visually (rendering limitation only)</span>
	</div>
</div>

<style>
	.island {
		border: 1px solid #2f7dd1;
		border-radius: 8px;
		padding: 8px;
		background: #0d1117;
		font: 13px system-ui;
		color: #d6e2f0;
		min-width: 0;
	}
	.toolbar {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
		margin-bottom: 0;
		min-height: 30px;
	}
	.fieldsrow {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
		min-height: 30px;
	}
	.hintline {
		min-height: 15px;
		margin: 0 0 4px;
	}
	.toolbar button {
		background: #16202b;
		color: #d6e2f0;
		border: 1px solid #2f7dd1;
		border-radius: 4px;
		padding: 4px 10px;
		cursor: pointer;
		font: 12px system-ui;
	}
	.toolbar button:hover:not(:disabled) {
		background: #1d2b3a;
	}
	.toolbar button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.toolbar button:focus-visible,
	.fieldsrow input:focus-visible {
		outline: 2px solid #ffd54a;
		outline-offset: 1px;
	}
	.field {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font: 12px system-ui;
		color: #9fb0c0;
	}
	.field input {
		background: #101820;
		border: 1px solid #2f7dd1;
		color: #d6e2f0;
		border-radius: 4px;
		padding: 3px 6px;
		width: 90px;
		font: 12px ui-monospace, Consolas, monospace;
	}
	.sep {
		width: 1px;
		height: 18px;
		background: #2f7dd1;
		margin: 0 4px;
	}
	.sel-id {
		color: #ffd54a;
		font: 11px ui-monospace, Consolas, monospace;
	}
	.hintline {
		min-height: 17px;
		margin: 0 0 4px;
	}
	.hint {
		display: block;
		line-height: 17px;
		height: 17px;
		color: #7d8b99;
		font-size: 11px;
	}
	.readout {
		font: 12px ui-monospace, Consolas, monospace;
		color: #9fe3b0;
		min-height: 16px;
		margin-bottom: 4px;
	}
	.readout b {
		color: #d6e2f0;
	}
	.chart {
		width: 100%;
		height: clamp(320px, 58vh, 560px);
	}
	.statusline {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		margin-top: 6px;
		flex-wrap: wrap;
	}
	.status {
		font: 11px ui-monospace, Consolas, monospace;
		padding: 1px 6px;
		border-radius: 3px;
		background: #16202b;
	}
	.status.saving,
	.status.deleting {
		color: #ffd54a;
	}
	.status.saved {
		color: #2f9e63;
	}
	.status.failed {
		color: #ff7b72;
	}
	.status.idle {
		color: #7d8b99;
	}
	.note {
		color: #586a7a;
		font-size: 10px;
	}
</style>
