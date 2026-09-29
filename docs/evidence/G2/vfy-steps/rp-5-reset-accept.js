window.__vfyDialogAnswer = true; // accept the reset confirm
const btn = document.querySelector('[data-testid="btn-replay-reset"]');
if (!btn) return { error: 'no reset button' };
btn.click();
await new Promise((r) => setTimeout(r, 500));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.trim() : null);
return {
	afterReset: { banner: txt('[data-testid="mode-banner"]'), g2key: window.localStorage.getItem('g2.replay.v1'), status: txt('[data-testid="panel-status"]') }
};