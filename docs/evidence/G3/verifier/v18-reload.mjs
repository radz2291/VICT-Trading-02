// FRESH VERIFIER harness v18 — spot-check of an UNTOUCHED surface (criterion 1
// limb: draft persistence across reload, byte-exact via app storage) at 8a33b00.
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/'));
const puppeteer = puppeteerMod.default ?? puppeteerMod;
const OUT = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G3/verifier/';
const results = { steps: {} };
const save = () => writeFileSync(OUT + 'v18-reload-results.json', JSON.stringify(results, null, 2));
const dataDir = mkdtempSync(path.join(tmpdir(), 'v18-g3-'));
const browser = await puppeteer.launch({
	executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
	headless: true, debuggingPort: 9394,
	args: ['--headless=new', '--user-data-dir=' + dataDir, '--no-first-run', '--disable-extensions'],
	defaultViewport: { width: 1280, height: 900 }, protocolTimeout: 45000
});
const page = (await browser.pages())[0];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = async (name, fn) => {
	try { results.steps[name] = { ok: true, ...(await fn()) }; }
	catch (e) { results.steps[name] = { ok: false, error: String(e).slice(0, 340) }; }
	save(); console.log(name, '=>', JSON.stringify(results.steps[name]).slice(0, 260));
};
const setVal = (sel, v) => page.$eval(sel, (el, vv) => { el.value = vv; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, v);
const click = (sel) => page.click(sel);
const SRC = '// reload-persistence probe\nfunction onBar(bar, api) {\n  api.plot("persist", bar.close * 2 - 1.25);\n}\n';
await step('v18-create-save', async () => {
	await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 40000 });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
	await setVal('[data-testid="new-draft-name"]', 'reloadprobe');
	await click('[data-testid="btn-new-draft"]');
	await sleep(400);
	await setVal('[data-testid="draft-source"]', SRC);
	await click('[data-testid="btn-save-draft"]');
	await sleep(500);
	const bytes = await page.evaluate(() => localStorage.getItem('g3.scripts.v1'));
	return { draftBytesLen: bytes?.length ?? 0, containsSource: bytes?.includes(encodeURIComponent('reload-persistence probe')) ?? bytes?.includes('reload-persistence probe') ?? false };
});
const bytesBefore = results.steps['v18-create-save'].draftBytesLen;
await step('v18-reload-byte-exact', async () => {
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
	await sleep(600);
	const bytes = await page.evaluate(() => localStorage.getItem('g3.scripts.v1'));
	const draftVisible = await page.$eval('[data-testid="draft-reloadprobe"]', (el) => el.textContent.replace(/\s+/g, ' ').trim()).catch(() => null);
	const editorSrc = await page.$eval('[data-testid="draft-source"]', (el) => el.value).catch(() => null);
	return {
		byteExact: bytes?.length === bytesBefore,
		draftRestored: !!draftVisible,
		editorRestored: editorSrc?.includes('reload-persistence probe') === true
	};
});
await browser.close().catch(() => {});
console.log('v18 done');