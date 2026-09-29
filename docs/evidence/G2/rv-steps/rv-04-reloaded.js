await new Promise((r) => setTimeout(r, 600));
return { levelsAfterReload: [...document.querySelectorAll('[data-testid="panel-drawings"] li')].length, banner: document.querySelector('[data-testid="mode-banner"]')?.textContent.trim(), store: !!localStorage.getItem('g1.levels.v1') };
