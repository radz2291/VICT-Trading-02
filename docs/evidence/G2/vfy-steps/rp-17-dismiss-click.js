document.querySelector('[data-testid="btn-replay-reset"]').click();
await new Promise((r) => setTimeout(r, 600));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
return {
	banner: txt('[data-testid="mode-banner"]'),
	position: txt('[data-testid="replay-position"]'),
	g2key: window.localStorage.getItem('g2.replay.v1'),
	chartIslandAbsent: !document.querySelector('[data-testid="chart-island"]')
};