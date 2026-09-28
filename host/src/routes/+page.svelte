<script lang="ts">
	import { VitApp, type ActionResult } from '@victframework/ui-svelte';
	import { createComponentRegistry } from '@victframework/application/renderer';
	import { compileSpikePlan, levelSaveInput, levelDeleteInput } from '$lib/definition.js';
	import ChartIslandLWC from '$lib/islands/ChartIslandLWC.svelte';
	import ChartIslandUPlot from '$lib/islands/ChartIslandUPlot.svelte';
	import type { Level } from '$lib/chart-api.js';

	// Registry authority stays host-side (consumer code), per the ui-svelte contract.
	const registry = createComponentRegistry('registry.g0.chart-spike', '1');
	registry.register({ componentId: 'cmp.chart.lwc', revision: '1', implementation: ChartIslandLWC });
	registry.register({ componentId: 'cmp.chart.uplot', revision: '1', implementation: ChartIslandUPlot });

	const plan = compileSpikePlan();

	// ---- durable levels store (host-side) --------------------------------
	const STORE_KEY = 'g0.spike.levels.v1';
	let dataVersion = $state(0);

	function loadLevels(): Level[] {
		if (typeof window === 'undefined') return [];
		try {
			const raw = window.localStorage.getItem(STORE_KEY);
			const parsed = raw ? (JSON.parse(raw) as unknown) : [];
			return Array.isArray(parsed) ? (parsed as Level[]) : [];
		} catch {
			return [];
		}
	}

	function persistLevels(levels: Level[]): void {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(STORE_KEY, JSON.stringify(levels));
		dataVersion += 1;
	}

	async function dispatch(actionId: string, input: unknown): Promise<ActionResult> {
		if (actionId === 'act.level.save') {
			const parsed = levelSaveInput.parse(input);
			if (!parsed.ok) {
				return { ok: false, code: 'CONTRACT_REJECTED', message: parsed.issues[0]?.message ?? 'invalid input' };
			}
			const levels = loadLevels().filter((l) => l.id !== parsed.value.id);
			levels.push(parsed.value);
			persistLevels(levels);
			return { ok: true, value: { levels } };
		}
		if (actionId === 'act.level.delete') {
			const parsed = levelDeleteInput.parse(input);
			if (!parsed.ok) {
				return { ok: false, code: 'CONTRACT_REJECTED', message: parsed.issues[0]?.message ?? 'invalid input' };
			}
			const levels = loadLevels().filter((l) => l.id !== parsed.value.id);
			persistLevels(levels);
			return { ok: true, value: { levels } };
		}
		return { ok: false, code: 'DATA_UNKNOWN_ACTION', message: 'unknown action ' + actionId };
	}

	const viewData = $derived.by(() => {
		void dataVersion; // refetch dependency
		return {
			'v.levels': { rows: loadLevels() as unknown as Record<string, unknown>[] }
		};
	});
</script>

<svelte:head>
	<title>G0 Chart Spike</title>
</svelte:head>

<VitApp {plan} {registry} {dispatch} path="/" {viewData} record={null} onInvalidate={() => { dataVersion += 1; }} />
