document.querySelector('[data-testid="btn-return-current"]').click();
await new Promise((r) => setTimeout(r, 500));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
return {
	banner: txt('[data-testid="mode-banner"]'),
	chartIslandBack: !!document.querySelector('[data-testid="chart-island"]'),
	g1Panel: [...document.querySelectorAll('[data-testid="panel-drawings"] li')].map((l) => l.textContent.replace(/\s+/g, ' ').trim()),
	g1Store: window.localStorage.getItem('g1.levels.v1'),
	g2key: JSON.parse(window.localStorage.getItem('g2.replay.v1') || 'null')
};