const sel = document.querySelector('[data-testid="sel-replay-start"]');
sel.selectedIndex = 1;
sel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 700));
const all = [...document.querySelectorAll('[role="alert"], .replay-status, [data-testid="replay-status"], [data-testid="replay-position"]')].map((e) => ({ tid: e.getAttribute('data-testid'), role: e.getAttribute('role'), text: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) }));
const banners = [...document.querySelectorAll('[data-testid="mode-banner"]')].map((e) => e.textContent.trim());
const g1Len = (localStorage.getItem('g1.levels.v1') || '').length;
const g2Raw = localStorage.getItem('g2.replay.v1') || '';
return { started: !!document.querySelector('[data-testid="replay-position"]'), elements: all, banners, g2Len: g2Raw.length, g1Len };
