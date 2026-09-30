<script lang="ts">
	import { scriptsStore as st } from '../scripts.svelte.js';

	let props = $props();
	void props;

	let newDraftName = $state('');
	let inputsJson = $state('{"period": 20}');
	let timeframe = $state<'15m' | '1h' | '4h'>('15m');
	let rangeBars = $state<number>(250);
	let compareA = $state('');
	let compareB = $state('');
	let selectedPlot = $state('');

	const selected = $derived(st.drafts.find((d) => d.id === st.selectedDraftId) ?? null);
	const succeededRuns = $derived(st.runs.filter((r) => r.status === 'succeeded'));
	const lastRun = $derived(succeededRuns.length > 0 ? succeededRuns[succeededRuns.length - 1] : null);

	const plotNames = $derived(lastRun && lastRun.plots ? Object.keys(lastRun.plots) : []);
	const activePlotName = $derived(selectedPlot && plotNames.includes(selectedPlot) ? selectedPlot : (plotNames[0] ?? ''));
	const activePlot = $derived(lastRun && lastRun.plots ? (lastRun.plots[activePlotName] ?? []) : []);
	const activeSignals = $derived(lastRun && lastRun.signals ? (lastRun.signals[activePlotName] ?? null) : null);

	const fmtT = (t: number) => new Date(t * 1000).toISOString().slice(5, 16).replace('T', ' ');

	// SVG plot geometry (width-normalized polyline)
	const W = 560;
	const H = 90;
	function plotPoints(values: (number | null)[]): { x: number; y: number }[] {
		const nums = values.filter((v): v is number => v !== null && Number.isFinite(v));
		if (nums.length < 2) return [];
		const min = Math.min(...nums);
		const max = Math.max(...nums);
		const span = max - min || 1;
		return values
			.map((v, i) => (v === null || !Number.isFinite(v) ? null : { x: (i / Math.max(1, values.length - 1)) * W, y: H - ((v - min) / span) * (H - 8) - 4 }))
			.filter((p): p is { x: number; y: number } => p !== null);
	}
	const polyPts = $derived(plotPoints(activePlot));
	function diffCell(runA: typeof lastRun, runB: typeof lastRun, field: 'inputs' | 'finalEquity' | 'netProfit' | 'tradeCount' | 'maxDrawdown'): boolean {
		if (!runA || !runB) return false;
		if (field === 'inputs') return JSON.stringify(runA.inputs) !== JSON.stringify(runB.inputs);
		const a = runA.stats?.[field];
		const b = runB.stats?.[field];
		return JSON.stringify(a) !== JSON.stringify(b);
	}
	const runA = $derived(st.runs.find((r) => r.id === compareA) ?? null);
	const runB = $derived(st.runs.find((r) => r.id === compareB) ?? null);
</script>

