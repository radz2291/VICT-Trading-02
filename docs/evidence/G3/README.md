# G3 evidence — artifact lineage (tarballs ↔ candidates)

Owner-directed lineage note (V-G3-R4 disposition): each versioned package artifact is tied
to the exact candidate SHA whose source produced it by `npm pack`. All sha512 values below
were verified by the round-3 verifier at the pinned candidate (`git rev-parse HEAD`) and by
fresh `npm pack` reproduction where stated. Not published to npm — local tarball artifacts only.

## `@vict-trading/trading-kit`

| Version | sha512 (first 8 hex) | Committed artifact | Produced from candidate | Notes |
|---|---|---|---|---|
| 0.2.0 | `a6d4b02a1f63…` | `docs/evidence/G3/kit-0.2.0.tgz` + `packages/trading-kit/vict-trading-trading-kit-0.2.0.tgz` | pre-repair G3 candidate `685d769e02df94e73e0033e6a03f1fe72210d211` | Round-1 verifier reproduced this digest exactly (pack-sha512-verified.txt). Does NOT contain the 5400a45/ce8f875 determinism repairs (extraction grep, round-2 report) — historical artifact for the round-1 candidate only. |
| 0.2.1 | `12851cb4357103c8…` | `docs/evidence/G3/kit-0.2.1.tgz` + `packages/trading-kit/vict-trading-trading-kit-0.2.1.tgz` | verdict candidate `8a33b00a9bd0c12f7c8a5fc8ebc78ff9e28bb6e6` (superseded by `842122b…`) | Verifier re-verified: committed artifact sha512 == `12851cb4…`; both copies byte-identical; round-3 independent consumer (outside the monorepo) installed THIS tarball (`verifier/v16-kit-consumer.mjs` → result + `v16-kit-consumer-results.json`). Superseded by 0.2.2 (below) after the owner-ordered V-G3-4 contested check. |
| 0.2.2 | `4601a528f25069a8…` | `docs/evidence/G3/kit-0.2.2.tgz` + `packages/trading-kit/vict-trading-trading-kit-0.2.2.tgz` | contested-check repair candidate `842122b03ccb5d923ce810689ab3ba37d3fff32b` (V-G3-4) | Sync-only script contract: `SCRIPT_ASYNC_FORBIDDEN` refusal for thenable `onBar` returns and pending guest jobs (red evidence `verifier/RED-NOTE.md`, commit `6dc22b7`); kit tests 26/26; browser suite 16/16 incl. `vg34-async-refused-truthfully`; pack reproduced twice at `4601a528…`; consumer harness (`pack-and-consume.mjs`) re-run on this digest. |

Intermediate state (recorded for honesty): at repair-round-2 candidate `ce8f875…` the kit
source had been repaired but the version NOT bumped and the committed artifact NOT refreshed —
fresh pack at `ce8f875` = `7661d397…` (round-2 finding V-G3-R4). No committed artifact ever
carried that divergent digest; the divergence is resolved at `8a33b00` by kit `0.2.1`.

## `@vict-trading/chart-workspace`

| Version | sha512 (first 8 hex) | Committed artifact | Produced from candidate | Notes |
|---|---|---|---|---|
| 0.1.1 | `e4576272c4b73fa…` | `docs/evidence/G3/chart-workspace-0.1.1.tgz` + `packages/chart-workspace/vict-trading-chart-workspace-0.1.1.tgz` | repair-round-2 candidate `ce8f875fbc29e3383bdb097f5af0836eb216cddd` | Round-2 verifier reproduced the digest; consumer proof passed; same-id addOverlay stacking defect found there (V-G3-R3) is FIXED in 0.1.2 — 0.1.1 is the historical artifact for the round-2 candidate. |
| 0.1.2 | `32e4f929d6d9462…` | `docs/evidence/G3/chart-workspace-0.1.2.tgz` + `packages/chart-workspace/vict-trading-chart-workspace-0.1.2.tgz` | verdict candidate `8a33b00a9bd0c12f7c8a5fc8ebc78ff9e28bb6e6` (superseded by `842122b…`) | Verifier re-verified: committed artifact sha512 == `32e4f929…` == fresh `npm pack` (pack-chart-workspace.mjs run output); consumer install + replace/orphan/inert/remove pixel checks PASS (`docs/evidence/G3/consumer-chart-results.json`, screenshot `verifier/cw0312-consumer-overlay.png` copied from the run). |

## Verification commands (round 3, at 8a33b00)

```bash
sha512sum docs/evidence/G3/kit-0.2.1.tgz docs/evidence/G3/chart-workspace-0.1.2.tgz   # 12851cb4… / 32e4f929…
sha512sum packages/trading-kit/vict-trading-trading-kit-0.2.1.tgz packages/chart-workspace/vict-trading-chart-workspace-0.1.2.tgz  # identical
cd packages/chart-workspace && node ../../docs/evidence/G3/pack-chart-workspace.mjs    # fresh pack == committed == 32e4f929…
node docs/evidence/G3/verifier/v16-kit-consumer.mjs                                    # installs kit-0.2.1 tarball; all checks PASS
```