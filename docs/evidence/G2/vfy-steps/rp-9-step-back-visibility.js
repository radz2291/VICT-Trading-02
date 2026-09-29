// craft record at step 2 keeping the step-4-created level, restore must hide it
const rec = JSON.parse(window.localStorage.getItem('g2.replay.v1'));
// instant corresponding to step 2 of this session: start 1769447700 + 1*900
const rec2 = { ...rec, instant: 1769448600, stepIndex: 2, playing: false };
window.localStorage.setItem('g2.replay.v1', JSON.stringify(rec2));
document.querySelector('[data-testid="btn-replay-restore"]').click();
await new Promise((r) => setTimeout(r, 400));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
const step2 = {
	position: txt('[data-testid="replay-position"]'),
	levelsListed: [...document.querySelectorAll('[data-testid="replay-levels"] li')].map((l) => l.textContent.replace(/\s+/g, ' ').trim()),
	empty: txt('[data-testid="replay-levels-empty"]'),
	g2key: window.localStorage.getItem('g2.replay.v1')
};
// restore forward to step 4 again -> must become visible
const rec4 = { ...rec, instant: 1769450400, stepIndex: 4, playing: false };
window.localStorage.setItem('g2.replay.v1', JSON.stringify(rec4));
document.querySelector('[data-testid="btn-replay-restore"]').click();
await new Promise((r) => setTimeout(r, 400));
const step4 = {
	position: txt('[data-testid="replay-position"]'),
	levelsListed: [...document.querySelectorAll('[data-testid="replay-levels"] li')].map((l) => l.textContent.replace(/\s+/g, ' ').trim()),
	empty: txt('[data-testid="replay-levels-empty"]')
};
// and below creationStep (step 3) -> hidden
const rec3 = { ...rec, instant: 1769449500, stepIndex: 3, playing: false };
window.localStorage.setItem('g2.replay.v1', JSON.stringify(rec3));
document.querySelector('[data-testid="btn-replay-restore"]').click();
await new Promise((r) => setTimeout(r, 400));
const step3 = { levelsListed: [...document.querySelectorAll('[data-testid="replay-levels"] li')].map((l) => l.textContent.trim()), empty: txt('[data-testid="replay-levels-empty"]') };
return { step2, step3, step4 };