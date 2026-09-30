// quick diagnostic: what does the page actually contain around the island?
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import(new URL('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/')));
const puppeteer = puppeteerMod.default ?? puppeteerMod;
const dataDir = mkdtempSync(path.join(tmpdir(), 'g3diag-'));
const browser = await puppeteer.launch({
	executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
	headless: true, debuggingPort: 9363,
	args: ['--headless=new', '--user-data-dir=' + dataDir, '--no-first-run', '--disable-extensions'],
	defaultViewport: { width: 1280, height: 900 }, protocolTimeout: 30000
});
const page = (await browser.pages())[0];
const errs = [];
page.on('console', (m) => errs.push(m.type() + ": " + String(m.text()).slice(0, 200)));
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + String(e).slice(0, 300)));
await page.goto('http://localhost:5199/',  { waitUntil: 'domcontentloaded', timeout: 30000 });
await new Promise((r) => setTimeout(r, 2500));
const html = await page.evaluate(() => document.body.innerHTML);
console.log('body len:', html.length, 'has loading:', html.includes('Loading workspace'));
console.log('has scripts-island:', html.includes('scripts-island'));
console.log('has main:', /class="main"/.test(html));
const mainIdx = html.indexOf('class="main"');
console.log('main snippet:', html.slice(mainIdx, mainIdx + 600).replace(/\s+/g, ' ').slice(0, 500));
console.log('console errors:', JSON.stringify(errs.slice(0, 6), null, 1));
await browser.close();
