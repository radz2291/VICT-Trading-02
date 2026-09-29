const valid = '{"version":1,"symbol":"","instant":1767597300,"stepIndex":30,"playing":false,"levels":[],"returnedToCurrent":false}';
localStorage.setItem('g2.replay.v1', valid);
document.querySelector('[data-testid="btn-replay-restore"]').click();
await new Promise((r) => setTimeout(r, 700));
const $ = (s) => document.querySelector(s);
return { status: $('[data-testid="replay-status"]')?.textContent.trim(), position: $('[data-testid="replay-position"]')?.textContent.replace(/\s+/g,' ').trim(), g2: localStorage.getItem('g2.replay.v1') };
