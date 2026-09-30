# LEAN local-run feasibility on this machine (G3 Part A2 evidence)

Recorded 2026-09-30 by the G3 stage manager. Read-only checks; nothing installed.

## Checks performed (this machine, win32-x64)

| Check | Result |
|---|---|
| `docker` on PATH | **ABSENT** (`docker: command not found`) |
| `dotnet` SDK on PATH | **ABSENT** (`dotnet: command not found`) |
| Docker Desktop installed (Program Files) | not checked exhaustively; PATH absent is sufficient for the CLI-driven local run |
| LEAN distribution under evaluation | GitHub `QuantConnect/Lean` — Apache-2.0 (verified via GitHub API 2026-09-30); **latest GitHub release `v2.4.0.1` published 2017-08-08** (verified 2026-09-30); current development ships via master branch + Docker images, so a local run without Docker means building the .NET solution from a source pin (repo state at an exact commit), with no released artifact identity to pin |

## Consequence for the A2 comparison

LEAN's supported local execution path (`lean` CLI) requires Docker Desktop;
a Docker-less local run requires building the .NET solution from a source
checkout at an exact commit. Neither Docker nor the .NET SDK exists on this
machine, and installing a full .NET build toolchain to build a repository
whose last released artifact is from 2017 is disproportionate to the G3
bounded-backtest requirement (a single-symbol, 24-bar hand-calculated
fixture and a 2,000-bar bounded run).

**LEAN operational-footprint verdict for this environment: NOT RUNNABLE
LOCALLY without installing Docker Desktop or a .NET SDK toolchain — recorded
as evidence, not as a soft failure.** Any owner decision to adopt LEAN must
account for this first-class integration cost (toolchain install + source
pinning of an unreleased master state + Docker image identity questions).

This evidence is reproducible: rerun `dotnet --version` and `docker --version`
(absent) and check https://github.com/QuantConnect/Lean/releases (latest
release 2017-08-08, verified 2026-09-30).
