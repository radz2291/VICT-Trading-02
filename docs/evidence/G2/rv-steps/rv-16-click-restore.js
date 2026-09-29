document.querySelector('[data-testid="btn-replay-restore"]').click();
await new Promise((r) => setTimeout(r, 500));
const $ = (s) => document.querySelector(s);
const el = $('[data-testid="replay-status"]');
return { status: el?.textContent.trim(), role: el?.getAttribute('role'), visible: !!(el && (el.offsetParent || el.getClientRects().length)), g2Len: (localStorage.getItem('g2.replay.v1')||'').length, g2: localStorage.getItem('g2.replay.v1') };
