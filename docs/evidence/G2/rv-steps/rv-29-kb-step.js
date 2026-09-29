const sel = document.querySelector('[data-testid="sel-replay-start"]');
sel.selectedIndex = 1;
sel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 700));
const stepBtn = document.querySelector('[data-testid="btn-replay-step"]');
stepBtn.focus();
const focused = document.activeElement === stepBtn;
return { focused, before: document.querySelector('[data-testid="replay-position"]').textContent.replace(/\s+/g,' ').trim() };
