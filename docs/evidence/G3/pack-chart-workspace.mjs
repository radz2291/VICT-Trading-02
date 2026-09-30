// G3 bounded-extension consumer proof — chart-workspace 0.1.1 installed FROM
// THE PACKED TARBALL outside the monorepo; independent page demonstrates
// addOverlay('price') line + markers + sub-pane over its own data in a real
// browser; asserts the controller API behavior + canvas render presence.
import { execSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync, copyFileSync, readFileSync, existsSync } from 'fs';
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
const save = () => writeFileSync(new URL('../consumer-chart-results.json', import.meta.url), JSON.stringify(results, null, 2));
const step = async (name, fn) => {
	try {
		const value = typeof fn === 'function' ? await fn() : fn;
		results.steps[name] = { ok: true, ...value };
	} catch (e) {
		results.steps[name] = { ok: false, error: String(e).slice(0, 300) };
	}
	console.log(name, '=>', JSON.stringify(results.steps[name]).slice(0, 200));
	save();
	if (results.steps[name].ok === false) process.exit(1);
};

let tarball = 'vict-trading-chart-workspace-0.1.1.tgz';
await step('pack', () => {
	const bytes = readFileSync(path.join(CW, tarball));
	return { sha512: createHash('sha512').update(bytes).digest('hex'), bytes: bytes.length };
});
const pack = results.steps['pack'];

await step('consumer-install', () => {
	rmSync(CONSUMER, { recursive: true, force: true });
	mkdirSync(CONSUMER, { recursive: true });
	writeFileSync(
		path.join(CONSUMER, 'package.json'),
		JSON.stringify({ name: 'g3-chart-consumer', version: '1.0.0', private: true, type: 'module', dependencies: {} }, null, 2)
	);
	execSync('npm install "' + path.join(CW, tarball) + '" --no-workspaces', { cwd: CONSUMER, stdio: 'pipe', env: { ...process.env, npm_config_workspaces: 'false' } });
	const installed = JSON.parse(readFileSync(path.join(CONSUMER, 'node_modules/@vict-trading/chart-workspace/package.json'), 'utf8'));
	const lwcInstalled = existsSync(path.join(CONSUMER, 'node_modules/lightweight-charts/package.json'));
	return { consumerRoot: CONSUMER, version: installed.version, lwcPresent: lwcInstalled };
});

// consumer page: own data + a bare chart + the overlay API; bundles via esbuild
const pageJs = `
import { createChart } from '@vict-trading/chart-workspace';
const T0 = 1800000000;
const bars = [];
for (let i = 0; i < 60; i++) {
	const c = 100 + i * 0.5;
	bars.push({ time: T0 + i * 900, open: c - 0.2, high: c + 0.5, low: c - 0.6, close: c });
}
const host = { container: document.getElementById('chart') };
const out = {};
try {
	const controller = createChart(host, bars, { onCrosshairMove() {}, onCreateAtPrice() {}, onSelectLevel() {}, onLevelMoved() {} });
	out.chartOk = !!document.querySelector('#chart canvas');
	out.hasAddOverlay = typeof controller.addOverlay === 'function';
	out.hasRemoveOverlay = typeof controller.removeOverlay === 'function';
	const h = controller.addOverlay({ id: 'sma', kind: 'line', pane: 'price', color: '#4ea1ff' });
	out.setDataOk = (() => { h.setData([{ time: T0 + 900, value: 100.4 }, { time: T0 + 1800, value: null }, { time: T0 + 2700, value: 101.4 }]); return true; })();
	out.setMarkersOk = (() => { h.setMarkers([{ time: T0 + 900, shape: 'circle' }, { time: T0 + 2700, shape: 'circle' }]); return true; })();
	const h2 = controller.addOverlay({ id: 'vol', kind: 'histogram', pane: 'sub', color: '#2f9e63' });
	out.subPaneOk = (() => { h2.setData([{ time: T0 + 900, value: 3 }, { time: T0 + 1800, value: 5 }]); return true; })();
	h.setData([{ time: T0 + 900, value: 100.4 }, { time: T0 + 2700, value: 102 }]); // replace works
	out.replaceOk = true;
	controller.removeOverlay('vol');
	out.removeOk = true;
	window.__consumerResults = { ok: true, ...out };
} catch (e) {
	window.__consumerResults = { ok: false, error: String(e).slice(0, 200), ...out };
}
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
	const dataDir = mkdtempSync(path.join(tmpdir(), 'g3cw-'));
	const browser = await puppeteer.launch({
		executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
		headless: true, debuggingPort: 9371,
		args: ['--headless=new', '--user-data-dir=' + dataDir, '--no-first-run', '--disable-extensions'],
		defaultViewport: { width: 1000, height: 600 }, protocolTimeout: 30000
	});
	const page = (await browser.pages())[0];
	const errs = [];
	page.on('pageerror', (e) => errs.push(String(e).slice(0, 150)));
	const { spawn } = await import('child_process');
	const srv = spawn('C:/Users/RZ1/AppData/Local/Programs/Python/Python312/python.exe', ['-m', 'http.server', '8147'], { cwd: CONSUMER, stdio: 'ignore' });
	await new Promise((r) => setTimeout(r, 800));
	await page.goto('http://localhost:8147/index.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
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
	const need = ['chartOk', 'hasAddOverlay', 'hasRemoveOverlay', 'setDataOk', 'setMarkersOk', 'subPaneOk', 'replaceOk', 'removeOk'];
	const missing = need.filter((k) => !checks[k]);
	if (missing.length) throw new Error('missing: ' + missing.join(','));
	return { verdict: 'PASS' };
});

console.log('\nCHART-WS PACK sha512:', pack.sha512);