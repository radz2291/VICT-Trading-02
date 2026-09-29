# G1-PKG — owner-directed correction report (builder report, NOT a verifier verdict)

Baseline HEAD: `964038bd036b2fe11bc09e1022729e6612a70e1b` (verified clean at start; tree left **uncommitted** per instruction). Environment: Node v22.13.1, npm, Windows, Chrome via raw CDP harness (pattern reused from `cdp-pkg.mjs`).

## Correction 1 — note preservation + explicit clear

**Contract (documented in `DrawingWorkspace.edit` JSDoc, `validateUpdateInput`, README):**

| `patch.note` | Meaning |
| --- | --- |
| `undefined` (absent) | **PRESERVE** the level's existing note |
| `''` (empty string) | **EXPLICIT CLEAR** (persisted as `note: ''`) |
| any other string | **SET** the note |

- `edit()` now computes an *effective note* (`patch.note === undefined ? cur.note : patch.note`). The effective note rides in the persisted `update` op and in **both** undo/redo ops, so a price-only edit + undo restores the exact pre-edit price AND note; the redo op carries the effective post-edit note.
- Undo already snapshot `before` with the pre-edit note; with the effective-note fix the whole round-trip is exact.
- `validateUpdateInput` accepts `''` as an explicit clear (documented).
- README API example now demonstrates all three cases (price-only preserve / `note: ''` clear / set).
- **Type change:** none — patch type `{ price: number; note?: string }` unchanged.
- Host (`island-state.svelte.ts`): the label-edit path now passes the note field through verbatim — an emptied note field submitted is an explicit clear (`''`); the package preserves only when a patch omits `note` entirely.

**Independent-consumer evidence (temp dir `g1pkg-consumer2`, own package.json, tgz-installed, no workspace resolution; vite on :5300):**

- Seed level note `"resistance"` → stored bytes show note (`correction-shots/c2-seeded-note-resistance.png`).
- Price-only edit 101.5 → 102.75 with note omitted → stored note stays `"resistance"` in consumer's own storage AND workspace state (`c3-priceonly-note-preserved.png`).
- Undo → price back to 101.5, note `"resistance"` intact (`c4-undo-restores-price-and-note.png`); redo → 102.75 again.
- Explicit clear `note: ''` → stored note `""` (`c5-explicit-clear-note-empty.png`); undo restores note `"resistance"` with the pre-clear price (`c6-undo-after-clear-restores-note.png`).
- Full page reload → persisted state re-read (`c9-full-reload-persisted.png`). Console clean.

## Correction 2 — persistence contract resolution

**Chosen: RECOMMENDED option — intrinsic read-acknowledgment gate (defense-in-depth).**

- `DrawingWorkspace.acknowledgeRead(levels, symbol?)` — the consumer calls it after ITS adapter's read succeeded (initial load and every recovery read). It feeds the source (supersedes bare `setSource` for this purpose) and opens the gate.
- Until the first acknowledgment, **every** persistence mutation (`create`/`edit`/`move`/`remove`/`undo`/`redo`) returns `ok:false` with distinct code **`READ_NOT_ACKNOWLEDGED`**. The package still never touches storage — the gate enforces ordering over data the workspace was fed.
- The adapter remains responsible for the storage-side read-gate (byte protection). Both layers documented in `src/types.ts` (`WorkspacePersistence` doc), package README "Read-gate: responsibility split", and the host.
- `WorkspacePersistence.readLevels` is now **optional** and documented as never called by the package (reads are consumer-fed); the host port's throwing stub was removed.
- **Host integration (`island-state.svelte.ts`):** the view-feed effect now calls `store.acknowledgeRead(incoming, symbol)` — host views only update after a successful host read, so this acknowledges the initial load and every recovery read. The host adapter-side read-gate + write-verify (`gateLevelsRead` / `writeLevelsVerified` in `+page.svelte`) is **KEPT unchanged** — F-A invariant intact, defense in depth.

**Read-failure proof in the consumer:**

