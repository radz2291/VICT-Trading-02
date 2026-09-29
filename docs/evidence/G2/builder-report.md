# G2 claim matrix + reproduction — blind replay in the workspace

Candidate built by the builder session on 2026-09-29, baseline HEAD `429e39596d989a6203117cf105a0a11e86ea2a88` (clean tree verified at start). **Not committed, not pushed, not self-certified** — the orchestrator integrates and a fresh verifier session judges the candidate.

## Artifacts and identity

| Artifact | Identity |
|---|---|
| Kit package | `@vict-trading/trading-kit@0.1.0` — `packages/trading-kit/` |
| Packed artifact | `packages/trading-kit/vict-trading-trading-kit-0.1.0.tgz` — sha256 `38979340d24c22a97c5c4b224b3a27a66b06fb5f37793d88b07a224d4823ed09`, sha512 `86b53ccbec16f2bb02b9c00446e5aa4064eb4c62b47cebcb931fd230944c51dcb08621d5d6f8c85e0b26a17311a1b396cf9fef12e88dcb63ee9c78dcf3bf3600` (copy in `consumer/`) |
| Fixture baseline | `fixture/g2-fixture-baseline.json` — sha256 `5a0f4c1d32eb255f3a2bfffbd26be0036df6dc34a7174410debfbb3df42a1079` (byte-identical copy used by the app: `host/src/lib/fixtures/g2-fixture.json`) |
| Fixture alternate | `fixture/g2-fixture-alternate.json` — sha256 `13560efa1c40f00dc78628033dab4c2aa6b93c04f6695c61e5104a6a5f07e013` |
| Fixture meta | `fixture/fixture-meta.json` — sha256 `a1addd706536dc4050e1d4ad69c58c4c38c8d0af0471f408eb33095b557ee7da` |
| Derivation | seed `20260927`, XAUUSD 15m — the app's own fixture walk (`host/src/lib/fixture.ts`); walk total **2023 bars**; horizon = bar index 1997 close (`1770068700`); poison = the last **25** bars (indices 1998–2022) with closes 3100+0.5j (baseline) vs 6100+0.5j (alternate). Historical prefix (1998 bars) byte-identical across variants — verified programmatically AND verified byte-identical to the app's `buildFixture()` prefix. |
| One-command regenerator | `node docs/evidence/G2/fixture/generate.mjs` (both variants + meta + host copy); `node docs/evidence/G2/fixture/generate.mjs alternate` also works — the verifier mutates the host copy with: `node docs/evidence/G2/fixture/generate.mjs && cp docs/evidence/G2/fixture/g2-fixture-alternate.json host/src/lib/fixtures/g2-fixture.json && cd host && npm run build` |

## Claims and evidence

