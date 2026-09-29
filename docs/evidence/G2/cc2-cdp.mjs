// cc2 CDP driver (adapted from rv-cdp.mjs; port 5301 fresh build)
//   goto  <url> [width] [height]  - navigate a dedicated cc2 tab (fresh page)
//   eval  <js-file>               - run JS file contents in page (async ctx), print result JSON
//   evals <js-file> [width] [height] - set viewport then eval
//   shot  <name.png>              - screenshot into docs/evidence/G2/<name>
//   console                       - dump collected console messages
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import(new URL('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/')));
const puppeteer = puppeteerMod.default ?? puppeteerMod;

const OUT = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G2/';
const MODE = process.argv[2];

const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
const pages = await browser.pages();
const appPages = pages.filter((p) => p.url().includes('localhost:5301'));
let page = appPages[appPages.length - 1];
if (MODE === 'goto') {
	for (const p of appPages) { try { await p.close(); } catch {} }
	page = await browser.newPage();
}
if (!(await page.evaluate(() => !!window.__cc2Console).catch(() => false))) {
	await page.evaluateOnNewDocument(() => {
		window.__cc2Console = [];
		const push = (level, args) => { try { window.__cc2Console.push({ level, text: args.join(' '), t: Date.now() }); } catch {} };
		const origErr = console.error, origWarn = console.warn;
		console.error = (...a) => { push('error', a); origErr(...a); };
		console.warn = (...a) => { push('warn', a); origWarn(...a); };
		window.addEventListener('error', (e) => push('error', ['uncaught: ' + e.message]));
		window.addEventListener('unhandledrejection', (e) => push('error', ['unhandledrejection: ' + String(e.reason)]));
	});
}
if (!page.__cc2_installed) {
	page.on('console', (m) => {
		if (m.type() === 'error' || m.type() === 'warning') {
			page.__cc2ConsoleExt = page.__cc2ConsoleExt || [];
			page.__cc2ConsoleExt.push({ level: m.type(), text: m.text(), t: Date.now() });
		}
	});
	page.on('dialog', async (d) => {
		const answer = page.__cc2DialogAnswerCached ?? true;
		page.__cc2Dialogs = page.__cc2Dialogs || [];
		page.__cc2Dialogs.push({ message: d.message(), answered: answer });
		try { if (answer) await d.accept(); else await d.dismiss(); } catch {}
	});
	page.__cc2_installed = true;
}
page.__cc2DialogAnswerCached = await page.evaluate(() => window.__cc2DialogAnswer).catch(() => undefined);

if (MODE === 'goto') {
	const [url, w, h] = process.argv.slice(3);
	if (w) await page.setViewport({ width: Number(w), height: Number(h || 800) });
	await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
	console.log('navigated:', page.url());
} else if (MODE === 'eval' || MODE === 'evals') {
	if (MODE === 'evals') {
		const [w, h] = process.argv.slice(4);
		if (w) await page.setViewport({ width: Number(w), height: Number(h || 800) });
	}
	const file = process.argv[MODE === 'evals' ? 3 : 3];
	const src = readFileSync(file, 'utf8');
	const result = await page.evaluate(src);
	console.log(JSON.stringify(result, null, 2));
} else if (MODE === 'shot') {
	const name = process.argv[3];
	await page.screenshot({ path: OUT + name });
	console.log('shot:', name);
} else if (MODE === 'click') {
	const [x, y] = process.argv.slice(3).map(Number);
	await page.mouse.click(x, y);
	console.log('clicked', x, y);
} else if (MODE === 'console') {
	const consoleLog = await page.evaluate(() => window.__cc2Console || []);
	console.log(JSON.stringify(consoleLog, null, 2));
} else {
	console.log('modes: goto | eval | evals | shot | console');
}