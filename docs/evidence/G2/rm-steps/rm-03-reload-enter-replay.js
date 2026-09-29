// rm-03: reload → W1 level persisted; then enter replay at earliest option and step twice
const out1 = { levelsAfterReload: [...document.querySelectorAll('[data-testid="panel-drawings"] li')].length, store: !!localStorage.getItem('g1.levels.v1') };
const sel = document.querySelector('[data-testid="sel-replay-start"]');
if (!sel) return { error: 'no replay select', out1 };
sel.selectedIndex = 0;
sel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 700));
const stepBtn = document.querySelector('[data-testid="btn-replay-step"]');
stepBtn.click(); await new Promise((r) => setTimeout(r, 400));
stepBtn.click(); await new Promise((r) => setTimeout(r, 400));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
return {
  ...out1,
  banner: txt('[data-testid="mode-banner"]'),
  position: txt('[data-testid="replay-position"]'),
  gaps: txt('[data-testid="replay-gaps"]'),
  replayStatus: txt('[data-testid="replay-status"]'),
  storedLen: (localStorage.getItem('g2.replay.v1') || '').length
};
