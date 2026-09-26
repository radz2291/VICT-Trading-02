# VICT Trading Workspace — Complete Agent Development Pack

Edition 0.1 · 2026-09-26 · Proposed for owner review

This readable edition contains every file in the agent pack. The ZIP preserves the individual files and their relative links. Repository authority requires a completed, accepted handoff.


---

## File: README.md

# VICT Trading Workspace — Agent Development Pack

**Edition:** 0.1, 2026-09-26. **Status:** proposed product and execution specification for owner review. It becomes repository authority only through a repo-specific, accepted handoff. No new repository URL or release identity has been supplied.

## Start here

This pack defines a new chart-first trading application. It is a fresh product. The earlier Trading OS repository is a read-only source of lessons and candidate semantics, not an implementation base or a source of binding product flow.

Read in order:

1. PRODUCT.md (see its section in this document) — purpose, freedom, and product boundaries.
2. EXPERIENCE.md (see its section in this document) — observable trader tasks and interaction principles.
3. ARCHITECTURE.md (see its section in this document) — ownership, seams, and selection proofs.
4. STAGES.md (see its section in this document) — dependency-aware slices and exact exit criteria.
5. EVALUATION.md (see its section in this document) — evidence, verdicts, and review method.
6. RUNBOOK.md (see its section in this document) — agent roles, autonomy, scope, and failure handling.
7. STATE.md (see its section in this document) — accepted context, proposals, and unresolved facts.
8. HANDOFF-TEMPLATE.md (see its section in this document) — binding repo-specific kickoff.

AGENTS.md (see its section in this document) is a short entry point for agents after these files are installed in the new repository. Avoid copying the same rules into multiple locations.

## Destination in one paragraph

The trader opens a chart immediately and can draw, inspect, add an indicator or script, replay history, test an idea, place simulated trades, and review outcomes in a persistent workspace. The order of these actions belongs to the trader. VICT governs consequential operations and durable meaning; specialized chart, data, and execution components provide the domain machinery. A reproducible test pins its inputs; live automation requires an explicit account-specific grant. The application should remain light by consuming proven reusable components.

## Execution model

An authorized builder works through the stages, fixes objective failures within scope, and produces evidence. A fresh verifier challenges each candidate against the written criteria, including experience walkthroughs. The builder may continue through preauthorized passing gates without waiting for a new prompt. The owner decides material product forks, controls any real account activation, and judges the final hands-on experience. A stage cannot be marked independently verified by its implementer.

The pack is a standing reference, not blanket authority to edit VICT, publish packages, connect an account, or place an order. The target repository, baseline SHA, platform release set, scoped task authority, and permitted push destination belong in an accepted handoff. The Builder Kit's task-pack and accepted-scope rules apply where the verified release provides them.

## Source references

- VICT framework: https://github.com/radz2291/vict-02
- Builder Kit contract: https://github.com/radz2291/vict-02/blob/main/packages/builder-kit/README.md
- Earlier Trading OS, reference only: https://github.com/radz2291/VICT-Trading/tree/38f654e2ceffa0455fd5e7c2f1b4da24d73aea25

The published VICT release, UI package state, and Builder Kit distribution must be rechecked at Stage 0. Work on a branch is not a published consumer contract.


---

## File: PRODUCT.md

# Product intent

## Promise

Build a personal, chart-first trading workspace for discovering, practising, testing, and eventually operating discretionary and scripted ideas. The working surface should feel native and free to approach: the trader may start with a bare XAUUSD or EURUSD chart and decide what to do next. The product supports exploration without requiring a Trading Program, Method, formal Session, or preselected mode.

The initial audience is one desktop trader. XAUUSD and EURUSD are the first representative instruments. A broader market and mobile experience are later product decisions. This is a product vision, not a claim about currently available feeds, history, brokers, or chart libraries.

## Non-negotiable experience properties

