const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.trim() : null);
return {
	banner: txt('[data-testid="mode-banner"]'),
	chartIsland: !!document.querySelector('[data-testid="chart-island"]'),
	panel: [...document.querySelectorAll('[data-testid="panel-drawings"] li')].map((l) => l.textContent.trim()),
	store: window.localStorage.getItem('g1.levels.v1')
};
