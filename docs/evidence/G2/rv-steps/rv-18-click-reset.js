document.querySelector('[data-testid="btn-replay-reset"]').click();
await new Promise((r) => setTimeout(r, 700));
const $ = (s) => document.querySelector(s);
const el = $('[data-testid="replay-status"]');
return { status: el?.textContent.trim(), role: el?.getAttribute('role'), visible: !!(el && (el.offsetParent || el.getClientRects().length)), g2Len: (localStorage.getItem('g2.replay.v1')||'').length, g1Len: (localStorage.getItem('g1.levels.v1')||'').length, bannerVisible: !!$('[data-testid="mode-banner"]') };