- **Chart as place:** The visible market and its relevant context persist while tools, code, replay controls, orders, and results appear around it.
- **Free entry:** A new workspace opens to a useful chart with an instrument and timeframe; no formal object-creation wizard blocks drawing, inspection, or replay.
- **Multiple approaches:** The trader can start from a drawing, an observation, a script, a replay, or a manual simulated trade. None is the privileged starting route.
- **Provisional work:** Drawings, drafts, and notes can remain experiments. The app asks for formal identity when the user wants a reproducible comparison or grants operational authority.
- **Continuity:** Symbol, timeframe, drawings, panel arrangement, relevant script inputs, and historical time remain intelligible across tool changes and reloads.
- **Truthful time:** Historical and current contexts are visibly distinct. A future bar cannot influence a historical decision or computed output.
- **Mechanical and discretionary coexist:** Scripts may produce signals and orders for simulation; manual decisions remain possible in the same workspace. Their records distinguish source and authority.
- **Earned structure:** Versioning, evidence, and risk rules add reliability at their point of use. They do not prescribe the user's exploration sequence.

## Modes of commitment

1. **Explore:** Open charts, draw, inspect, draft code, and annotate. Saving is lightweight. No claim of strategy performance follows from this state.
2. **Test:** Pin exact script/rule revision, data revision, timeframe, range, execution assumptions, and engine revision. Results are reproducible and inspectable.
3. **Practise:** Run blind historical replay and simulated decisions, or current-market paper trading. The clock and fill model are explicit.
4. **Operate:** Connect live data and an account only with an explicit grant. Assisted orders require confirmation. Automated live trading is a distinct, opt-in capability with limits and stop control.

These are authority and evidence states, not required top-level destinations or a sequential onboarding path.

## Product boundary

The application chooses its identity, workspace defaults, layout, instruments, providers, account connections, and wording. VICT supplies generic contracts, application meaning, permission and governed operation boundaries where its verified public APIs support them. A trading package may supply reusable domain contracts, data/replay adapters, simulation, evidence, and specialized surfaces. An existing engine is preferred when a bounded proof shows that it supports the required human-paced and scripted behaviors.

The app does not inherit the previous Trading OS's Research → Practice → Operate → Review navigation, governing Program prerequisite, or Method-first user flow. The previous T1–T3 work can inform tests, especially deterministic data identity and time fences, after its actual status is checked.

## Success test

From one saved workspace, the trader can discover a boundary on XAUUSD, draw it, prototype a rule or script, rewind to an earlier point, take or decline a simulated opportunity, inspect what followed, and return to current data. They can change direction at each step without rebuilding context or completing a formal workflow.

This is a task demonstration, not a promise that every feature arrives in Stage 1. The stages grow toward it while keeping the same interaction grammar.

## Deliberately open decisions

The chart library, scripting language, simulation engine, data sources, broker adapters, package count, and precise navigation remain open until demonstrated by the relevant gate. Pine Script compatibility is not implied. No live broker authority is created by this document.


---

## File: EXPERIENCE.md

# Experience contract

This document is the product fit test. It describes what the trader must be able to do, not a fixed screen diagram.

## Workspace grammar

The chart owns the primary spatial and temporal context. Tool panels may dock, float, collapse, or detach if they preserve a clear return to that context. The trader can invoke common actions from a toolbar, chart context, or search/command entry point. The implementation may change placement after hands-on evidence, while keeping the task behavior below.

| Intent | Action at the point of work | Context that must survive |
|---|---|---|
| Inspect | Change instrument/timeframe, pan, zoom, crosshair, inspect a candle | Other workspace settings and saved objects |
| Mark | Draw/edit a level, annotate, undo or redo | Price/time anchoring and drawing identity |
| Compute | Add an indicator or draft script; change inputs and see outputs | Visible chart, input state, errors, saved draft |
| Rewind | Choose a historical point on the chart and step/play | Drawings and eligible indicators under the historical clock |
| Decide | Mark a take/decline choice or submit a simulated order | The exact visible information and active clock |
| Review | Inspect outcome, assumptions, and relevant evidence | Return path to the originating chart and time |
| Resume | Reload or return to current data | Saved workspace and explicit state of interrupted activity |

## Required walkthroughs

**W1 — Bare chart.** In a fresh installation, open XAUUSD 15m; inspect bars, draw a horizontal boundary, change timeframe, return, and reload. No Program, Method, account, or session is requested. The drawing remains aligned to its intended price and time context.

