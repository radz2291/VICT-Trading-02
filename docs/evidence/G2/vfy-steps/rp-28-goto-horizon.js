const rec = JSON.parse(window.localStorage.getItem('g2.replay.v1'));
const recH = { ...rec, instant: 1770068700, stepIndex: 2, playing: false };
window.localStorage.setItem('g2.replay.v1', JSON.stringify(recH));
document.querySelector('[data-testid="btn-replay-restore"]').click();
await new Promise((r) => setTimeout(r, 400));
return document.querySelector('[data-testid="replay-position"]').textContent.trim();
