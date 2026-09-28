# G0 attempt-3 raw fetch manifest

Fetched 2026-09-28 (npm registry Date headers all 14:15-14:21 GMT this session).
Every response relied on by attempt-3-platform-intake-brief.md is saved in this directory.
The attempt-2 files under docs/evidence/G0/raw/ are untouched and remain valid evidence.

Source URL per file:
- npm-search-victframework.json <- https://registry.npmjs.org/-/v1/search?text=@victframework&size=250
- npm-<pkg>.json <- https://registry.npmjs.org/@victframework%2f<pkg> (per-package registry doc; npm-builder-kit.json is the saved 404 body)
- <pkg>-0.4.0-rc.1.tgz <- https://registry.npmjs.org/@victframework/<pkg>/-/<pkg>-0.4.0-rc.1.tgz (extracted under tarball-inspect/ for reading; SHA-512 verified byte-exact against registry dist.integrity for ui, ui-svelte, application)
- gh-repo-main-commit.json <- https://api.github.com/repos/radz2291/vict-02/commits/main
- gh-contents-packages.json <- https://api.github.com/repos/radz2291/vict-02/contents/packages
- gh-tree-main.json <- https://api.github.com/repos/radz2291/vict-02/git/trees/main?recursive=1
- gh-tags.json <- https://api.github.com/repos/radz2291/vict-02/tags
- gh-releases.json <- https://api.github.com/repos/radz2291/vict-02/releases
- git-ls-remote-tags.txt <- git ls-remote --tags https://github.com/radz2291/vict-02.git (empty output)
- repo-RELEASE-COMPATIBILITY.md <- https://raw.githubusercontent.com/radz2291/vict-02/main/RELEASE-COMPATIBILITY.md (HTTP 404 - doc moved to docs/RELEASE-COMPATIBILITY.md; body is the literal 404 text)
- repo-doc-RELEASE-COMPATIBILITY.md <- https://raw.githubusercontent.com/radz2291/vict-02/main/docs/RELEASE-COMPATIBILITY.md
- repo-README.md <- https://raw.githubusercontent.com/radz2291/vict-02/main/README.md
- repo-package.json <- https://raw.githubusercontent.com/radz2291/vict-02/main/package.json
- pkg-ui-README.md <- https://raw.githubusercontent.com/radz2291/vict-02/main/packages/ui/README.md (HTTP 404 - does not exist)
- pkg-ui-svelte-README.md <- https://raw.githubusercontent.com/radz2291/vict-02/main/packages/ui-svelte/README.md (HTTP 404 - does not exist)
- pkg-ui-src-index.ts / pkg-ui-src-composition.ts / pkg-ui-src-feedback.ts / pkg-ui-package.json <- raw.githubusercontent.com/radz2291/vict-02/main/packages/ui/...
- pkg-ui-svelte-src-*.ts / pkg-ui-svelte-package.json <- raw.githubusercontent.com/radz2291/vict-02/main/packages/ui-svelte/...
- pkg-scaffolder-src-index.ts, pkg-application-src-release.ts <- raw.githubusercontent.com (vict-02 main)
- pkg-builder-kit-README.md, pkg-builder-kit-package.json <- raw.githubusercontent.com/radz2291/vict-02/main/packages/builder-kit/...
- ref-app-host-page.svelte <- .../examples/reference-app/src/routes/[...vict]/+page.svelte
- ref-app-registry.ts <- .../examples/reference-app/src/lib/components/registry.ts
- ref-app-package.json <- .../examples/reference-app/package.json
- ui-showcase-host-page.svelte <- .../examples/ui-showcase/src/routes/[...vict]/+page.svelte
- qa4-* <- .../qa-artifacts/qa4/consumer-compat/src/* and package.json (packed-tarball consumer proof fixture)
- doc-RELEASE-EXEC-R2.md / doc-RELEASE-EXEC-R3.md / doc-RELEASE-IMPACT-UI-PACKAGES.md / doc-UI-COMPOSITION-SLICE-1.md / doc-UI-FACADE-RETIREMENT.md <- raw.githubusercontent.com/radz2291/vict-02/main/ (docs/ and qa-artifacts/)

Per-file HTTP status and registry Date header (third column = last column of the four):
| `application-0.4.0-rc.1.tgz` | 200 | Mon, 28 Sep 2026 14:18:41 GMT | `application-0.4.0-rc.1.tgz.headers.txt` |
| `doc-RELEASE-EXEC-R2.md` | 200 | Mon, 28 Sep 2026 14:21:21 GMT | `doc-RELEASE-EXEC-R2.md.headers.txt` |
| `doc-RELEASE-EXEC-R3.md` | 200 | Mon, 28 Sep 2026 14:18:11 GMT | `doc-RELEASE-EXEC-R3.md.headers.txt` |
| `doc-RELEASE-IMPACT-UI-PACKAGES.md` | 200 | Mon, 28 Sep 2026 14:17:28 GMT | `doc-RELEASE-IMPACT-UI-PACKAGES.md.headers.txt` |
| `doc-UI-COMPOSITION-SLICE-1.md` | 200 | Mon, 28 Sep 2026 14:17:33 GMT | `doc-UI-COMPOSITION-SLICE-1.md.headers.txt` |
| `doc-UI-FACADE-RETIREMENT.md` | 200 | Mon, 28 Sep 2026 14:17:34 GMT | `doc-UI-FACADE-RETIREMENT.md.headers.txt` |
| `gh-contents-packages.json` | 200 | Mon, 28 Sep 2026 14:16:50 GMT | `gh-contents-packages.headers.txt` |
| `gh-releases.json` | 200 | Mon, 28 Sep 2026 14:16:58 GMT | `gh-releases.headers.txt` |
| `gh-repo-main-commit.json` | 200 | Mon, 28 Sep 2026 14:16:50 GMT | `gh-repo-main-commit.headers.txt` |
| `gh-tags.json` | 200 | Mon, 28 Sep 2026 14:16:57 GMT | `gh-tags.headers.txt` |
| `gh-tree-main.json` | 200 | Mon, 28 Sep 2026 14:16:54 GMT | `gh-tree-main.headers.txt` |
| `git-ls-remote-tags.txt` | git | git ls-remote (no HTTP) | (no header captured) |
| `npm-appdata-sqlite.json` | 200 | Mon, 28 Sep 2026 14:16:05 GMT | `npm-appdata-sqlite.headers.txt` |
| `npm-application.json` | 200 | Mon, 28 Sep 2026 14:15:49 GMT | `npm-application.headers.txt` |
| `npm-builder-kit.json` | 404 | Mon, 28 Sep 2026 14:16:21 GMT | `npm-builder-kit.headers.txt` |
| `npm-cli.json` | 200 | Mon, 28 Sep 2026 14:16:19 GMT | `npm-cli.headers.txt` |
| `npm-contracts.json` | 200 | Mon, 28 Sep 2026 14:15:54 GMT | `npm-contracts.headers.txt` |
| `npm-control.json` | 200 | Mon, 28 Sep 2026 14:16:14 GMT | `npm-control.headers.txt` |
| `npm-kernel.json` | 200 | Mon, 28 Sep 2026 14:15:57 GMT | `npm-kernel.headers.txt` |
| `npm-mastra.json` | 200 | Mon, 28 Sep 2026 14:16:11 GMT | `npm-mastra.headers.txt` |
| `npm-renderer-svelte.json` | 200 | Mon, 28 Sep 2026 14:15:47 GMT | `npm-renderer-svelte.headers.txt` |
| `npm-runtime.json` | 200 | Mon, 28 Sep 2026 14:16:00 GMT | `npm-runtime.headers.txt` |
| `npm-scaffolder.json` | 200 | Mon, 28 Sep 2026 14:16:08 GMT | `npm-scaffolder.headers.txt` |
| `npm-sdk.json` | 200 | Mon, 28 Sep 2026 14:15:51 GMT | `npm-sdk.headers.txt` |
| `npm-search-victframework.json` | 200 | Mon, 28 Sep 2026 14:15:34 GMT | `npm-search-victframework.headers.txt` |
| `npm-server.json` | 200 | Mon, 28 Sep 2026 14:16:16 GMT | `npm-server.headers.txt` |
| `npm-store-sqlite.json` | 200 | Mon, 28 Sep 2026 14:16:02 GMT | `npm-store-sqlite.headers.txt` |
| `npm-ui-svelte.json` | 200 | Mon, 28 Sep 2026 14:15:43 GMT | `npm-ui-svelte.headers.txt` |
| `npm-ui.json` | 200 | Mon, 28 Sep 2026 14:15:41 GMT | `npm-ui.headers.txt` |
| `pkg-application-src-release.ts` | 200 | Mon, 28 Sep 2026 14:17:35 GMT | `pkg-application-src-release.ts.headers.txt` |
| `pkg-builder-kit-README.md` | 200 | Mon, 28 Sep 2026 14:17:07 GMT | `pkg-builder-kit-README.md.headers.txt` |
| `pkg-builder-kit-package.json` | 200 | Mon, 28 Sep 2026 14:21:23 GMT | `pkg-builder-kit-package.json.headers.txt` |
| `pkg-scaffolder-src-index.ts` | 200 | Mon, 28 Sep 2026 14:18:08 GMT | `pkg-scaffolder-src-index.ts.headers.txt` |
| `pkg-ui-README.md` | 404 | Mon, 28 Sep 2026 14:17:06 GMT | `pkg-ui-README.md.headers.txt` |
| `pkg-ui-package.json` | 200 | Mon, 28 Sep 2026 14:17:26 GMT | `pkg-ui-package.json.headers.txt` |
| `pkg-ui-src-composition.ts` | 200 | Mon, 28 Sep 2026 14:17:25 GMT | `pkg-ui-src-composition.ts.headers.txt` |
| `pkg-ui-src-feedback.ts` | 200 | Mon, 28 Sep 2026 14:17:25 GMT | `pkg-ui-src-feedback.ts.headers.txt` |
| `pkg-ui-src-index.ts` | 200 | Mon, 28 Sep 2026 14:17:24 GMT | `pkg-ui-src-index.ts.headers.txt` |
| `pkg-ui-svelte-README.md` | 404 | Mon, 28 Sep 2026 14:17:06 GMT | `pkg-ui-svelte-README.md.headers.txt` |
| `pkg-ui-svelte-package.json` | 200 | Mon, 28 Sep 2026 14:17:27 GMT | `pkg-ui-svelte-package.json.headers.txt` |
| `pkg-ui-svelte-src-component-actions.ts` | 200 | Mon, 28 Sep 2026 14:18:06 GMT | `pkg-ui-svelte-src-component-actions.ts.headers.txt` |
| `pkg-ui-svelte-src-component-context.ts` | 200 | Mon, 28 Sep 2026 14:18:07 GMT | `pkg-ui-svelte-src-component-context.ts.headers.txt` |
| `pkg-ui-svelte-src-index.ts` | 200 | Mon, 28 Sep 2026 14:18:06 GMT | `pkg-ui-svelte-src-index.ts.headers.txt` |
| `qa4-App.svelte` | 200 | Mon, 28 Sep 2026 14:18:09 GMT | `qa4-App.svelte.headers.txt` |
| `qa4-ConsumerIsland.svelte` | 200 | Mon, 28 Sep 2026 14:18:08 GMT | `qa4-ConsumerIsland.svelte.headers.txt` |
| `qa4-consumer-package.json` | 200 | Mon, 28 Sep 2026 14:18:10 GMT | `qa4-consumer-package.json.headers.txt` |
| `qa4-main.js` | 200 | Mon, 28 Sep 2026 14:18:09 GMT | `qa4-main.js.headers.txt` |
| `ref-app-host-page.svelte` | 200 | Mon, 28 Sep 2026 14:18:17 GMT | `ref-app-host-page.svelte.headers.txt` |
| `ref-app-package.json` | 200 | Mon, 28 Sep 2026 14:18:05 GMT | `ref-app-package.json.headers.txt` |
| `ref-app-registry.ts` | 200 | Mon, 28 Sep 2026 14:18:05 GMT | `ref-app-registry.ts.headers.txt` |
| `repo-README.md` | 200 | Mon, 28 Sep 2026 14:17:08 GMT | `repo-README.md.headers.txt` |
| `repo-RELEASE-COMPATIBILITY.md` |  |  | (no header captured) |
| `repo-doc-RELEASE-COMPATIBILITY.md` | 200 | Mon, 28 Sep 2026 14:17:23 GMT | `repo-doc-RELEASE-COMPATIBILITY.md.headers.txt` |
| `repo-package.json` | 200 | Mon, 28 Sep 2026 14:17:34 GMT | `repo-package.json.headers.txt` |
| `ui-0.4.0-rc.1.tgz` | 200 | Mon, 28 Sep 2026 14:18:38 GMT | `ui-0.4.0-rc.1.tgz.headers.txt` |
| `ui-showcase-host-page.svelte` | 200 | Mon, 28 Sep 2026 14:18:18 GMT | `ui-showcase-host-page.svelte.headers.txt` |
| `ui-svelte-0.4.0-rc.1.tgz` | 200 | Mon, 28 Sep 2026 14:18:40 GMT | `ui-svelte-0.4.0-rc.1.tgz.headers.txt` |
