import { createRequire } from 'module';
import { tmpdir } from 'os';
import path from 'path';
import { mkdtempSync } from 'fs';
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/'));
const puppeteer = puppeteerMod.default ?? puppeteerMod;
const CW = 'C:/Users/RZ1/Desktop/RZ/g3-verifier-chart-consumer';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--headless=new', '--no-first-run'], defaultViewport: { width: 950, height: 560 } });
const page = (await browser.pages())[0];
await page.goto('file:///' + CW.replace(/\\/g, '/') + '/page.html');
await page.waitForFunction(() => !!window.CW, { timeout: 20000 });
const out = await page.evaluate(() => {
	const bars = Array.from({ length: 25 }, (_, i) => { const t = 1772900000 + i * 900; const base = 100 + i; return { time: t, open: base, high: base + 1.2, low: base - 1.2, close: base + 0.5 }; });
	const c = CW.createChart({ container: document.getElementById('chart') }, bars, {});
	const T = 1772900000;
	const rows = []; for (let i = 0; i < 25; i++) rows.push({ time: T + i * 900, value: i % 5 });
	c.addOverlay({ id: 's1', kind: 'line', pane: 'sub', color: '#22AA44' }).setData(rows);
	return 'added';
});
await new Promise((r) => setTimeout(r, 600));
const scan = await page.evaluate(() => {
	const cvs = document.querySelector('#chart canvas');
	const ctx = cvs.getContext('2d');
	const img = ctx.getImageData(0, 0, cvs.width, cvs.height);
	let green = 0, minX = 1e9, minY = 1e9, maxY = -1;
	for (let y = 0; y < cvs.height; y++) for (let x = 0; x < cvs.width; x++) {
		const i = (y * cvs.width + x) * 4;
		const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
		if (Math.abs(g - 170) < 45 && Math.abs(r - 34) < 45 && Math.abs(b - 68) < 45) { green++; maxY = y; if (y < minY) minY = y; if (x < minX) minX = x; }
	}
	return { green, minY, maxY, minX, w: cvs.width, h: cvs.height };
});
console.log(JSON.stringify(out), JSON.stringify(scan));
await page.screenshot({ path: 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G3/verifier/v11-shot-03-b-sub.png' });
await browser.close();