// v19 — narrow-width overflow check on the repaired ScriptsIsland (criterion 11 limb)
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/'));
const puppeteer = puppeteerMod.default ?? puppeteerMod;
const OUT = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G3/verifier/';
const results = { steps: {} };
const save = () => writeFileSync(OUT + 'v19-narrow-results.json', JSON.stringify(results, null, 2));
const dataDir = mkdtempSync(path.join(tmpdir(), 'v19-g3-'));
const browser = await puppeteer.launch({
	executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
	headless: true, args: ['--headless=new', '--user-data-dir=' + dataDir, '--no-first-run'],
	defaultViewport: { width: 1280, height: 900 }
});
const page = (await browser.pages())[0];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};
for (const w of [768, 375]) {
	await page.setViewport({ width: w, height: 900 });
	await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 40000 });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
	await sleep(700);
	const m = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth }));
	out['overflow_' + w] = m.scrollW - m.innerW;
	await page.setViewport({ width: w, height: 900 });
	await page.screenshot({ path: OUT + 'v19-shot-' + w + '.png' });
}
console.log(JSON.stringify(out));
await browser.close().catch(() => {});
save(); results.steps.narrow = out; save();