**W2 — Unplanned exploration.** On EURUSD, add an indicator, create a short script draft, hide the editor, draw a note, then reopen the draft. Changes remain recoverable without publishing a Method Version.

**W3 — Blind history.** Start replay at a chosen historical bar, advance, change between compatible timeframes, and inspect a script or indicator. No future value, drawing added later in the original timeline, current-market quote, or hidden result may leak into a historical decision. If an item cannot be safely shown, say so in context.

**W4 — Human decision.** In replay, place a simulated trade or explicitly decline a detected opportunity, advance time, and inspect what followed. A manual observation can be noted without fabricating a machine-qualified opportunity. The origin of each record is visible.

**W5 — Mechanical idea.** Edit a script, see its plots/signals, run a bounded backtest, inspect trades and assumptions, change one input, and compare exact runs. A run pins the revision used; editing the draft cannot silently alter an earlier result.

**W6 — Current-market boundary.** Switch out of replay and see an unmistakable current-market state. Historical simulated orders cannot route to a current-market paper or live account. A later live script cannot gain account authority merely because it ran in backtest.

The stage plan says when each walkthrough becomes executable. Once a walkthrough passes, later stages must preserve it or explicitly document a regression and fix it before closure.

## Quality judgments

The builder and verifier should record a short screen capture of each walkthrough, including hesitations, missing affordances, and unnecessary context switches. The owner can reject an interaction that is technically correct but feels constrained or confusing. Such feedback becomes a concrete scenario or decision record before remediation.

Avoid measuring elegance by the number of features or by similarity of visual styling to TradingView. Measure whether the trader can approach the chart naturally, make a local action, retain context, and discover deeper controls when needed. The tool can be specialized without filling every panel at startup.

## Accessibility and device scope

Desktop browser is the initial working target. Essential controls have keyboard access, visible focus and usable labels; state is not conveyed by color alone. A narrower viewport must avoid data loss or unusable dialogs. Full mobile chart authoring is a later decision. Every interactive stage includes a real-browser pass at the agreed desktop and narrow widths.

## Honest states

The app distinguishes loading, saved, saving, failed, unavailable data, stale data, replay time, current time, simulated order, and live account. It never calls a calculation state an order or a backtest result a live outcome. When a provider, chart type, or timeframe is unsupported, the user sees the actual limitation and can recover.


---

## File: ARCHITECTURE.md

# Architecture and selection boundaries

## Dependency direction

New trading app → reusable trading capability or adapter → public, pinned VICT contracts. A specialized chart surface and an external market/simulation engine sit behind explicit interfaces. VICT core never imports trading concepts. The app remains the composition point for provider choice, account identity, presentation, and deployment.

| Owner | Carries |
|---|---|
| **VICT public release** | Verified generic application definition, capabilities, contracts, authorization, data and UI integration at consequential boundaries |
| **Trading domain layer** | Instrument/bar semantics, time and provenance, script/method identity where needed, replay/evaluation contracts, opportunity/decision/evidence records |
| **Engine adapter** | Translation between the domain contracts and a selected external data/simulation/execution engine; no engine type leaks into the product definition |
| **Chart surface** | High-frequency pan/zoom/crosshair/drawing/overlay interaction and chart-specific rendering; registered through the supported VICT UI extension seam |
| **App** | Workspace composition, product text, provider configuration, visual arrangement, account grants, and deployment |

These are ownership boundaries, not a mandate to publish five packages. Extract a package only when isolation, dependency weight, or a second consumer demonstrates value. A capability pack governs coarse operations; it does not run once per bar or implement the chart's pointer interaction.

## Platform intake at Stage 0

Record the exact public VICT release-set identity, package versions, integrity/provenance, UI extension contract, app-data persistence contract, Builder Kit artifact availability and verification command. Inspect current public packages rather than importing from an in-progress UI branch. The planned roles of @victframework/ui and @victframework/ui-svelte must be checked against published artifacts; do not assume the older renderer is the new canonical path. If a required versioned chart component island cannot be expressed through public APIs, file a narrow upstream gap and mark the corresponding gate blocked. Do not bury the gap inside app-specific renderer internals.

Builder Kit use is conditional on a verified artifact and its accepted task scope. It governs repository work; it is not an app runtime or a trading-agent dependency.

