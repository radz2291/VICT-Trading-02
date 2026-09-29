const $ = (s) => document.querySelector(s);
const el = $('[data-testid="replay-status"]');
return { position: $('[data-testid="replay-position"]')?.textContent.replace(/\s+/g,' ').trim(), status: el ? { text: el.textContent.trim(), role: el.getAttribute('role'), visible: !!(el.offsetParent || el.getClientRects().length) } : null, g2Len: (localStorage.getItem('g2.replay.v1')||'').length, levels: [...document.querySelectorAll('[data-testid="replay-levels"] li')].length };
