# Current state and decision register

**As of 2026-09-27 (B0 repository bootstrap):** This remains a proposed development pack pending owner review; it has not been independently verified, and no owner experience review has occurred. B0 is complete: the repository is initialized at https://github.com/radz2291/VICT-Trading-02 (branch `main`) with the pack installed under `docs/`; the remote was empty before B0 (see B0-BOOTSTRAP-REPORT.md). No accepted repo-specific handoff, published VICT release identity, chart library, script runtime, engine, provider or broker has been pinned. G0–G7 have not begun; G0 technology intake is next.

A filled handoff at `HANDOFF.md` covering target/provenance, push rules, and a pre-authorized G0 stage scope was **accepted by the owner on 2026-09-27** (handoff bytes at `5ed125aa222c4b2f17832e5a5dbad8140b3638e4`). G0 is now authorized; G1–G7 require their own accepted scopes.

**G0 status (2026-09-28, orchestrator record):** Platform intake attempts 2+3 COMPLETE. Owner confirmed new UI packages published (2026-09-28) — G0 hold LIFTED. Attempt-3 (docs/evidence/G0/attempt-3-platform-intake-brief.md + raw2/): `@victframework/ui` and `@victframework/ui-svelte` published at 0.4.0-rc.1 (integrity byte-verified); `renderer-svelte` retired; release set advanced to `vict-release-set@1/0.4.0-rc.1` (contentId `v1_2a70a29a…` recomputed MATCH); consumer path = `VitApp` from `@victframework/ui-svelte` with registry/dispatch; island props domain EXPANDED (strings/finite numbers/booleans + closed `{param|record|view}` source bindings + `input` action mapping + `useVictActions()`). Traps: `latest` on ui/ui-svelte is a non-functional `0.0.0-bootstrap.1` marker — pin `0.4.0-rc.1` explicitly; svelte peer floor `^5.33.0`. Chart-candidate spike AUTHORIZED against the published 0.4.0-rc.1 seam. Builder Kit remains in development (npm 404, private) — deferred owner item, not a G0 blocker. rc-stage caveat noted: gate may prefer stable 0.4.0 when published; spike proves the seam regardless. G0 intake begins with the published VICT platform check.

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
| O-03 | Chart component and drawing model | Candidate task comparison, G0 |
| O-04 | Historical/current data provider and resolution | Provenance, availability, rights, G0–G2 |
| O-05 | Simulation engine and script language | Replay/script proofs, G0–G3 |
| O-06 | Package extraction boundary | Consumer dependency and second-use evidence, G3–G5 |
| O-07 | Live provider, account and risk settings | Separate owner decision and G6 proof |

Update this page after every gate. Supersede a decision explicitly and retain its earlier evidence. Do not present a proposal as an accepted product rule.

## Operational conventions (agent orchestration)

- **In-session role separation is implemented with pi subagents, not tmux-hosted agent processes.** Builder work uses forked-context implementation agents; fresh verification uses a fresh-context verifier agent whose prompt requires falsification attempts, independent evidence, and no silent repairs; an oracle agent may guard inherited state. Structured outputs and run logs are retained as evidence.
- **Tmux is used only for long-running processes** (dev servers, test watchers, builds) — never for agent roles.
- Parallel agent work only where files and authority do not overlap, per RUNBOOK.md; one integrator reconciles before verification.
