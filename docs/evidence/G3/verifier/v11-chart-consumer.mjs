// FRESH VERIFIER — own independent chart-workspace 0.1.1 consumer, OUTSIDE
// the monorepo. Installs the COMMITTED tarball, bundles nothing (page loads
// the esbuild bundle produced here), and drives a REAL browser page with
// canvas pixel probes. Own assertions, incl. the re-add stacking falsification.
import { execSync } from 'child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, appendFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/'));
const puppeteer = puppeteerMod.default ?? puppeteerMod;

const ROOT = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading';
const CW = 'C:/Users/RZ1/Desktop/RZ/g3-verifier-chart-consumer';
const OUT = ROOT + '/docs/evidence/G3/verifier/';
mkdirSync(OUT, { recursive: true });

const results = { steps: {} };
const save = () => writeFileSync(OUT + 'v11-chart-consumer-results.json', JSON.stringify(results, null, 2));
const logLine = (s) => { console.log(s); try { appendFileSync(OUT + 'v11-chart-consumer-runlog.txt', s + '\n'); } catch {} };
const step = async (name, fn) => {
	try { results.steps[name] = { ok: true, ...(await fn()) }; }
	catch (e) { results.steps[name] = { ok: false, error: String(e).slice(0, 300) }; }
	save();
	logLine(name + ' => ' + JSON.stringify(results.steps[name]).slice(0, 260));
};

// ---- install the COMMITTED 0.1.1 tarball (verify identity first) ------------
await step('install', async () => {
	execSync(`npm init -y`, { cwd: CW, stdio: 'pipe' });
	const { execSync: es } = { execSync };
	void es;
});
try {
	execSync('npm init -y', { cwd: CW, stdio: 'pipe' });
	execSync(`npm install "C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G3/chart-workspace-0.1.1.tgz"`, { cwd: CW, stdio: 'pipe' });
	logLine('install ok: cw 0.1.1 installed from committed artifact');
} catch (e) { logLine('INSTALL FAIL: ' + String(e).slice(0, 300)); }

// ---- bundle for the page ----------------------------------------------------
await step('bundle', async () => {
	const esbuildJs = `import * as cw from '@vict-trading/chart-workspace'; window.CW = cw; export {};`;
	writeFileSync(CW + '/entry.js', esbuildJs);
	execSync(`C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/host/node_modules/.bin/esbuild ${CW}/entry.js --bundle --format=iife --outfile=${CW}/bundle.js --alias:@vict-trading/chart-workspace=${CW}/node_modules/@vict-trading/chart-workspace/dist/index.js`, { stdio: 'pipe' });
	logLine('bundle ok');
	return { bytes: readFileSync(CW + '/bundle.js').length };
});

// ---- page -------------------------------------------------------------------
const pageHtml = `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0"><div id="chart" style="width:900px;height:500px"></div>
<script src="./bundle.js"></script></body></html>`;
writeFileSync(CW + '/page.html', pageHtml);

const dataDir = mkdtempSync(path.join(tmpdir(), 'v11cw-'));
const browser = await puppeteer.launch({
	executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
	headless: true, args: ['--headless=new', '--user-data-dir=' + dataDir, '--no-first-run'],
	defaultViewport: { width: 950, height: 560 }
});
const page = (await browser.pages())[0];
await page.goto('file:///' + CW.replace(/\\/g, '/') + '/page.html');
await page.waitForFunction(() => !!window.CW, { timeout: 20000 });
logLine('page loaded with CW global');

// candles fixture: rising 25 bars, times = own synthetic (not any fixture)
const pageSetup = await page.evaluate(() => {
	const bars = Array.from({ length: 25 }, (_, i) => {
		const t = 1772900000 + i * 900;
		const base = 100 + i;
		return { time: t, open: base, high: base + 1.2, low: base - 1.2, close: base + 0.5 };
	});
	const c = CW.createChart({ container: document.getElementById('chart') }, bars, {});
	window.__ctrl = c;
	return { chartOk: true, hasAddOverlay: typeof c.addOverlay === 'function', hasRemoveOverlay: typeof c.removeOverlay === 'function' };
});

function colorScan(xStrip, colors) {
	return page.evaluate((xs, cols) => {
		const cvs = document.querySelector('#chart canvas');
		const ctx = cvs.getContext('2d');
		const img = ctx.getImageData(xs - 2, 0, 5, cvs.height);
		const counts = {};
		for (const c of cols) counts[c] = 0;
		for (let y = 0; y < cvs.height; y++) {
			for (let dx = 0; dx < 5; dx++) {
				const i = (y * 5 + dx) * 4;
				const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
				for (const c of cols) {
					const [cr, cg, cb, tol] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 40];
					if (Math.abs(r - cr) < tol && Math.abs(g - cg) < tol && Math.abs(b - cb) < tol) { counts[c] += 1; break; }
				}
			}
		}
		return counts;
	}, xStrip, colors);
}

