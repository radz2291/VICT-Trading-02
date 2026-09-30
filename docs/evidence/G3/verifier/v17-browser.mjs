// FRESH VERIFIER harness v17 — criterion-2 FINAL on-chart ruling at 8a33b00.
// Proves: (L0) truthful 'No plot rendered yet' legend before any run;
// (R1) SMA overlay renders INSIDE the workspace chart container against
// candles, sharing the price pane (vertical band overlap) + crosshair linkage
// (shared time axis); (S) signals render as markers (pixel delta);
// (RP) nothing drawn in replay mode + truthful replay legend note; the
// current-mode overlay returns after Return-to-current.
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/'));
const puppeteer = puppeteerMod.default ?? puppeteerMod;
const OUT = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G3/verifier/';
const results = { steps: {}, consoleErrors: [] };
const save = () => writeFileSync(OUT + 'v17-browser-results.json', JSON.stringify(results, null, 2));
const t0 = Date.now();
const TIME_CAP = 75_000;
const dataDir = mkdtempSync(path.join(tmpdir(), 'v17-g3-'));
const browser = await puppeteer.launch({
	executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
	headless: true, debuggingPort: 9393,
	args: ['--headless=new', '--user-data-dir=' + dataDir, '--no-first-run', '--disable-extensions', '--window-size=1280,900'],
	defaultViewport: { width: 1280, height: 900 }, protocolTimeout: 45000
});
const page = (await browser.pages())[0];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) results.consoleErrors.push(String(m.text()).slice(0, 200)); });
page.on('pageerror', (e) => results.consoleErrors.push('pageerror: ' + String(e).slice(0, 200)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = async (name, fn) => {
	try { results.steps[name] = { ok: true, ...(await fn()) }; }
	catch (e) { results.steps[name] = { ok: false, error: String(e).slice(0, 340) }; }
	results.elapsedMs = Date.now() - t0;
	save();
	console.log(name, '=>', JSON.stringify(results.steps[name]).slice(0, 300));
};
const txt = (sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, ' ').trim()).catch(() => null);
const setVal = (sel, v) => page.$eval(sel, (el, vv) => { el.value = vv; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, v);
const click = (sel) => page.click(sel);
const waitRunDone = async () => {
	for (let i = 0; i < 40; i++) { await sleep(300); const dis = await page.$eval('[data-testid="btn-run-backtest"]', (el) => el.disabled).catch(() => true); if (!dis) return true; if (Date.now() - t0 > TIME_CAP) return false; }
	return false;
};
const shot = (n) => page.screenshot({ path: OUT + n });
const scan = async (testid, colors) => page.evaluate(({ testid, colors }) => {
	const container = document.querySelector(`[data-testid="${testid}"]`);
	if (!container) return { noContainer: true };
	const counts = {}; const bands = {};
	for (const c of colors) {
		const cr = parseInt(c.slice(1, 3), 16), cg = parseInt(c.slice(3, 5), 16), cb = parseInt(c.slice(5, 7), 16);
		let count = 0, minY = 1e9, maxY = -1;
		for (const cvs of container.querySelectorAll('canvas')) {
			const rect = cvs.getBoundingClientRect();
			let ctx; try { ctx = cvs.getContext('2d'); } catch { continue; }
			if (!ctx) continue;
			let img; try { img = ctx.getImageData(0, 0, cvs.width, cvs.height); } catch { continue; }
			for (let y = 0; y < cvs.height; y += 1) for (let x = 0; x < cvs.width; x += 2) {
				const i = (y * cvs.width + x) * 4;
				if (Math.abs(img.data[i] - cr) < 30 && Math.abs(img.data[i + 1] - cg) < 30 && Math.abs(img.data[i + 2] - cb) < 30) {
					count++; const py = Math.round(rect.top) + y; if (py < minY) minY = py; if (py > maxY) maxY = py;
				}
			}
		}
		counts[c] = count;
		if (maxY >= minY) (bands[c] = bands[c] || []).push({ y0: minY, y1: maxY });
	}
	return { counts, bands };
}, { testid, colors });

const BLUE = '#4ea1ff', CANDLE_G = '#2f9e63', CANDLE_R = '#d05050';

await step('v17-load', async () => {
	await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 40000 });
	await page.waitForSelector('[data-testid="chart-container"]', { timeout: 40000 });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
	const legend0 = await txt('[data-testid="overlay-legend"]');
	await shot('v17-shot-01-initial.png');
	return { legend0, truthfulNoPlotYet: !!legend0 && legend0.includes('No plot rendered yet') };
});
await step('v17-run-sma20-on-chart', async () => {
	await click('[data-testid="btn-add-sma"]');
	await sleep(400);
	await click('[data-testid="btn-run-backtest"]');
	const done = await waitRunDone();
	await sleep(900);
	const legend = await txt('[data-testid="overlay-legend"]');
	const sc = await scan('chart-container', [BLUE, CANDLE_G, CANDLE_R]);
	await shot('v17-shot-02-sma20.png');
	const bluePx = sc.counts[BLUE] ?? 0;
	const candlePx = (sc.counts[CANDLE_G] ?? 0) + (sc.counts[CANDLE_R] ?? 0);
	const blueBand = (sc.bands[BLUE] || [])[0];
	const candleBand = (sc.bands[CANDLE_G] || [])[0] || (sc.bands[CANDLE_R] || [])[0];
	const sharesPricePane = !!(blueBand && candleBand && blueBand.y0 >= candleBand.y0 && blueBand.y1 <= candleBand.y1);
	return { done, legend: legend?.slice(0, 140), bluePx, candlePx, blueBand, candleBand, sharesPricePane };
});
await step('v17-crosshair-shared-time-axis', async () => {
	const box = await (await page.$('[data-testid="chart-container"]')).boundingBox();
	await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45);
	await sleep(450);
	const r1 = await txt('[data-testid="readout"]');
	await page.mouse.move(box.x + box.width * 0.30, box.y + box.height * 0.45);
	await sleep(450);
	const r2 = await txt('[data-testid="readout"]');
	await page.mouse.move(box.x + 40, box.y + 40);
	await sleep(400);
	const r3 = await txt('[data-testid="readout"]');
	return { readoutAtA: r1?.slice(0, 120), readoutAtB: r2?.slice(0, 110), readoutOff: r3?.slice(0, 60), linkageAlive: !!r1 && r1 !== '—' && r1 !== r3, timeAxisFollows: !!r1 && !!r2 && r1 !== r2 };
});
await step('v17-stacking-probe-period2', async () => {
	const before = (await scan('chart-container', [BLUE])).counts[BLUE] ?? 0;
	await setVal('[data-testid="run-inputs"]', '{\n  "period": 2\n}');
	await sleep(250);
	await click('[data-testid="btn-run-backtest"]');
	const done = await waitRunDone();
	await sleep(900);
	const sc = await scan('chart-container', [BLUE]);
	await shot('v17-shot-03-period2.png');
	const after = sc.counts[BLUE] ?? 0;
	return { done, blueBefore: before, blueAfter: after, replacedNotStacked: after < Math.max(before * 1.8, before + 400) };
});
await step('v17-signals-as-markers', async () => {
	await setVal('[data-testid="new-draft-name"]', 'sigtest');
	await click('[data-testid="btn-new-draft"]');
	await sleep(400);
	const src = "var s = 0;\nfunction onBar(bar, api){\n  api.plot('w', bar.close - 2590);\n  if (s === 40 || s === 90) api.plotSignal('w', true);\n  s++;\n}\n";
	await setVal('[data-testid="draft-source"]', src);
	await click('[data-testid="btn-save-draft"]');
	await sleep(400);
	await setVal('[data-testid="run-inputs"]', '{}');
	await click('[data-testid="btn-run-backtest"]');
	const done1 = await waitRunDone();
	await sleep(900);
	const noMarkerPx = (await scan('chart-container', [BLUE])).counts[BLUE] ?? 0;
	const noSigLegend = await txt('[data-testid="overlay-legend"]');
	await setVal('[data-testid="draft-source"]', src.replace('(s === 40 || s === 90)', '(s === 40 || s === 90 || s === 140 || s === 200)'));
	await click('[data-testid="btn-save-draft"]');
	await sleep(300);
	await click('[data-testid="btn-run-backtest"]');
	const done2 = await waitRunDone();
	await sleep(900);
	const withMarkerPx = (await scan('chart-container', [BLUE])).counts[BLUE] ?? 0;
	await shot('v17-shot-04-signals.png');
	return { done1, done2, noMarkerPx, withMarkerPx, markerDeltaPx: withMarkerPx - noMarkerPx, markersRender: withMarkerPx > noMarkerPx + 20, legendAfter: noSigLegend?.slice(0, 120) };
});
await step('v17-replay-nothing-drawn', async () => {
	await page.select('[data-testid="sel-replay-start"]', '0');
	await sleep(600);
	await click('[data-testid="btn-replay-step"]');
	await sleep(1400);
	const banner = await txt('[data-testid="mode-banner"]');
	const legend = await txt('[data-testid="overlay-legend"]');
	const sc = await scan('replay-chart-container', [BLUE, CANDLE_G]);
	await shot('v17-shot-05-replay.png');
	const candlesInReplay = (sc.counts[CANDLE_G] ?? 0) > 0;
	return { banner: banner?.slice(0, 90), legendInReplay: legend?.slice(0, 140), blueInReplay: sc.counts[BLUE] ?? 0, replayCandles: sc.counts[CANDLE_G] ?? 0, nothingDrawnInReplay: (sc.counts[BLUE] ?? 0) === 0 && candlesInReplay > 0 };
});
await step('v17-return-to-current-restores-overlay', async () => {
	await click('[data-testid="btn-return-current"]');
	await sleep(1500);
	const banner = await txt('[data-testid="mode-banner"]');
	const sc = await scan('chart-container', [BLUE]);
	await shot('v17-shot-06-back-current.png');
	return { banner: banner?.slice(0, 30), blueBack: sc.counts[BLUE] ?? 0 };
});
results.finishedAt = new Date().toISOString();
results.consoleErrorCount = results.consoleErrors.length;
save();
console.log('HARNESS v17 done, elapsed', Date.now() - t0, 'consoleErrors', results.consoleErrors.length);
await browser.close().catch(() => {});