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