## Chart selection proof

Compare a small number of embeddable chart candidates using the same fixture and Svelte host. Evaluate license/commercial terms, time/price coordinate mapping, drawings and overlays, multi-chart synchronization, replay data window control, keyboard/accessibility affordances, performance on a representative history, bundle and lifecycle behavior, and the public VICT component seam. Record measured or observed results and choose the simplest candidate that passes the required stage. A screenshot is insufficient.

## Market and engine selection proof

Use a pinned small dataset with known gaps and two contrasting mechanical rules. A candidate engine must demonstrate deterministic bar ordering, closed-bar timing, spread/cost/fill assumptions, step/pause/resume for a human decision, future-data isolation, restart/reconstruction, and equivalent rule behavior where backtest and replay overlap. Record license, runtime footprint, supported markets and provider/broker limits. NautilusTrader and LEAN are research candidates, not decisions. If neither passes, define the minimum custom behavior required before implementing it.

The engine runs market-time calculations in batches or its native loop. VICT governs bounded operations such as starting a run, recording a decision, changing an account grant, and reconciling an order. Per-bar framework calls are outside the performance path.

## Time and identity

Historical data carries source, instrument, timezone convention, timeframe, range, revision, gaps and availability. An evaluation pins its exact script/rule revision, data revision, engine revision, inputs, clock policy, and fill assumptions. At historical time T, eligible computations cannot access information later than T. Multi-timeframe calculations explicitly define when a larger bar becomes available. A missing interval is unavailable, never silently replaced with a stale value.

Drafts can mutate. Pinned runs cannot. The evidence system can record human notes without inventing a qualified signal. An enabled detector records its qualified opportunities and any take/decline decision with its exact source revision.

## Execution boundary

Paper, replay and live account endpoints have distinct identities and visible state. Live automation is separately enabled for a particular script revision, account and limits; an emergency stop and post-restart reconciliation are required. Backend-only credentials and order transport stay outside browser bundles. An AI helper may propose or explain, but it cannot acquire builder tools or live order grants through this app.

## Change control

Compatibility upgrades and substitutions are explicit proof tasks. A dependency replacement must rerun the affected walkthroughs and identity/time tests. Document a material departure from this architecture in DECISIONS.md with evidence and changed evaluation criteria before adopting it.


---

## File: STAGES.md

# Stage plan and exit gates

**Status:** planned gates. The builder may split a stage into smaller commits and internal tasks. Stage names govern development, not product navigation. Every gate requires the relevant checks in EVALUATION.md and a fresh verifier's verdict. A passing unit suite cannot substitute for the user walkthrough.

## G0 — Repository and technology intake

**Outcome:** a reproducible new consumer baseline and evidence-based component selection. Verify the supplied empty repository and its remote/default branch. Record VICT public release identity, exact package pins, the current UI extension seam, and Builder Kit distribution and verification status. Compare chart candidates in a minimal running host. Probe simulation engine candidates with the pinned dataset and human-paced replay requirements; a final engine choice may remain deferred if no simulation code is needed in G1.

**Pass:** a fresh checkout installs/builds/runs using documented commands; a real chart candidate demonstrates pan, zoom, time/price mapping and one durable drawing through the public UI seam; dependency/license and bundle observations are recorded; the engine decision is either supported by a runnable proof or explicitly open with a proof task. No old Trading OS code or private VICT source is copied into the new consumer by default. A Builder Kit bootstrap, if used, passes its app verification gate.

**Stop:** an indispensable public VICT extension is unavailable; package identity/integrity cannot be established; a chart license blocks intended use; or the proposed engine cannot meet future-time isolation and no alternative has been evaluated. Report a minimal upstream issue or alternate route; do not declare G0 complete.

## G1 — Native chart workspace

**Outcome:** the chart is the home. Open XAUUSD/EURUSD fixture or licensed historical data in a desktop browser; select instrument/timeframe; pan, zoom, crosshair; create/edit/remove and undo/redo an anchored drawing; save and restore workspace arrangement and objects. Provide clear loading, unavailable, saving and failed states.

