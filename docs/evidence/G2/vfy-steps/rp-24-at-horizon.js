const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
const stepBtn = document.querySelector('[data-testid="btn-replay-step"]');
const playBtn = document.querySelector('[data-testid="btn-replay-play"]');
const pauseBtn = document.querySelector('[data-testid="btn-replay-pause"]');
const before = {
	position: txt('[data-testid="replay-position"]'),
	stepDisabled: stepBtn ? stepBtn.disabled : 'absent',
	playDisabled: playBtn ? playBtn.disabled : 'absent',
	playBtnPresent: !!playBtn,
	pausePresent: !!pauseBtn
};
// attempt to force a step via the disabled button (should do nothing)
if (stepBtn) stepBtn.click();
await new Promise((r) => setTimeout(r, 300));
return {
	before,
	afterForceClick: {
		position: txt('[data-testid="replay-position"]'),
		g2key: window.localStorage.getItem('g2.replay.v1')
	}
};