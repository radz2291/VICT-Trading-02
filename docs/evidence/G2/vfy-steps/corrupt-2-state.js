const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
const corruptBytes = window.localStorage.getItem('g2.replay.v1');
// attempt interactions that would persist
const errs = [];
try {
  document.querySelector('[data-testid="sel-replay-start"]').selectedIndex = 5;
  document.querySelector('[data-testid="sel-replay-start"]').dispatchEvent(new Event('change', { bubbles: true }));
} catch (e) { errs.push('start-dispatch: ' + e.message); }
await new Promise((r) => setTimeout(r, 400));
// attempt restore
const rBtn = document.querySelector('[data-testid="btn-replay-restore"]');
if (rBtn) rBtn.click();
await new Promise((r) => setTimeout(r, 300));
return {
	banner: txt('[data-testid="mode-banner"]'),
	status: txt('[data-testid="panel-status"]'),
	bytesAfterAttempts: window.localStorage.getItem('g2.replay.v1'),
	byteCount: (window.localStorage.getItem('g2.replay.v1') || '').length,
	errs,
	replayActive: !!document.querySelector('[data-testid="replay-island"]')
};