- Read failure induced in the consumer's own adapter → create / edit / delete all return `ok:false` (`STORAGE_READ_FAILED` from the adapter's own duty), **stored bytes unchanged** (verified by byte compare in-page) — `c7-read-failure-all-refused-bytes-unchanged.png`. No operation reported success.
- Intrinsic gate proven separately: a fresh `DrawingWorkspace` that was never acknowledged returns `{ok:false, code:"READ_NOT_ACKNOWLEDGED"}` on create — `c8-intrinsic-gate-READ_NOT_ACKNOWLEDGED.png`.

**Host recheck:**

- `npm run check`: **0 errors / 1 baseline warning** (pre-existing, unchanged). `npm run build`: PASS.
- Browser smoke (production preview :5199, CDP, real mouse events): create via `+ Level` → `saved`, bytes written (`h1` flow); note set to `resistance` via label-edit path; price-only edit keeps note (`h2-priceonly-note-preserved.png`); note field emptied + submitted → stored `note:""` (`h3`); undo restores note and price (`h4`).
- Corrupt-key smoke (Part A harness pattern): `g1.levels.v1 = '{corrupt'` → edit refused AND delete refused, bytes unchanged (`{corrupt` survives), pill `failed: storage` (`h5-corrupt-write-refused-bytes-survive.png`); restore bytes → edit succeeds, pill `saved` (`h6-recovery-write-works-pill-saved.png`). Console clean.

## Correction 3 — status text + npm claims

- `AGENTS.md` §6 "Current status": rewritten as a dated snapshot (G0+G1+G1-PKG complete, latest gate PASS WITH NON-BLOCKING FINDINGS, HEAD `964038b…` at correction time, G2 NOT authorized, package NOT on npm) with an explicit "STATE.md always wins" pointer. All history above preserved.
- `docs/HANDOFF.md`: "Correction in progress" line appended to the G1-PKG record — no verdicts rewritten.
- `docs/STATE.md`: dated header updated + "Correction in progress" paragraph (baseline `964038b…`, tree uncommitted); verdicts unchanged; final gate-record update explicitly left to the fresh verifier + orchestrator.
- npm-availability claims: `packages/chart-workspace/README.md` install section now states **packed locally (npm pack artifact); NOT published to npm; install from artifact path only** (package README states publish status explicitly, including in the License section's "Not published to npm"). Repo-wide grep found no other consumer-facing "install from npm" wording for this package (only historical G0 evidence/raw files about npm publishing mechanics, which are records, not claims).

## Commands and results (all run this session)

| Command | Result |
| --- | --- |
| `git status` / `git log` at start | clean tree at `964038b…` |
| `npm run build` (packages/chart-workspace) | PASS, no type errors |
| `npm pack --pack-destination …\g1pkg-consumer2` | `vict-trading-chart-workspace-0.1.0.tgz` |
| sha512 of artifact | `a5eb14b5865c6405902138bf977a343c35899a80a725c573b8db75acd268546934b15ff357d08e745b60b7b10016970471979fd353e5c87fdaf1c10879163047` |
| `npm install` (consumer2, installs the tgz) | OK — tree: `@vict-trading/chart-workspace@0.1.0` → `lightweight-charts@5.0.8` → `fancy-canvas@2.1.0`; vite dev-only |
| `npx vite --port …` + CDP flows (consumer) | all proofs above, screenshots `correction-shots/c1–c9` |
| `npm run check` (host) | 0 errors / 1 baseline warning |
| `npm run build` (host) | PASS |
| CDP host smoke (preview :5199) | screenshots `correction-shots/h1–h6`, console clean |

## Honesty / scope notes

- This is a **builder report**. It does NOT certify the gate; the fresh verifier decides against the final integrated SHA.
- No commit, no push, no npm publish performed. The tgz artifact lives in the temp consumer dir (outside the repo).
- Environment note: a stale dev server from the earlier packaging run occupied port 5299; this run used :5300 (consumer) and :5199 (host preview, restarted from the fresh build).
- Untracked pre-existing file `docs/TRADING-KIT-BOUNDARY-PROPOSAL.md` was present before this session; left untouched.
