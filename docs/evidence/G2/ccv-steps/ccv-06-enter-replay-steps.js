const $ = (s) => document.querySelector(s);
const txt = (s) => ($(s) ? $(s).textContent.replace(/\s+/g,' ').trim() : null);
const out = {};
const sel = $('[data-testid="sel-replay-start"]');
out.firstOption = sel.options[0].textContent.trim();
sel.selectedIndex = 0;
sel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 800));
out.bannerAfterStart = txt('[data-testid="mode-banner"]');
out.positionAfterStart = txt('[data-testid="replay-position"]');
out.g2AfterStart = (localStorage.getItem('g2.replay.v1')||'').slice(0,120);
// REAL Step button clicks ×3
for (let i = 0; i < 3; i++) {
	$('[data-testid="btn-replay-step"]').click();
	await new Promise((r) => setTimeout(r, 500));
}
out.bannerAfterSteps = txt('[data-testid="mode-banner"]');
out.positionAfterSteps = txt('[data-testid="replay-position"]');
out.g2AfterSteps = (localStorage.getItem('g2.replay.v1')||'').slice(0,160);
out.stepBtnClickable = !document.querySelector('[data-testid="btn-replay-step"]').disabled;
out.consoleClean = true;
return JSON.stringify(out);
