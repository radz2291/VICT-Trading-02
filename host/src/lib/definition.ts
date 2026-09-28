import {
	APPLICATION_DEFINITION_SCHEMA,
	RESOURCE_DEFINITION_SCHEMA,
	defineApplication,
	defineContract,
	defineResource
} from '@victframework/sdk';
import { compileApplication } from '@victframework/application';
import type { ApplicationPlan } from '@victframework/application';

/**
 * G1 workspace application, described neutrally and compiled to an immutable
 * Application Plan. One custom chart island (lightweight-charts, G0
 * selection) is registered by the HOST through createComponentRegistry.
 *
 * Two resources:
 *  - `levels`    — horizontal price levels. save is revision '2': it now
 *                  carries symbol/createdAt so undo/redo restores a level on
 *                  its ORIGINAL instrument. update added for edit/move.
 *  - `workspace` — the active workspace row: symbol, timeframe, panelOpen.
 *                  The host panel dispatches act.workspace.set; the island
 *                  reads symbol/timeframe via the v.workspace view binding.
 */

/** Save (create or keyed-restore) one level: full snapshot. */
export const levelSaveInput = defineContract<{ id: string; price: number; note?: string; symbol?: string; createdAt?: number }>({
	id: 'chart.level.save',
	revision: '2',
	expected: '{ id: string, price: finite number, note?: string, symbol?: string, createdAt?: finite number }',
	parse: (input) => {
		const c = input as Record<string, unknown> | null;
		if (
			c !== null &&
			typeof c === 'object' &&
			typeof c.id === 'string' &&
			c.id.length > 0 &&
			typeof c.price === 'number' &&
			Number.isFinite(c.price)
		) {
			return {
				ok: true as const,
				value: {
					id: c.id,
					price: c.price,
					note: typeof c.note === 'string' ? c.note : undefined,
					symbol: typeof c.symbol === 'string' ? c.symbol : undefined,
					createdAt: typeof c.createdAt === 'number' && Number.isFinite(c.createdAt) ? c.createdAt : undefined
				}
			};
		}
		return {
			ok: false as const,
			issues: [{ code: 'invalid_type', path: '(root)', message: 'a level {id, price} is required' }]
		};
	}
});

/** Update an existing level's price and/or label. */
export const levelUpdateInput = defineContract<{ id: string; price: number; note?: string }>({
	id: 'chart.level.update',
	revision: '1',
	expected: '{ id: string, price: finite number, note?: string }',
	parse: (input) => {
		const c = input as Record<string, unknown> | null;
		if (
			c !== null &&
			typeof c === 'object' &&
			typeof c.id === 'string' &&
			c.id.length > 0 &&
			typeof c.price === 'number' &&
			Number.isFinite(c.price)
		) {
			return {
				ok: true as const,
				value: {
					id: c.id,
					price: c.price,
					note: typeof c.note === 'string' ? c.note : undefined
				}
			};
		}
		return {
			ok: false as const,
			issues: [{ code: 'invalid_type', path: '(root)', message: 'a level {id, price} is required' }]
		};
	}
});

/** Delete one level by id. */
export const levelDeleteInput = defineContract<{ id: string }>({
	id: 'chart.level.delete',
	revision: '1',
	expected: '{ id: string }',
	parse: (input) => {
		const c = input as { id?: unknown } | null;
		if (c !== null && typeof c === 'object' && typeof c.id === 'string' && c.id.length > 0) {
			return { ok: true as const, value: { id: c.id } };
		}
		return {
			ok: false as const,
			issues: [{ code: 'invalid_type', path: '(root)', message: 'a level id is required' }]
		};
	}
});

/** Set the active workspace row. panelOpen is stored as 0/1 (number). */
export const workspaceSetInput = defineContract<{ symbol: string; timeframe: string; panelOpen: number }>({
	id: 'workspace.set',
	revision: '1',
	expected: '{ symbol: string, timeframe: string, panelOpen: 0|1 }',
	parse: (input) => {
		const c = input as Record<string, unknown> | null;
		if (
			c !== null &&
			typeof c === 'object' &&
			typeof c.symbol === 'string' &&
			typeof c.timeframe === 'string' &&
			(c.panelOpen === 0 || c.panelOpen === 1)
		) {
			return {
				ok: true as const,
				value: { symbol: c.symbol, timeframe: c.timeframe, panelOpen: c.panelOpen }
			};
		}
		return {
			ok: false as const,
			issues: [{ code: 'invalid_type', path: '(root)', message: 'workspace {symbol, timeframe, panelOpen} is required' }]
		};
	}
});

