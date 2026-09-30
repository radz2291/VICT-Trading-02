// v18b — editor-source restore probe (criterion 1 limb; untouched surface spot-check)
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/'));
const puppeteer = puppeteerMod.default ?? puppeteerMod;
const dataDir = mkdtempSync(path.join(tmpdir(), 'v18b2-'));
const browser = await puppeteer.launch({
	executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
	headless: true, args: ['--headless=new', '--user-data-dir=' + dataDir, '--no-first-run'],
	defaultViewport: { width: 1280, height: 900 }
});
const page = (await browser.pages())[0];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};
await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 40000 });
await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
await page.type('[data-testid="new-draft-name"]', 'reloadprobe');
await page.click('[data-testid="btn-new-draft"]');
await sleep(500);
await page.$eval('[data-testid="draft-source"]', (el) => { el.value = el.value + '\napi.plot("afterProbe", 1);'; el.dispatchEvent(new Event('input', { bubbles: true })); });
await sleep(200);
await page.click('[data-testid="btn-save-draft"]');
await sleep(600);
const stored = await page.evaluate(() => localStorage.getItem('g3.scripts.v1'));
out.storedHasPlot = decodeURIComponent(stored).includes('afterProbe');
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
await sleep(700);
const storedRel = await page.evaluate(() => localStorage.getItem('g3.scripts.v1'));
out.storedSameAfterReload = storedRel === stored;
// the editor is closed by default after reload — open the restored draft
await page.click('[data-testid="draft-reloadprobe"]').catch(() => {});
await sleep(300);
await page.click('[data-testid="btn-toggle-editor"]').catch(() => {});
await sleep(600);
const taRel = await page.$eval('[data-testid="draft-source"]', (el) => el.value).catch(() => null);
out.editorReopensWithSource = taRel ? taRel.includes('afterProbe') : false;
console.log(JSON.stringify(out));
await browser.close().catch(() => {});
process.exit(out.storedHasPlot && out.storedSameAfterReload && out.editorReopensWithSource ? 0 : 1);