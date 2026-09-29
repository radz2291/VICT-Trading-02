// Enter replay at bar 1500, step x3 -> step 4, then chart coordinates for a real mouse click
const sel = document.querySelector('[data-testid="sel-replay-start"]');
const target = [...sel.options].find((o) => o.value === '1500');
sel.selectedIndex = [...sel.options].indexOf(target);
sel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 500));
for (let s = 0; s < 3; s++) {
	document.querySelector('[data-testid="btn-replay-step"]').click();
	await new Promise((r) => setTimeout(r, 150));
}
const rect = document.querySelector('[data-testid="replay-chart-container"]').getBoundingClientRect();
return {
	position: document.querySelector('[data-testid="replay-position"]').textContent.replace(/\s+/g, ' ').trim(),
	stats: document.querySelector('[data-testid="replay-slice-stats"]').textContent.replace(/\s+/g, ' ').trim(),
	g2key: window.localStorage.getItem('g2.replay.v1'),
	chartRect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }
};