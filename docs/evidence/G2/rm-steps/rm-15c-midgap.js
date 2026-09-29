const sel = document.querySelector('[data-testid="sel-replay-start"]');
sel.selectedIndex = 1; // 2026-01-05 00:00Z
sel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 800));
const stepBtn = document.querySelector('[data-testid="btn-replay-step"]');
for (let i = 0; i < 16; i++) { stepBtn.click(); await new Promise((r) => setTimeout(r, 100)); }
await new Promise((r) => setTimeout(r, 500));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
return { position: txt('[data-testid="replay-position"]'), gaps: txt('[data-testid="replay-gaps"]') };
