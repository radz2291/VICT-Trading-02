/**
 * Workspace chart island logic (G1) — single island, lightweight-charts.
 *
 * VICT contract paths (published 0.4.0-rc.1 only):
 *  - write: useVictActions().run('act.level.save' | 'act.level.update' |
 *    'act.level.delete' | 'act.workspace.set', input) → host dispatch
 *    validates via the same defineContract parsers → persists → bumps its
 *    data version. (useVictActions lives on the ./component-actions subpath
 *    at rc.1 — recorded as G0 finding F1.)
 *  - read: props.levels bound to `{ view: 'v.levels' }`; props.workspace
 *    bound to `{ view: 'v.workspace' }` — reactive, survives full reload.
 *
 * G1 additions over the verified G0 pattern:
 *  - symbol/timeframe come from the workspace view (host panel dispatches
 *    act.workspace.set); bars are derived per symbol/timeframe from the
 *    deterministic fixtures (aggregation is honest — no invented bars).
 *  - full drawing lifecycle: create / select / edit / drag-move / remove /
 *    undo / redo. Undo/redo is a symmetric stack of prebuilt {undo, redo}
 *    action pairs, every entry dispatched through the same contract path,
 *    so an undo across a symbol switch restores the level on its ORIGINAL
 *    instrument (symbol/createdAt ride in the save contract, rev 2).
 *
 * Reactivity note: `props` must be the raw `$props()` proxy (NOT a
 * destructured copy) so `$derived` re-reads the view rows on updates.
 */
import { onMount } from 'svelte';
import { useVictActions } from '@victframework/ui-svelte/component-actions';
import { DrawingWorkspace, createChart, type ChartCallbacks, type ChartController, type PriceLevel as Level, type WorkspacePersistence } from '@vict-trading/chart-workspace';
import { buildSeries, SYMBOLS, TIMEFRAMES, type Bar, type InstrumentSymbol, type Timeframe } from './fixture.js';

export type MutationStatus = 'idle' | 'saving' | 'saved' | 'deleting' | 'failed';

/**
 * G1-PKG: the drawing lifecycle (create/select/edit/move/remove/undo/redo)
 * is the package's `DrawingWorkspace`; the app supplies a persistence port
 * routed through the VICT action contract path. Reads stay app-side: the
 * host feeds its own view rows into the workspace via `setSource`.
 */
function makePort(run: (actionId: string, input: Record<string, unknown>) => Promise<boolean>): WorkspacePersistence {
	return {
		// reads are consumer-fed (host views); the port only carries writes.
		// The package's intrinsic READ_NOT_ACKNOWLEDGED gate is additionally
		// satisfied by the host acknowledging every successful view read via
		// acknowledgeRead() below. The adapter-side read-gate (gateLevelsRead
		// in +page.svelte) is KEPT — defense in depth, not weakened.
		apply: async (op) => {
			if (op.type === 'save') {
				const ok = await run('act.level.save', { ...op.level });
				return ok ? { ok: true } : { ok: false, code: 'STORAGE_WRITE_REFUSED', message: 'save refused by host storage' };
			}
			if (op.type === 'update') {
				const ok = await run('act.level.update', { id: op.id, price: op.price, note: op.note });
				return ok ? { ok: true } : { ok: false, code: 'STORAGE_WRITE_REFUSED', message: 'update refused by host storage' };
			}
			const ok = await run('act.level.delete', { id: op.id });
			return ok ? { ok: true } : { ok: false, code: 'STORAGE_WRITE_REFUSED', message: 'delete refused by host storage' };
		}
	};
}

export type IslandProps = { symbol?: string; timeframe?: string; levels?: unknown; workspace?: unknown };

interface WorkspaceRow {
	symbol?: string;
	timeframe?: string;
}