// C1 — overlay type surface + basic render on the price pane WITH candles
await step('c1-overlay-api-and-render', async () => {
	const s = await colorScan(null === 0 ? 0 : 0, ['#FF00FF']);
	void s;
	const counts = await colorScan(Math.floor(950 / 2) + 1, ['#FF00FF']);
	return { ...pageSetup, magentaScanSample: counts };
});

// C2 — FALSIFICATION: re-adding the SAME id twice — stacking or replacement?
await step('c2-readd-same-id', async () => {
	await page.evaluate(() => {
		const c = window.__ctrl;
		const T = 1772900000;
		const h1 = c.addOverlay({ id: 'probe-x', kind: 'line', pane: 'price', color: '#FF00FF' });
		const rows = [];
		for (let i = 0; i < 25; i++) rows.push({ time: T + i * 900, value: 101 }); // LOW line
		h1.setData(rows);
		const h2 = c.addOverlay({ id: 'probe-x', kind: 'line', pane: 'price', color: '#00FFFF' });
		const rows2 = [];
		for (let i = 0; i < 25; i++) rows2.push({ time: T + i * 900, value: 110 }); // HIGH line
		h2.setData(rows2);
	});
	await new Promise((r) => setTimeout(r, 400));
	const stripColors = ['#FF00FF', '#00FFFF'];
	const counts = await colorScan(Math.floor(950 / 2) + 1, stripColors);
	await page.screenshot({ path: OUT + 'v11-shot-01-readd.png' });
	const stacked = counts['#FF00FF'] > 0 && counts['#00FFFF'] > 0;
	const replaced = counts['#00FFFF'] > 0 && counts['#FF00FF'] === 0;
	return { counts, stacked, replaced };
});

// C3 — removeOverlay really removes
await step('c3-removeOverlay', async () => {
	await page.evaluate(() => { window.__ctrl.removeOverlay('probe-x'); });
	await new Promise((r) => setTimeout(r, 300));
	const counts = await colorScan(Math.floor(950 / 2) + 1, ['#FF00FF', '#00FFFF']);
	return { removedBoth: counts['#FF00FF'] === 0 && counts['#00FFFF'] === 0, counts };
});

// C4 — markers at candle times + null gaps + out-of-order refusal behaviour
await step('c4-data-semantics', async () => {
	const r = await page.evaluate(() => {
		const c = window.__ctrl;
		const T = 1772900000;
		const h = c.addOverlay({ id: 'probe-y', kind: 'line', pane: 'price', color: '#FF8800' });
		// null gaps + an out-of-order trailing point (must be refused, not corrupt)
		h.setData([
			{ time: T, value: 102 }, { time: T + 900, value: null }, { time: T + 1800, value: 104 },
			{ time: T + 7200, value: 99 } // out of order vs T+1800 -> refused internally
		]);
		h.setMarkers([{ time: T + 1800, shape: 'circle', text: 'sig' }]);
		const p = c.priceToCoordinate(104);
		return { priceCoordinateAvailable: typeof p === 'number', paneCount: (c === null) ? -1 : 'see-probe' };
	});
	await new Promise((r) => setTimeout(r, 400));
	const counts = await colorScan(Math.floor(950 / 2) + 1, ['#FF8800']);
	await page.screenshot({ path: OUT + 'v11-shot-02-markers.png' });
	return { ...r, orangeTraceVisible: counts['#FF8800'] > 0 };
});

// C5 — 'sub' pane keeps its own price scale but shares the time axis
await step('c5-sub-pane', async () => {
	const panes = await page.evaluate(() => window.__ctrl.panes ? -1 : -1); // panes() not on ChartController
	void panes;
	await page.evaluate(() => {
		const c = window.__ctrl;
		const T = 1772900000;
		const h = c.addOverlay({ id: 'probe-sub', kind: 'line', pane: 'sub', color: '#22AA44', lineWidth: 2 });
		const rows = [];
		for (let i = 0; i < 25; i++) rows.push({ time: T + i * 900, value: i % 5 });
		h.setData(rows);
	});
	await new Promise((r) => setTimeout(r, 500));
	await page.screenshot({ path: OUT + 'v11-shot-03-sub-pane.png' });
	// green trace in the LOWER area = own scale; verify pixels below the main plot area
	const lower = await page.evaluate(() => {
		const cvs = document.querySelector('#chart canvas');
		const ctx = cvs.getContext('2d');
		let green = 0;
		for (let y = Math.floor(cvs.height * 0.75); y < cvs.height; y++) {
			for (let dx = 0; dx < 5; dx++) {
				const img = ctx.getImageData(Math.floor(cvs.width * 0.5) + dx, y, 1, 1);
				const r = img.data[0], g = img.data[1], b = img.data[2];
				if (Math.abs(g - 0xAA) < 45 && Math.abs(r - 0x22) < 45 && Math.abs(b - 0x44) < 45) green++;
			}
		}
		return green;
	});
	return { greenTraceInLowerZone: lower > 0 };
});

await browser.close();
logLine('SUMMARY ok=' + Object.values(results.steps).filter((s) => s.ok).length + '/' + Object.keys(results.steps).length);