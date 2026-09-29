// rm-07: state after chart click while corrupt
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
return {
  statusRendered: txt('[data-testid="replay-status"]'),
  bytesUnchanged: localStorage.getItem('g2.replay.v1') === '{"version":1,"symbol":"","instant":1767573000,"stepIndex":3',
  levelsInPanel: [...document.querySelectorAll('[data-testid="replay-levels"] li')].map((l) => l.textContent.trim())
};
