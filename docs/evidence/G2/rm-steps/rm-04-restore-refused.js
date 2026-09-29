// rm-04: corrupt g2.replay.v1 in place, then attempt RESTORE → refusal must be rendered
window.__rmSaved = {
  replay: localStorage.getItem('g2.replay.v1'),
  levels: localStorage.getItem('g1.levels.v1')
};
const corrupt = '{"version":1,"symbol":"","instant":1767573000,"stepIndex":3';
localStorage.setItem('g2.replay.v1', corrupt);
document.querySelector('[data-testid="btn-replay-restore"]').click();
await new Promise((r) => setTimeout(r, 800));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
return {
  statusRendered: txt('[data-testid="replay-status"]'),
  bytesUnchanged: localStorage.getItem('g2.replay.v1') === corrupt,
  levelsUnchanged: localStorage.getItem('g1.levels.v1') === window.__rmSaved.levels,
  position: txt('[data-testid="replay-position"]')
};
