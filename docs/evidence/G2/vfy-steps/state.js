const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
return {
	banner: txt('[data-testid="mode-banner"]'),
	position: txt('[data-testid="replay-position"]'),
	hasStartSelect: !!document.querySelector('[data-testid="sel-replay-start"]'),
	g2key: window.localStorage.getItem('g2.replay.v1')
};
