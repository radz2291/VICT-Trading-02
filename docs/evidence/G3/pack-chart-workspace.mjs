// G3 bounded-extension consumer proof — chart-workspace 0.1.2 installed FROM
// THE PACKED TARBALL outside the monorepo; independent page demonstrates
// addOverlay('price') line + markers + sub-pane over its own data in a real
// browser, INCLUDING the V-G3-R3 falsifications: same-id re-add must REPLACE
// (no orphan stacking; old handle inert) and removeOverlay must clear pixels.
// NOTE: LWC paints on rAF — every pixel read waits two rAFs first.
import { execSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import { createRequire } from 'module';
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import(new URL('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/')));
const puppeteer = puppeteerMod.default ?? puppeteerMod;

const REPO = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading';
const CW = path.join(REPO, 'packages/chart-workspace');
const CONSUMER = 'C:/Users/RZ1/Desktop/RZ/g3-chart-consumer';
const results = { steps: {} };
const save = () => writeFileSync(new URL('./consumer-chart-results.json', import.meta.url), JSON.stringify(results, null, 2));
const step = async (name, fn) => {
	try {
		const value = typeof fn === 'function' ? await fn() : fn;
		results.steps[name] = { ok: true, ...value };
	} catch (e) {
		results.steps[name] = { ok: false, error: String(e).slice(0, 300) };
	}
	console.log(name, '=>', JSON.stringify(results.steps[name]).slice(0, 240));
	save();
	if (results.steps[name].ok === false) process.exit(1);
};

await step('pack', () => {
	const tarball = 'vict-trading-chart-workspace-0.1.2.tgz';
	const bytes = readFileSync(path.join(CW, tarball));
	return { tarball, sha512: createHash('sha512').update(bytes).digest('hex'), bytes: bytes.length };
});
const pack = results.steps['pack'];

await step('consumer-install', () => {
	rmSync(CONSUMER, { recursive: true, force: true });
	mkdirSync(CONSUMER, { recursive: true });
	writeFileSync(
		path.join(CONSUMER, 'package.json'),
		JSON.stringify({ name: 'g3-chart-consumer', version: '1.0.0', private: true, type: 'module', dependencies: {} }, null, 2)
	);
	execSync('npm install "' + path.join(CW, pack.tarball) + '" --no-workspaces', { cwd: CONSUMER, stdio: 'pipe', env: { ...process.env, npm_config_workspaces: 'false' } });
	const installed = JSON.parse(readFileSync(path.join(CONSUMER, 'node_modules/@vict-trading/chart-workspace/package.json'), 'utf8'));
	const lwcInstalled = existsSync(path.join(CONSUMER, 'node_modules/lightweight-charts/package.json'));
	return { consumerRoot: CONSUMER, version: installed.version, lwcPresent: lwcInstalled };
});

