import type { ReplayClock } from './clock.js';
/**
 * Data session — every public data query is CAPPED by the replay clock (R1)
 * with honest availability semantics (R2).
 *
 *  R1: `bars({ until, granularity })` serves a slice ending at
 *      min(until ?? +inf, clock.now()) and RECORDS {requestedUntil,
 *      servedUntil, capped} per query. There is no public API that can
 *      bypass the cap: `bars` is the only bar-returning method.
 *  R2: a base bar is available iff close ≤ now. An aggregated (HTF) bar is
 *      returned only when ALL its constituent base bars are available — no
 *      unfinished-bar preview, ever. Availability is computed ONLY from
 *      clock-visible information (the available prefix plus the clock
 *      itself): interior gaps that resume within the clock are reported as
 *      {status:'missing', from, to}; every later region is open-ended
 *      ({from, to: null}) with NO lookahead into the source beyond the
 *      available prefix — public outputs cannot change when post-clock
 *      source bars are added or removed. Gaps are NEVER bridged.
 *
 * The consumer supplies the source (base-granularity bars) and the
 * instrument/timeframe rules; the kit fetches nothing.
 */
import type {
	Bar,
	BarsSource,
	ClockRecord,
	Granularity,
	InstrumentRules,
	MissingInterval,
	QueryRecord,
} from './types.js';
import { TF_SECONDS } from './types.js';

export interface DataSessionConfig {
	clock: ReplayClock;
	source: BarsSource;
	rules: InstrumentRules;
}

export interface BarsResult {
	symbol: string;
	granularity: Granularity;
	bars: Bar[];
	requestedUntil: number | null;
	servedUntil: number;
	capped: boolean;
}

export interface DataSession {
	/** THE only bar-returning API. Capped, recorded. */
	bars(query: { until?: number | null; granularity?: Granularity }): BarsResult;
	/** clock passthrough for readouts (consumers must still query via bars) */
	clock(): ReplayClock;
	/** explicit unavailability intervals (R2) with close ≤ t */
	availabilityAt(t?: number): MissingInterval[];
	/** query records (R1 evidence channel) */
	queryRecords(): readonly QueryRecord[];
	/** clock operation records (future-guard evidence) */
	clockRecords(): readonly ClockRecord[];
	/** identity of this session */
	rules(): InstrumentRules;
}

