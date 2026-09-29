document.querySelector('[data-testid="btn-return-current"]').click();
await new Promise((r) => setTimeout(r, 800));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
const rec = JSON.parse(localStorage.getItem('g2.replay.v1'));
return { banner: txt('[data-testid="mode-banner"]'), status: txt('[data-testid="replay-status"]'), returnedToCurrent: rec.returnedToCurrent, g1LevelPersisted: !!localStorage.getItem('g1.levels.v1') };
