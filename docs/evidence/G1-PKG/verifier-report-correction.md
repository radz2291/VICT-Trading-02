# G1-PKG — fresh verifier report: owner-directed correction (independent)

**Verifier session (fresh, adversarial, independent of the correcting builder).**
Tested SHA: **`f148fff3530155237add2fd5e53e230835275165`** — HEAD of a clean tree, branch `main` (verified locally via `git log -1 --format=%H`; nothing pushed by this verifier).
Baseline for correction diff: `964038bd036b2fe11bc09e1022729e6612a70e1b`.
Builder claim source (unproven at test time): `docs/evidence/G1-PKG/correction-report.md` (builder report, not a verdict).
Environment: Node v22.13.1, npm 11.19.1, Chrome 153 (CDP-driven live browser), Windows. This verifier performed **zero repairs**; the only working-tree artifacts produced are the new untracked evidence files listed at the end (intended checker output, not committed).

Method: every check below was re-executed by this session from the pinned SHA — a fresh `npm pack`, a fresh consumer outside the repo I wrote myself, and a live-browser host walkthrough on my own freshly built preview. Builder screenshots were treated as claims, not evidence.

---

## Check 1 — Note preservation + explicit clear through a FRESH pack and consumer

**My own pack (not the builder's artifact):**

- `npm run build` in `packages/chart-workspace`: PASS, no type errors. `dist/` = 57,995 bytes, 20 files.
- `npm pack --pack-destination %TEMP%\vx-consumer` → `vict-trading-chart-workspace-0.1.0.tgz` (17,807 bytes).
- **sha512 of MY artifact: `a5eb14b5865c6405902138bf977a343c35899a80a725c573b8db75acd268546934b15ff357d08e745b60b7b10016970471979fd353e5c87fdaf1c10879163047`** — **exactly matches** the digest the builder recorded in `correction-report.md` (…16970471979fd353e5c87fdaf1c10879163047). No substitution between builder artifact and committed source tree.
- Installed-dep identity check: `node_modules/@vict-trading/chart-workspace` = 0.1.0 from the tgz; per-file sha256 of installed `dist/{index,lwc,types,validate,workspace}.js` all **byte-identical** to the repo-built `dist/` (no silent substitution in the tarball vs tree).

**Fresh consumer (I authored it):** `C:\Users\RZ1\AppData\Local\Temp\vx-consumer` — own `package.json` (`file:./vict-trading-chart-workspace-0.1.0.tgz`), own vite dev server (:5310), OWN 300-bar OHLC data, OWN storage adapter with OWN key `vx-fresh-consumer.levels.v1` including an adapter read-gate + write-verify. Entry asserts **`data-testid="chart-island"` first**: verified `true` before any other check, 7 canvases rendered from my data (screenshot `cv-read-failed-unavailable.png` peer and `cv-full-reload-persisted.png` show the working island). Consumer imports only the package public exports.

Walkthrough (all through `DrawingWorkspace` public API, results in `cv-*.json`, screenshots with `cv-` prefix):

| Step | Result |
| --- | --- |
| (a) create `{price:2700.5, note:'resistance'}` → price-only edit `{price:2702.25}` (note **absent**) | note **`"resistance"` preserved** in workspace state AND in the consumer's own stored bytes; price 2702.25 |
| (b) undo | price restored to **2700.5**, note **still `"resistance"`** in state and bytes |
| (c) explicit clear `{price:2703.75, note:''}` | stored bytes show **`"note":""`** (empty string, not omitted); undo after clear → **note `"resistance"` AND prior price 2700.5 restored** |
| (d) set `{price:2703.75, note:'vx-new-note'}` | note set in state and stored bytes |
| Extra: price-only edit → undo → redo | price-only edit **preserves**; undo restores pre-edit price; **redo carries the effective post-edit note** (2800 + `vx-new-note`) |
| Full page reload | all three levels re-read from the consumer's stored bytes (`cv-full-reload-persisted.png`); console clean |

Evidence: `cv-read-failed-unavailable.png`, `cv-note-set-and-clear-state.png`, `cv-read-failure-all-refused.png`, `cv-recovery-write-allowed.png`, `cv-full-reload-persisted.png`, `cv-read-failure-attempts.json`, `cv-adapter-refusal.json`, `cv-recovery-write-works.json`, `cv-redo-carries-effective-note.json`, screenshots in this dir.
(Note: builder's own screenshots c1–c9 remain in `correction-shots/`; not relied upon.)

**VERDICT PASS.**

## Check 2 — Read-failure + intrinsic read-acknowledgment gate through the fresh consumer

Fresh reload of my consumer with an **induced read failure in MY adapter** (`vx-fresh-consumer.fail=1`; my `readLevels()` throws before `acknowledgeRead` is ever reached):

- Boot state: `readOk=false`, workspace never acknowledged. Zero false success states anywhere.
- All six mutation paths attempted — create / edit / move / remove / undo / redo — **every one refused** with `ok:false, code:"READ_NOT_ACKNOWLEDGED"` (the workspace order governs; the intrinsic gate fires first, as documented) — `cv-read-failure-attempts.json`, screenshot `cv-read-failure-all-refused.png`.
- The ADAPTER-level duty additionally demonstrated directly: `VX.adapter.apply({type:'save',…})` in failure mode → `ok:false, code:"STORAGE_READ_FAILED"` — `cv-adapter-refusal.json`.
- **Byte-diff:** stored bytes captured before attempts and after all attempts are **byte-identical** (verified as strings exported from the page and compared in Node; `cv-bytes-…`-style pre/post dumps kept in this dir) — no blind write happened.
- Recovery: fail flag cleared → my consumer performed a successful read → `acknowledgeRead` → the next create **succeeded** and the stored bytes gained the new level — `cv-recovery-write-works.json`, screenshot `cv-recovery-write-allowed.png`.
- Negative probe of the contract wording: `acknowledgeRead` trusts its caller (it unconditionally opens the gate); the true byte protection remains the adapter gate, which the package types/README document precisely as a two-layer responsibility split. No defect against the claimed behavior; recorded as an observation (see findings).

**VERDICT PASS.**

## Check 3 — Host recheck (fresh integrated SHA)

- `npm run check` (host): **0 errors / 1 warning** (baseline warning, pre-existing — matches claim).
- `npm run build`: PASS. Served **my own fresh build with adapter-node on :5198** (not the builder's earlier server). `data-testid="chart-island"` present, 7 canvases.
- Corrupt-key smoke (real CDP mouse click on `+ Level`): `g1.levels.v1='{corrupt'` → create **refused** (`failed: storage` pill; island status `failed: STORAGE_READ_FAILED`), **bytes survived exactly** (`{corrupt` still stored) — `cv-host-corrupt-write-refused-bytes-survive.png`.
- Recovery: restored bytes → `+ Level` → create **succeeded**, stored bytes written, pill **`saved`** (F-N1 recovery) — `cv-host-recovery-pill-saved.png`. F-A invariant intact and the acknowledgeRead integration did not weaken the adapter-side gate (host port keeps `gateLevelsRead`/`writeLevelsVerified`; reads are fed via `acknowledgeRead` in the view-feed effect).
- Note semantics through the **app's label-edit path** (real field interaction via select + insertText + change): typing `host-note-x` → stored `note:"host-note-x"` (`cv-host-note-set-via-label.png`); emptied field submitted → stored `note:""` (explicit clear, `cv-host-note-cleared-and-undo-restored.png`); **undo button → note and price restored**; console clean.
- Reload persistence: level re-read from storage after full reload — `cv-host-reload-persisted.png`.

**VERDICT PASS.**

## Check 4 — Docs / claims audit

- `AGENTS.md` §6: stale B0 snapshot replaced by an honest dated snapshot (G0+G1+G1-PKG complete, latest verdict PASS WITH NON-BLOCKING FINDINGS, G2 NOT authorized, package NOT published, artifact-path install only; `STATE.md` wins). PASS.
- `packages/chart-workspace/README.md`: install section states NOT published / artifact-path-only (twice, and in the License section); API example documents the three note cases, `acknowledgeRead`, and the pre-acknowledgment `READ_NOT_ACKNOWLEDGED` refusal — consistent with `src/types.ts` (`WorkspacePersistence` two-layer doc; `readLevels` now optional and documented as never called by the package). Repo-wide grep found **no doc claiming npm availability or registry install of `@vict-trading/chart-workspace`** (the former `npm install @vict-trading/chart-workspace` line was replaced by artifact install). PASS.
- `docs/HANDOFF.md` + `docs/STATE.md`: "Correction in progress" lines appended; **no verdict rewritten**; both note the final gate-record update belongs to verifier + orchestrator. Honest.
- Minor staleness (non-blocking, for the orchestrator to refresh): STATE/AGENTS say "tree uncommitted" / `HEAD 964038b…` at correction time — now committed at `f148fff…`; see ruling below.

**VERDICT PASS** (with the staleness note routed to the STATE/HANDOFF refresh).

## Check 5 — Scope audit `git diff 964038b..f148fff --stat`

Exactly: `packages/chart-workspace/{src/{workspace,types,validate}.ts, README.md}`, `host/src/lib/island-state.svelte.ts`, `AGENTS.md`, `docs/HANDOFF.md`, `docs/STATE.md`, `docs/evidence/G1-PKG/**` (correction report + correction-shots), `docs/TRADING-KIT-BOUNDARY-PROPOSAL.md` (separate docs commit `00bc502` — design proposal explicitly declared out of gate scope, part of lineage only). No forbidden paths (no VICT edits, no G2/replay code, no package publishing mechanics). **VERDICT PASS.**

## Check 6 — No regressions

- Package `npm run build` clean; `dist/` grew 49 KB → ~57 KB (gate + note logic; delta explainable by the diff, no red flags).
- App smoke (quick): create via UI (refused when gated, succeeding after recovery), label edit set/clear, undo, redo-equivalent paths, full reload persistence — all normal (evidence above); console clean on both consumer and host.

**VERDICT PASS.**

---

## Findings

| # | Severity | Finding | User effect |
| --- | --- | --- | --- |
| N-1 | non-blocking | `acknowledgeRead` opens the gate unconditionally and trusts its caller; if a consumer acknowledges data it never actually read, the intrinsic layer grants no protection (the adapter byte-gate still governs, as documented). Contract wording already places the duty on the consumer; consider an example warning sentence, no code change requested. | None under the documented contract; only possible under consumer misuse. |
| N-2 | non-blocking (doc refresh) | `docs/STATE.md` / `docs/HANDOFF.md` carry "correction in progress / tree uncommitted / baseline `964038b…`" — now stale: the correction is committed at `f148fff…` and verified. Ruling + exact wording below. | No user effect; record freshness only. |
| N-3 | non-blocking | Undo/redo stacks are in-memory only (consumer page reloads reset them; host state persists via workspace snapshot outside this check's scope) — expected from the documented design, noted to prevent future misreading of consumer evidence. | None. |

## Verdicts — summary

| Check | Verdict |
| --- | --- |
| 1. Fresh pack (sha512 match) + fresh consumer note semantics a–d | **PASS** (all four cases + redo-op case demonstrated) |
| 2. Read-failure + intrinsic gate + adapter refusal + byte safety + recovery | **PASS** |
| 3. Host recheck (F-A + F-N1 + label-edit note semantics + check/build) | **PASS** |
| 4. Docs/claims agreement | **PASS** (+N-2 doc refresh) |
| 5. Scope audit of `964038b..f148fff` | **PASS** |
| 6. No regressions (build sizes, app smoke) | **PASS** |

## GATE RECORD RULING (requested)

The correction was **verified as claimed at `f148fff3530155237add2fd5e53e230835275165`** by fresh, independent evidence (own pack with digest match, self-authored external consumer, live-browser host walkthrough). Nothing attempted here falsified the owner-directed correction; only non-blocking doc-freshness findings surfaced. The existing G1-PKG gate verdict **"PASS WITH NON-BLOCKING FINDINGS still reflects the evidence"** — it does **not** need re-scoring, only a record refresh.

**Exact wording to apply in STATE/HANDOFF (orchestrator applies, verifier does not):**

In `docs/STATE.md`, replace the paragraph beginning **"Correction in progress (owner-directed, 2026-09-29, baseline `964038b…`, tree uncommitted)"** with:

> **Correction applied and verified (owner-directed, 2026-09-29, candidate `f148fff3530155237add2fd5e53e230835275165`, HEAD of clean tree):** G1-PKG bounded correction — (1) note preservation on price-only edits + explicit clear (`note: ''`), demonstrated through a fresh verifier-packed artifact (sha512 independently reproduced, matching the builder's recorded digest) installed in a self-authored consumer outside the monorepo, including in the consumer's own stored bytes; (2) intrinsic read-acknowledgment gate (`acknowledgeRead` / `READ_NOT_ACKNOWLEDGED`) layered over the unchanged adapter-side read-gate — read-failure mode refused all six mutation kinds with zero false success and byte-identical storage, adapter-level `STORAGE_READ_FAILED` refusal additionally demonstrated, recovery via acknowledgeRead restored writes; (3) host F-A + F-N1 re-verified live (corrupt-key refusal, bytes survive, recovery pill `saved`) with label-edit note set/clear/undo; (4) status/npm wording fixed. Fresh verifier report: `docs/evidence/G1-PKG/verifier-report-correction.md` — all six checks PASS; findings N-1–N-3 non-blocking (N-2 = this refresh). **G1-PKG correction verdict: PASS WITH NON-BLOCKING FINDINGS. The G1-PKG gate record at candidate `f0fdcd4…` therefore stands, with the correction integrated at `f148fff…`. G2 is NOT authorized** — awaits owner D-001 review.

In `docs/HANDOFF.md`, append to the G1-PKG record after the existing "Correction in progress" line:

> **Correction verified (fresh verifier, 2026-09-29):** all claims proven at `f148fff…` per `docs/evidence/G1-PKG/verifier-report-correction.md`; gate verdict unchanged (PASS WITH NON-BLOCKING FINDINGS).

Also update the AGENTS.md §6 snapshot SHA wording (`candidate f0fdcd4…, HEAD 964038b… at correction time` → `…correction integrated at f148fff…`) at the next natural edit; the STATE pointer already governs.

## Evidence index (this session, all in `docs/evidence/G1-PKG/`)

- Screenshots: `cv-read-failed-unavailable.png`, `cv-note-set-and-clear-state.png`, `cv-read-failure-all-refused.png`, `cv-recovery-write-allowed.png`, `cv-full-reload-persisted.png`, `cv-host-corrupt-write-refused-bytes-survive.png`, `cv-host-recovery-pill-saved.png`, `cv-host-note-set-via-label.png`, `cv-host-note-cleared-and-undo-restored.png`, `cv-host-reload-persisted.png`
- Machine records: `cv-read-failure-attempts.json`, `cv-adapter-refusal.json`, `cv-recovery-write-works.json`, `cv-redo-carries-effective-note.json`, `cv-d-normal-bytes.json`, pre/post byte dumps `cv-pre-bytes-failmode.txt` / `cv-post-bytes-failmode.txt`
- Harnesses (derived from precedent `cdp-pkg.mjs`, no secrets): `cdp-vx.mjs`, `cdp-host.mjs`
- Artifact: my fresh pack tgz + sha512 in `C:\Users\RZ1\AppData\Local\Temp\vx-consumer` (outside the repo; NOT committed, NOT published)

No repairs made, nothing pushed, no real orders, no publish. Prior reports and red evidence untouched. Working tree contains only the new untracked evidence files enumerated above.