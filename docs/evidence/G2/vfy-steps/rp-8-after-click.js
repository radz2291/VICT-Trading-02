const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
return {
	readout: txt('[data-testid="replay-readout"]'),
	levels: [...document.querySelectorAll('[data-testid="replay-levels"] li')].map((l) => l.textContent.replace(/\s+/g, ' ').trim()),
	empty: txt('[data-testid="replay-levels-empty"]'),
	position: txt('[data-testid="replay-position"]'),
	g2keyParsed: (window.localStorage.getItem('g2.replay.v1') || '')
};
