# Fetch manifest — G0 platform intake (attempt 2)

Fetched 2026-09-27 (local session time). Timestamps in "Server date" are the
HTTP `Date` response header captured in the saved *.headers.txt files —
authoritative fetch-time evidence per docs/EVALUATION.md. Files without a
headers file (raw.githubusercontent / api.github.com) show the wall-clock
fetch time recorded at save time: 2026-09-27 21:23–21:27 local.

| File | Source URL | HTTP | Server date / fetch time |
|---|---|---|---|
| npm-sdk.json | https://registry.npmjs.org/@victframework%2fsdk | 200 | Sun, 27 Sep 2026 13:22:54 GMT |
| npm-ui.json | https://registry.npmjs.org/@victframework%2fui | 404 | Sun, 27 Sep 2026 13:22:56 GMT |
| npm-ui-svelte.json | https://registry.npmjs.org/@victframework%2fui-svelte | 404 | Sun, 27 Sep 2026 13:23:00 GMT |
| npm-builder-kit.json | https://registry.npmjs.org/@victframework%2fbuilder-kit | 404 | Sun, 27 Sep 2026 13:23:02 GMT |
| npm-contracts.json | https://registry.npmjs.org/@victframework%2fcontracts | 200 | Sun, 27 Sep 2026 13:23:05 GMT |
| npm-renderer-svelte.json | https://registry.npmjs.org/@victframework%2frenderer-svelte | 200 | Sun, 27 Sep 2026 13:23:08 GMT |
| npm-application.json | https://registry.npmjs.org/@victframework%2fapplication | 200 | Sun, 27 Sep 2026 13:23:10 GMT |
| npm-control.json | https://registry.npmjs.org/@victframework%2fcontrol | 200 | Sun, 27 Sep 2026 13:23:14 GMT |
| npm-server.json | https://registry.npmjs.org/@victframework%2fserver | 200 | Sun, 27 Sep 2026 13:23:16 GMT |
| npm-cli.json | https://registry.npmjs.org/@victframework%2fcli | 200 | Sun, 27 Sep 2026 13:23:19 GMT |
| npm-runtime.json | https://registry.npmjs.org/@victframework%2fruntime | — | 2026-09-27 21:22-21:27 local |
| npm-kernel.json | https://registry.npmjs.org/@victframework%2fkernel | — | 2026-09-27 21:22-21:27 local |
| npm-mastra.json | https://registry.npmjs.org/@victframework%2fmastra | — | 2026-09-27 21:22-21:27 local |
| npm-scaffolder.json | https://registry.npmjs.org/@victframework%2fscaffolder | — | 2026-09-27 21:22-21:27 local |
| npm-store-sqlite.json | https://registry.npmjs.org/@victframework%2fstore-sqlite | — | 2026-09-27 21:22-21:27 local |
| npm-appdata-sqlite.json | https://registry.npmjs.org/@victframework%2fappdata-sqlite | — | 2026-09-27 21:22-21:27 local |
| npm-notes-pack.json | https://registry.npmjs.org/@victframework%2fnotes-pack | — | 2026-09-27 21:22-21:27 local |
| npm-search-victframework.json | https://registry.npmjs.org/-/v1/search?text=%40victframework | 200 | 2026-09-27 21:23 local |
| npm-all-victframework.json | https://registry.npmjs.org/-/all?text=@victframework | 404 (ResourceNotFound body) | 2026-09-27 21:23 local |
| repo-README.md | https://raw.githubusercontent.com/radz2291/vict-02/main/README.md | 200 | 2026-09-27 21:23-21:27 local |
| pkg-builder-kit-README.md | https://raw.githubusercontent.com/radz2291/vict-02/main/packages/builder-kit/README.md | 200 | 2026-09-27 21:23-21:27 local |
| pkg-ui-README.md | https://raw.githubusercontent.com/radz2291/vict-02/main/packages/ui/README.md | 404 | 2026-09-27 21:23-21:27 local |
| pkg-renderer-svelte-README.md | https://raw.githubusercontent.com/radz2291/vict-02/main/packages/renderer-svelte/README.md | 404 | 2026-09-27 21:23-21:27 local |
| pkg-application-README.md | https://raw.githubusercontent.com/radz2291/vict-02/main/packages/application/README.md | 404 | 2026-09-27 21:23-21:27 local |
| pkg-sdk-README.md | https://raw.githubusercontent.com/radz2291/vict-02/main/packages/sdk/README.md | 404 | 2026-09-27 21:23-21:27 local |
| pkg-control-README.md | https://raw.githubusercontent.com/radz2291/vict-02/main/packages/control/README.md | 404 | 2026-09-27 21:23-21:27 local |
| doc-STAGE-08.md | https://raw.githubusercontent.com/radz2291/vict-02/main/docs/architecture/STAGE-08-BUILDER-KIT-AND-SELF-HOSTING.md | 200 | 2026-09-27 21:23-21:27 local |
| doc-STAGE-05.md | https://raw.githubusercontent.com/radz2291/vict-02/main/docs/architecture/STAGE-05-APPLICATION-DELIVERY.md | 200 | 2026-09-27 21:23-21:27 local |
| repo-RELEASE-COMPATIBILITY.md | https://raw.githubusercontent.com/radz2291/vict-02/main/docs/RELEASE-COMPATIBILITY.md | 200 | 2026-09-27 21:23-21:27 local |
| repo-package.json | https://raw.githubusercontent.com/radz2291/vict-02/main/package.json | 200 | 2026-09-27 21:23-21:27 local |
| example-application-proof-package.json | https://raw.githubusercontent.com/radz2291/vict-02/main/examples/application-proof/package.json | 200 | 2026-09-27 21:23-21:27 local |
| example-reference-app-package.json | https://raw.githubusercontent.com/radz2291/vict-02/main/examples/reference-app/package.json | 200 | 2026-09-27 21:23-21:27 local |
| ref-app-README.md | https://raw.githubusercontent.com/radz2291/vict-02/main/examples/reference-app/README.md | 200 | 2026-09-27 21:23-21:27 local |
| app-proof-definition.ts | https://raw.githubusercontent.com/radz2291/vict-02/main/examples/application-proof/src/lib/application/definition.ts | 200 | 2026-09-27 21:23-21:27 local |
| app-proof-proof-renderer.ts | https://raw.githubusercontent.com/radz2291/vict-02/main/examples/application-proof/src/lib/host/proof-renderer.ts | 200 | 2026-09-27 21:23-21:27 local |
| app-proof-ApplicationHost.svelte | https://raw.githubusercontent.com/radz2291/vict-02/main/examples/application-proof/src/lib/host/ApplicationHost.svelte | 200 | 2026-09-27 21:23-21:27 local |
| app-proof-page.svelte | https://raw.githubusercontent.com/radz2291/vict-02/main/examples/application-proof/src/routes/[...vict]/+page.svelte | 200 | 2026-09-27 21:23-21:27 local |
| ref-app-registry.ts | https://raw.githubusercontent.com/radz2291/vict-02/main/examples/reference-app/src/lib/components/registry.ts | 200 | 2026-09-27 21:23-21:27 local |
| ref-app-definition.ts | https://raw.githubusercontent.com/radz2291/vict-02/main/examples/reference-app/src/lib/application/definition.ts | 200 | 2026-09-27 21:23-21:27 local |
| gh-tags.json | https://api.github.com/repos/radz2291/vict-02/tags?per_page=100 | 200 | 2026-09-27 21:24 local |
| gh-releases.json | https://api.github.com/repos/radz2291/vict-02/releases?per_page=100 | 200 | 2026-09-27 21:24 local |
| gh-contents-packages.json | https://api.github.com/repos/radz2291/vict-02/contents/packages | 200 | 2026-09-27 21:24 local |
| gh-tree-main.json | https://api.github.com/repos/radz2291/vict-02/git/trees/main?recursive=1 | 200 | 2026-09-27 21:24 local |
| gh-repo-main-commit.json | https://api.github.com/repos/radz2291/vict-02/commits/main | 200 | 2026-09-27 21:27 local |
| git-ls-remote-tags.txt | git ls-remote --tags https://github.com/radz2291/vict-02 | (exit 0, empty) | 2026-09-27 21:24 local |
