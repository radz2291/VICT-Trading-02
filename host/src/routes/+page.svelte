<script lang="ts">
	import { VitApp, type ActionResult } from '@victframework/ui-svelte';
	import { createComponentRegistry } from '@victframework/application/renderer';
	import {
		compileWorkspacePlan,
		levelSaveInput,
		levelUpdateInput,
		levelDeleteInput,
		workspaceSetInput
	} from '$lib/definition.js';
	import ChartIslandLWC from '$lib/islands/ChartIslandLWC.svelte';
	import { SYMBOLS, TIMEFRAMES, type InstrumentSymbol, type Timeframe } from '$lib/fixture.js';
	import type { Level } from '$lib/chart-api.js';

	// Registry authority stays host-side (consumer code), per the ui-svelte contract.
	const registry = createComponentRegistry('registry.g1.workspace', '1');
	registry.register({ componentId: 'cmp.chart.lwc', revision: '1', implementation: ChartIslandLWC });

	const plan = compileWorkspacePlan();

	// ---- durable stores (host-side) --------------------------------------
	const LEVELS_KEY = 'g1.levels.v1';
	const WORKSPACE_KEY = 'g1.workspace.v1';

	interface WorkspaceRow {
		id: string;
		symbol: InstrumentSymbol;
		timeframe: Timeframe;
		panelOpen: number;
	}

	const DEFAULT_WS: WorkspaceRow = { id: 'active', symbol: 'XAUUSD', timeframe: '15m', panelOpen: 1 };

	let dataVersion = $state(0);

	// Pure read — throws on failure. Callers decide how to be honest about it.
	function readLevels(): Level[] {
		if (typeof window === 'undefined') return [];
		const raw = window.localStorage.getItem(LEVELS_KEY);
		const parsed = raw ? (JSON.parse(raw) as unknown) : [];
		return Array.isArray(parsed) ? (parsed as Level[]) : [];
	}

	// Non-throwing variant for dispatch paths (failure surfaces via the
	// action result contract there, not via the panel).
	function loadLevels(): Level[] {
		try {
			return readLevels();
		} catch {
			return [];
		}
	}

	// G1-PKG FIX 1 — READ-FAILURE WRITE GUARD.
	// Invariant: **no persisted write to the levels collection occurs unless
	// the prior read of that collection succeeded.** If the stored bytes
	// cannot be read (corrupt `g1.levels.v1` JSON, or a throwing storage),
	// every level mutation (save / update / delete) is REFUSED before any
	// `setItem` happens, the existing stored bytes are left untouched, and
	// the failure is surfaced (contract path returns ok:false with code
	// STORAGE_READ_FAILED; panel pill and island status show failure).
	// Additionally every accepted write is verified by an immediate read-back
	// compare; a mismatch restores the original bytes and reports failure.
	function gateLevelsRead(): { ok: true; rawBefore: string | null } | { ok: false } {
		try {
			const rawBefore = window.localStorage.getItem(LEVELS_KEY); // throws on getter-throw
			readLevels(); // full parse + shape check; throws on corrupt data
			return { ok: true, rawBefore };
		} catch {
			return { ok: false };
		}
	}

	function writeLevelsVerified(next: string, rawBefore: string | null): { ok: true } | { ok: false; code: string; message: string } {
		try {
			window.localStorage.setItem(LEVELS_KEY, next);
			if (window.localStorage.getItem(LEVELS_KEY) !== next) throw new Error('read-back mismatch');
			return { ok: true };
		} catch {
			// Verification failed: restore the exact original bytes (best effort), report failure honestly.
			try {
				if (rawBefore === null) window.localStorage.removeItem(LEVELS_KEY);
				else window.localStorage.setItem(LEVELS_KEY, rawBefore);
			} catch {
				// restore itself failed; the read-back evidence in the report covers this case
			}
			panelStatus = 'failed';
			panelDetail = 'storage';
			return { ok: false, code: 'STORAGE_VERIFY_FAILED', message: 'write verification failed — original data restored' };
		}
	}

	function loadWorkspace(): WorkspaceRow {
		if (typeof window === 'undefined') return DEFAULT_WS;
		try {
			const raw = window.localStorage.getItem(WORKSPACE_KEY);
			const parsed = raw ? (JSON.parse(raw) as Partial<WorkspaceRow>) : null;
			if (parsed && typeof parsed.symbol === 'string' && typeof parsed.timeframe === 'string') {
				return {
					id: 'active',
					symbol: parsed.symbol as InstrumentSymbol,
					timeframe: parsed.timeframe as Timeframe,
					panelOpen: parsed.panelOpen === 0 ? 0 : 1
				};
			}
		} catch {
			// fall through to default
		}
		return DEFAULT_WS;
	}

	// ---- panel state (host-side mirror of the workspace resource) ---------
	let ws = $state<WorkspaceRow>(DEFAULT_WS);
	// G1-PKG FIX 2 — `loading` gate: the host renders the app-defined loading
	// wording (t.loading, definition.ts screen states) until client hydration
	// has completed the first storage read. Visible under network throttling.
	let hydrated = $state(false);
	let panelStatus = $state<'idle' | 'saving' | 'saved' | 'failed' | 'unavailable'>('idle');
	let panelDetail = $state('');
	let saveTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		// hydrate panel state once on the client
		ws = loadWorkspace();
		hydrated = true;
	});

	function persistWorkspace(row: WorkspaceRow): void {
		panelStatus = 'saving';
		panelDetail = '';
		try {
			window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(row));
			dataVersion += 1; // refetch views → island props update
			panelStatus = 'saved';
		} catch (e) {
			panelStatus = 'failed';
			panelDetail = e instanceof Error && e.name === 'QuotaExceededError' ? 'quota' : 'storage';
			revertToApplied(); // F-V4 fix: select shows the APPLIED value, not the rejected one
		}
	}

	// F-V4 fix: after a rejected/failed workspace persist, restore the panel
	// controls to the last APPLIED (persisted or default) workspace row, so
	// the selects never display a value the chart did not adopt.
	function revertToApplied(): void {
		const applied = loadWorkspace();
		ws = applied;
	}

	function schedulePersist(row: WorkspaceRow): void {
		panelStatus = 'saving';
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => persistWorkspace(row), 250);
	}

	async function dispatch(actionId: string, input: unknown): Promise<ActionResult> {
		try {
			if (actionId === 'act.level.save' || actionId === 'act.level.update' || actionId === 'act.level.delete') {
				// G1-PKG FIX 1 read-gate: refuse BEFORE any write if the stored
				// collection cannot be read. Bytes are never overwritten blind.
				const gate = gateLevelsRead();
				if (!gate.ok) {
					panelStatus = 'failed';
					panelDetail = 'storage';
					return {
						ok: false,
						code: 'STORAGE_READ_FAILED',
						message: 'stored drawings unreadable — write refused to protect existing data'
					};
				}
				if (actionId === 'act.level.save') {
					const parsed = levelSaveInput.parse(input);
					if (!parsed.ok) {
						return { ok: false, code: 'CONTRACT_REJECTED', message: parsed.issues[0]?.message ?? 'invalid input' };
					}
					const levels = loadLevels().filter((l) => l.id !== parsed.value.id);
					levels.push(parsed.value);
					const w = writeLevelsVerified(JSON.stringify(levels), gate.rawBefore);
					if (!w.ok) return { ok: false, code: w.code, message: w.message };
					dataVersion += 1;
					// F-N1 fix: a successful level mutation clears a stale failure pill
					// (recovery must be visible in the topbar, not only in the island).
					panelStatus = 'saved';
					panelDetail = '';
					return { ok: true, value: { levels } };
				}
				if (actionId === 'act.level.update') {
					const parsed = levelUpdateInput.parse(input);
					if (!parsed.ok) {
						return { ok: false, code: 'CONTRACT_REJECTED', message: parsed.issues[0]?.message ?? 'invalid input' };
					}
					const levels = loadLevels();
					const idx = levels.findIndex((l) => l.id === parsed.value.id);
					if (idx === -1) {
						return { ok: false, code: 'NOT_FOUND', message: 'no level ' + parsed.value.id };
					}
					levels[idx] = {
						...levels[idx],
						price: parsed.value.price,
						note: parsed.value.note
					};
					const w = writeLevelsVerified(JSON.stringify(levels), gate.rawBefore);
					if (!w.ok) return { ok: false, code: w.code, message: w.message };
					dataVersion += 1;
					panelStatus = 'saved'; // F-N1 fix: recovery visible in the pill
					panelDetail = '';
					return { ok: true, value: { levels } };
				}
				// act.level.delete
				const parsed = levelDeleteInput.parse(input);
				if (!parsed.ok) {
					return { ok: false, code: 'CONTRACT_REJECTED', message: parsed.issues[0]?.message ?? 'invalid input' };
				}
				const levels = loadLevels().filter((l) => l.id !== parsed.value.id);
				const w = writeLevelsVerified(JSON.stringify(levels), gate.rawBefore);
				if (!w.ok) return { ok: false, code: w.code, message: w.message };
				dataVersion += 1;
				panelStatus = 'saved'; // F-N1 fix: recovery visible in the pill
				panelDetail = '';
				return { ok: true, value: { levels } };
			}
			if (actionId === 'act.workspace.set') {
				const parsed = workspaceSetInput.parse(input);
				if (!parsed.ok) {
					return { ok: false, code: 'CONTRACT_REJECTED', message: parsed.issues[0]?.message ?? 'invalid input' };
				}
				const row: WorkspaceRow = {
					id: 'active',
					symbol: parsed.value.symbol as InstrumentSymbol,
					timeframe: parsed.value.timeframe as Timeframe,
					panelOpen: parsed.value.panelOpen
				};
				window.localStorage.setItem(WORKSPACE_KEY, JSON.stringify(row));
				dataVersion += 1;
				return { ok: true, value: { row } };
			}
			return { ok: false, code: 'DATA_UNKNOWN_ACTION', message: 'unknown action ' + actionId };
		} catch (e) {
			return { ok: false, code: 'STORAGE_FAILED', message: e instanceof Error ? e.message : 'storage failed' };
		}
	}

	function setSymbol(sym: string): void {
		const row = { ...ws, symbol: sym as InstrumentSymbol };
		ws = row;
		schedulePersist(row);
		void dispatch('act.workspace.set', { symbol: row.symbol, timeframe: row.timeframe, panelOpen: row.panelOpen }).then(
			(r) => {
				if (r.ok === false) {
					panelStatus = 'failed';
					panelDetail = r.code ?? 'rejected';
					revertToApplied(); // F-V4 fix
				}
			}
		);
	}

	function setTimeframe(tf: string): void {
		const row = { ...ws, timeframe: tf as Timeframe };
		ws = row;
		schedulePersist(row);
		void dispatch('act.workspace.set', { symbol: row.symbol, timeframe: row.timeframe, panelOpen: row.panelOpen }).then(
			(r) => {
				if (r.ok === false) {
					panelStatus = 'failed';
					panelDetail = r.code ?? 'rejected';
					revertToApplied(); // F-V4 fix
				}
			}
		);
	}

	function togglePanel(): void {
		const row = { ...ws, panelOpen: ws.panelOpen === 1 ? 0 : 1 };
		ws = row;
		void dispatch('act.workspace.set', { symbol: row.symbol, timeframe: row.timeframe, panelOpen: row.panelOpen });
	}

	function resetWorkspace(): void {
		if (!window.confirm('Reset the workspace? All drawings will be removed.')) return;
		try {
			window.localStorage.removeItem(LEVELS_KEY);
			window.localStorage.removeItem(WORKSPACE_KEY);
			location.reload();
		} catch {
			panelStatus = 'failed';
			panelDetail = 'storage';
		}
	}

	const viewData = $derived.by(() => {
		void dataVersion; // refetch dependency
		const levels = loadLevels() as unknown as Record<string, unknown>[];
		const stored = (() => {
			if (typeof window === 'undefined') return null;
			try {
				const raw = window.localStorage.getItem(WORKSPACE_KEY);
				return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
			} catch {
				return null;
			}
		})();
		const workspaceRow = stored ?? { id: 'active', symbol: ws.symbol, timeframe: ws.timeframe, panelOpen: ws.panelOpen };
		return {
			'v.levels': { rows: levels },
			'v.workspace': { rows: [workspaceRow] }
		};
	});

	// F-V3 fix: the panel drawings read is honest — a storage READ failure
		// renders as an explicit read-failed note, never as "None yet".
		// (Try/catch inside the derived; no state mutation during derivation.)
		const panelRead = $derived.by(() => {
			void dataVersion;
			try {
				const levels = readLevels()
					.filter((l) => !l.symbol || l.symbol === ws.symbol)
					.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
				return { failed: false, levels };
			} catch {
				return { failed: true, levels: [] as Level[] };
			}
		});

	function fmtCreated(t?: number): string {
		if (!t) return '—';
		return new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ') + 'Z';
	}
