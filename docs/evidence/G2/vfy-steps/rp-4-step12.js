const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
const snap = (i) => ({
	i,
	position: txt('[data-testid="replay-position"]'),
	stats: txt('[data-testid="replay-slice-stats"]'),
	gaps: txt('[data-testid="replay-gaps"]')
});
const out = [snap(0)];
for (let s = 1; s <= 12; s++) {
	const stepBtn = document.querySelector('[data-testid="btn-replay-step"]');
	if (!stepBtn || stepBtn.disabled) { out.push({ s, disabled: true }); break; }
	stepBtn.click();
	await new Promise((r) => setTimeout(r, 120));
	out.push(snap(s));
}
return out;