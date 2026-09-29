# Current state and decision register

**As of 2026-09-29 (G2 complete):** The development pack remains the product contract; the repository-specific handoff at `HANDOFF.md` carries **owner-accepted stage records for G0 (2026-09-27/28), G1 (2026-09-28), G1-PKG (2026-09-29, incl. correction verified at `f148fff…`), and G2 (accepted 2026-09-29 at `c9b780d…` with amendments in D-003; executed and verified)** — each verdict PASS WITH NON-BLOCKING FINDINGS — plus owner-accepted decisions **D-001** (delivery = composed app + installable capabilities), **D-002** (Trading Kit direction + precision rules R1–R4) and **D-003** (poison-future both directions; provenance-unknown drawings hidden in replay). Repository: https://github.com/radz2291/VICT-Trading-02, branch `main`. **G0 PASS WITH NON-BLOCKING FINDINGS** (chart: lightweight-charts 5.0.8; platform `vict-release-set@1/0.4.0-rc.1`; engine explicitly open). **G1 PASS WITH NON-BLOCKING FINDINGS** (remediated `24e81f0…`). **G1-PKG PASS WITH NON-BLOCKING FINDINGS** (gate `f0fdcd4…`, correction `f148fff…`; `@vict-trading/chart-workspace@0.1.0` proven installable; note-preservation + intrinsic read-acknowledgment gate in). **G2 PASS WITH NON-BLOCKING FINDINGS** (candidate `5ebe4ee…`: `@vict-trading/trading-kit@0.1.0` + blind replay + pinned poison fixture; verdict details in the G2 status block below). Carried: F-R1, RF4, F-1/F-2/F-3 (G2 minors), stable-0.4.0 recheck, N-1/N-3, bundle-delta unverified. **NOT authorized and not started: G3+ (scripts/engine/risk/orders), engine selection (LGPL owner question pending), package publication.** A new agent must NOT mistake G0 for the only accepted work — read all stage records and the decision register above this line.

