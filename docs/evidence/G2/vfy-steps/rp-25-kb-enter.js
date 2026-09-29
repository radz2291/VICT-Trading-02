// enter replay fresh (bar 1500) then return info for keyboard focus test
const sel = document.querySelector('[data-testid="sel-replay-start"]');
if (!sel) return { error: 'no select' };
const target = [...sel.options].find((o) => o.value === '1500');
sel.selectedIndex = [...sel.options].indexOf(target);
sel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 400));
// Tab order through the replay controls group
const order = [...document.querySelectorAll('[data-testid="btn-replay-step"],[data-testid="btn-replay-play"],[data-testid="btn-replay-restore"],[data-testid="btn-replay-reset"],[data-testid="btn-return-current"],[data-testid="sel-replay-tf"]')]
	.filter((e) => e.offsetParent !== null)
	.map((e) => e.dataset.testid + (e.tagName === 'SELECT' ? '/select' : '/btn'));
return { order, step0: document.querySelector('[data-testid="replay-position"]').textContent.trim() };