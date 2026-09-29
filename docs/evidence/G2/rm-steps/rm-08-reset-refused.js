// rm-08: RESET refused while corrupt (dialog accepted)
const corrupt = '{"version":1,"symbol":"","instant":1767573000,"stepIndex":4,';
localStorage.setItem('g2.replay.v1', corrupt);
window.__vfyDialogAnswer = true;
const g1Before = localStorage.getItem('g1.levels.v1');
document.querySelector('[data-testid="btn-replay-reset"]').click();
await new Promise((r) => setTimeout(r, 900));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
return {
  statusRendered: txt('[data-testid="replay-status"]'),
  replayKeyStillPresent: localStorage.getItem('g2.replay.v1') !== null,
  corruptBytesUnchanged: localStorage.getItem('g2.replay.v1') === corrupt,
  levelsUnchanged: localStorage.getItem('g1.levels.v1') === g1Before,
  banner: txt('[data-testid="mode-banner"]')
};