export const levelsResource = defineResource({
	schema: RESOURCE_DEFINITION_SCHEMA,
	id: 'levels',
	revision: '2',
	identity: { key: 'id' },
	fields: [
		{ name: 'id', type: 'string', required: true, label: 'Id' },
		{ name: 'price', type: 'number', required: true, label: 'Price' },
		{ name: 'note', type: 'string', required: false, label: 'Note' },
		{ name: 'symbol', type: 'string', required: false, label: 'Symbol' },
		{ name: 'createdAt', type: 'number', required: false, label: 'Created' }
	],
	queries: { list: { sort: ['price'], pagination: false } },
	mutations: [
		{
			op: 'create',
			effect: 'write',
			inputContractId: 'chart.level.save',
			idempotency: 'keyed',
			permissions: ['levels.write']
		},
		{
			op: 'update',
			effect: 'write',
			inputContractId: 'chart.level.update',
			idempotency: 'keyed',
			permissions: ['levels.write']
		},
		{
			op: 'delete',
			effect: 'write',
			inputContractId: 'chart.level.delete',
			permissions: ['levels.write']
		}
	],
	authorization: { effect: 'read' }
});

export const workspaceResource = defineResource({
	schema: RESOURCE_DEFINITION_SCHEMA,
	id: 'workspace',
	revision: '1',
	identity: { key: 'id' },
	fields: [
		{ name: 'id', type: 'string', required: true, label: 'Id' },
		{ name: 'symbol', type: 'string', required: true, label: 'Symbol' },
		{ name: 'timeframe', type: 'string', required: true, label: 'Timeframe' },
		{ name: 'panelOpen', type: 'number', required: true, label: 'PanelOpen' }
	],
	queries: { list: { sort: ['id'], pagination: false } },
	mutations: [
		{
			op: 'create',
			effect: 'write',
			inputContractId: 'workspace.set',
			idempotency: 'keyed',
			permissions: ['workspace.write']
		}
	],
	authorization: { effect: 'read' }
});

export const workspaceApplication = defineApplication({
	schema: APPLICATION_DEFINITION_SCHEMA,
	id: 'app.g1.workspace',
	revision: '1',
	name: 'VICT Trading Workspace',
	routes: [
		{
			id: 'home',
			path: '/',
			screenId: 's.chart',
			nav: { label: 'Chart', order: 1 }
		}
	],
	screens: [
		{
			id: 's.chart',
			title: 'Chart workspace (fixture data — not live market)',
			layout: [
				{
					name: 'header',
					surfaces: [
						{ role: 'text', id: 't.heading', content: 'VICT Trading Workspace — fixture data, gaps included' }
					]
				},
				{
					name: 'main',
					surfaces: [
						{
							role: 'component',
							id: 'sc.chart',
							componentId: 'cmp.chart.lwc',
							revision: '1',
							props: {
								levels: { view: 'v.levels' },
								workspace: { view: 'v.workspace' }
							}
						}
					]
				}
			],
			states: {
				loading: { role: 'text', id: 't.loading', content: 'Loading workspace…' },
				empty: { role: 'text', id: 't.empty', content: 'No drawings yet — click the chart to add a level.' },
				failure: { role: 'text', id: 't.failure', content: 'Something failed safely.' }
			}
		}
	],
	views: [
		{
			viewId: 'v.levels',
			resourceId: 'levels',
			resourceRevision: '2',
			fields: ['id', 'price', 'note', 'symbol', 'createdAt']
		},
		{
			viewId: 'v.workspace',
			resourceId: 'workspace',
			resourceRevision: '1',
			fields: ['id', 'symbol', 'timeframe', 'panelOpen']
		}
	],
	forms: [],
	actions: [
		{
			kind: 'mutation',
			id: 'act.level.save',
			revision: '1',
			resourceId: 'levels',
			resourceRevision: '2',
			op: 'create',
			inputContractId: 'chart.level.save'
		},
		{
			kind: 'mutation',
			id: 'act.level.update',
			revision: '1',
			resourceId: 'levels',
			resourceRevision: '2',
			op: 'update',
			inputContractId: 'chart.level.update'
		},
		{
			kind: 'mutation',
			id: 'act.level.delete',
			revision: '1',
			resourceId: 'levels',
			resourceRevision: '2',
			op: 'delete',
			inputContractId: 'chart.level.delete'
		},
		{
			kind: 'mutation',
			id: 'act.workspace.set',
			revision: '1',
			resourceId: 'workspace',
			resourceRevision: '1',
			op: 'create',
			inputContractId: 'workspace.set'
		}
	],
	resources: [
		{ resourceId: 'levels', revision: '2' },
		{ resourceId: 'workspace', revision: '1' }
	],
	components: [{ componentId: 'cmp.chart.lwc', revision: '1' }],
	compatibility: { applicationSchema: APPLICATION_DEFINITION_SCHEMA }
});

/** Compile the neutral definition into the immutable plan used by VitApp. */
export function compileWorkspacePlan(): ApplicationPlan {
	const result = compileApplication({
		application: workspaceApplication,
		resources: [levelsResource, workspaceResource],
		contracts: [
			{ id: 'chart.level.save', revision: '2' },
			{ id: 'chart.level.update', revision: '1' },
			{ id: 'chart.level.delete', revision: '1' },
			{ id: 'workspace.set', revision: '1' }
		],
		components: [{ componentId: 'cmp.chart.lwc', revision: '1' }]
	});
	if (!result.ok) {
		throw new Error('plan compilation failed: ' + JSON.stringify(result.issues ?? result));
	}
	return result.plan;
}
