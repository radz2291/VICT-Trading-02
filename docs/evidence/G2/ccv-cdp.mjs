// ccv-cdp.mjs — FRESH VERIFIER CDP driver (candidate db66475a build, port 5278; own Chrome :9345).
//   goto <url> [w] [h] | eval <js-file> | evals <js-file> [w] [h] | shot <name.png>
//   console | state | rect <selector> | click <x> <y> [waitMs]  (REAL input pipeline)
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import(new URL('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/')));
const puppeteer = puppeteerMod.default ?? puppeteerMod;

const OUT = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G2/';
const MODE = process.argv[2];
const ARG = process.argv[3];
const A2 = process.argv[4];
const A3 = process.argv[5];
const A4 = process.argv[6];
const WD = 20000;

const browser = await puppeteer.connect({ browserURL: 'http://localhost:9345', defaultViewport: null });
let page = null;
{
	const pages = await browser.pages();
	const app = pages.filter(p => p.url().includes('localhost:5278'));
	page = app[app.length - 1] ?? pages[pages.length - 1];
}
if (!page.__ccvInstalled) {
	page.on('console', (m) => {
		if (m.type() === 'error' || m.type() === 'warning') {
			page.__ccvConsole = page.__ccvConsole || [];
			page.__ccvConsole.push({ level: m.type(), text: m.text(), t: Date.now() });
		}
	});
	page.on('pageerror', (e) => {
		page.__ccvConsole = page.__ccvConsole || [];
		page.__ccvConsole.push({ level: 'pageerror', text: String(e), t: Date.now() });
	});
	page.on('dialog', async (d) => {
		const answer = page.__ccvDialogAnswer ?? true;
		page.__ccvDialogs = page.__ccvDialogs || [];
		page.__ccvDialogs.push({ message: d.message(), answered: answer });
		setTimeout(() => d.accept().catch(() => {}), 150);
	});
	page.__ccvInstalled = true;
}

if (MODE === 'goto') {
	if (A2) await page.setViewport({ width: Number(A2), height: Number(A3 ?? 900) });
	try {
		await Promise.race([
			page.goto(ARG ?? 'http://localhost:5278/', { waitUntil: 'networkidle2', timeout: 45000 }),
			new Promise((_, rej) => setTimeout(() => rej(new Error('goto-timeout')), 46000))
		]);
	} catch (e) { if (!/goto-timeout/.test(String(e))) console.log('goto note: ' + String(e).slice(0, 120)); }
	const t0 = Date.now();
	let hydrated = false;
	while (Date.now() - t0 < WD) {
		try {
			const st = await page.evaluate(() => ({
				pill: !!document.querySelector('[data-testid="panel-status"]'),
				loading: !!document.querySelector('[data-testid="workspace-loading"]')
			}));
			if (st.pill && !st.loading) { hydrated = true; break; }
		} catch {}
		await new Promise((r) => setTimeout(r, 500));
	}
	console.log(JSON.stringify({ goto: 'done', hydrated, url: page.url() }));
} else if (MODE === 'eval' || MODE === 'evals') {
	if (MODE === 'evals') { if (A2) await page.setViewport({ width: Number(A2), height: Number(A3 ?? 900) }); }
	const file = ARG.endsWith('.js') || ARG.endsWith('.mjs') ? ARG : OUT + 'ccv-steps/' + ARG;
	const code = readFileSync(file, 'utf8');
	const fn = new Function('return (async () => {' + code + '})()');
	let out;
	try {
		const h = await Promise.race([
			page.evaluateHandle(fn),
			new Promise((_, rej) => setTimeout(() => rej(new Error('step-timeout')), WD))
		]);
		out = await h.jsonValue().catch(() => 'unserializable');
	} catch (e) { out = { STEP_ERROR: String(e).slice(0, 300) }; }
	console.log(typeof out === 'string' ? out : JSON.stringify(out));
	console.log('CONSOLE_NEW:', JSON.stringify(page.__ccvConsole ?? []));
} else if (MODE === 'shot') {
	await page.screenshot({ path: OUT + ARG });
	console.log('shot: ' + ARG);
} else if (MODE === 'console') {
	console.log(JSON.stringify(page.__ccvConsole ?? []));
} else if (MODE === 'state') {
	const st = await page.evaluate(() => ({
		g2: localStorage.getItem('g2.replay.v1'),
		g1len: (localStorage.getItem('g1.levels.v1') || '').length,
		testids: Array.from(document.querySelectorAll('[data-testid]')).map(e => e.getAttribute('data-testid')).filter((v, i, a) => a.indexOf(v) === i)
	}));
	console.log(JSON.stringify(st, null, 1));
} else if (MODE === 'rect') {
	const r = await page.evaluate((sel) => {
		const el = document.querySelector(sel);
		if (!el) return null;
		const b = el.getBoundingClientRect();
		return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) };
	}, ARG);
	console.log(JSON.stringify(r));
} else if (MODE === 'click') {
	await page.mouse.move(Number(ARG), Number(A2));
	await new Promise(r => setTimeout(r, 300));
	await page.mouse.click(Number(ARG), Number(A2));
	await new Promise(r => setTimeout(r, Number(A3 ?? 800)));
	console.log('clicked');
}
 else if (MODE === 'key') {
	await page.focus(ARG);
	await page.keyboard.press('Enter');
	await new Promise(r => setTimeout(r, 1000));
	const pos = await page.evaluate(() => (document.querySelector('[data-testid="replay-position"]')||{}).textContent);
	console.log('after real Enter:', pos);
}

browser.disconnect();
process.exit(0);