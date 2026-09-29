const valid = '{"version":1,"symbol":"","instant":1767597300,"stepIndex":30,"playing":false,"levels":[],"returnedToCurrent":false}';
localStorage.setItem('g2.replay.v1', valid);
// start a fresh session from index 0 (real select click) — per-op re-verify passes now
const sel = document.querySelector('[data-testid="sel-replay-start"]');
sel.selectedIndex = 1;
sel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 700));
const $ = (s) => document.querySelector(s);
return { position: $('[data-testid="replay-position"]')?.textContent.replace(/\s+/g,' ').trim(), banner: [...document.querySelectorAll('[data-testid="mode-banner"]')].map(x=>x.textContent.trim()) };
