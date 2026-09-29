# G2 CORRECTION CYCLE 2 — BUILDER REPORT (owner-directed; FIX A + FIX B + FIX C)

- **Session:** implementation subagent (`worker`), G2 correction cycle 2, 2026-09-29
- **Baseline HEAD (verified clean at start):** `ac54cb3a7aee8fcbc3965bf793e671eef2e26dc1` (`git status` clean; `origin/main` up to date)
- **Authority:** owner instruction delivered by the orchestrator (correction cycle 2): FIX A future-free availability (clock-visible-only ruling), FIX B failed-write state consistency (transactional persisted ops), FIX C host refusal display incl. the F-RV-2 class. Normatives read fresh: `AGENTS.md`, accepted G2 handoff record (`docs/HANDOFF.md`), `docs/evidence/G2/verifier-report-G2-contested.md` (Cases 1–3) + `verifier-report-G2-remediation.md` (F-RV-1 rationale note, F-RV-2, wholesale-removal boundary probe), `docs/EVALUATION.md`, D-002/D-003.
- **Scope honored:** `packages/trading-kit/**`, `host/**`, new `docs/evidence/G2/` artifacts with `cc2-` prefix. **Prior evidence untouched** (no existing report edited). **No commits, no pushes, no publish, no G3.** No secrets/orders/accounts anywhere in artifacts.

---

## FIX A — FUTURE-FREE AVAILABILITY (clock-visible-only; supersedes the never-recorded edge decision)

**Change** (`packages/trading-kit/src/data.ts`, `src/types.ts`, `README.md`): the trailing open-ended entry is now emitted **purely from clock-visible information**, with the `nextSource` lookahead scan REMOVED:

