// fresh replay session for the reset-dialog pair test: start bar 1500, step x2
const sel = document.querySelector('[data-testid="sel-replay-start"]');
const target = [...sel.options].find((o) => o.value === '1500');
sel.selectedIndex = [...sel.options].indexOf(target);
sel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 400));
document.querySelector('[data-testid="btn-replay-step"]').click();
await new Promise((r) => setTimeout(r, 200));
document.querySelector('[data-testid="btn-replay-step"]').click();
await new Promise((r) => setTimeout(r, 200));
return {
	position: document.querySelector('[data-testid="replay-position"]').textContent.replace(/\s+/g, ' ').trim(),
	g2key: window.localStorage.getItem('g2.replay.v1')
};