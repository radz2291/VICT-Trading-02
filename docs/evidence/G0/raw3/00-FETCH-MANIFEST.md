# raw3 fetch manifest — G0 engine-candidate intake (NautilusTrader + LEAN)

Fetched 2026-09-28, 22:27–22:45 UTC (local Windows time shown by ls). All fetches by curl
(api.github.com, raw.githubusercontent.com, pypi.org, hub.docker.com, lean.io,
quantconnect.com) plus `git ls-remote`. No credentials used. These are raw saved responses;
do not edit them. Provenance only — no engine decision is made from this directory alone.

## Fetch anomaly log
- `gh-repo-nautilus.json`, `gh-license-nautilus.json`, first `gh-releases-nautilus.json`
  attempt: HTTP 404 at 2026-09-28 ~22:26 UTC. Refetched ~22:28 UTC: HTTP 200 for repo and
  license; `gh-releases-nautilus.json` (refetch, per_page=10): HTTP 200. Treat the 404s as
  transient (org listing `gh-org-nautechsystems.json` fetched HTTP 200 in the same window
  contains nautechsystems/nautilus_trader, confirming the repo exists).
- `raw.githubusercontent.com/.../develop/docs/concepts/backtesting/fill-prices-and-matching.md`:
  one curl exit 35 (schannel SSL/TLS handshake failure); refetch HTTP 200.
- `https://www.quantconnect.com/docs/v2/writing-algorithms/backtesting` (`qc-docs-backtesting.html`):
  HTTP 200 but a 23,923-byte JS shell with no engine-content text; NOT usable as evidence.
- `raw.githubusercontent.com/QuantConnect/Lean/master/README.md` first attempt: HTTP 404;
  actual file is lowercase `readme.md` (see `gh-tree-lean.json`) — fetched HTTP 200 as
  `README-lean.md`.
- `pyproject-nautilus.toml` at repo root: HTTP 404 (file is at `python/pyproject.toml`);
  refetched there, HTTP 200.
- LEAN determinism claim: searched lean.io backtesting docs page and quantconnect.com docs;
  no explicit "deterministic" wording found in fetched bytes. Recorded as UNVERIFIED in the brief.

