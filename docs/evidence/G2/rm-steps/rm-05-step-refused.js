// rm-05: STEP refused while storage corrupt (bytes untouched)
const before = localStorage.getItem('g2.replay.v1');
document.querySelector('[data-testid="btn-replay-step"]').click();
await new Promise((r) => setTimeout(r, 800));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
return {
  statusRendered: txt('[data-testid="replay-status"]'),
  bytesUnchanged: localStorage.getItem('g2.replay.v1') === before,
  position: txt('[data-testid="replay-position"]')
};