| # | Claim (pass criterion) | Evidence | Reproduction |
|---|---|---|---|
| 1a | POTENCY: naive full-history calc changes when only poison bars change | `proof-poison-results.json potency` — baseline max 3112.5 / SMA20final 3107.25 vs alternate 6112.5 / 6107.25 (max-drawdown recorded too) | `node docs/evidence/G2/proof-poison.mjs` (exit 0 requires both directions) |
| 1b | ISOLATION: every visible-slice result identical across that change | same file `isolation` — 57 clock instants × {15m,1h,4h} served slices byte-compared, last-bar OHLC, visible-slice max/SMA — 0 mismatches; screenshots `g2-rp-14/15` (in-app: restored replay under swapped fixture shows identical stats: max H 2657.81 · SMA20 2645.09 · 1504 bars) | same; in-app: swap host fixture per table above, rebuild, preview, Restore session |
| 2 | Clock cap: future/beyond-horizon queries capped, recorded, never errors; hard guard | `proof-poison-results.json clockCap`; records show `requestedUntil > servedUntil`; advance 1y past horizon → applied = horizon, `capped:true`. In-app, chart/OHLC/stats receive bars ONLY via `replay.bars` (kit `bars()` — see `host/src/lib/replay.svelte.ts` `refresh()`; ReplayIsland consumes only that). | `node docs/evidence/G2/proof-poison.mjs`; consumer proof `consumer/consumer-results.json capChecks` |
| 3 | R2: unfinished HTF bar never returned; missing intervals explicit, never bridged | `proof-poison-results.json htf/missing` (1h series ends at last completed bucket at a mid-bucket instant; 6 missing intervals named); in-app `g2-rp-03-htf-1h-mid-bucket.png` (1h: 376 buckets vs 15m 1504 at 18:15Z mid-bucket) | same + replay UI: switch replay timeframe, observe bars |
| 4 | R3/D-003: provenance-unknown levels HIDDEN in replay; replay-stamped visible only at/after creation step; earlier-step invisibility; current mode unchanged | UI: `g2-rp-01/02/05` (panel note "Existing saved levels are NOT shown in replay — provenance unknown (1 hidden)"; level created at step 4 visible at step 5); programmatic: `visibility-step-results.json` (invisible at steps 1–3, visible 4–6; provenance-unknown hidden in replay/visible in current); app panel wording `host/src/routes/+page.svelte` | `node docs/evidence/G2/proof-visibility-steps.mjs`; walkthrough below |
| 5 | Session restore/reset exact and replayable; return-to-current works and is labelled | `g2-rp-06-restored-exact.png` (after full reload: Restore → step 5 · instant 2026-01-26 18:15Z, level restored); `visibility-step-results.json restoreExact`; `g2-rp-07` return-to-current → CURRENT banner, current island restored, `g1.levels.v1` untouched, record marked `returnedToCurrent`; deliberate reset via confirm dialog | walkthrough below; storage key `g2.replay.v1` (distinct from `g1.levels.v1`), adapter with read-before-write + read-back verify in `host/src/lib/replay.svelte.ts` |
| 6 | Replay/current unmistakably labelled; replay controls cannot reach current-market endpoints | persistent banner `data-testid=mode-banner`: red "REPLAY — historical fixture data as of … · NOT current" vs green "CURRENT" (all screenshots); in replay the current-mode island is UNMOUNTED (`chart-island` absent) — no replay control dispatches any current-mode action | `g2-rp-01`, `g2-rp-09/10` (narrow), `g2-w1-05` |
| 7 | Kit builds/packs standalone; external consumer with OWN data/adapter; import audit both directions | `consumer/consumer-results.json` (all checks green, exit 0), `consumer/npm-ls.txt` (only `@vict-trading/trading-kit@0.1.0` resolved; no app/VICT/chart-workspace), kit has no nested node_modules (zero runtime deps); import audit: no `import` of chart-workspace or app anywhere in kit `dist` (only header comment mentions the name); chart-workspace imports nothing from trading-kit | `cd C:/Users/RZ1/Desktop/RZ/g2-consumer && node consumer-replay.mjs; echo $?` (exit 0) |
| 8 | check + build + console clean; keyboard access; desktop + narrow | `npm run check` 0 errors / 1 warning (pre-existing baseline `state_referenced_locally` in ChartIslandLWC); `npm run build` PASS; CDP console empty across the whole walkthrough; replay controls are real `<button>`/`<select>` (keyboard-focusable, focus-visible outlines); narrow 375/768 shots `g2-rp-09..12` | commands below |

## Commands (final build state)

```
cd packages/trading-kit && npm run build && npm pack
cd host && npm run check        # 0 errors / 1 warning (baseline)
cd host && npm run build        # PASS
node docs/evidence/G2/proof-poison.mjs
node docs/evidence/G2/proof-visibility-steps.mjs
cd host && npm run preview      # serves the built app on 5199
node docs/evidence/G2/cdp-g2.mjs <cmd> …   # CDP walkthrough harness (Chrome 153, localhost:9222)
cd C:/Users/RZ1/Desktop/RZ/g2-consumer && node consumer-replay.mjs
```

## Browser walkthrough recorded (all on the FINAL build unless marked)

- W1 regression (current mode): create level → undo → create → reload persistence (`g2-w1-03`, `g2-w1-05`; earlier dev-server shots `g2-w1-00..02` retained for history).
- Enter replay at bar 1500 (`g2-rp-01`); step ×3 → step 4 (`g2-rp-02`); click chart → replay-stamped level at price 2650.24 step 4; step → 5; stored record inspected (stepIndex 5, level creationStep 4).
- Reload → CURRENT (no auto-resume) → Restore → exact step 5 / instant 18:15Z with level visible (`g2-rp-06`).
- Replay timeframe 1h/4h at a mid-bucket instant → completed buckets only (`g2-rp-03*`).
- Return to current → CURRENT banner, current island back, g1 levels intact (`g2-rp-07`).
- In-app poison isolation: baseline slice stats (`g2-rp-14`) vs alternate-fixture build with restored session — identical (`g2-rp-15`); baseline fixture restored afterwards (host copy sha256 re-verified `5a0f4c1d…`).
- Narrow 375/768 in both modes (`g2-rp-09..12`).
- Console: empty (no errors/warnings) at every checkpoint.

## Honest notes / unverified items

- The builder did NOT run a fresh-session W1 walkthrough on a wiped profile in this pass; `g2-w1-03/05` run with pre-seeded storage. The verifier should repeat W1 on a fresh profile.
- The in-app isolation screenshot pair used the app's own baseline-vs-alternate builds; the 57-instant programmatic slice comparison (`proof-poison.mjs`) is the exhaustive evidence.
- `docs/STATE.md` was NOT updated (no commit/push by this builder; orchestrator integrates — STATE.md update belongs to the gate record step).
- App "reset session" uses a confirm dialog; CDP auto-accept exercised it implicitly via reset flows in earlier dev runs only — the verifier should exercise it explicitly on the final build.
- Kit `npm pack` was re-run after the final kit fix (`stepCounter`); both hashes above are the FINAL artifact. Re-pack after any change invalidates them.
