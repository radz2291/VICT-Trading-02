# A2 — simulation engine comparison (G3 Part A) — evidence + recommendation

**Date:** 2026-09-30. **Status:** research and proof ONLY (D-005): nothing here adopts an engine, accepts any license implication for distribution, or ships anything. The engine-adoption decision is the owner's, made at the PAUSE this evidence feeds.

## Fixtures used (all pinned)

1. **Hand-calculated trade/fill/cost fixture** — `docs/evidence/G3/fixtures/hand-calculated-fixture.json` (24 bars, SMA3 long/flat, 6 hand-derived fills with full cost math; the exactness oracle).
2. **Gap fixture** — the G2 pinned series carries deliberate dropped slots (gap block + singles); exercised via the kit's R2 semantics; engine-side gap behavior assessed below.
3. **Poison-future fixture** — `docs/evidence/G2/fixture/` baseline + alternate variants (poison only after the horizon; SHA-256-pinned).

## Candidate 1 — NautilusTrader (local evaluation performed; research-only permission)

- **Identity evaluated:** `nautilus_trader 1.231.0` (pip wheel, install log + version in-process), license **LGPL-3.0**.
- **Reproduction:** `g3-nt-eval/Scripts/python.exe nt_eval2.py` (committed here; venv OUTSIDE the repo at `C:/Users/RZ1/Desktop/RZ/g3-nt-eval`, 559 MB, 17 packages + deps).
- **Determinism: PASS** — two full runs in one process produce byte-identical fill sequences (side/qty/avg_px/ts/commissions/slippage; `nt-eval-result.json`).
- **Signal correctness: PASS** — decision logic fired at exactly the hand-fixture bars (BUY 08:45/10:00/11:15, SELL 09:30/10:30/12:00), 6 fills, same order sequence as the hand table.
- **Fill/cost exactness vs the hand table: FAIL under default configuration.** Hand model = next-bar-OPEN fill ± (spread/2 + slippage) + flat commission 1.00. NT: (a) with bar data alone, every market order was **rejected: 'no market'** — bar execution alone gave market orders no market (recorded finding — fill semantics undocumented, as the G0 record anticipated); (b) after synthesizing one quote per bar open (documented in the script), NT filled market orders against the last quote STRICTLY BEFORE the order's submission instant, producing systematic one-bar-off prices (e.g. BUY filled 100.500009 where the hand model fills 101.10 at the same instant); (c) commission defaulted to the instrument's 0.02 USD taker fee, not the stated 1.00; slippage recorded 0. Reproducing the hand model exactly would require an adapter layer with custom fill/fee models and careful timestamp orchestration — non-trivial additional integration work, evidenced by the two failed direct attempts preserved in `nt-eval-output.txt` / `nt-eval-result.json`.
- **Gap semantics: NO CONTRACT.** NT processes whatever bars exist; a missing interval is simply absent data. There is no R2-equivalent (no explicit unavailable states, no slot-complete aggregation rule) — those guarantees would live entirely in OUR adapter, i.e. the kit, not the engine.
- **Poison-future: no engine-side contract either.** Isolation is the caller's responsibility (the kit's R1 cap provides it; an NT adapter would sit behind the same capped source).
- **Footprint: heavy.** 559 MB venv for the evaluation of ONE fixture; requires a local Python sidecar process for a browser-first app — the app's first external-process dependency (process model, IPC, packaging, version pinning).
- **License: LGPL-3.0.** Evaluation permitted by the owner (research/proof only). Adoption would trigger a separate decision covering distribution implications (D-001 keeps publishing open) — adopting LGPL for personal local use is materially different from distributing it, and that call has NOT been made.

## Candidate 2 — LEAN (QuantConnect) — local run not possible on this machine

- **Identity:** Apache-2.0 (verified 2026-09-30); **latest GitHub release `v2.4.0.1` published 2017-08-08** (verified 2026-09-30) — development ships via master + Docker images with no released artifact identity to pin.
- **Local runnability (this machine): `docker` ABSENT, `dotnet` SDK ABSENT** (both verified 2026-09-30; `lean-footprint.md`). The supported local path (lean CLI) requires Docker Desktop; a Docker-less local run requires building the .NET solution from an unreleased master pin — disproportionate to the G3 bounded-backtest requirement and unverifiable as a release artifact.
- **Correctness comparison on the fixtures: NOT RUNNABLE here** — recorded as blocked evidence, not a soft pass. Any adoption decision must include the toolchain cost as a first-class item.

## The G3-delivered alternative that is already owner-accepted architecture

The owner's acceptance explicitly scoped G3's delivery: **"Keep reusable run identity, sandbox contracts, backtest and fill behavior in `@vict-trading/trading-kit`."** The kit runner was built under that scope and is proven in this cycle: hand-fixture exactness (18/18 kit tests), determinism (bit-identical), R1/R2/R3 integration (capped queries, slot-complete aggregation, explicit gaps — the poison proof passes at every timeframe). It runs inside the browser app (no sidecar), has zero external footprint, and its full cost math is recorded per fill. This is NOT a quietly invented engine — it is the explicitly accepted kit contract, and this comparison is the separate engine-adoption decision on top of it.

## Recommendation (concrete, for the owner decision)

**Adopt NEITHER external engine for G3.** Grounds, in order of weight:
1. LEAN cannot be run locally on this machine at all (no Docker/.NET; last release 2017) — its comparison evidence is a blocked record, not a pass.
2. NT works and is deterministic, but cannot express the pinned fill/cost assumption model without a substantial custom adapter, brings a 559 MB Python sidecar as the app's first external-process dependency, and its adoption hinges on an LGPL decision that has explicitly NOT been made for distribution.
3. The owner-accepted kit runner already satisfies every G3 engine requirement with exact hand-fixture reproduction and no footprint cost; nothing in G3's scope requires external-engine power (multi-asset portfolios, richer order types, live-data adapters arrive at G4+, if ever).

**If neither: external-engine selection remains open for G4+** (O-05 unchanged), to be revisited only when mechanical-trading requirements exceed the bounded per-symbol bar backtest — with a fresh proof at that point, not this one.

**What you are deciding at this pause:** choose NautilusTrader, LEAN, or neither (recommended: neither) **before any simulation engine is integrated into the product.** Under "neither", G3 proceeds to final verification on the accepted kit architecture; under either engine, integration becomes NEW scope (not quietly absorbed into G3).
---

## Correction (owner-directed, 2026-09-30) — NT finding narrowed

The NT findings above are narrowed to what the experiment actually proved: **NT's TESTED CONFIGURATION did not match our fixture without further model, timing, or adapter work** (market orders rejected 'no market' under pure bar execution; synthesized-quote fills landed one bar off the stated next-bar-open model; commission defaulted to 0.02 USD vs the stated 1.00). The experiment did NOT establish that NT could never express the model — only that this configuration, as tested, did not, and that expressing it requires further fill-model/timing/adapter work. All raw outputs above are preserved unchanged.