</script>

<svelte:head>
	<title>VICT Trading Workspace</title>
</svelte:head>

<div class="workspace" data-testid="workspace">
	<header class="topbar">
		<span class="brand">VICT Trading Workspace</span>
		<span class="pill" class:failed={panelStatus === 'failed'} data-testid="panel-status">
			{panelStatus === 'idle' ? 'ready' : panelStatus}{panelDetail ? ': ' + panelDetail : ''}
		</span>
		<span class="feed-note">fixture data — not live market</span>
		<button class="panel-toggle" data-testid="btn-toggle-panel" onclick={togglePanel} aria-expanded={ws.panelOpen === 1}>
			{ws.panelOpen === 1 ? 'Hide panel' : 'Show panel'}
		</button>
	</header>

	{#if !hydrated}
		<p class="loading" data-testid="workspace-loading">Loading workspace…</p>
	{:else}
	<div class="body" class:panel-closed={ws.panelOpen !== 1}>
		<main class="main">
			<VitApp {plan} {registry} {dispatch} path="/" {viewData} record={null} onInvalidate={() => { dataVersion += 1; }} />
		</main>

		{#if ws.panelOpen === 1}
			<aside class="panel" data-testid="panel" aria-label="Workspace panel">
				<div class="group">
					<label class="ctl">
						Instrument
						<select data-testid="sel-symbol" value={ws.symbol} onchange={(e) => setSymbol(e.currentTarget.value)}>
							{#each SYMBOLS as s}<option value={s}>{s}</option>{/each}
						</select>
					</label>
					<label class="ctl">
						Timeframe
						<select data-testid="sel-timeframe" value={ws.timeframe} onchange={(e) => setTimeframe(e.currentTarget.value)}>
							{#each TIMEFRAMES as t}<option value={t}>{t}</option>{/each}
						</select>
					</label>
				</div>

				<div class="group">
					<h3>Drawings — {ws.symbol}</h3>
					{#if panelRead.failed}
						<p class="empty read-failed" data-testid="panel-read-failed">
							Drawings list unavailable: storage read failed. Existing levels may still be visible on the chart.
						</p>
					{:else if panelRead.levels.length === 0}
						<p class="empty" data-testid="panel-empty">None yet. Click the chart to draw a level.</p>
					{:else}
						<ul class="drawings" data-testid="panel-drawings">
							{#each panelRead.levels as l (l.id)}
								<li>
									<span class="d-price">{l.price}</span>
									<span class="d-note">{l.note ?? ''}</span>
									<span class="d-time">{fmtCreated(l.createdAt)}</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<div class="group">
					<h3>Data</h3>
					<p class="data-note">
						Deterministic fixture with deliberate gaps (block + singles). The chart bridges gaps visually — treat as a
						known limitation until G2. Never live market data.
					</p>
				</div>

				<div class="group">
					<button class="danger" data-testid="btn-reset" onclick={resetWorkspace}>Reset workspace</button>
					<p class="hint">Storage: browser-local. Nothing leaves this machine.</p>
				</div>
			</aside>
		{/if}
	</div>
	{/if}
</div>

<style>
	.loading {
		padding: 24px;
		color: #7d8b99;
		font: 13px system-ui;
	}
	.workspace {
		display: flex;
		flex-direction: column;
		height: 100vh;
		min-width: 0;
		font: 13px system-ui;
		color: #d6e2f0;
		background: #0b0e12;
	}
	.topbar {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 12px;
		border-bottom: 1px solid #1c232b;
		background: #0d1117;
	}
	.brand {
		font-weight: 600;
		letter-spacing: 0.02em;
	}
	.pill {
		font: 11px ui-monospace, Consolas, monospace;
		padding: 1px 8px;
		border-radius: 10px;
		background: #16202b;
		color: #2f9e63;
	}
	.pill.failed {
		color: #ff7b72;
	}
	.feed-note {
		color: #e0c96b;
		font-size: 11px;
	}
	.panel-toggle {
		margin-left: auto;
		background: #16202b;
		color: #d6e2f0;
		border: 1px solid #2f7dd1;
		border-radius: 4px;
		padding: 4px 10px;
		cursor: pointer;
		font: 12px system-ui;
	}
	.panel-toggle:focus-visible,
	.panel select:focus-visible,
	.panel button:focus-visible {
		outline: 2px solid #ffd54a;
		outline-offset: 1px;
	}
	.body {
		display: flex;
		flex: 1;
		min-height: 0;
		min-width: 0;
	}
	.main {
		flex: 1;
		min-width: 0;
		overflow: auto;
		padding: 8px;
	}
	.panel {
		width: 260px;
		flex: 0 0 260px;
		border-left: 1px solid #1c232b;
		background: #0d1117;
		padding: 10px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.group h3 {
		margin: 0 0 6px;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #7d8b99;
	}
	.ctl {
		display: block;
		margin-bottom: 8px;
		font-size: 12px;
		color: #9fb0c0;
	}
	.ctl select {
		display: block;
		width: 100%;
		margin-top: 3px;
		background: #101820;
		color: #d6e2f0;
		border: 1px solid #2f7dd1;
		border-radius: 4px;
		padding: 5px 6px;
		font: 13px system-ui;
	}
	.drawings {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.drawings li {
		display: flex;
		gap: 8px;
		padding: 4px 2px;
		border-bottom: 1px solid #16202b;
		font: 12px ui-monospace, Consolas, monospace;
	}
	.d-price {
		color: #e0c96b;
		min-width: 72px;
	}
	.d-note {
		color: #d6e2f0;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.d-time {
		color: #586a7a;
		font-size: 10px;
	}
	.empty {
		color: #586a7a;
		font-size: 12px;
		margin: 0;
	}
	.empty.read-failed {
		color: #ff7b72;
	}
	.data-note,
	.hint {
		color: #586a7a;
		font-size: 11px;
		margin: 0;
	}
	.danger {
		background: #241418;
		color: #ff7b72;
		border: 1px solid #7a3b38;
		border-radius: 4px;
		padding: 5px 10px;
		cursor: pointer;
		font: 12px system-ui;
		width: 100%;
	}

	/* narrow widths: panel stacks below the chart, nothing overflows */
	@media (max-width: 768px) {
		.body {
			flex-direction: column-reverse;
			overflow-y: auto;
		}
		.panel {
			width: 100%;
			flex: 0 0 auto;
			border-left: none;
			border-top: 1px solid #1c232b;
		}
		.main {
			overflow: visible;
		}
	}
</style>
