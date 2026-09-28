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
 * The G0 spike application, described neutrally and compiled to an
 * immutable Application Plan. Two custom chart islands are registered by
 * the HOST through createComponentRegistry; the plan only declares their
 * identity (componentId/revision) and props (static scalars + the closed
 * `{ view: 'v.levels' }` source binding available at 0.4.0-rc.1).
 */

/** Save one horizontal level: { id, price, note } */
export const levelSaveInput = defineContract<{ id: string; price: number; note?: string }>({
	id: 'chart.level.save',
	revision: '1',
	expected: '{ id: string, price: finite number, note?: string }',
	parse: (input) => {
		const c = input as { id?: unknown; price?: unknown; note?: unknown } | null;
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
				value: { id: c.id, price: c.price, note: typeof c.note === 'string' ? c.note : undefined }
			};
		}
		return {
			ok: false as const,
			issues: [{ code: 'invalid_type', path: '(root)', message: 'a level {id, price} is required' }]
		};
	}
});

/** Delete one horizontal level by id. */
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

export const levelsResource = defineResource({
	schema: RESOURCE_DEFINITION_SCHEMA,
	id: 'levels',
	revision: '1',
	identity: { key: 'id' },
	fields: [
		{ name: 'id', type: 'string', required: true, label: 'Id' },
		{ name: 'price', type: 'number', required: true, label: 'Price' },
		{ name: 'note', type: 'string', required: false, label: 'Note' }
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
			op: 'delete',
			effect: 'write',
			inputContractId: 'chart.level.delete',
			permissions: ['levels.write']
		}
	],
	authorization: { effect: 'read' }
});

export const spikeApplication = defineApplication({
	schema: APPLICATION_DEFINITION_SCHEMA,
	id: 'app.g0.chart-spike',
	revision: '1',
	name: 'G0 Chart Spike',
	routes: [
		{
			id: 'home',
			path: '/',
			screenId: 's.chart',
			nav: { label: 'Spike', order: 1 }
		}
	],
	screens: [
		{
			id: 's.chart',
			title: 'G0 Chart Candidate Spike — XAUUSD 15m fixture',
			layout: [
				{
					name: 'header',
					surfaces: [
						{ role: 'text', id: 't.heading', content: 'G0 chart-candidate spike (fixture data only)' }
					]
				},
				{
					name: 'main',
					surfaces: [
						{
							role: 'component',
							id: 'sc.lwc',
							componentId: 'cmp.chart.lwc',
							revision: '1',
							props: {
								symbol: 'XAUUSD',
								timeframe: '15m',
								levels: { view: 'v.levels' }
							}
						},
						{
							role: 'component',
							id: 'sc.uplot',
							componentId: 'cmp.chart.uplot',
							revision: '1',
							props: {
								symbol: 'EURUSD (same fixture, offset)',
								timeframe: '15m',
								levels: { view: 'v.levels' }
							}
						}
					]
				}
			],
			states: {
				loading: { role: 'text', id: 't.loading', content: 'Loading…' },
				empty: { role: 'text', id: 't.empty', content: 'No levels yet.' },
				failure: { role: 'text', id: 't.failure', content: 'Something failed safely.' }
			}
		}
	],
	views: [
		{
			viewId: 'v.levels',
			resourceId: 'levels',
			resourceRevision: '1',
			fields: ['id', 'price', 'note']
		}
	],
	forms: [],
	actions: [
		{
			kind: 'mutation',
			id: 'act.level.save',
			revision: '1',
			resourceId: 'levels',
			resourceRevision: '1',
			op: 'create',
			inputContractId: 'chart.level.save'
		},
		{
			kind: 'mutation',
			id: 'act.level.delete',
			revision: '1',
			resourceId: 'levels',
			resourceRevision: '1',
			op: 'delete',
			inputContractId: 'chart.level.delete'
		}
	],
	resources: [{ resourceId: 'levels', revision: '1' }],
	components: [
		{ componentId: 'cmp.chart.lwc', revision: '1' },
		{ componentId: 'cmp.chart.uplot', revision: '1' }
	],
	compatibility: { applicationSchema: APPLICATION_DEFINITION_SCHEMA }
});

/** Compile the neutral definition into the immutable plan used by VitApp. */
export function compileSpikePlan(): ApplicationPlan {
	const result = compileApplication({
		application: spikeApplication,
		resources: [levelsResource],
		contracts: [
			{ id: 'chart.level.save', revision: '1' },
			{ id: 'chart.level.delete', revision: '1' }
		],
		components: [
			{ componentId: 'cmp.chart.lwc', revision: '1' },
			{ componentId: 'cmp.chart.uplot', revision: '1' }
		]
	});
	if (!result.ok) {
		throw new Error('plan compilation failed: ' + JSON.stringify(result.issues ?? result));
	}
	return result.plan;
}
