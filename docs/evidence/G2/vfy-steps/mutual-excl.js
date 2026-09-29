const q = (s) => document.querySelector(s);
return JSON.stringify({
	current: { banner: q('[data-testid="mode-banner"]')?.textContent.trim(), chartIsland: !!q('[data-testid="chart-island"]'), replayIsland: !!q('[data-testid="replay-island"]') }
});