**Pass:** W1 succeeds from a fresh profile without Program, Method, Session or account setup; a reload and fresh browser session restore the intended drawing and symbol/timeframe; time/price anchoring survives pan/zoom/timeframe change; controls work by mouse and keyboard where applicable; the chart remains useful with tool panels open. A fresh verifier repeats the flow and records a screen capture.

**Stop:** a static chart or navigation mockup, a drawing stored only as screen pixels, lost state after reload, or a form workflow that blocks the bare chart.

## G2 — Blind replay in the workspace

**Outcome:** choose a historical start on the chart, step/play/pause, switch supported timeframes, restore or deliberately reset a session, and return to current data. Data, indicators, drawings and tooltips obey one historical clock.

**Pass:** W3 works with a poison-future fixture whose later bars would change an incorrect result; no future price, larger-timeframe unfinished bar, later annotation, current quote or future-derived output leaks into the historical view. Step and reload behavior match recorded rules. Replay and current context are unmistakably labelled. Multi-chart support, if delivered, is synchronized and verified at differing timeframes. A missing data interval has an explicit unavailable state.

**Stop:** chart masking only while calculations still see future data; historical controls that can send an order to a current-market endpoint; or an unsupported timeframe silently substituted.

## G3 — Script experiments and reproducible tests

**Outcome:** a draft script can plot or signal on the chart without formal method creation. A strategy variant can run an explicit bounded backtest. The editor and results stay connected to the originating workspace. Select a scripting runtime on evidence; document supported syntax, resource limits, sandbox boundary and error behavior.

**Pass:** W2 and W5 work. A draft survives hide/reopen and reload. An invalid script gives actionable local feedback without corrupting the saved version. Two runs with identical pinned inputs and assumptions produce identical output identity and results; changing one input yields a distinct run. At a historical bar, the script only sees eligible information. Run results cannot be rewritten by editing the draft. A strategy's simulated orders never imply a live account grant.

**Stop:** non-reproducible results; unrestricted script access to server secrets or future data; mandatory formal versioning before a script can be tried; or an engine choice made without the G0/G3 selection evidence.

## G4 — Manual and mechanical simulated decisions

**Outcome:** from the workspace, make manual replay trades, decline a detected opportunity, and use current-market paper trading. Display orders, position, stop/target and outcome in chart context. Mechanical scripts may trade in backtest/replay and paper environments through the supported engine boundary.

**Pass:** W4 and W6 work. Replay and current-market paper have separate clocks and account identities. A take/decline record captures what was visible at decision time; manually marked observations are distinguishable from detector-qualified opportunities. Fill, spread, cost, gap and stop/target assumptions are stated and tested against a hand-calculated small fixture. Restart preserves completed evidence and reconciles an interrupted activity without duplicating trades.

**Stop:** any historical action routes to current-market trading; an unexplained difference between backtest and replay on overlapping conditions; or a declined opportunity being presented as an actual trade.

## G5 — Evidence and comparison

**Outcome:** inspect decisions, trades, rejected opportunities, notes and exact run assumptions from the chart; compare script revisions and outcomes without losing the originating time and symbol. Evidence is available when wanted and does not become a prerequisite for casual exploration.

**Pass:** the trader can answer which script/data/engine/fill assumptions produced a selected result; distinguish taken, declined, missed (only when an enabled detector supports that claim), and manually noted cases; compare two pinned runs; return to the originating chart point. Known gaps and unavailable results are visible. Restart preserves the record and its identity.

**Stop:** a performance claim that omits known costs or data gaps; records that cannot be traced to an exact source; or a journal form imposed before drawing, replaying or drafting.

## G6 — Current market and live authority

**Outcome:** current data and account adapters, assisted orders, and separately enabled automated orders for an exact script revision. Implement the specific provider interfaces supported by evidence. Begin with a non-live integration proof and a controlled paper run.

**Pass:** provider staleness and disconnection are visible; an assisted order requires explicit trader confirmation; automation requires an explicit account-specific enable action and bounded limits; a stop command prevents new orders and reports uncertain in-flight orders; restart reconciles external orders before resuming; duplicate/retry tests do not create unintended orders. Exact script revision, account, risk decision and broker receipt are traceable. Independent verification includes negative authority tests. Owner review is required before any real account is connected or live order capability is enabled.

