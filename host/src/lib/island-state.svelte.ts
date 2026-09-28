/**
 * Shared island logic: both candidates get identical behavior through
 * ChartController, so the comparison isolates the candidate difference.
 *
 * Durability path (published contract only):
 *  - write: useVictActions().run('act.level.save'/'act.level.delete', input)
 *    → host dispatch persists → bumps its data version
 *  - read:  the plan binds props.levels to `{ view: 'v.levels' }`; the host
 *    feeds viewData from its persisted store, so saved levels arrive as a
 *    reactive prop (including after a full reload).
 *
 * Reactivity note: `props` must be the raw `$props()` proxy (NOT a
 * destructured copy) so `$derived` re-reads `props.levels` on updates.
 */
import { onMount } from 'svelte';
import { useVictActions } from '@victframework/ui-svelte/component-actions';
import { buildFixture } from './fixture.js';
import type { ChartCallbacks, ChartController, ChartHost, CrosshairRead, Level } from './chart-api.js';

export interface IslandFactory {
	candidate: string;
	factory: (host: ChartHost, bars: ReturnType<typeof buildFixture>, cb: ChartCallbacks) => ChartController;
}

export type IslandProps = { symbol?: string; timeframe?: string; levels?: unknown };

export function islandState(cfg: IslandFactory, props: IslandProps) {
	const actions = useVictActions();
	let container: HTMLDivElement | undefined = $state();
	let controller: ChartController | null = null;
	let readout: CrosshairRead | null = $state(null);
	let status: string = $state('boot');

	const incoming = $derived(Array.isArray(props.levels) ? (props.levels as Level[]) : []);

	onMount(() => {
		if (!container) return;
		const rect = container.getBoundingClientRect();
		const width = Math.max(320, Math.floor(rect.width) || 920);
		const height = 360;
		controller = cfg.factory(
			{ container, width, height },
			buildFixture(),
			{
				onCrosshairMove: (r) => {
					readout = r;
				},
				onAddLevelAtPrice: (price) => {
					status = 'saving';
					actions
						.run('act.level.save', {
							id: 'lvl-' + Math.random().toString(36).slice(2, 10),
							price: Math.round(price * 100) / 100,
							note: 'level'
						})
						.then((r) => {
							status = r && r.ok === false ? 'failed: ' + (r.code ?? '') : 'saved';
						})
						.catch(() => {
							status = 'failed';
						});
				}
			}
		);
		controller.setData(buildFixture());
		status = 'ready';
		return () => {
			controller?.destroy();
			controller = null;
		};
	});

	// reconcile drawn levels whenever the host-persisted view rows change
	$effect(() => {
		if (controller) controller.setLevels(incoming);
	});

	function removeLevel(id: string): void {
		status = 'deleting';
		actions
			.run('act.level.delete', { id })
			.then((r) => {
				status = r && r.ok === false ? 'failed: ' + (r.code ?? '') : 'deleted';
			})
			.catch(() => {
				status = 'failed';
			});
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
		get levels() {
			return incoming;
		},
		removeLevel
	};
}