export function createDataSession(config: DataSessionConfig): DataSession {
	const { clock, rules } = config;
	const base = config.source.bars;
	if (!Array.isArray(base) || base.length === 0) {
		throw new Error('createDataSession: source.bars must be a non-empty ascending array');
	}
	for (let i = 1; i < base.length; i++) {
		if (base[i].time <= base[i - 1].time) {
			throw new Error('createDataSession: source.bars must be strictly ascending by time');
		}
	}
	const baseSeconds = TF_SECONDS[rules.baseTimeframe];
	const queries: QueryRecord[] = [];
	let seq = 0;

	function assertGranularity(g: Granularity): void {
		if (!(g in TF_SECONDS)) throw new Error(`unknown granularity: ${String(g)}`);
		if (TF_SECONDS[g] < baseSeconds || TF_SECONDS[g] % baseSeconds !== 0) {
			throw new Error(`granularity ${g} is not a whole multiple of base ${rules.baseTimeframe}`);
		}
	}

	// ---- R2 availability ---------------------------------------------------
	// A base bar is available at t iff close ≤ t (close = time + barSeconds).
	function availableBase(t: number): Bar[] {
		const out: Bar[] = [];
		for (const b of base) {
			if (b.time + baseSeconds <= t) out.push(b);
			else break; // ascending: everything later is unavailable too
		}
		return out;
	}

	// Aggregate ONLY complete buckets whose every constituent is available
	// (R2: never an unfinished bar, never a partial-constituent preview).
	// A bucket missing some of its constituents (fixture gap) is reported as
	// data the caller can see is absent — it is NOT fabricated from partials.
	function aggregate(available: Bar[], g: Granularity): Bar[] {
		const factor = TF_SECONDS[g] / baseSeconds;
		if (factor === 1) return available;
		const bucketSeconds = TF_SECONDS[g];
		const sourceSlot = new Set(base.map((b) => b.time));
		const availableSlot = new Map<number, Bar>(available.map((b) => [b.time, b]));
		const out: Bar[] = [];
		const seenBucket = new Set<number>();
		for (const b of available) {
			const bucketStart = Math.floor(b.time / bucketSeconds) * bucketSeconds;
			if (seenBucket.has(bucketStart)) continue;
			seenBucket.add(bucketStart);
			// R2 (contested-case ruling, now normative): an aggregated bar is
			// returned ONLY when EVERY required constituent slot in the bucket
			// [bucketStart + k*baseSeconds, k = 0..factor-1] is present in the
			// SOURCE and available (close ≤ now). A bucket missing any slot —
			// because it is unfinished OR because the source has a gap there —
			// is NEVER returned and NEVER fabricated from partials; the interval
			// is named by availabilityAt() instead.
			let complete = true;
			const group: Bar[] = [];
			for (let k = 0; k < factor; k++) {
				const slot = bucketStart + k * baseSeconds;
				if (!sourceSlot.has(slot) || !availableSlot.has(slot)) {
					complete = false;
					break;
				}
				group.push(availableSlot.get(slot) as Bar);
			}
			if (!complete) continue;
			let open = group[0].open;
			let close = group[group.length - 1].close;
			let high = -Infinity;
			let low = Infinity;
			for (const b of group) {
				high = Math.max(high, b.high);
				low = Math.min(low, b.low);
			}
			out.push({ time: bucketStart, open, high, low, close });
		}
		return out;
	}

	return {
		bars({ until = null, granularity = rules.baseTimeframe }) {
			assertGranularity(granularity);
			seq += 1;
			const now = clock.now(); // hard-capped at horizon by the clock itself
			const requestedUntil = until;
			const servedUntil = Math.min(until ?? now, now);
			const capped = requestedUntil !== null && servedUntil < requestedUntil;
			const slice = availableBase(servedUntil);
			const out = aggregate(slice, granularity);
			queries.push({
				kind: 'bars',
				granularity,
				requestedUntil,
				servedUntil,
				capped,
				count: out.length,
				seq
			});
			return {
				symbol: rules.symbol,
				granularity,
				bars: out,
				requestedUntil,
				servedUntil,
				capped
			};
		},
		clock: () => clock,
		availabilityAt(t) {
			const at = Math.min(t ?? clock.now(), clock.now());
			const missing: MissingInterval[] = [];
			// Gaps are computed ONLY from clock-visible information (owner
			// correction-cycle-2 ruling, normative): the available prefix (close
			// ≤ `at`) plus the clock-visible bound `at` itself. A public replay
			// query must never reveal a FUTURE resumption instant, and must never
			// change when post-clock source bars change: interior gaps are
			// detected between consecutive AVAILABLE bars (both endpoints
			// clock-visible), `to` is a number only when the resumption bar's
			// close is already ≤ `at`, and a gap whose resumption is not yet
			// within the clock's availability is OPEN-ENDED (`to: null`). See the
			// availability-edge block below for the edge rule.
			const avail = availableBase(at);
			for (let i = 1; i < avail.length; i++) {
				const prev = avail[i - 1];
				const cur = avail[i];
				const gapFrom = prev.time + baseSeconds;
				if (cur.time > gapFrom) {
					missing.push({ status: 'missing', from: gapFrom, to: cur.time });
				}
			}
			// Availability edge (owner correction-cycle-2 ruling, normative):
			// availability is computed ONLY from clock-visible information — the
			// available prefix (close ≤ `at`) plus the clock-visible bound (`at`)
			// itself. Whenever the last available close precedes the clock, the
			// edge is reported as an open-ended interval {from: lastAvailableClose,
			// to: null}: from the clock's viewpoint there is no available data
			// known beyond it (whether that is a source gap or ordinary
			// not-yet-delivered future is honestly invisible). There is NO
			// lookahead into the source beyond `avail`, ever — no existence check
			// on post-clock source bars — so public outputs cannot change when
			// source bars after the clock are added, removed, or wholesale
			// deleted. When lastAvailableClose === `at` (availability is current
			// through the clock), NO edge entry is emitted: the not-yet-closed
			// next slot is undelivered future, honestly invisible.
			if (avail.length > 0) {
				const lastClose = avail[avail.length - 1].time + baseSeconds;
				if (lastClose < at) {
					missing.push({ status: 'missing', from: lastClose, to: null });
				}
			}
			return missing;
		},
		queryRecords: () => queries.slice(),
		clockRecords: () => clock.records(),
		rules: () => ({ ...rules })
	};
}