## Files
| File | Source URL | Status |
|---|---|---|
| gh-repo-nautilus.json | https://api.github.com/repos/nautechsystems/nautilus_trader | 200 (after transient 404) |
| gh-license-nautilus.json | https://api.github.com/repos/nautechsystems/nautilus_trader/license | 200 |
| gh-releases-nautilus.json | https://api.github.com/repos/nautechsystems/nautilus_trader/releases?per_page=10 | 200 |
| gh-tags-nautilus.json | https://api.github.com/repos/nautechsystems/nautilus_trader/tags?per_page=10 | 200 |
| gh-org-nautechsystems.json | https://api.github.com/orgs/nautechsystems/repos?per_page=100 | 200 |
| gh-tree-nautilus.json | https://api.github.com/repos/nautechsystems/nautilus_trader/contents/?ref=develop | 200 |
| gh-docs-dir-nautilus.json | https://api.github.com/repos/nautechsystems/nautilus_trader/contents/docs?ref=develop | 200 |
| gh-docs-concepts-nautilus.json | https://api.github.com/repos/nautechsystems/nautilus_trader/contents/docs/concepts?ref=develop | 200 |
| gh-docs-backtesting-dir-nautilus.json | https://api.github.com/repos/nautechsystems/nautilus_trader/contents/docs/concepts/backtesting?ref=develop | 200 |
| gh-docs-data-dir-nautilus.json | https://api.github.com/repos/nautechsystems/nautilus_trader/contents/docs/concepts/data?ref=develop | 200 |
| gh-python-dir-nautilus.json | https://api.github.com/repos/nautechsystems/nautilus_trader/contents/python?ref=develop | 200 |
| README-nautilus.md | https://raw.githubusercontent.com/nautechsystems/nautilus_trader/develop/README.md | 200 |
| LICENSE-nautilus.txt | https://raw.githubusercontent.com/nautechsystems/nautilus_trader/develop/LICENSE | 200 |
| Cargo-nautilus.toml | https://raw.githubusercontent.com/nautechsystems/nautilus_trader/develop/Cargo.toml | 200 |
| rust-toolchain-nautilus.toml | https://raw.githubusercontent.com/nautechsystems/nautilus_trader/develop/rust-toolchain.toml | 200 |
| pyproject-nautilus.toml | https://raw.githubusercontent.com/nautechsystems/nautilus_trader/develop/python/pyproject.toml | 200 |
| version-nautilus.json | https://raw.githubusercontent.com/nautechsystems/nautilus_trader/develop/version.json | 200 |
| version-nautilus-master.json | https://raw.githubusercontent.com/nautechsystems/nautilus_trader/master/version.json | 200 |
| ADAPTERS-nautilus.md | https://raw.githubusercontent.com/nautechsystems/nautilus_trader/develop/ADAPTERS.md | 200 |
| nt-doc-backtesting-index.md | https://raw.githubusercontent.com/nautechsystems/nautilus_trader/develop/docs/concepts/backtesting/index.md | 200 |
| nt-doc-backtesting-apis-and-runs.md | .../docs/concepts/backtesting/apis-and-runs.md | 200 |
| nt-doc-backtesting-data-and-venues.md | .../docs/concepts/backtesting/data-and-venues.md | 200 |
| nt-doc-backtesting-bar-execution.md | .../docs/concepts/backtesting/bar-execution.md | 200 |
| nt-doc-backtesting-fill-prices-and-matching.md | .../docs/concepts/backtesting/fill-prices-and-matching.md | 200 (after 1 SSL retry) |
| nt-doc-backtesting-fill-models.md | .../docs/concepts/backtesting/fill-models.md | 200 |
| nt-doc-backtesting-simulation-modules.md | .../docs/concepts/backtesting/simulation-modules.md | 200 |
| nt-doc-concepts-data.md | .../docs/concepts/data/index.md | 200 |
| nt-doc-concepts-bar.md | .../docs/concepts/data/bar.md | 200 |
| nt-doc-live.md | .../docs/concepts/live.md | 200 |
| git-ls-remote-nautilus-tags.txt | git ls-remote --tags https://github.com/nautechsystems/nautilus_trader.git | ok |
| pypi-nautilus-trader.json | https://pypi.org/pypi/nautilus-trader/json | 200 |
| gh-repo-lean.json | https://api.github.com/repos/QuantConnect/Lean | 200 |
| gh-license-lean.json | https://api.github.com/repos/QuantConnect/Lean/license | 200 |
| gh-releases-lean.json | https://api.github.com/repos/QuantConnect/Lean/releases?per_page=5 | 200 |
| gh-tags-lean.json | https://api.github.com/repos/QuantConnect/Lean/tags?per_page=10 | 200 |
| gh-tree-lean.json | https://api.github.com/repos/QuantConnect/Lean/contents/?ref=master | 200 |
| gh-doc-dir-lean.json | https://api.github.com/repos/QuantConnect/Lean/contents/Documentation?ref=master | 200 |
| gh-brokerages-dir-lean.json | https://api.github.com/repos/QuantConnect/Lean/contents/Brokerages?ref=master | 200 |
| README-lean.md | https://raw.githubusercontent.com/QuantConnect/Lean/master/readme.md | 200 (lowercase name) |
| LICENSE-lean.txt | https://raw.githubusercontent.com/QuantConnect/Lean/master/LICENSE | 200 |
| lean-Dockerfile | https://raw.githubusercontent.com/QuantConnect/Lean/master/Dockerfile | 200 |
| lean-cli-Dockerfile | https://raw.githubusercontent.com/QuantConnect/Lean/master/DockerfileJupyter | 200 |
| lean-config.json | https://raw.githubusercontent.com/QuantConnect/Lean/master/Launcher/config.json | 200 |
| lean-doc-readme.md | https://raw.githubusercontent.com/QuantConnect/Lean/master/Documentation/readme.md | 200 |
| gh-repo-lean-cli.json | https://api.github.com/repos/QuantConnect/lean-cli | 200 |
| README-lean-cli.md | https://raw.githubusercontent.com/QuantConnect/lean-cli/master/README.md | 200 |
| git-ls-remote-lean-tags.txt | git ls-remote --tags https://github.com/QuantConnect/Lean.git | ok |
| dockerhub-quantconnect-lean.json | https://hub.docker.com/v2/repositories/quantconnect/lean/tags?page_size=10 | 200 |
| dockerhub-quantconnect-lean-repo.json | https://hub.docker.com/v2/repositories/quantconnect/lean/ | 200 |
| pypi-lean-cli.json | https://pypi.org/pypi/lean/json | 200 |
| leanio-backtesting-deployment.html | https://www.lean.io/docs/v2/lean-cli/backtesting/deployment | 200 (page fetched; no determinism wording present) |
| qc-docs-backtesting.html | https://www.quantconnect.com/docs/v2/writing-algorithms/backtesting | 200 (JS shell, not usable as engine-doc evidence) |