**Stop:** missing reconciliation or emergency stop, implicit account authority, secrets in a browser bundle, uncertain order state displayed as confirmed, or reliance on backtest performance as live readiness.

## G7 — AI assistance

**Outcome:** optional explanation and idea refinement within the chart workspace, grounded in the visible data and durable records. The helper can propose script changes or investigations through reviewable artifacts.

**Pass:** it labels observed facts and hypotheses distinctly; cites the exact chart time, data and run it used; cannot see future replay data; script edits require review; account authority and order execution stay on the explicit G6 path. Fresh verifier attempts prompt-driven scope or authority escalation and records the outcome.

**Stop:** an AI claim treated as an unverified signal, unreviewed script activation, or any path from conversational instruction to live order authority.

## Change rules

If a stage exposes a better dependency order, update this plan with evidence and a decision record before implementation crosses the affected boundary. A later stage cannot waive an earlier safety/time/identity gate. A stage may be deferred, but the final report must say which product capabilities are absent. Full TradingView feature parity is not an exit criterion.


---

## File: EVALUATION.md

# Evaluation and evidence protocol

## Verdict vocabulary

- **PASS:** every required stage criterion demonstrated with reproducible evidence and a fresh verifier's independent attempt.
- **PASS WITH NON-BLOCKING FINDINGS:** all required behaviors pass; each minor issue is identified, bounded, owned and carried forward.
- **HELD:** a required fact, browser demonstration, owner experience judgment, or external integration proof is missing.
- **FAIL:** a required behavior contradicts observed evidence.
- **BLOCKED:** the stage depends on an unavailable public platform contract, data right, authorization or external service; record the precise dependency.

A builder report is a candidate, not an independent verdict. A screenshot without interaction evidence cannot pass a workflow. Never convert a missing demonstration into a pass by inference. Owner sign-off is a separate final product acceptance unless a stage explicitly requires it, as G6 does for real account activation.

## Shared checks on every stage

| Dimension | Required evidence |
|---|---|
| Provenance | Target repo URL, branch, base and final full SHAs, exact VICT release and external dependency identities, clean or disclosed working tree |
| Build | Fresh install/build/typecheck/lint and relevant tests with commands, versions and results; no unexplained skipped required check |
| Browser | Real-browser task run at agreed desktop and narrow widths, with screen capture or step screenshots showing interaction and recovery |
| Boundary | Public API usage; server/browser separation; no source checkout or private renderer imports in the consumer; no unapproved cross-repo edits |
| Time/data | Relevant data revision, timezone, timeframe, gap behavior and historical availability; future-poison and unfinished-bar cases from G2 onward |
| State | Save/reload/restart and interruption behavior appropriate to the stage, including truthful failure states |
| Authority | No unintended account, secret, publish or live-order authority; negative tests deepen with G4 and G6 |
| Product fit | Walkthrough IDs actually attempted, context switches or friction noted, and explicit owner feedback when the gate requires hands-on judgment |

Scope tests to the risk introduced by the stage. Avoid unit tests that only repeat the implementation. A browser interaction, deterministic fixture, or crash/restart proof is more useful when it catches a distinct failure.

## Stage evidence bundle

Each candidate writes one concise report in the new repo under docs/evidence/Gx/ with:

1. **Claim matrix:** criterion ID, PASS/FAIL/NOT DEMONSTRATED, direct evidence path and short explanation.
2. **Reproduction:** exact commands, dataset/input revisions, environment, browser size, and steps.
3. **Artifacts:** screen capture or screenshots, test output, relevant logs with secrets removed, and fixture expected values.
4. **Lineage:** base, final SHA, diff summary, changed dependencies and recorded decisions.
5. **Findings:** severity, user effect, owner, proposed correction, and whether the stage remains held.

The verifier runs against the exact candidate commit from a fresh checkout or isolated worktree, inspects negative cases, and produces a separate report. If the builder remediates after verification, the verifier reruns the affected checks against the new SHA. Preserve red evidence and earlier verdicts rather than rewriting history.

## Experience evaluation

Measure the actual steps in EXPERIENCE.md. Record first-action time only if measured; otherwise use qualitative observations. The evaluator asks:

