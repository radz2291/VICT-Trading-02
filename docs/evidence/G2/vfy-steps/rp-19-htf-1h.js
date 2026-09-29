// HTF mid-bucket: start bar 1500 (17:15Z, mid-hour), switch to 1h, verify last
// completed bucket stays UNCHANGED while advancing within the same hour.
const sel = document.querySelector('[data-testid="sel-replay-start"]');
const target = [...sel.options].find((o) => o.value === '1500');
sel.selectedIndex = [...sel.options].indexOf(target);
sel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 400));
// switch replay timeframe to 1h
const tfSel = document.querySelector('[data-testid="sel-replay-tf"]');
tfSel.value = '1h';
tfSel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 300));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
const rect = document.querySelector('[data-testid="replay-chart-container"]').getBoundingClientRect();
// hover near the right edge where the last candle is (crosshair readout)
const samples = [];
async function hoverAndRead(tag) {
	// sweep a few positions near the right edge, keep the one with a valid bar readout
	for (const fx of [0.96, 0.93, 0.9, 0.87, 0.84]) {
		const x = rect.x + rect.width * fx;
		const y = rect.y + rect.height * 0.5;
		window.dispatchEvent(new Event('x')); // noop
		const readoutBefore = txt('[data-testid="replay-readout"]');
		samples.push({ tag, fx, readout: readoutBefore });
	}
}
return {
	position: txt('[data-testid="replay-position"]'),
	stats: txt('[data-testid="replay-slice-stats"]'),
	chartRect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
	gaps: txt('[data-testid="replay-gaps"]'),
	samples
};