/**
 * Headless drawing-workspace behavior: create / select / edit / move /
 * remove / undo / redo for horizontal price levels, over a consumer-supplied
 * WorkspacePersistence port.
 *
 * Design constraints (G1-PKG):
 *  - The package NEVER touches storage. All reads arrive via
 *    `setSource(levels)` (consumer-fed, e.g. from its own views) and all
 *    writes go through the port. The package owns no storage keys.
 *  - READ-GATE invariant: the consumer must not feed mutations after a
 *    failed read; when the port's `readLevels` throws, the consumer's
 *    adapter is expected to refuse writes. Additionally every port op that
 *    returns ok:false makes the failed undo/redo step re-push (stay honest).
 *  - Undo/redo is a symmetric stack of prebuilt {undo, redo} op pairs; an
 *    undo across an instrument switch restores the level on its ORIGINAL
 *    instrument (symbol/createdAt ride in the save op).
 */
import type { PersistenceOp, PortResult, PriceLevel, WorkspacePersistence } from './types.js';
import { validateCreateInput, validateUpdateInput } from './validate.js';

export interface CreateLevelInput {
	id?: string;
	price: number;
	note?: string;
	symbol?: string;
	createdAt?: number;
}

export interface WorkspaceOptions {
	/** id generator (defaults to 'lvl-' + random base36); injectable for tests */
	genId?: () => string;
	/** wall-clock seconds for createdAt defaults; injectable for tests */
	nowSeconds?: () => number;
	/** default note attached to created levels when none given */
	defaultNote?: string;
}

/** One prebuilt, replayable op pair — the unit of the undo/redo stacks. */
interface ActionPair {
	undo: PersistenceOp;
	redo: PersistenceOp;
}

export interface MutationResult {
	ok: boolean;
	code?: string;
	message?: string;
	/** the id most affected by the operation (created / edited / removed) */
	id?: string;
}

export class DrawingWorkspace {
	private readonly port: WorkspacePersistence;
	private readonly genId: () => string;
	private readonly nowSeconds: () => number;
	private readonly defaultNote: string;

	private source: PriceLevel[] = [];
	private symbol: string | undefined = undefined;
	private selected: string | null = null;
	private readonly undoStack: ActionPair[] = [];
	private readonly redoStack: ActionPair[] = [];
	private listeners: Array<() => void> = [];

	constructor(port: WorkspacePersistence, opts: WorkspaceOptions = {}) {
		this.port = port;
		this.genId = opts.genId ?? (() => 'lvl-' + Math.random().toString(36).slice(2, 10));
		this.nowSeconds = opts.nowSeconds ?? (() => Math.floor(Date.now() / 1000));
		this.defaultNote = opts.defaultNote ?? 'level';
	}

	// ---- consumer-fed state ---------------------------------------------

	/**
	 * Feed the current persisted collection (and active instrument) from the
	 * consumer's own read path. The workspace re-reads this on every
	 * operation, so it always acts on consumer-owned truth.
	 */
	setSource(levels: PriceLevel[], symbol?: string): void {
		this.source = levels;
		this.symbol = symbol;
	}

	/** Levels for the active instrument (or all when no symbol), oldest first. */
	levels(): PriceLevel[] {
		return this.source
			.filter((l) => !this.symbol || !l.symbol || l.symbol === this.symbol)
			.slice()
			.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
	}

	get selectedId(): string | null {
		return this.selected;
	}

	get canUndo(): boolean {
		return this.undoStack.length > 0;
	}

	get canRedo(): boolean {
		return this.redoStack.length > 0;
	}

	// ---- change notification (framework-agnostic) ------------------------

