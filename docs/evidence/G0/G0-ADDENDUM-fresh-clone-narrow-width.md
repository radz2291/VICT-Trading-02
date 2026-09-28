# G0 addendum — fresh-clone check and narrow-width check

**Date:** 2026-09-28 (owner-directed pre-close work within the G1 run; see `docs/HANDOFF.md` G1 record, "Pre-close work")
**Baseline checked:** `ee3e0c7473dcb8dbbcd8d200e5da973684d9f320` (fresh clone verified equal)
**Scope note:** this addendum closes two G0 evidence gaps only. The original G0 report (`spike-host.md`) and its red uPlot findings remain **preserved and unchanged**. No fix to the repository was required; nothing in the documented commands needed correcting.

## Check 1 — fresh clone: install, build, run

Genuinely fresh clone into an isolated temp directory (not the working tree):

| Step | Command | Duration | Result |
|---|---|---|---|
| Clone | `git clone https://github.com/radz2291/VICT-Trading-02 <tempdir>` | — | Cloned HEAD `ee3e0c7…` == expected ✅ |
| Install | `npm install` (in `host/`) | 14.2s (96 packages) | ✅ PASS. Same esbuild `allowScripts` postinstall warning as documented in `spike-host.md` — doc and reality match |
| Build | `npm run build` | 45.6s total (vite 30.6s + adapter-node done) | ✅ PASS (762 modules; adapter-node output written) |
| Serve | `npm run preview` (port 5199, strictPort) | — | ✅ Server started |
| Verify | `curl http://localhost:5199/` | — | **HTTP 200**, 4329 bytes; SSR HTML contains `vict-app` host div, 2× lightweight-charts island shells, 1× uPlot island shell, XAUUSD/EURUSD instrument options — no SSR crash |

**Result: PASS.** A fresh checkout installs, builds, and runs using exactly the documented commands, with no discrepancies between `spike-host.md` and observed reality.

## Check 2 — narrow-width browser layout

**Methodology note (recorded honestly):** two earlier measurement passes produced contradictory overflow readings. Root cause was measurement error, not page behavior: (1) `Emulation.setDeviceMetricsOverride` **persists per browser target** and polluted subsequent "real window" resize attempts; (2) applying an override *after* page load leaves chart canvases at their initialization width (stale canvas sizing), which reads as overflow that a fresh load does not have. The final, clean protocol — used for the recorded results — is: clear stale emulation, set the target width, **reload the page fresh at that width**, then measure. Screenshots from the flawed intermediate passes were discarded; only clean-protocol captures are retained.

**Results (fresh load at each width, Chrome via CDP):**

| Width | Overflow? | Overflowing elements | Island layout |
|---|---|---|---|
| 1280×800 | No (`docScrollW` 1265 ≤ 1280) | none | 2 islands side-by-side, 946px each |
| 768×900 | No (`docScrollW` 753 ≤ 768) | none | islands stacked, 469px each |
| 375×700 | No (`docScrollW` 360 ≤ 375) | none | islands stacked, 308px each |

Visual confirmation at 375px (`fresh-clone-375.png`): candles render and remain readable; price axis and instrument legend legible; last-close label (2647.77) visible; uPlot island header renders below (its canvas body falls below the fold at this viewport height — scroll reaches it).

**Result: PASS for initial load at narrow widths.** The G0 spike page has no horizontal overflow at 1280/768/375 and both islands lay out and shrink proportionally.

**Honest limitations carried forward for G1:**
- **Live resize after load was not cleanly testable** in this pass: emulated metric changes applied after load can leave chart canvases at stale sizes (observed in the discarded intermediate measurements), and real OS-window resizes could not go below Chrome's minimum window width (~500px). Whether both chart types re-layout correctly on a *live* narrow resize is therefore **unverified** here — the G1 workspace must handle live window resizing and must be verified doing so.
- The spike page has no persistence UI and nothing to lose at narrow widths; "no data loss at narrow width" is meaningful only from G1 onward.

## Screenshots

- `gap-shots/fresh-clone-1280.png` — fresh load @1280 (clean protocol)
- `gap-shots/fresh-clone-768.png` — fresh load @768
- `gap-shots/fresh-clone-375.png` — fresh load @375 (visually confirmed usable chart)

**Not retained:** intermediate screenshots from the two flawed measurement passes (emulation-state artifacts; misleading). Real-window resize shots (`fresh-clone-realwin-*.png`) were also affected by leftover emulation state and are superseded by the clean-protocol results above.

## Verdict

Both owner-directed G0 evidence gaps are **closed: PASS**. No repository fixes were needed; documented G0 commands proved accurate. G0 evidence is now complete: original report and red uPlot findings preserved, fresh-clone reproducibility demonstrated, narrow-width initial-load behavior recorded with honest limitations passed to G1.