<div class="island" data-testid="scripts-island">
	<div class="head">
		<span class="title">Scripts</span>
		<input
			class="name"
			data-testid="new-draft-name"
			placeholder="new draft name"
			bind:value={newDraftName}
			aria-label="New draft name"
		/>
		<button data-testid="btn-new-draft" onclick={() => { if (newDraftName.trim()) void st.newDraft(newDraftName.trim(), `// ${newDraftName.trim()} — write onBar(bar, api)\nfunction onBar(bar, api) {\n  api.plot('value', bar.close);\n}\n`); }}>New draft</button>
		<button data-testid="btn-add-sma" onclick={() => void st.addBuiltin('SMA')}>+ SMA indicator</button>
		<button data-testid="btn-add-ema" onclick={() => void st.addBuiltin('EMA')}>+ EMA indicator</button>
		{#if selected}
			<button data-testid="btn-toggle-editor" onclick={() => void (st.editorOpen ? st.hideEditor() : st.openEditor())}>
				{st.editorOpen ? 'Hide editor' : 'Reopen editor'}
			</button>
			<button data-testid="btn-delete-draft" onclick={() => void st.deleteSelected()}>Delete</button>
		{/if}
	</div>

	<div class="drafts" data-testid="draft-list">
		{#if st.drafts.length === 0}
			<span class="hint">no drafts yet — create one, or add an indicator</span>
		{:else}
			{#each st.drafts as d (d.id)}
				<button
					class="draft"
					class:active={d.id === st.selectedDraftId}
					data-testid={`draft-${d.name}`}
					onclick={() => st.select(d.id)}
				>
					{d.name}{d.builtin ? ' ·built-in' : ''}
				</button>
			{/each}
		{/if}
	</div>

	{#if st.editorOpen && selected}
		<div class="editor">
			<label class="field">
				name
				<input data-testid="draft-name" bind:value={selected.name} onchange={(e) => void st.editSelectedName(e.currentTarget.value)} aria-label="Draft name" />
			</label>
			<textarea
				data-testid="draft-source"
				spellcheck="false"
				rows="9"
				bind:value={selected.source}
				oninput={(e) => void st.editSelectedSource(e.currentTarget.value)}
				aria-label="Script source"
			></textarea>
			<div class="editor-actions">
				<button data-testid="btn-save-draft" onclick={() => void st.saveSelected()}>Save draft</button>
			</div>
		</div>
	{/if}

	<div class="runrow" data-testid="run-controls">
		<select data-testid="sel-run-tf" bind:value={timeframe} aria-label="Run timeframe">
			<option value="15m">15m</option>
			<option value="1h">1h</option>
			<option value="4h">4h</option>
		</select>
		<select data-testid="sel-run-range" bind:value={rangeBars} aria-label="Run range (bars)">
			<option value={250}>last 250 bars</option>
			<option value={500}>last 500 bars</option>
			<option value={1000}>last 1000 bars</option>
			<option value={2000}>last 2000 bars</option>
		</select>
		<input class="inputs" data-testid="run-inputs" bind:value={inputsJson} aria-label="Run inputs JSON" />
		<button data-testid="btn-run-backtest" disabled={st.running || !selected} onclick={() => void st.runSelected(timeframe, rangeBars, inputsJson)}>
			{st.running ? 'Running…' : 'Run backtest'}
		</button>
		<span class="status {st.status}" data-testid="scripts-status" role="status">
			{st.status}{st.statusDetail ? ': ' + st.statusDetail : ''}
		</span>
	</div>
	{#if st.runMessage}
		<p class="runmsg" data-testid="run-message">{st.runMessage}</p>
	{/if}

	{#if st.runs.length > 0}
		<div class="runs" data-testid="run-list">
			<span class="title small">Runs (immutable)</span>
			<table>
				<thead>
					<tr><th>run</th><th>draft</th><th>tf</th><th>bars</th><th>status</th><th>net</th><th>trades</th><th>cmpA</th><th>cmpB</th></tr>
				</thead>
				<tbody>
					{#each st.runs as r (r.id + r.finishedAt)}
						<tr data-testid={`run-row-${r.shortId}`}>
							<td>{r.shortId}</td>
							<td>{r.draftName}</td>
							<td>{r.timeframe}</td>
							<td>{r.rangeBars}</td>
							<td class:failed={r.status === 'failed'}>{r.status === 'failed' ? `failed: ${r.errorCode}` : 'ok'}</td>
							<td>{r.stats ? r.stats.netProfit.toFixed(2) : '—'}</td>
							<td>{r.stats ? r.stats.tradeCount : '—'}</td>
							<td><input type="radio" name="cmpA" bind:group={compareA} value={r.id} aria-label={`Compare A ${r.shortId}`} /></td>
							<td><input type="radio" name="cmpB" bind:group={compareB} value={r.id} aria-label={`Compare B ${r.shortId}`} /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if runA && runB}
		<div class="compare" data-testid="run-compare">
			<span class="title small">Compare {runA.shortId} vs {runB.shortId}</span>
			<table>
				<tbody>
					<tr><th>identity</th><td class:diff={runA.id !== runB.id}>{runA.shortId} / {runB.shortId}</td></tr>
					<tr><th>inputs</th><td class:diff={diffCell(runA, runB, 'inputs')}>{JSON.stringify(runA.inputs)} / {JSON.stringify(runB.inputs)}</td></tr>
					<tr><th>net</th><td class:diff={diffCell(runA, runB, 'netProfit')}>{runA.stats?.netProfit.toFixed(2)} / {runB.stats?.netProfit.toFixed(2)}</td></tr>
					<tr><th>final equity</th><td class:diff={diffCell(runA, runB, 'finalEquity')}>{runA.stats?.finalEquity.toFixed(2)} / {runB.stats?.finalEquity.toFixed(2)}</td></tr>
					<tr><th>trades</th><td class:diff={diffCell(runA, runB, 'tradeCount')}>{runA.stats?.tradeCount} / {runB.stats?.tradeCount}</td></tr>
					<tr><th>max DD</th><td class:diff={diffCell(runA, runB, 'maxDrawdown')}>{runA.stats?.maxDrawdown.toFixed(2)} / {runB.stats?.maxDrawdown.toFixed(2)}</td></tr>
					<tr><th>trades A</th><td>{(runA.trades ?? []).length} fills, first at {(runA.trades ?? [])[0] ? fmtT((runA.trades ?? [])[0].fillBarTime) : '—'}</td></tr>
					<tr><th>trades B</th><td>{(runB.trades ?? []).length} fills, first at {(runB.trades ?? [])[0] ? fmtT((runB.trades ?? [])[0].fillBarTime) : '—'}</td></tr>
				</tbody>
			</table>
		</div>
	{/if}

	{#if lastRun}
		<div class="plots" data-testid="script-plots">
			<span class="title small">Script plots — run {lastRun.shortId} ({lastRun.rangeBars} bars, {lastRun.timeframe})</span>
			<select data-testid="sel-plot" value={activePlotName} onchange={(e) => (selectedPlot = e.currentTarget.value)} aria-label="Plot series">
				{#each plotNames as name (name)}
					<option value={name}>{name}</option>
				{/each}
			</select>
			<svg data-testid="plot-svg" viewBox="0 0 {W} {H}" preserveAspectRatio="none" role="img" aria-label={`Plot ${activePlotName}`}>
				{#if polyPts.length > 1}
					<polyline fill="none" stroke="#4ea1ff" stroke-width="1.4" points={polyPts.map((p) => `${p.x},${p.y}`).join(' ')} />
				{/if}
				{#if activeSignals}
					{#each activeSignals as s, i}
						{#if s === 1}
							<circle cx={(i / Math.max(1, activeSignals.length - 1)) * W} cy={H - 6} r="2.4" fill="#e0c96b" />
						{/if}
					{/each}
				{/if}
			</svg>
			<span class="hint">
				gaps are explicit unavailable intervals in data — never bridged
				{#if (lastRun.unavailable ?? []).length > 0}
					· {(lastRun.unavailable ?? []).length} unavailability interval(s) in range
				{/if}
			</span>
		</div>
	{/if}
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
	.head {
		display: flex;
		gap: 6px;
		align-items: center;
		flex-wrap: wrap;
		min-height: 30px;
	}
	.title {
		font-weight: 600;
		margin-right: 4px;
	}
	.title.small {
		font-weight: 600;
	}
	.name {
		width: 130px;
	}
	inputs,
	.inputs {
		width: 190px;
	}
	button,
	select,
	input,
	textarea {
		background: #16202b;
		color: #d6e2f0;
		border: 1px solid #2f7dd1;
		border-radius: 4px;
		padding: 4px 8px;
		font: 12px system-ui;
	}
	button {
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.drafts {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		margin: 6px 0;
	}
	.draft.active {
		background: #1d3a5f;
		border-color: #4ea1ff;
	}
	.editor {
		margin: 6px 0;
	}
	.editor textarea {
		width: 100%;
		box-sizing: border-box;
		font-family: ui-monospace, monospace;
		font-size: 12px;
		white-space: pre;
	}
	.editor-actions {
		margin-top: 4px;
	}
	.runrow {
		display: flex;
		gap: 6px;
		align-items: center;
		flex-wrap: wrap;
		margin: 6px 0;
	}
	.status.saved {
		color: #2f9e63;
	}
	.status.failed {
		color: #ff7b72;
	}
	.status.idle {
		color: #8ba1b9;
	}
	.status.saving {
		color: #e0c96b;
	}
	.runmsg {
		margin: 2px 0;
		color: #8ba1b9;
	}
	.runs table,
	.compare table {
		border-collapse: collapse;
		margin-top: 4px;
		font-size: 12px;
	}
	.runs th,
	.runs td,
	.compare th,
	.compare td {
		border: 1px solid #1c232b;
		padding: 2px 6px;
		text-align: left;
	}
	.compare td.diff {
		color: #ffd54a;
	}
	.failed {
		color: #ff7b72;
	}
	.plots {
		margin-top: 6px;
	}
	.plots svg {
		display: block;
		width: 100%;
		height: 90px;
		background: #101418;
		border-radius: 4px;
		margin-top: 4px;
	}
	.hint {
		color: #8ba1b9;
		font-size: 12px;
	}
</style>
