// G3 browser harness — smoke 1: does the app load, and does a QuickJS
// backtest actually RUN in the browser (wasm through Vite)? Bounded.
import { writeFileSync, mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import(new URL('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/')));
const puppeteer = puppeteerMod.default ?? puppeteerMod;
const OUT = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G3/';
process.on('uncaughtException', (e) => { try { results.fatal = String(e); writeFileSync(OUT + 'wip-browser-results.json', JSON.stringify(results, null, 2)); } catch {} process.exit(1); });
const hard = setTimeout(() => { console.log('HARD CAP'); try { writeFileSync(OUT + 'wip-browser-results.json', JSON.stringify(results, null, 2)); } catch {} process.exit(2); }, 150000);
const results = { steps: {} };
const save = () => writeFileSync(OUT + 'wip-browser-results.json', JSON.stringify(results, null, 2));

const dataDir = mkdtempSync(path.join(tmpdir(), 'g3prof-'));
const browser = await puppeteer.launch({
	executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
	headless: true, debuggingPort: 9361,
	args: ['--headless=new', '--user-data-dir=' + dataDir, '--no-first-run', '--disable-extensions', '--window-size=1280,900'],
	defaultViewport: { width: 1280, height: 900 }, protocolTimeout: 30000
});
const page = (await browser.pages())[0];
const consoleMsgs = [];
page.on('console', (m) => { if (m.type() === 'error') consoleMsgs.push(String(m.text()).slice(0, 200)); });
page.on('dialog', async (d) => { try { await d.accept(); } catch {} });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = async (name, fn) => {
	try { results.steps[name] = { ok: true, ...(await fn()) }; }
	catch (e) { results.steps[name] = { ok: false, error: String(e).slice(0, 300) }; }
	save();
	console.log(name, '=>', JSON.stringify(results.steps[name]).slice(0, 220));
};

await step('load', async () => {
	await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 30000 });
	await page.waitForSelector('[data-testid="workspace"]', { timeout: 30000 });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 10000 });
	return { scriptsIsland: true };
});

await step('new-draft', async () => {
	await page.type('[data-testid="new-draft-name"]', 'probe');
	await page.click('[data-testid="btn-new-draft"]');
	await sleep(300);
	const src = await page.$eval('[data-testid="draft-source"]', (el) => el.value);
	return { editorOpen: !!(await page.$('[data-testid="draft-source"]')), srcLen: src.length };
});

await step('set-sma-script', async () => {
	const src = [
		'function onBar(bar, api) {',
		"  const period = Math.max(2, Math.round(Number(api.input('period', 20))));",
		"  const closes = api.bars().bars.map(function (b) { return b.close; });",
		'  let m = null;',
		'  if (closes.length >= period) {',
		'    let s = 0;',
		'    for (let i = closes.length - period; i < closes.length; i++) s += closes[i];',
		'    m = s / period;',
		'  }',
		"  api.plot('sma', m);",
		'}'
	].join('\n');
	await page.click('[data-testid="draft-source"]');
	await page.evaluate(() => { document.querySelector('[data-testid="draft-source"]').value = ''; });
	await page.type('[data-testid="draft-source"]', src);
	await page.click('[data-testid="btn-save-draft"]');
	await sleep(500);
	const status = await page.$eval('[data-testid="scripts-status"]', (el) => el.textContent.trim());
	return { status };
});

await step('run-backtest', async () => {
	// quickjs wasm through Vite is the risk — run the real thing
	await page.select('[data-testid="sel-run-range"]', '250');
	await page.click('[data-testid="btn-run-backtest"]');
	await page.waitForFunction(
		"document.querySelector('[data-testid=\"run-message\"]') && document.querySelector('[data-testid=\"run-message\"]').textContent.includes('run ')",
		{ timeout: 60000 }
	);
	await sleep(300);
	const msg = await page.$eval('[data-testid="run-message"]', (el) => el.textContent.trim());
	const hasPlot = !!(await page.$('[data-testid="plot-svg"]'));
	return { msg: msg.slice(0, 120), hasPlot };
});

await page.screenshot({ path: OUT + 'wip-01-desktop-run.png' }).catch(() => {});
results.consoleErrors = consoleMsgs.slice(0, 10);
save();
await browser.close();
clearTimeout(hard);
console.log('DONE');
