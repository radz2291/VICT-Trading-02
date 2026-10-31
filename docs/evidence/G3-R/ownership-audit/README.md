# Ownership audit evidence — 2026-10-31

Audited source baseline: `b075c3e086154c84fc10e71d4334cdf027248cea` on radz2291/VICT-Trading-02 main.

This is direct source audit evidence, not an independent packaging-gate verdict. See `docs/APP-PACKAGE-REALIGNMENT-2026-10-31.md` for scope, inventory, findings, limitations, ownership and the implementation contract.

`node docs/evidence/G3-R/ownership-audit/reproduce.mjs` reproduces the host/kit aggregation disagreement with no npm install on Node v24.22.1. It creates/removes a temporary directory, copies three kit source modules changing only `.js` import suffixes to `.ts`, imports the original host fixture generator/aggregator, supplies the same raw source to the kit, and prints the comparison. `results.json` is the observed output at the audited baseline, not an expectation to preserve after the correction. After repair, the host aggregation function may no longer exist; retain this evidence and use a new harness for the new API rather than rewriting this red result.

The source snapshot was fetched from GitHub at the pinned SHA. The local Windows checkout and running browser were not accessed. No full app build or browser pass is claimed. During harness preparation a repository-root path ascended one directory too far; the command failed with ENOENT, the path was corrected and the successful output was then captured. This had no effect on product source.