- Can I act on the chart without a prerequisite form?
- Can I switch tasks without losing instrument, time and drawings?
- Is provisional work cheap to try and recover?
- Do replay/current and simulated/live boundaries remain obvious?
- Can I inspect why a result exists and return to its chart point?

The owner may later identify friction that automated tests miss. Convert that feedback into an observable scenario and fix or explicitly defer it. The independent experience evaluator can hold a stage for concrete friction such as a lost chart context or an imposed prerequisite. Routine stages do not wait for owner feedback. Owner acceptance of the finished product is recorded separately.

## Closure

A stage closes only after candidate report, independent verdict, bounded remediation where needed, and a status update reflecting the verified SHA. A final program report maps G0–G7 verdicts and lists deferred features. It must distinguish a completed research proof, implemented code, independently verified behavior, and owner-approved product fit.


---

## File: RUNBOOK.md

# Agent operating guide

## Roles and separation

**Program steward:** maintains the current-state record, checks that the next stage has authority and prerequisites, coordinates bounded work and collects evidence. This can be the builder; it is not a new product runtime service.

**Builder:** implements within the accepted new-repo scope, chooses routine techniques, runs checks, fixes findings, commits and reports a candidate. It does not certify its own stage as independently verified.

**Fresh verifier:** works from the pinned candidate SHA in an independent checkout/session, tries to falsify the claims, records direct evidence and issues a verdict. It does not silently repair the candidate while auditing.

**Product evaluator:** a fresh agent/session tests the actual experience against the walkthroughs and records friction. The owner makes material product choices and judges the final hands-on experience. An agent can prepare the demo and record observations; it cannot invent owner approval.

Use the smallest number of concurrent agents needed. Parallel implementation is allowed only where files and authority do not overlap; one integrator reconciles a candidate before verification.

## Autonomy envelope

Within an accepted stage scope, the builder may investigate documentation, compare libraries, implement, refactor, add relevant tests, repair failed checks, and revise non-semantic details without another prompt. It may make a product choice only when the pack gives a clear criterion and the evidence selects one option. Record that choice in STATE.md or a decision entry.

Pause and present a concrete, reviewable choice when: two plausible options produce materially different trader behavior; the required VICT public API is absent; an external license or data right is unresolved; a stage requires new repo authority; a scope/policy acceptance record must be created by the owner; or a live account/order/publishing action is involved. Routine passing stages continue without owner review. Report completed independent work before asking.

The overall pack describes the program. Actual repository authority comes from the accepted, repo-specific handoff and its stage scopes. If the verified Builder Kit requires an accepted-scope record tied to exact handoff bytes, obtain and preserve that record; do not generate an apparently valid task pack that lacks authority. Stage scopes can be prepared together for owner review, but a new or changed scope requires its own accepted authority. The builder must not grant itself broader privileges.

## Repository rules

- Work in the user-supplied new trading repo. VICT and the former Trading OS are read-only references unless a separate instruction grants a narrowly scoped change.
- Verify remote, default branch, base SHA, clean state and applicable AGENTS.md before editing. Use isolated branches/worktrees for parallel or audit work.
- Consume pinned public VICT artifacts and record release identity. Do not copy packages from a local VICT checkout to make a consumer gate pass.
- Commit logical increments; push only to the authorized target branch/remote. Report the full SHA and URL. Preserve audit evidence and red runs.
- Never put credentials, broker tokens or private data in source, screenshots, logs, prompts or fixtures. Do not place a real order during development verification.

## Stage loop

1. Verify authority, baseline and stage prerequisites.
2. Write a short implementation plan tied to criterion IDs; keep architecture decisions open until the required proof.
3. Build the smallest complete user slice; include truthful empty, loading and error states.
4. Run meaningful automated checks and the relevant real-browser walkthrough.
5. Produce a candidate commit and evidence report.
6. Have a fresh verifier try the stage independently. Repair failures within scope and reverify changed behavior.
7. Update STATE.md with the actual verdict and SHA. Continue to the next preauthorized stage; pause at a defined owner/authority boundary.