- Interior gaps: unchanged — detected between consecutive AVAILABLE bars; `to` is a number only when the resumption bar's close is already ≤ the clock (both endpoints clock-visible).
- Availability edge: `{status:'missing', from: lastAvailableClose, to: null}` emitted **whenever `lastAvailableClose < now`** — NO lookahead into the base source beyond the available prefix, ever; no existence check on post-clock source bars. Public outputs therefore cannot change when post-clock source bars are added, removed, or **wholesale deleted** (the exact boundary probe the remediation verifier recorded as the prior semantics' single residual sensitivity).
- **`lastAvailableClose === now` → NO trailing entry**: availability is current through the clock; the not-yet-closed next slot is undelivered future, honestly invisible.
- `bars()` unchanged — already prefix-based (`availableBase(servedUntil)`).

**Proof (owner's exact discriminating test — `cc2-fixA.mjs`, results `cc2-fixA-results.json`; kit from the fresh pack sha256 `4316c068…`, consumer `C:/Users/RZ1/Desktop/RZ/cc2-consumer`, `npm ls`: kit only):**

Two sources with IDENTICAL bars available at each clock, built programmatically from the committed fixture (digest matches prior evidence `e6b0b749bc09f9a0…`): variant A = full committed fixture; variant B = post-clock remainder deleted (`bars` with close > clock removed). Compared at 8 clocks incl. **04:15Z (mid-gap), 04:14:30Z, one instant strictly > the last available close (horizon−15m+0.5s → 21:30:00.5Z), horizon**:

| clock | bars 15m/1h/4h identity | availabilityAt identity | queryRecords identity | clockRecords identity | max/SMA identity | availabilityAt == own clock-visible oracle |
|---|---|---|---|---|---|---|
| 04:15Z | ✓✓✓ | ✓ (both `[]` — availability current through clock, no edge entry) | ✓ | ✓ | ✓ | ✓ both |
| 04:14:30Z | ✓✓✓ | ✓ (both `{from:04:00Z close-boundary, to:null}`) | ✓ | ✓ | ✓ | ✓ both |
| 05:00Z, 06:00Z, 07:15Z | ✓✓✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2026-01-08T06:00Z | ✓✓✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| horizon | ✓✓✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 21:30:00.5Z (strictly > lastClose) | ✓✓✓ | ✓ (both gain trailing `{from:21:30Z, to:null}`) | ✓ | ✓ | ✓ | ✓ |

**All identities TRUE at every clock — including the wholesale-remainder-deleted variant that exposed the prior defect.** The engine's `availabilityAt` matches an independent clock-visible oracle both-directions at every clock.

**Potency (the compare is over a real future-existence difference — naive full-history calculations DIFFER):**

| quantity | full history (A) | prefix-at-horizon (B) | differs |
|---|---|---|---|
| naive max-high, whole source | **3112.5** | **2657.81** | yes |
| naive SMA20 of closes, whole source | **3107.25** | **2647.537** | yes |
| naive max-high at clock 06:00Z view | 3112.5 (full) | 2650.34 (prefix@06:00Z) | yes |
| naive SMA20 | 3107.25 (full) | 2646.9715 (prefix@06:00Z) | yes |
| bar count | 2023 | 1998 @horizon | 25 fewer |

**Prior mutation-sweep properties re-run under the NEW semantics (focused sweep, mutations applied ONLY to bars past the clock; mutations reaching the clock-visible region recorded not-applicable — 11 rows, with reason):** 9 applicable rows (remove resumption 04:30Z @04:15Z; add bar inside gap @04:15Z @04:15Z; remove 04:30Z+04:45Z @04:15Z; value-change of all close>clock bars @04:15Z/05:00Z/07:15Z/horizon; remove far-future 07:00Z+07:15Z @04:15Z/05:00Z) — **every public output (bars 15m/1h/4h, availabilityAt, queryRecords, max/SMA) identical in 9/9 rows; sweepAllOk = true.** Where the historical interior gap `{04:15Z → 04:30Z}` is clock-visible (e.g. value-mutation and far-future-removal rows at 05:00Z/07:15Z/horizon), it **is still reported** (`{from: 1767586500, to: 1767587400}`) — interior-gap reporting preserved. At 04:15Z, per the new normative semantics, availability is current through the clock: the previously-reported open-ended trailing entry at that instant is GONE (this is the owner's intended semantic change, not a regression).

## FIX B — FAILED-WRITE STATE CONSISTENCY (transactional persisted operations)

**Change** (`packages/trading-kit/src/session.ts`, `src/clock.ts`, `src/types.ts`, `README.md`, index export `ClockSnapshot`): every persisted operation now commits only AFTER a successful port write:

- New `ReplayClock.snapshot()` / `restoreSnapshot()` (committed instant + operation-log length) — a non-mutating preview/restore primitive.
- Order in EVERY persisted op (start, step, play, pause, restore, reset, returnToCurrent, createLevel, removeLevel): **gate → re-verify (read) → compute next state → persist(NEXT-state record) → commit live state → emit.** Emitted events reflect COMMITTED state only.
- On `write()` resolving `{ok:false}` → `ok:false, code:'WRITE_REFUSED'` (port's own code + message embedded, truthful); on `throw` → `code:'PORT_ERROR'`; in BOTH cases live state (clock instant incl. truncated operation log, step index, drawings, playing, returnedToCurrent) is **identical before and after** and no bytes change. A subsequent healthy write simply works (recovery).
- `restore()`: the restored record is **written FIRST**; live state adopts it only on success (write-commit transactional). Read failure still refuses `READ_FAILED` before any state change.
- `reset()`: the record REMOVAL is transactional — a throwing `remove()` refuses with `PORT_ERROR`, live state does NOT change (session stays active at prior position, bytes untouched). Note recorded honestly: the `remove()` port contract returns `Promise<void>` — it has NO `ok:false` value channel, so the only removal failure shape is a throw (the `{ok:false}`-remove cell is not-applicable by contract).
- Consumer example: host example now models failing writes (`README` + `host/src/lib/replay.svelte.ts` rendering `WRITE_REFUSED`/`PORT_ERROR` with truthful wording).

**Proof (kit consumer, `cc2-fixB.mjs` → `cc2-fixB-results.json`; healthy session pre-built by REAL successful writes, then port flipped to failing):**

| op | `{ok:false}` write | `throw` write | refused | state-before==after (instant/step/levels/playing/returned/current + clock-log length) | bytes before==after | truthful code |
|---|---|---|---|---|---|---|
| start | PASS | PASS | ✓ | ✓ | ✓ | WRITE_REFUSED / PORT_ERROR |
| step | PASS | PASS | ✓ | ✓ | ✓ | ✓ |
| createLevel (drawing create) | PASS | PASS | ✓ | ✓ | ✓ | ✓ |
| removeLevel (drawing remove) | PASS | PASS | ✓ | ✓ | ✓ | ✓ |
| play | PASS | PASS | ✓ | ✓ | ✓ | ✓ |
| pause | PASS | PASS | ✓ | ✓ | ✓ | ✓ |
| returnToCurrent | PASS | PASS | ✓ | ✓ | ✓ | ✓ |
| restore (transactional write-commit) | PASS | PASS | ✓ | ✓ (fresh live session did NOT adopt the record) | ✓ | ✓ |
| reset() — removal failure | not-applicable (remove contract has no ok:false value; recorded in results JSON) | PASS (PORT_ERROR, state+bytes unchanged) | ✓ | ✓ | ✓ | ✓ |

**17 rows, allPass = true.** **Recovery + reload:** after healing the port: ghost level (`'ghost'` created during failing phase) **absent** from the record; real post-heal level present; step of a fresh session adopting the stored bytes matches exactly (`reloadExact: true`) — reload state = last SUCCESSFUL write only; no phantom step/drawing from failed ops.

## FIX C — HOST display accuracy in failure paths

**Change** (`host/src/routes/+page.svelte`, `host/src/lib/replay.svelte.ts`):

- The replay-status surface (`data-testid="replay-status"`, `role="alert"`) is now ALSO rendered while replay is **NOT active** (`!replay.active && replay.statusFailed`) — refused Restore/Start/Reset in the corrupt-at-start / never-acknowledged CURRENT-mode state (the F-RV-2 class) now produce a visible truthful explanation (F-RV-2 fix).
- `refused()` maps the new kit codes truthfully: `WRITE_REFUSED` → "…failed: storage write refused — session state unchanged (nothing was advanced or overwritten)"; `PORT_ERROR` → "…failed: storage write could not be completed — no state change"; READ paths unchanged.

**BROWSER VERIFICATION STATUS: UNVERIFIED (explicitly not claimed).** Two live-browser attempts in this cycle ended in runner-level hangs (a CDP step on port 5301 hard-hung ~55 min in a prior run; a follow-up run flooded stderr). One final strictly-bounded attempt (fresh temp-profile Chrome on port 9345, 15 s/step cap, 75 s hard cap — `cc2-browser-run.mjs`, log `cc2-browser-run.log`, results `cc2-browser-results.json`) loaded the app but its workspace hydration did not complete in that fresh headless profile ("Loading workspace…" persisted; panel never mounted), so NO browser interaction evidence was captured this cycle. Artifacts kept honestly: `cc2-01-current-smoke.png` shows the topbar (ready pill, CURRENT banner) with hydration incomplete — **it is NOT smoke-pass evidence**; `cc2-02-UNUSABLE-hydration-incomplete.png` renamed accordingly. The refusal-path rendering of FIX C is verified only at the code/`svelte-check` level; the interactive F-RV-2 screenshot and in-browser failed-write walkthrough remain UNVERIFIED and need a fresh verifier run (prior sessions' CDP-environment pattern, as the remediation verifier used successfully).

## Packaging + regression

- Fresh `tsc` build of the kit + `npm pack` → **sha256 `4316c06860fc84c11f30cde7df0ed7d73840d3669d99120243eac06aace9474b`**, written to BOTH committed tarball copies (`packages/trading-kit/` and `docs/evidence/G2/consumer/`, hashes verified equal). NOT published.
- Fresh external consumer `C:/Users/RZ1/Desktop/RZ/cc2-consumer` installs from the fresh tarball (`cc2-consumer-npm-ls.txt`: only `@vict-trading/trading-kit@0.1.0`); all kit-level harnesses above run against that fresh install. **Failing-write + healthy-port consumer behavior covered by cc2-fixB (kit consumer level). A fresh consumer rerun with in-browser failing-write ports was NOT completed** (browser route aborted — see FIX C status).
- `host`: `npm run check` → **0 errors / 1 warning** (pre-existing baseline `state_referenced_locally`, ChartIslandLWC); `npm run build` → **PASS** (twice, before and after the kit tarball refresh). Kit `tsc` clean (re-verified at revival: `tsc --noEmit` OK).
- Prior G1-PKG behaviors: **not re-run in-browser this cycle** (browser aborted). Code-level review shows no interference (kit changes are internal to session.ts/data.ts/clock.ts; host changes touch only replay status rendering). The W1/replay smoke therefore remains as verified in the prior remediation report and is UNVERIFIED for this candidate.

## Records honesty (required section)

1. **D-004 was never recorded in `docs/DECISIONS.md`.** Commit `f23b886` ("docs: D-004 — kit availability-edge open-ended semantics recorded") contains ONLY verifier evidence files; `grep -l "D-004" docs/DECISIONS.md` → no match; DECISIONS.md ends at D-003. The commit's MESSAGE claims a decision record that its content does not contain. Not fixed here (DECISIONS.md edits are not in this cycle's scope) — flagged for the orchestrator.
2. **The new availability semantics is an owner ruling from THIS cycle** (clock-visible-only; trailing entry whenever `lastAvailableClose < now`; nothing when `lastAvailableClose === now`; NO lookahead ever — wholesale post-clock deletion also identity-preserving). It supersedes the previously-implemented edge semantics ("trailing entry whenever further source bars exist" — never recorded as a decision) which the remediation verifier had accepted-with-recommendation (F-RV-1 rationale note). The orchestrator is to record this ruling from the owner's instruction; this report only documents the implementation and proof.
3. Unverified facts are labeled as such inline; nothing in this report is a verdict — a fresh verifier against the final candidate SHA is still required (builder never self-certifies).

## Unverified / open items

- Browser refusal-rendering screenshots (incl. F-RV-2 current-mode surface) — UNVERIFIED this cycle (route aborted; see FIX C).
- In-browser failed-write table × ops × ports `{ok:false}`/`{throw}` with reload — kit-consumer level complete; in-browser level UNVERIFIED.
- Fresh external consumer with in-browser failing-write port + healthy port rerun — kit level done; in-browser UNVERIFIED.
- W1 + replay in-browser smoke on THIS candidate — UNVERIFIED (prior remediation-run versions remain valid evidence for their own SHA only).
- Console-clean check on this candidate's build in a real browser — UNVERIFIED (the bounded run captured one pre-existing-image 404 + nothing else before abort; not representative — treated as unverified).

## Open risks

1. The `lastAvailableClose === now` boundary (no trailing entry) is new public behavior; the host gapnote will show nothing "still missing" at exactly-that clocks even when a gap resumes just after — intended per the owner ruling, but the verifier should assert both directions of the boundary explicitly (04:15Z → `[]`; 04:15:01Z → trailing).
2. `restore()` now persists the (possibly consumer-modified) record back verbatim before adopting it — if a consumer hand-edits storage between read and restore, the edited record is what gets confirmed. Same read-record-echo as before the fix, now transactional; not judged a leak.
3. Host hydration failed in the fresh headless profile this cycle — almost certainly environmental (headless/`--headless=new` + temp profile), but it is unexplained; a verifier browser run should confirm hydration normally before dismissing.

## Artifact inventory (all `cc2-` prefix, new; no prior artifact edited)

- Kit-level: `cc2-fixA-results.json`, `cc2-fixA.mjs`, `cc2-fixB-results.json`, `cc2-fixB.mjs`, `cc2-consumer-npm-ls.txt`, `cc2-consumer-package-lock.json`, `fixture.json` (copy of the committed host fixture for reproduction), `cc2-01-current-smoke.png` (page-load only — see caption above), `cc2-02-UNUSABLE-hydration-incomplete.png`, `cc2-browser-run.mjs`, `cc2-browser-run.log`, `cc2-browser-results.json`, `cc2-console-final.json` (partial), `cc2-cdp.mjs` (driver from earlier attempt; unused in final evidence), updated tarball copies ×2.
- Changed product files: `packages/trading-kit/src/{data,session,clock,types,index}.ts`, `packages/trading-kit/README.md`, `host/src/lib/replay.svelte.ts`, `host/src/routes/+page.svelte`.