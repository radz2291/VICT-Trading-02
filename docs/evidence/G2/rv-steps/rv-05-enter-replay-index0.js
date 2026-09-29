const sel = document.querySelector('[data-testid="sel-replay-start"]');
if (!sel) return { error: 'no replay select' };
sel.selectedIndex = 0;
sel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 700));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
return { firstOption: sel.options[0]?.textContent?.trim(), banner: document.querySelectorAll('[data-testid="mode-banner"]')[0]?.textContent.trim() ?? txt('[data-testid="mode-banner"]'), position: txt('[data-testid="replay-position"]'), g2: (localStorage.getItem('g2.replay.v1')||'').slice(0,200) };