function rowsOf(v: unknown): Record<string, unknown>[] {
	return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

/** Shared handle to the workspace chart (G3: scripts overlays target it). */
export const chartControllerRef: { current: ChartController | null } = { current: null };

export function workspaceState(props: IslandProps) {
	const actions = useVictActions();
	let container: HTMLDivElement | undefined = $state();
	let controller: ChartController | null = null;
	let readout = $state<{ price: number; time: number | null; bar: Bar | null } | null>(null);
	let status: MutationStatus = $state('idle');
	let statusDetail: string = $state('');
	let selectedId: string | null = $state(null);
	let editPrice: string = $state('');
	let editNote: string = $state('');
	let stackVersion = $state(0); // reactivity trigger for canUndo/canRedo

	// package-owned headless workspace; undo/redo stacks live inside it
	const store = new DrawingWorkspace(
		makePort(async (actionId, input) => {
			status = actionId === 'act.level.delete' ? 'deleting' : 'saving';
			statusDetail = '';
			try {
				const r = await actions.run(actionId, input);
				if (r && r.ok === false) {
					status = 'failed';
					statusDetail = r.code ?? 'rejected';
					return false;
				}
				status = 'saved';
				return true;
			} catch {
				status = 'failed';
				statusDetail = 'dispatch error';
				return false;
			}
		})
	);
	store.subscribe(() => {
		stackVersion++;
		selectedId = store.selectedId;
	});

	// ---- workspace view → symbol/timeframe (host panel is the writer) ----
	const workspaceRow = $derived(rowsOf(props.workspace)[0] as WorkspaceRow | undefined);
	const symbol = $derived(
		SYMBOLS.includes((workspaceRow?.symbol ?? 'XAUUSD') as InstrumentSymbol)
			? ((workspaceRow?.symbol ?? 'XAUUSD') as InstrumentSymbol)
			: 'XAUUSD'
	);
	const timeframe = $derived(
		TIMEFRAMES.includes((workspaceRow?.timeframe ?? '15m') as Timeframe)
			? ((workspaceRow?.timeframe ?? '15m') as Timeframe)
			: '15m'
	);

	// levels for THIS instrument, oldest first
	const incoming = $derived(Array.isArray(props.levels) ? (props.levels as Level[]) : []);
	const myLevels = $derived(
		incoming
			.filter((l) => !l.symbol || l.symbol === symbol)
			.slice()
			.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
	);

	// drop the selection if its level no longer exists (e.g. removed via undo)
	$effect(() => {
		if (selectedId !== null && !myLevels.some((l) => l.id === selectedId)) {
			selectLevel(null);
		}
	});

	// F-V1 fix: keep the toolbar edit fields in lockstep with the selected
	// level's STORED values. After a drag-move, undo/redo, or any successful
	// mutation, the fields re-sync from the store — a later label-only edit
	// therefore always carries the dragged/current price, never a stale one.
	// A field the user is actively typing in (document.activeElement) is left
	// alone until blur/change submits it, so typing is never clobbered.
	$effect(() => {
		const cur = selectedId !== null ? myLevels.find((l) => l.id === selectedId) : undefined;
		if (!cur) return;
		const ae = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
		if (ae?.dataset?.field !== 'edit-price') editPrice = String(cur.price);
		if (ae?.dataset?.field !== 'edit-note') editNote = cur.note ?? '';
	});

	// bars: deterministic fixture per symbol, honestly aggregated per timeframe
	const bars = $derived(buildSeries(symbol, timeframe));

	// G1-PKG correction: acknowledge every successful consumer-owned read
	// (initial load and every recovery read — host views only update after a
	// successful read) so the package's intrinsic read gate opens.
	$effect(() => {
		void myLevels;
		store.acknowledgeRead(incoming, symbol);
	});

	const callbacks: ChartCallbacks = {
		onCrosshairMove: (r) => {
			readout = r;
		},
		onCreateAtPrice: (price) => {
			void createLevel(price);
		},
		onSelectLevel: (id) => {
			selectLevel(id);
		},
		onLevelMoved: (id, price) => {
			void moveLevel(id, price);
		}
	};

	onMount(() => {
		if (!container) return;
		controller = createChart({ container }, bars, callbacks);
		chartControllerRef.current = controller; // G3: scripts overlays target the workspace chart
		controller.setData(bars);
		controller.setLevels(myLevels);
		return () => {
			controller?.destroy();
			chartControllerRef.current = null;
			controller = null;
		};
	});

	// data swap on symbol/timeframe change (levels persist: price-anchored)
	$effect(() => {
		if (controller) controller.setData(bars);
	});
	$effect(() => {
		if (controller) controller.setLevels(myLevels);
	});

	// ---- mutation plumbing (package-owned behavior, app-owned status) ----

	function selectLevel(id: string | null): void {
		store.select(id);
		controller?.setSelected(id);
		const cur = id !== null ? incoming.find((l) => l.id === id) : undefined;
		editPrice = cur ? String(cur.price) : '';
		editNote = cur?.note ?? '';
	}

	function onKeydown(e: KeyboardEvent): void {
		const target = e.target as HTMLElement | null;
		if (target && target.closest('input, select, textarea')) {
			if (e.key === 'Escape') (target as HTMLElement).blur();
			return;
		}
		if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId !== null) {
			e.preventDefault();
			void removeSelected();
		} else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
			e.preventDefault();
			void undo();
		} else if (
			((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
			((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')
		) {
			e.preventDefault();
			void redo();
		} else if (e.key === 'Escape') {
			selectLevel(null);
		}
	}

	async function createLevel(price: number): Promise<void> {
		const r = await store.create({ price, note: 'level', symbol, createdAt: Math.floor(Date.now() / 1000) });
		if (r.ok) selectLevel(r.id ?? null);
	}

	async function moveLevel(id: string, price: number): Promise<void> {
		await store.move(id, price);
	}

	async function editSelected(price: number, note: string): Promise<void> {
		if (selectedId === null) return;
		// Note semantics (package contract): '' is an EXPLICIT CLEAR of the
		// note; the field is never emptied accidentally (clearing requires
		// submitting an emptied field). The package preserves the note only
		// when a patch omits it entirely (undefined).
		await store.edit(selectedId, { price, note });
	}

	async function removeSelected(): Promise<void> {
		if (selectedId === null) return;
		const r = await store.remove(selectedId);
		if (r.ok) selectLevel(store.selectedId);
	}

	async function undo(): Promise<void> {
		await store.undo();
	}

	async function redo(): Promise<void> {
		await store.redo();
	}

	function addLevelAtLastClose(): void {
		const last = bars[bars.length - 1];
		if (last) void createLevel(last.close);
	}

	return {
		get container() {
			return container;
		},
		set container(el: HTMLDivElement | undefined) {
			container = el;
		},
		get readout() {
			return readout;
		},
		get status() {
			return status;
		},
		get statusDetail() {
			return statusDetail;
		},
		get levels() {
			return myLevels;
		},
		get selectedId() {
			return selectedId;
		},
		get editPrice() {
			return editPrice;
		},
		set editPrice(v: string) {
			editPrice = v;
		},
		get editNote() {
			return editNote;
		},
		set editNote(v: string) {
			editNote = v;
		},
		get canUndo() {
			void stackVersion;
			return store.canUndo;
		},
		get canRedo() {
			void stackVersion;
			return store.canRedo;
		},
		get symbol() {
			return symbol;
		},
		get timeframe() {
			return timeframe;
		},
		get bars() {
			return bars;
		},
		selectLevel,
		editSelected,
		removeSelected,
		undo,
		redo,
		onKeydown,
		addLevelAtLastClose
	};
}