**Correction applied and verified (owner-directed, 2026-09-29, candidate `f148fff3530155237add2fd5e53e230835275165`, HEAD of clean tree):** G1-PKG bounded correction — (1) note preservation on price-only edits + explicit clear (`note: ''`), demonstrated through a fresh verifier-packed artifact (sha512 independently reproduced, matching the builder's recorded digest) installed in a self-authored consumer outside the monorepo, including in the consumer's own stored bytes; (2) intrinsic read-acknowledgment gate (`acknowledgeRead` / `READ_NOT_ACKNOWLEDGED`) layered over the unchanged adapter-side read-gate — read-failure mode refused all six mutation kinds with zero false success and byte-identical storage, adapter-level `STORAGE_READ_FAILED` refusal additionally demonstrated, recovery via acknowledgeRead restored writes; (3) host F-A + F-N1 re-verified live (corrupt-key refusal, bytes survive, recovery pill `saved`) with label-edit note set/clear/undo; (4) status/npm wording fixed. Fresh verifier report: `docs/evidence/G1-PKG/verifier-report-correction.md` — all six checks PASS; findings N-1–N-3 non-blocking (N-2 = this refresh). **G1-PKG correction verdict: PASS WITH NON-BLOCKING FINDINGS. The G1-PKG gate record at candidate `f0fdcd4…` therefore stands, with the correction integrated at `f148fff…`. G2 is NOT authorized** — awaits owner D-001 review.

A filled handoff at `HANDOFF.md` covering target/provenance, push rules, and a pre-authorized G0 stage scope was **accepted by the owner on 2026-09-27** (handoff bytes at `5ed125aa222c4b2f17832e5a5dbad8140b3638e4`). G0 is now authorized; G1–G7 require their own accepted scopes.

**G0 status (2026-09-28, orchestrator record — VERDICT):** **PASS WITH NON-BLOCKING FINDINGS** at candidate SHA `212d490219921e75e4a3554c6f7f575aa22441f7`.

**G2 status (2026-09-29, orchestrator record — VERDICT):** **PASS WITH NON-BLOCKING FINDINGS** at candidate SHA `5ebe4eeae74bc608ada625feca57ee284a085747` (fresh verifier independent of builder; see `docs/evidence/G2/verifier-report-G2.md`).

- **Blind replay delivered:** `@vict-trading/trading-kit@0.1.0` (zero runtime deps; clock with hard future-guard; R1 capped+recorded queries; R2 availability — completed-bucket-only HTF, explicit missing intervals; R3/D-003 visibility — provenance-unknown hidden in replay, replay-stamped visible ≥ creation step; ReplaySession over app-supplied persistence port with read-acknowledgment) + `host/` replay mode (banner-labelled replay/current, step/play/pause, timeframe switch, session restore/reset, return-to-current) + pinned poison fixture (seed 20260927-derived, generator + SHA-256 in `docs/evidence/G2/fixture/`).
- **Owner-amended criteria (D-003) proven both directions:** POTENCY — changing only post-horizon bars flips the naive full-history calc (max 3112.5→6112.5; SMA20 3107.25→6107.25); ISOLATION — 42/42 kit-slice results + in-app restored-session values identical across poison variants. Every verifier-listed leak channel probed: direct future queries, changed future bars, unfinished larger-TF bars, gaps (5 explicit, none bridged), later annotations, derived output, session reload (return-to-current on reload; restore deliberate and exact), return-to-current.
- **Packaging:** kit builds standalone, `npm pack` sha512 (86b53ccb…) independently reproduced matching both committed tarballs; consumer OUTSIDE monorepo (own data, own storage) passes all replay-lifecycle checks; import audit clean both directions; app W1 re-verified on a fresh browser profile at desktop + 375/768 incl. corrupt-key refusal byte-survival on both storage keys.
- **Carried findings (all minor/non-blocking):** F-1 fixture regenerator pretty-print mismatch (one-file spurious diff on regeneration; content semantically identical); F-2 corrupt `g2.replay.v1` read failure correctly refuses start/restore (bytes survive) but the UI shows no explanation (pill covers current-mode drawings only) — honesty display gap to fix at G3; F-3 stale G1 gap-bridging wording in panel/footer; plus F-R1, RF4, stable-0.4.0 recheck, N-1/N-3, bundle-delta unverified.
- **Not started, not authorized:** G3+ (scripts, engine, risk, orders), engine selection (LGPL owner question pending), package publication. Evidence: builder report + verifier report + ~35 screenshots + proof scripts + consumer results under `docs/evidence/G2/`.

- **Chart selection proof (O-03):** `lightweight-charts 5.0.8` (Apache-2.0) selected for G1 — the only candidate whose verifier-confirmed evidence passes the G0 demo (pan, zoom, crosshair time/price mapping verified against fixture values, durable drawing via create→reload→redraw→edit→reload loop with real browser interaction; 30 verifier screenshots). `uPlot 1.6.32` **FALSIFIED** as implemented: CSS never imported (cursor dislocation, no containment), level lines invisible (2-elem series vs 2023-length x), dblclick adds spurious levels — findings preserved, not discarded.
- **Platform intake:** release set `vict-release-set@1/0.4.0-rc.1` verified (attempts 2+3; contentId recomputed MATCH; 14/14 tarball integrity). Consumer path: `VitApp` via `@victframework/ui-svelte@0.4.0-rc.1` + `createComponentRegistry`. `renderer-svelte` retired.
- **Engine (O-05): explicitly OPEN with proof task** — neither NT nor LEAN decided. NT: LGPL-3.0 (owner license decision required before selection); LEAN: Apache-2.0 but weak release provenance (Docker-tag identity, no usable GitHub release since 2017). Gap semantics undocumented in both — the pinned gap fixture must test. No simulation code needed for G1, so deferral is within the G0 pass condition.
- **Carry-forward findings:** LWC silently bridges the 2h fixture gap visually (crosshair times truthful) — must be fixed or explicitly documented at G2; LWC price lines not autoscaled; no in-app edit affordance yet (G1 scope); F1 upstream question: `useVictActions` lives only on the `./component-actions` subpath in published rc.1 (repo-tip exports from root) — narrow public-contract question, non-blocking; F5: gate accepted the rc pin because stable 0.4.0 does not exist — **G1 must re-verify against stable 0.4.0 when published or explicitly accept rc risk (owner-informed)**. Cold-clone install was reproduced in-place, not as a separate fresh-clone run — commands documented in `docs/evidence/G0/spike-host.md`.
- **Evidence:** builder report `docs/evidence/G0/spike-host.md`; verifier report `docs/evidence/G0/verifier-report-G0-spike.md` + 30 screenshots `verifier-shots/`; intake briefs attempts 1–3 + raw/ + raw2/ + raw3/. Verifier session independent of builder; verdict vocabulary per EVALUATION.md. G0 intake begins with the published VICT platform check.

## Accepted product direction from the conversation

- Fresh app with a TradingView-like freedom of approach, chart-first and desktop-first.
- Strong chart essentials: drawings, indicators, layouts and multiple timeframes.
- Manual and method/script-qualified opportunities coexist, with clear origin.
- Methods may be made by visual rules, code or AI assistance over time; scripts support mechanical trading.
- Replay, paper trading and automatic backtests are in the destination.
- One-minute history is a plausible starting resolution; seconds/ticks are a later upgrade subject to data/provider proof.
- Record method-qualified opportunities including declined or missed cases when an enabled detector can support those claims.
- Live operation may eventually include explicitly enabled automatic orders, in addition to assisted execution.
- AI may explain, help design/test, and monitor within its granted authority.
- Initial representative symbols are XAUUSD and EURUSD in a desktop browser.
- The former Trading OS's prescribed navigation and required Program/Method entry flow are rejected for this new app.

## Proposals in this pack, pending owner review

- G0–G7 stages and their criteria; exact order may change with evidence.
- Three separated responsibilities: builder, fresh verifier, product evaluator.
- Public VICT at coarse governance boundaries; specialized chart and proven external engine through adapters.
- New-repo scope and Builder Kit task authority described in RUNBOOK.md.

## Known external status that must be refreshed

- VICT UI work on @victframework/ui and @victframework/ui-svelte was in progress in parallel on 2026-09-26; published compatibility must be checked.
- The older Trading OS T2 was independently closed; its T3 was implemented but awaited independent verification at the referenced 38f654e snapshot. These facts confer no readiness on the new app.
- VICT Stage 8 Builder Kit documentation describes a scoped external-app bootstrap. Its distribution and current verified consumer path must be checked at G0.

## Open decisions

| ID | Decision | Required evidence / latest gate |
|---|---|---|
| O-01 | New repository identity and authorized remote/branch | Repository initialized at the user-supplied URL in B0 (https://github.com/radz2291/VICT-Trading-02, branch `main`); accepted binding handoff still pending |
| O-02 | VICT release and UI extension contract | Published artifacts and browser spike, G0 |
| O-03 | Chart component and drawing model | **lightweight-charts 5.0.8 selected for G1** — G0 spike + fresh verifier PASS (durable drawing, pan/zoom/mapping); uPlot falsified (see G0 record); final drawing/editing model proven at G1 |
| O-04 | Historical/current data provider and resolution | Provenance, availability, rights, G0–G2 |
| O-05 | Simulation engine and script language | Explicitly open: NT (LGPL-3.0 — owner license decision required) vs LEAN (Apache-2.0, weak release provenance); both need gap-semantics + future-isolation behavioral proof on the pinned fixture, G3 |
| O-06 | Package extraction boundary | **SUPERSEDED by D-001 (2026-09-29):** packaging gate G1-PKG pulled forward between G1 and G2 (Chart Workspace capability first); Trading Kit boundary established before replay code; publication remains a later release decision |
| O-07 | Live provider, account and risk settings | Separate owner decision and G6 proof |

Update this page after every gate. Supersede a decision explicitly and retain its earlier evidence. Do not present a proposal as an accepted product rule.

## Operational conventions (agent orchestration)

- **In-session role separation is implemented with pi subagents, not tmux-hosted agent processes.** Builder work uses forked-context implementation agents; fresh verification uses a fresh-context verifier agent whose prompt requires falsification attempts, independent evidence, and no silent repairs; an oracle agent may guard inherited state. Structured outputs and run logs are retained as evidence.
- **Tmux is used only for long-running processes** (dev servers, test watchers, builds) — never for agent roles.
- Parallel agent work only where files and authority do not overlap, per RUNBOOK.md; one integrator reconciles before verification.
