// FRESH VERIFIER harness v13 — on-chart overlay verification in the HOST app
// (production preview) + falsification probe: does re-running with different
// inputs leave the OLD plot line stacked on the chart (host never calls
// removeOverlay)?
import { writeFileSync, mkdtempSync, appendFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/'));
const puppeteer = puppeteerMod.default ?? puppeteerMod;
const OUT = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G3/verifier/';
mkdirSync(OUT, { recursive: true });
const results = { steps: {}, consoleErrors: [] };
const save = () => writeFileSync(OUT + 'v13-browser-results.json', JSON.stringify(results, null, 2));
const logLine = (s) => { console.log(s); try { appendFileSync(OUT + 'v13-browser-runlog.txt', s + '\n'); } catch {} };
const dataDir = mkdtempSync(path.join(tmpdir(), 'v13-g3-'));
const browser = await puppeteer.launch({
	executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
	headless: true, debuggingPort: 9391,
	args: ['--headless=new', '--user-data-dir=' + dataDir, '--no-first-run', '--disable-extensions', '--window-size=1280,900'],
	defaultViewport: { width: 1280, height: 900 }, protocolTimeout: 60000
});
const page = (await browser.pages())[0];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) results.consoleErrors.push(String(m.text()).slice(0, 200)); });
page.on('pageerror', (e) => results.consoleErrors.push('pageerror: ' + String(e).slice(0, 200)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = async (name, fn) => {
	try { results.steps[name] = { ok: true, ...(await fn()) }; }
	catch (e) { results.steps[name] = { ok: false, error: String(e).slice(0, 340) }; }
	save();
	logLine(name + ' => ' + JSON.stringify(results.steps[name]).slice(0, 300));
};
const txt = (sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, ' ').trim()).catch(() => null);
const setVal = (sel, v) => page.$eval(sel, (el, vv) => { el.value = vv; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, v);
const click = (sel) => page.click(sel);
const waitRunDone = async () => {
	for (let i = 0; i < 150; i++) { await sleep(300); const dis = await page.$eval('[data-testid="btn-run-backtest"]', (el) => el.disabled).catch(() => () => true); if (!dis) return true; }
	return false;
};
const shot = (n) => page.screenshot({ path: OUT + n });

// scan ALL canvases inside the CURRENT-mode chart island for colored traces
const scanTraces = (colors) => page.evaluate((cols) => {
	const container = document.querySelector('[data-testid="chart-container"]');
	if (!container) return { noContainer: true };
	const out = {};
	for (const c of cols) out[c] = 0;
	const bands = {}; // per color: {minY, maxY} in page coords
	for (const cvs of container.querySelectorAll('canvas')) {
		const rect = cvs.getBoundingClientRect();
		let ctx;
		try { ctx = cvs.getContext('2d'); } catch { continue; }
		if (!ctx) continue;
		let img;
		try { img = ctx.getImageData(0, 0, cvs.width, cvs.height); } catch { continue; }
		cols.forEach((c) => {
			const cr = parseInt(c.slice(1, 3), 16), cg = parseInt(c.slice(3, 5), 16), cb = parseInt(c.slice(5, 7), 16);
			let minY = 1e9, maxY = -1;
			for (let y = 0; y < cvs.height; y++) for (let x = 0; x < cvs.width; x += 2) {
				const i = (y * cvs.width + x) * 4, r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
				if (Math.abs(r - cr) < 30 && Math.abs(g - cg) < 30 && Math.abs(b - cb) < 30) { out[c] += 1; if (y < minY) minY = y; if (y > maxY) maxY = y; }
			}
			if (maxY >= minY) {
				bands[c] = bands[c] || [];
				bands[c].push({ pageTop: Math.round(rect.top), y0: minY, y1: maxY });
			}
		});
	}
	return { counts: out, bands };
}, colors);

await step('v13-load', async () => {
	await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 40000 });
	await page.waitForSelector('[data-testid="chart-container"]', { timeout: 40000 });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
	return { ok: true };
});
await step('v13-run-sma20', async () => {
	await click('[data-testid="btn-add-sma"]');
	await sleep(600);
	await click('[data-testid="btn-run-backtest"]');
	const done = await waitRunDone();
	await sleep(900);
	const legend = await txt('[data-testid="overlay-legend"]');
	const svgCount = (await page.$$('[data-testid="plot-svg"]')).length;
	await shot('v13-shot-01-sma20.png');
	const scan = await scanTraces(['#4ea1ff', '#2f9e63', '#d05050']);
	return { done, legend: legend?.slice(0, 100), plotSvgGone: svgCount === 0, scan: { counts: scan.counts, bands: scan.bands } };
});
await step('v13-crosshair-linkage', async () => {
	const box = await (await page.$('[data-testid="chart-container"]')).boundingBox();
	await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5);
	await sleep(500);
	const readout = await txt('[data-testid="readout"]');
	// second probe point
	await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5);
	await sleep(500);
	const readout2 = await txt('[data-testid="readout"]');
	return { readout1: readout?.slice(0, 110), readout2: readout2?.slice(0, 110), crosshairAlive: !!readout && readout !== '—' };
});
await step('v13-stacking-probe', async () => {
	// run #2 with period=2 (SMA hugs closes -> different level/shape)
	await setVal('[data-testid="run-inputs"]', '{"period": 2}');
	await sleep(250);
	await click('[data-testid="btn-run-backtest"]');
	const done = await waitRunDone();
	await sleep(900);
	await shot('v13-shot-02-period2.png');
	const scan = await scanTraces(['#4ea1ff']);
	return { done, traceBands: scan.bands, tracePixels: scan.counts };
});
await step('v13-run-period-24', async () => {
	await setVal('[data-testid="run-inputs"]', '{"period": 24}');
	await sleep(250);
	await click('[data-testid="btn-run-backtest"]');
	const done = await waitRunDone();
	await sleep(900);
	await shot('v13-shot-03-period24.png');
	const scan = await scanTraces(['#4ea1ff']);
	return { done, traceBands: scan.bands, tracePixels: scan.counts };
});
results.finishedAt = new Date().toISOString();
results.consoleErrorCount = results.consoleErrors.length;
save();
logLine('SUMMARY ok=' + Object.values(results.steps).filter((s) => s.ok).length + '/' + Object.keys(results.steps).length + ' consoleErrors=' + results.consoleErrors.length);
await browser.close();