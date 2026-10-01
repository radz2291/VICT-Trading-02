# RED NOTE — G3 CONTESTED CHECK, ROUND A: guest async work silently skipped under a `succeeded` run state

**Session:** fresh verifier, owner-contested re-check of carried finding **V-G3-4** (ordered by the owner).
**Tested tree:** HEAD `34effc356d2410ef24b61b575bf9330d9e1ade8c` — `git diff 8a33b00a9bd0c12f7c8a5fc8ebc78ff9e28bb6e6..HEAD -- packages host` is **EMPTY** (product code byte-identical to the pinned G3 candidate `8a33b00a9bd0c12f7c8a5fc8ebc78ff9e28bb6e6`; verified programmatically by every harness in this set and recorded in each results JSON as `productCodeByteIdenticalTo_8a33b00: true`). Nothing repaired; falsification only.

## What was attempted (all through the PUBLIC script+backtest path)

Kit imported exactly as the host does: name-resolved through `host/node_modules/@vict-trading/trading-kit` (workspace symlink → `packages/trading-kit` → `dist/index.js`, rebuilt from the verified sources via `tsc`; `dist/` is gitignored). Harnesses are my own; data is my own synthetic 15m series (48 bars from `1800000000`; 47 complete run bars — the 48th bar's close lies beyond `toTime`, R2 complete-bucket semantics). No accounts, no network, simulated-only intents.

| Probe | Harness | Result |
|---|---|---|
| A0 control — fully sync `onBar`, plot + order | `v18-async-red-a.mjs` | `CONTROL_OK`: plot 47/47 non-null, order filled at next bar open, `succeeded` — the harness demonstrably sees work that really executes |
| **A1 — `async onBar`: plot + order after `await Promise.resolve()`** | `v18-async-red-a.mjs` | **RED** (details below) |
| **A2 — `async onBar` with a never-settling await** (`await new Promise(function(){})`) | `v18-async-red-a.mjs` | **RED — NOT interrupted**: `succeeded`, error `null`, no `SCRIPT_INTERRUPTED` |
| **A3 — sync `onBar` RETURNING a promise** (`.then` emits plot + order) | `v18-async-red-a.mjs` | **RED**: `plots: {}`, 0 trades, `succeeded`, error `null` |
| A4 — guest async environment | `v18-async-red-a.mjs` | guest `typeof Promise` = `function`; `typeof queueMicrotask` = `undefined`; `typeof setTimeout` = `undefined` (surfaced via public signal names `env_*`) |
| Pending-job API probe | `v18-async-red-a.mjs` | public `ScriptRuntime` port surface = `["kind","version","run"]` — **no pending-job/pump API exists**; shipped `dist/sandbox/quickjs.js` contains **no `executePendingJobs`** |
| B0 control | `v18-async-red-b.mjs` | `CONTROL_OK` |
| **B1 — sync `onBar` schedules plot + order in `Promise.resolve().then(...)`** | `v18-async-red-b.mjs` | **RED** (details below) |
| **B2 — two-deep promise chain** (`.then(() => Promise.resolve().then(plot))`) | `v18-async-red-b.mjs` | **RED** |
| B3 — CONTRAST: `setTimeout` reference (thrown error) | `v18-async-red-b.mjs` | `CONTRAST_OK`: run `failed` with truthful `SCRIPT_ERROR: 'setTimeout' is not defined` — thrown errors ARE surfaced |
| **B4 — B1 pattern + host waits 250 ms after `runBacktest` resolves** | `v18-async-red-b.mjs` | **RED — still absent**: the scheduled jobs die with the per-run disposed runtime; waiting host-side changes nothing |
| **Committed artifact**: `kit-0.2.1.tgz` installed in a fresh consumer OUTSIDE the monorepo; Patterns A+B re-run | `v18-async-red-tgz.mjs` | **RED on both patterns**; sha256 `b7cec272…`, sha512 prefix `12851cb4…` == the lineage-recorded kit tarball; installed version 0.2.1 |

## Exact observed behavior (canonical rows)

- **A1** (identity `f9d92a47fa6019170bbc4a6a5726b925de258a080106780f93597da40ae407d3`): `status: "succeeded"`, `error: null`; `plots` contains ONLY `syncA` (47/47 — the pre-await slice ran); `asyncA` plot **absent**; the `MARKER` order **never emitted** (0 trades, netProfit 0 — the executed control order yields a trade and netProfit −1.92, proving the delta is the dropped work).
- **B1** (identity `4a7367ae1a35543d53ba942f5bc54284f63b5992fd5af358e5b54e6793c00901`): `status: "succeeded"`, `error: null`; `syncB` 47/47; `thenB` **absent**; 0 trades.
- **A2**: `status: "succeeded"`, no `SCRIPT_INTERRUPTED`, no error of any kind.
- **Every red probe**: two identical-input runs are **byte-identical** (`determinism_twoRunsIdentical: true` everywhere) — the omission itself is deterministic. Determinism (criterion 5) is NOT the violated property; **honesty is**.
- **No error, refusal, warning, or flag is surfaced through any public channel** — result fields, status, identity, and stored record are indistinguishable from a fully-executed run.

## Root cause (source-verified, `packages/trading-kit/src/sandbox/quickjs.ts` + `src/script.ts`)

1. `runBacktest` calls `runtime.run(req)` ONCE per run; the entire bar loop lives inside ONE guest `evalCode(DRIVER_SOURCE)`.
2. `DRIVER_SOURCE` calls `onBar(bar, api);` and **discards the return value** — an async `onBar` suspends at its first `await`; a `.then` callback is queued as a QuickJS pending job.
3. The adapter never calls `executePendingJobs` (absent from src and dist), and exposes **no API** by which a consumer could pump jobs (`run()` is the whole port surface). Pending jobs are destroyed with the runtime in `finally`.
4. Pass 3 succeeding ⇒ sandbox `{status:'completed'}` ⇒ backtest `status:'succeeded'` with fully-populated identity/plots/equity/stats.

## The accepted record's own claim is FALSE

`docs/evidence/G3/selection/a1-runtime/README.md` ("Contract decisions") states:

> "guest promises only settle when the host pumps the job queue — **the runner pumps between bars under the same deadline, so an `await` that never settles is interrupted truthfully**."

Falsified on every clause: nothing pumps (no code path executes guest jobs — and the claim's mechanism is impossible in this architecture, since the whole bar loop is a single guest `evalCode` with no host-side "between bars" moments); a never-settling await is NOT interrupted (A2: silent `succeeded`). Prior verifier rounds already recorded this ("README pump claim false", V-G3-4; "executePendingJobs still absent" in the round-3 carry list) — this check independently reproduces both facts at the tested tree and adds the committed-artifact reproduction.

## RULING (explicit, per the accepted criteria)

**Criterion 4** (G3 pass criterion 4 — sandbox boundary; "**supported syntax subset, limits, and error behavior documented with committed tests**"): **VIOLATED (truthfulness dimension).**
- The guest ACCEPTS async syntax (the compile gate passes — A1 executes partially), so async code is inside the experienced "supported" surface, yet its continuation semantics are silently truncated.
- The shipped kit README (packed in kit-0.2.1.tgz) contains **no script-contract / syntax-subset section at all** (no `onBar` mention — verified by grep). The ONLY written promise-semantics claim (a1 README, quoted above) is **false**.
- Error behavior is untruthful for this failure class: declared-but-skipped logic yields a clean `succeeded`. Contrast B3 proves the runtime IS capable of truthful failure classification — the scheduled-work class is simply never detected.
- No committed test exercises async/promise guest code (kit test suite: zero async/promise cases).

**Criterion 9** (honest run states — "running / succeeded / failed distinct"; EXPERIENCE.md "Honest states": "the user sees the actual limitation and can recover"): **VIOLATED.**
- A run whose user-written logic beyond the first await (or all `.then` work) never executed is labelled `succeeded`, with a complete-looking record (identity, plots, equity, stats). The state distinction succeeded/failed does not capture "partially executed, rest silently dropped".
- The user cannot see the limitation and cannot recover — there is no signal anywhere in the run record. This is exactly the "silent substitution" class the criterion and EXPERIENCE.md's honest-states principle prohibit: the executed strategy is silently substituted by the first synchronous slice of the one the user wrote.

**Not violated:** criterion 5 (two identical-input runs are byte-identical — omission included; identity is stable).

**Severity/judgment:** V-G3-4 was carried as minor/non-blocking with a documented disposition ("document the synchronous-only subset … or implement job pumping under the deadline"); neither disposition has happened at the tested tree. Whether the violation remains non-blocking is an owner call; this report records that the behavior is real, reproduces on the committed artifact, contradicts the accepted record's own wording, and violates criteria 4 and 9 as written.

## Reproduction

```bash
cd docs/evidence/G3/verifier
node v18-async-red-a.mjs     # Pattern A + control + never-settling await + env + pending-API probe
node v18-async-red-b.mjs     # Pattern B + control + thrown-error contrast + host-side-wait
node v18-async-red-tgz.mjs   # committed kit-0.2.1.tgz, consumer outside the monorepo
```

Results: `v18-async-red-a-results.json`, `v18-async-red-b-results.json`, `v18-async-red-tgz-results.json`.
