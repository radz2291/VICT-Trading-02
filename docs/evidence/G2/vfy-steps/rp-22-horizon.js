const sel = document.querySelector('[data-testid="sel-replay-start"]');
const target = [...sel.options].find((o) => o.value === '1997');
if (!target) return { error: 'no 1997 option' };
sel.selectedIndex = [...sel.options].indexOf(target);
sel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 400));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
const atStart = {
	position: txt('[data-testid="replay-position"]'),
	stats: txt('[data-testid="replay-slice-stats"]'),
	readout: txt('[data-testid="replay-readout"]'),
	stepDisabled: document.querySelector('[data-testid="btn-replay-step"]').disabled,
	playDisabled: document.querySelector('[data-testid="btn-replay-play"]')?.disabled ?? 'absent'
};
// try to step beyond the horizon
const stepBtn = document.querySelector('[data-testid="btn-replay-step"]');
stepBtn && stepBtn.click();
await new Promise((r) => setTimeout(r, 300));
const afterStepAttempt = {
	position: txt('[data-testid="replay-position"]'),
	stats: txt('[data-testid="replay-slice-stats"]'),
	g2key: window.localStorage.getItem('g2.replay.v1')
};
return { atStart, afterStepAttempt };