	subscribe(fn: () => void): () => void {
		this.listeners.push(fn);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== fn);
		};
	}

	private notify(): void {
		for (const fn of this.listeners) fn();
	}

	// ---- operations -------------------------------------------------------

	select(id: string | null): void {
		this.selected = id;
		this.notify();
	}

	async create(input: CreateLevelInput): Promise<MutationResult> {
		const candidate: Required<Pick<CreateLevelInput, 'id'>> & CreateLevelInput = {
			id: input.id ?? this.genId(),
			price: input.price,
			note: input.note ?? this.defaultNote,
			symbol: input.symbol ?? this.symbol,
			createdAt: input.createdAt ?? this.nowSeconds()
		};
		const err = validateCreateInput(candidate);
		if (err) return { ok: false, code: 'INVALID_INPUT', message: err, id: candidate.id };
		const snapshot: PriceLevel = { ...candidate };
		const r = await this.apply({ type: 'save', level: snapshot });
		if (!r.ok) return { ok: false, code: r.code, message: r.message, id: candidate.id };
		this.undoStack.push({
			undo: { type: 'delete', id: candidate.id },
			redo: { type: 'save', level: snapshot }
		});
		this.redoStack.length = 0;
		this.selected = candidate.id;
		this.notify();
		return { ok: true, id: candidate.id };
	}

	async move(id: string, price: number): Promise<MutationResult> {
		const cur = this.source.find((l) => l.id === id);
		if (!cur) return { ok: false, code: 'NOT_FOUND', message: 'no level ' + id, id };
		return this.edit(id, { price, note: cur.note });
	}

	async edit(id: string, patch: { price: number; note?: string }): Promise<MutationResult> {
		const cur = this.source.find((l) => l.id === id);
		if (!cur) return { ok: false, code: 'NOT_FOUND', message: 'no level ' + id, id };
		const before = { price: cur.price, note: cur.note };
		const after = { price: patch.price, note: patch.note };
		if (after.price === before.price && after.note === before.note) return { ok: true, id };
		const err = validateUpdateInput({ id, price: patch.price, note: patch.note });
		if (err) return { ok: false, code: 'INVALID_INPUT', message: err, id };
		const r = await this.apply({ type: 'update', id, price: patch.price, note: patch.note });
		if (!r.ok) return { ok: false, code: r.code, message: r.message, id };
		this.undoStack.push({
			undo: { type: 'update', id, price: before.price, note: before.note },
			redo: { type: 'update', id, price: after.price, note: after.note }
		});
		this.redoStack.length = 0;
		this.notify();
		return { ok: true, id };
	}

	async remove(id: string): Promise<MutationResult> {
		const cur = this.source.find((l) => l.id === id);
		if (!cur) return { ok: false, code: 'NOT_FOUND', message: 'no level ' + id, id };
		const snapshot: PriceLevel = { ...cur };
		const r = await this.apply({ type: 'delete', id });
		if (!r.ok) return { ok: false, code: r.code, message: r.message, id };
		this.undoStack.push({
			undo: { type: 'save', level: snapshot },
			redo: { type: 'delete', id }
		});
		this.redoStack.length = 0;
		if (this.selected === id) this.selected = null;
		this.notify();
		return { ok: true, id };
	}

	async undo(): Promise<MutationResult> {
		const op = this.undoStack.pop();
		if (!op) return { ok: false, code: 'EMPTY_STACK', message: 'nothing to undo' };
		const r = await this.apply(op.undo);
		if (!r.ok) {
			this.undoStack.push(op); // failed undo: put it back, stay honest
			this.notify();
			return { ok: false, code: r.code, message: r.message };
		}
		this.redoStack.push(op);
		this.notify();
		return r;
	}

	async redo(): Promise<MutationResult> {
		const op = this.redoStack.pop();
		if (!op) return { ok: false, code: 'EMPTY_STACK', message: 'nothing to redo' };
		const r = await this.apply(op.redo);
		if (!r.ok) {
			this.redoStack.push(op);
			this.notify();
			return { ok: false, code: r.code, message: r.message };
		}
		this.undoStack.push(op);
		this.notify();
		return r;
	}

	private async apply(op: PersistenceOp): Promise<PortResult> {
		try {
			return await this.port.apply(op);
		} catch (e) {
			return { ok: false, code: 'PORT_ERROR', message: e instanceof Error ? e.message : 'port error' };
		}
	}
}
