window.__vfyDialogAnswer = false; // dismiss the confirm
document.querySelector('[data-testid="btn-replay-reset"]').click();
await new Promise((r) => setTimeout(r, 500));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
const afterDismiss = {
	banner: txt('[data-testid="mode-banner"]'),
	position: txt('[data-testid="replay-position"]'),
	levels: [...document.querySelectorAll('[data-testid="replay-levels"] li')].map((l) => l.textContent.replace(/\s+/g, ' ').trim()),
	g2key: window.localStorage.getItem('g2.replay.v1')
};
window.__vfyDialogAnswer = true; // accept this time
document.querySelector('[data-testid="btn-replay-reset"]').click();
await new Promise((r) => setTimeout(r, 500));
const afterAccept = {
	banner: txt('[data-testid="mode-banner"]'),
	g2key: window.localStorage.getItem('g2.replay.v1'),
	chartIslandBack: !!document.querySelector('[data-testid="chart-island"]'),
	status: txt('[data-testid="panel-status"]')
};
return { afterDismiss, afterAccept };