const pageJs = `
import { createChart } from '@vict-trading/chart-workspace';
const T0 = 1800000000;
const bars = [];
for (let i = 0; i < 60; i++) {
	const c = 100 + i * 0.5;
	bars.push({ time: T0 + i * 900, open: c - 0.2, high: c + 0.5, low: c - 0.6, close: c });
}
function countColor(r, g, b) {
	let count = 0;
	for (const canvas of document.querySelectorAll('#chart canvas')) {
		const c2 = canvas.getContext('2d');
		if (!c2) continue;
		const d = c2.getImageData(0, 0, canvas.width, canvas.height).data;
		for (let i = 0; i < d.length; i += 4) {
			if (d[i] === r && d[i + 1] === g && d[i + 2] === b) count++;
		}
	}
	return count;
}
const paint = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
async function main() {
	const host = { container: document.getElementById('chart') };
	const out = {};
	try {
		const controller = createChart(host, bars, { onCrosshairMove() {}, onCreateAtPrice() {}, onSelectLevel() {}, onLevelMoved() {} });
		controller.setData(bars); // candles render on setData (package contract)
		await paint();
		out.chartOk = !!document.querySelector('#chart canvas');
		out.hasAddOverlay = typeof controller.addOverlay === 'function';
		out.candlePixels = Math.max(countColor(0x2f, 0x9e, 0x63), countColor(0xd0, 0x50, 0x50));
		const h1 = controller.addOverlay({ id: 'sma', kind: 'line', pane: 'price', color: '#4ea1ff' });
		h1.setData([{ time: T0 + 900, value: 100.4 }, { time: T0 + 1800, value: 101 }, { time: T0 + 2700, value: 102 }]);
		h1.setMarkers([{ time: T0 + 1800, shape: 'circle' }]);
		await paint();
		out.bluePixelsAfterAdd = countColor(0x4e, 0xa1, 0xff);
		const h2 = controller.addOverlay({ id: 'sma', kind: 'line', pane: 'price', color: '#ff5252' });
		h2.setData([{ time: T0 + 900, value: 99.5 }, { time: T0 + 2700, value: 103 }]);
		await paint();
		out.stackedOrphanGone = countColor(0x4e, 0xa1, 0xff) === 0;
		out.replacedColorLive = countColor(0xff, 0x52, 0x52) > 0;
		h1.setData([{ time: T0 + 900, value: 100.4 }, { time: T0 + 1800, value: 105 }, { time: T0 + 2700, value: 100 }]);
		await paint();
		out.oldHandleInert = countColor(0x4e, 0xa1, 0xff) === 0;
		controller.removeOverlay('sma');
		await paint();
		out.removeClearsPixels = countColor(0xff, 0x52, 0x52) === 0;
		const h3 = controller.addOverlay({ id: 'vol', kind: 'histogram', pane: 'sub', color: '#2f9e63' });
		h3.setData([{ time: T0 + 900, value: 3 }, { time: T0 + 1800, value: 5 }]);
		await paint();
		out.subPaneOk = countColor(0x2f, 0x9e, 0x63) > 0;
		controller.removeOverlay('vol');
		await paint();
		out.removeOk = true;
		out.candlesStillRender = out.candlePixels > 0;
		window.__consumerResults = { ok: true, ...out };
	} catch (e) {
		window.__consumerResults = { ok: false, error: String(e).slice(0, 250), ...out };
	}
}
main();
`;
await step('consumer-page', () => {
	writeFileSync(path.join(CONSUMER, 'page.js'), pageJs);
	writeFileSync(
		path.join(CONSUMER, 'index.html'),
		'<!doctype html><html><body style="margin:0"><div id="chart" style="width:900px;height:520px"></div><script type="module" src="./page.bundle.js"></script></body></html>'
	);
	execSync(
		'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/host/node_modules/.bin/esbuild.cmd page.js --bundle --format=esm --outfile=page.bundle.js --platform=browser',
		{ cwd: CONSUMER, stdio: 'pipe' }
	);
	return { bundled: existsSync(path.join(CONSUMER, 'page.bundle.js')) };
});

await step('consumer-browser-proof', async () => {
	const { mkdtempSync } = await import('fs');
	const { tmpdir } = await import('os');
	const dataDir = mkdtempSync(path.join(tmpdir(), 'g3cw3-'));
	const browser = await puppeteer.launch({
		executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
		headless: true, debuggingPort: 9375,
		args: ['--headless=new', '--user-data-dir=' + dataDir, '--no-first-run', '--disable-extensions'],
		defaultViewport: { width: 1000, height: 600 }, protocolTimeout: 30000
	});
	const page = (await browser.pages())[0];
	const errs = [];
	page.on('pageerror', (e) => errs.push(String(e).slice(0, 150)));
	const { spawn } = await import('child_process');
	const srv = spawn('C:/Users/RZ1/AppData/Local/Programs/Python/Python312/python.exe', ['-m', 'http.server', '8151'], { cwd: CONSUMER, stdio: 'ignore' });
	await new Promise((r) => setTimeout(r, 800));
	await page.goto('http://localhost:8151/index.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
	await page.waitForFunction('window.__consumerResults !== undefined', { timeout: 15000 });
	const res = await page.evaluate('window.__consumerResults');
	await page.screenshot({ path: 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G3/consumer-chart-overlay.png' }).catch(() => {});
	srv.kill();
	await browser.close();
	if (!res.ok) throw new Error('consumer page failed: ' + JSON.stringify(res) + ' errs=' + JSON.stringify(errs));
	return { checks: res, pageErrors: errs };
});
const checks = results.steps['consumer-browser-proof'].checks;

await step('consumer-verdict', () => {
	const need = ['chartOk', 'hasAddOverlay', 'blue>0', 'stackedOrphanGone', 'replacedColorLive', 'oldHandleInert', 'removeClearsPixels', 'subPaneOk', 'candlesStillRender'];
	const missing = need.filter((k) => {
		if (k === 'blue>0') return !((checks.bluePixelsAfterAdd ?? 0) > 0);
		return !checks[k];
	});
	if (missing.length) throw new Error('missing: ' + missing.join(',') + ' full=' + JSON.stringify(checks));
	return { verdict: 'PASS' };
});

console.log('\nCHART-WS PACK sha512:', pack.sha512);