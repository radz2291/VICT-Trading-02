const sel = document.querySelector('[data-testid="sel-replay-start"]');
if (!sel) return { error: 'no replay start select' };
const target = [...sel.options].find((o) => o.value === '1500');
if (!target) return { error: 'option 1500 missing' };
sel.selectedIndex = [...sel.options].indexOf(target);
sel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 500));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.trim() : null);
return {
	banner: txt('[data-testid="mode-banner"]'),
	replayIsland: !!document.querySelector('[data-testid="replay-island"]'),
	chartIslandAbsent: !document.querySelector('[data-testid="chart-island"]'),
	position: txt('[data-testid="replay-position"]'),
	stats: txt('[data-testid="replay-slice-stats"]'),
	hiddenNote: txt('[data-testid="replay-levels-hidden"]'),
	levelsVisibleNow: txt('[data-testid="replay-levels"]') || document.querySelector('[data-testid="replay-levels-empty"]')?.textContent.trim(),
	g2key: window.localStorage.getItem('g2.replay.v1'),
	levelLinesOnChart: [...document.querySelectorAll('.chart canvas')].length
};