An agent can continue autonomously through preauthorized stages after PASS or PASS WITH NON-BLOCKING FINDINGS. A HELD, FAIL or BLOCKED gate prevents claiming the next dependent capability. It may still investigate independent work that does not rely on the failed gate.

## Scope changes and decisions

Use concise decision entries: question, options demonstrated, chosen path, evidence, impact on experience and stages, authority, date and SHA. Do not manufacture certainty about the scripting language, chart or engine during G0. A reusable trading package is justified when real reuse or isolation is demonstrated; moving app code into a differently named package alone is not proof.

When a VICT platform gap blocks a required interaction, describe a minimal public contract and an isolated upstream proof. Keep the consumer held at that gate until a verified released path or accepted product rescope exists. The app should not depend on an unpublished UI branch.


---

## File: STATE.md

# Current state and decision register

**As of 2026-09-26:** This is a proposed development pack. No new target repository, accepted handoff, published VICT release identity, chart library, script runtime, engine, provider or broker has been pinned by this pack. No G0–G7 stage has begun in the new product.

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
| O-01 | New repository identity and authorized remote/branch | User-supplied URL; binding handoff |
| O-02 | VICT release and UI extension contract | Published artifacts and browser spike, G0 |
| O-03 | Chart component and drawing model | Candidate task comparison, G0 |
| O-04 | Historical/current data provider and resolution | Provenance, availability, rights, G0–G2 |
| O-05 | Simulation engine and script language | Replay/script proofs, G0–G3 |
| O-06 | Package extraction boundary | Consumer dependency and second-use evidence, G3–G5 |
| O-07 | Live provider, account and risk settings | Separate owner decision and G6 proof |

Update this page after every gate. Supersede a decision explicitly and retain its earlier evidence. Do not present a proposal as an accepted product rule.


---

## File: HANDOFF-TEMPLATE.md

# Repository-specific autonomous handoff template

This file is a template. Fill every bracketed field from verified facts before giving it to an executing agent. The pack alone grants no repository authority.

## Target and provenance

- New app repository: [exact user-supplied URL]
- Default branch and base full SHA: [verified values]
- Authorized work branch/push remote: [exact names]
- Read-only references: https://github.com/radz2291/vict-02 and https://github.com/radz2291/VICT-Trading
- Accepted pack revision/digest: [exact commit or artifact digest]
- VICT public release set and Builder Kit artifact identity: [verified during G0; discovery authority if not yet available]

## Mandate and scope

Implement the accepted G0–G7 program in STAGES.md to the extent covered by explicit stage scopes. Start at G0. Follow PRODUCT.md and EXPERIENCE.md as the product contract. Use EVALUATION.md for proof and RUNBOOK.md for autonomy and stopping. Do not import the older product flow. Repository edit scope, ignore manifest, profile and accepted-scope records: [exact paths/values]. If the Builder Kit requires acceptance for each generated task pack, use the owner-accepted records; never self-accept.

## Stage handoff record

For each stage: criterion IDs, prerequisite candidate SHA, in-scope paths, prohibited paths, expected demo, required checks, evidence path, allowed remediation, verifier identity, and stop conditions. Bind this record to the exact handoff bytes and baseline as required by the available Builder Kit protocol.

## Reports and stop

After each candidate provide exact branch/full SHA, diff summary, commands/results, browser walkthrough evidence, decision changes and unresolved findings. Obtain a fresh verifier verdict against that SHA. Continue through already authorized passing gates. Stop at HELD/FAIL/BLOCKED dependencies, a changed scope, a material product fork, live account activation, or a missing external right. Final report maps every G0–G7 gate to an evidenced verdict and names every unbuilt feature; owner product acceptance remains separate.


---

## File: AGENTS.md

# Agent entry point

Read README.md, PRODUCT.md, EXPERIENCE.md, ARCHITECTURE.md, STAGES.md, EVALUATION.md, RUNBOOK.md and STATE.md before proposing or editing a stage. Follow the accepted repository-specific handoff for authority, scope, baseline, release pins and push destination. If this pack and an accepted handoff conflict, stop and report the exact conflict; do not silently broaden scope.

The user-facing product begins with a usable chart. Verify interactions in a real browser. Record direct evidence and truthful gate verdicts. The builder cannot independently audit its own candidate.
