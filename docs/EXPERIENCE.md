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
