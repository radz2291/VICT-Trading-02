// rm-09: recovery — restore valid bytes, click Restore → session restored exactly
localStorage.setItem('g2.replay.v1', window.__rmSaved.replay);
document.querySelector('[data-testid="btn-replay-restore"]').click();
await new Promise((r) => setTimeout(r, 900));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
return {
  statusRendered: txt('[data-testid="replay-status"]'),
  position: txt('[data-testid="replay-position"]'),
  storedMatchesSaved: localStorage.getItem('g2.replay.v1') === window.__rmSaved.replay,
  banner: txt('[data-testid="mode-banner"]')
};
