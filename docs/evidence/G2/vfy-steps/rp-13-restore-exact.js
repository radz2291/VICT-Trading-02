const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
document.querySelector('[data-testid="btn-replay-restore"]').click();
await new Promise((r) => setTimeout(r, 500));
return {
	banner: txt('[data-testid="mode-banner"]'),
	position: txt('[data-testid="replay-position"]'),
	stats: txt('[data-testid="replay-slice-stats"]'),
	levels: [...document.querySelectorAll('[data-testid="replay-levels"] li')].map((l) => l.textContent.replace(/\s+/g, ' ').trim()),
	g2key: window.localStorage.getItem('g2.replay.v1'),
	chartIslandAbsent: !document.querySelector('[data-testid="chart-island"]')
};