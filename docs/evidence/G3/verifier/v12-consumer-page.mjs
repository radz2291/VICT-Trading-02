import { tmpdir } from 'os';
import path from 'path';
import { mkdtempSync } from 'fs';
import { createRequire } from 'module';
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/'));
const puppeteer = puppeteerMod.default ?? puppeteerMod;
const CW = 'C:/Users/RZ1/Desktop/RZ/g3-verifier-chart-consumer';
const OUT = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G3/verifier/';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--headless=new', '--no-first-run'], defaultViewport: { width: 950, height: 560 } });
const page = (await browser.pages())[0];
await page.goto('file:///' + CW.replace(/\\/g, '/') + '/page.html');
await page.waitForFunction(() => !!window.CW, { timeout: 20000 });
const setup = await page.evaluate(() => {
	const bars = Array.from({ length: 25 }, (_, i) => { const t = 1772900000 + i * 900; const base = 100 + i; return { time: t, open: base, high: base + 1.2, low: base - 1.2, close: base + 0.5 }; });
	const c = CW.createChart({ container: document.getElementById('chart') }, bars, {});
	c.setData(bars); // candles load only via setData (controller contract)
	window.__ctrl = c;
	window.__T = 1772900000;
	return { candlesLoaded: true };
});
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: OUT + 'v12-shot-01-candles.png' });

// stacking: two re-adds of the same id over visible candles
await page.evaluate(() => {
	const c = window.__ctrl; const T = window.__T;
	const h1 = c.addOverlay({ id: 'p', kind: 'line', pane: 'price', color: '#FF00FF' });
	h1.setData(Array.from({ length: 25 }, (_, i) => ({ time: T + i * 900, value: 103 })));
	const h2 = c.addOverlay({ id: 'p', kind: 'line', pane: 'price', color: '#00FFFF' });
	h2.setData(Array.from({ length: 25 }, (_, i) => ({ time: T + i * 900, value: 108 })));
});
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: OUT + 'v12-shot-02-stacked.png' });
// removeOverlay after stacking: which traces remain?
await page.evaluate(() => { window.__ctrl.removeOverlay('p'); });
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: OUT + 'v12-shot-03-removed.png' });
// markers + sub-pane + shared time axis with candles
await page.evaluate(() => {
	const c = window.__ctrl; const T = window.__T;
	const h = c.addOverlay({ id: 'mk', kind: 'line', pane: 'price', color: '#FF8800' });
	h.setData(Array.from({ length: 25 }, (_, i) => ({ time: T + i * 900, value: 106 + (i % 3) })));
	h.setMarkers([{ time: T + 12 * 900, shape: 'arrowUp', text: 'sig' }]);
	const hs = c.addOverlay({ id: 'sb', kind: 'line', pane: 'sub', color: '#22AA44' });
	hs.setData(Array.from({ length: 25 }, (_, i) => ({ time: T + i * 900, value: i % 5 })));
});
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: OUT + 'v12-shot-04-full.png' });
// zoom/pan shared-time check: narrow the visible range and screenshot (candles + overlay + sub trace must keep alignment)
await page.evaluate(() => {
	const c = window.__ctrl; const T = window.__T;
	c.timeScale().setVisibleRange({ from: T + 8 * 900, to: T + 16 * 900 });
});
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: OUT + 'v12-shot-05-zoomed.png' });
const done = await page.evaluate(() => 'probes-done');
await browser.close();
console.log(JSON.stringify({ setup, done }));