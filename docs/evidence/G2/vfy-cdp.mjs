// Verifier CDP driver (independent of the builder's harness).
// Usage: node vfy-cdp.mjs <goto|eval|shot|console> <arg...>
//   goto  <url> [width] [height]  - navigate current page (new page if none)
//   eval  <js-file>               - run JS file contents in page (async ctx), print result JSON
//   evals <js-file> [width] [height] - set viewport then eval
//   shot  <name.png>              - screenshot into docs/evidence/G2/<name>
//   console                       - dump collected console messages (since page open)
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
// resolve puppeteer-core from the browser-tools skill's node_modules
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import(new URL('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/')));
const puppeteer = puppeteerMod.default ?? puppeteerMod;

const OUT = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G2/';
const MODE = process.argv[2];

const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
const pages = await browser.pages();
const appPages = pages.filter((p) => p.url().includes('localhost:5199'));
let page = appPages[appPages.length - 1];
if (MODE === 'goto') {
	// dedicated verifier tab: close stale app tabs so shared localStorage confusion can't mislead evidence
	for (const p of appPages) {
		try { await p.close(); } catch {}
	}
	page = await browser.newPage();
}

// console capture since page open
if (!(await page.evaluate(() => !!window.__vfyConsole))) {
	await page.evaluateOnNewDocument(() => {
		window.__vfyConsole = [];
		const push = (level, args) => {
			try {
				window.__vfyConsole.push({ level, text: args.join(' '), t: Date.now() });
			} catch {}
		};
		const origErr = console.error, origWarn = console.warn;
		console.error = (...a) => { push('error', a); origErr(...a); };
		console.warn = (...a) => { push('warn', a); origWarn(...a); };
		window.addEventListener('error', (e) => push('error', ['uncaught: ' + e.message]));
		window.addEventListener('unhandledrejection', (e) => push('error', ['unhandledrejection: ' + String(e.reason)]));
	});
}
if (!page.__vfy_installed) {
	page.on('console', (m) => {
		if (m.type() === 'error' || m.type() === 'warning') {
			page.__vfyConsoleExt = page.__vfyConsoleExt || [];
			page.__vfyConsoleExt.push({ level: m.type(), text: m.text(), t: Date.now() });
		}
	});
	page.on('dialog', async (d) => {
		// auto-reply per cached preset (reading in-page state DURING an open
		// dialog would deadlock; preset is cached at each driver invocation start)
		const answer = page.__vfyDialogAnswerCached ?? true;
		page.__vfyDialogs = page.__vfyDialogs || [];
		page.__vfyDialogs.push({ message: d.message(), answered: answer });
		try {
			if (answer) await d.accept();
			else await d.dismiss();
		} catch {}
	});
	page.__vfy_installed = true;
}

// cache dialog preset before eval code runs
page.__vfyDialogAnswerCached = await page
	.evaluate(() => window.__vfyDialogAnswer)
	.catch(() => undefined);

if (MODE === 'goto') {
	const [url, w, h] = process.argv.slice(3);
	if (w) await page.setViewport({ width: Number(w), height: Number(h || 800) });
	await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
	console.log('navigated:', page.url());
} else if (MODE === 'eval' || MODE === 'evals') {
	if (MODE === 'evals') {
		const [w, h] = process.argv.slice(4);
		if (w) await page.setViewport({ width: Number(w), height: Number(h || 1000) });
		await new Promise((r) => setTimeout(r, 400));
	}
	const code = readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.):/, '$1')), process.argv[3]), 'utf8');
	const result = await page.evaluate(`(async () => { ${code} })()`);
	console.log(JSON.stringify(result, null, 1));
} else if (MODE === 'shot') {
	const name = process.argv[3];
	const path2 = path.isAbsolute(name) ? name : OUT + name;
	await page.screenshot({ path: path2 });
	console.log('saved', path2, existsSync(path2));
} else if (MODE === 'console') {
	const ext = page.__vfyConsoleExt || [];
	const inPage = await page.evaluate(() => window.__vfyConsole || []);
	console.log(JSON.stringify({ ext, inPage }, null, 1));
} else if (MODE === 'hover') {
	const [x, y] = process.argv.slice(3);
	await page.mouse.move(Number(x), Number(y));
	await new Promise((r) => setTimeout(r, 300));
	console.log('hovered', x, y);
} else if (MODE === 'click') {
	const [x, y, opts] = process.argv.slice(3);
	await page.mouse.move(Number(x), Number(y));
	await new Promise((r) => setTimeout(r, 250));
	if (opts === 'dbl') { await page.mouse.click(Number(x), Number(y), { clickCount: 2 }); }
	else { await page.mouse.down(); await new Promise((r) => setTimeout(r, 60)); await page.mouse.up(); }
	console.log('clicked', x, y);
} else if (MODE === 'key') {
	const keys = process.argv[3].split('+');
	if (keys.includes('ctrl')) await page.keyboard.down('Control');
	if (keys.includes('shift')) await page.keyboard.down('Shift');
	for (const k of keys.filter((x) => x !== 'ctrl' && x !== 'shift')) {
		await page.keyboard.press(k);
	}
	if (keys.includes('ctrl')) await page.keyboard.up('Control');
	if (keys.includes('shift')) await page.keyboard.up('Shift');
	console.log('keys sent', process.argv[3]);
} else if (MODE === 'setv') {
	const [w, h, reload] = process.argv.slice(3);
	await page.setViewport({ width: Number(w), height: Number(h || 900) });
	if (reload === 'reload') { await page.reload({ waitUntil: 'networkidle0' }); }
	console.log('viewport', w, h);
} else if (MODE === 'narrowshot') {
	const [w, h, name] = process.argv.slice(3);
	const session = await page.createCDPSession();
	await session.send('Emulation.setDeviceMetricsOverride', { width: Number(w), height: Number(h), deviceScaleFactor: 1, mobile: false });
	await new Promise((r) => setTimeout(r, 600));
	const iw = await page.evaluate(() => window.innerWidth);
	const path2 = path.isAbsolute(name) ? name : OUT + name;
	await page.screenshot({ path: path2 });
	await session.send('Emulation.clearDeviceMetricsOverride');
	await session.detach();
	console.log(JSON.stringify({ saved: path2, innerWidthAtShot: iw }));
} else if (MODE === 'pages') {
	console.log(JSON.stringify(await browser.pages().then((ps) => ps.map((p) => p.url()))));
} else {
	console.log('unknown mode');
}
await browser.disconnect();