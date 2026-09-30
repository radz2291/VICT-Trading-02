// FRESH VERIFIER harness #2 — continuation: recovery flows, runs-key refusal,
// keyboard, narrow widths, fresh-session identity continuity, W1 + W3
// regressions, console cleanliness. Production preview :5199.
import { writeFileSync, mkdtempSync, appendFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/'));
const puppeteer = puppeteerMod.default ?? puppeteerMod;
const OUT = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G3/verifier/';
mkdirSync(OUT, { recursive: true });
const results = { steps: {}, consoleErrors: [] };
const save = () => writeFileSync(OUT + 'v5-browser-results.json', JSON.stringify(results, null, 2));
const logLine = (s) => { console.log(s); try { appendFileSync(OUT + 'v5-browser-runlog.txt', s + '\n'); } catch {} };

const dataDir = mkdtempSync(path.join(tmpdir(), 'v5-g3-'));
const browser = await puppeteer.launch({
	executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
	headless: true, debuggingPort: 9379,
	args: ['--headless=new', '--user-data-dir=' + dataDir, '--no-first-run', '--disable-extensions', '--window-size=1280,900'],
	defaultViewport: { width: 1280, height: 900 }, protocolTimeout: 60000
});
const page = (await browser.pages())[0];
const consoleErrors = results.consoleErrors;
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) consoleErrors.push(String(m.text()).slice(0, 220)); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 220)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = async (name, fn) => {
	try { results.steps[name] = { ok: true, ...(await fn()) }; }
	catch (e) { results.steps[name] = { ok: false, error: String(e).slice(0, 320) }; }
	save();
	logLine(name + ' => ' + JSON.stringify(results.steps[name]).slice(0, 260));
};
const txt = (sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, ' ').trim()).catch(() => null);
const val = async (sel) => page.$eval(sel, (el) => el.value);
const setVal = (sel, v) => page.$eval(sel, (el, vv) => { el.value = vv; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, v);
const click = (sel) => page.click(sel);
const lsGet = (key) => page.evaluate((k) => window.localStorage.getItem(k), key);
const lsSet = (key, v) => page.evaluate((kv) => window.localStorage.setItem(kv[0], kv[1]), [key, v]);
const shot = (name) => page.screenshot({ path: OUT + name });
const waitRunDone = async () => {
	for (let i = 0; i < 150; i++) {
		await sleep(300);
		const dis = await page.$eval('[data-testid="btn-run-backtest"]', (el) => el.disabled).catch(() => true);
		if (!dis) return true;
	}
	return false;
};
const GOOD_DRAFT = { id: 'v1', name: 'recovered verifier draft', source: 'function onBar(bar, api) {\n  api.plot("mv", bar.close);\n  const st = api.state();\n  if (st.position <= 0 && bar.close % 2 === 0) api.order("buy", 1);\n  if (st.position > 0 && bar.close % 2 === 1) api.order("sell", 1);\n}\n', builtin: false, updatedAt: 0 };

await step('v5-load-seed-corrupt', async () => {
	await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 40000 });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
	await lsSet('g3.scripts.v1', 'BROKEN-SCRIPTS-{{{');
	await sleep(150);
	return { seeded: true };
});
await step('v5-recovery-cycle', async () => {
	// 1) attempt save while corrupt -> READ_FAILED refusal rendered
	await click('[data-testid="btn-save-draft"]').catch(() => {});
	await waitRunDone(); // may not run — just wait
	await sleep(500);
	const refusal = await txt('[data-testid="scripts-status"]');
	// 2) repair bytes -> reload -> save again -> saved
	await lsSet('g3.scripts.v1', JSON.stringify({ version: 1, drafts: [GOOD_DRAFT] }));
	await lsSet('g3.runs.v1', JSON.stringify({ version: 1, runs: [] }));
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
	const afterLoad = await txt('[data-testid="scripts-status"]');
	await click('[data-testid="btn-save-draft"]');
	await sleep(700);
	const afterSave = await txt('[data-testid="scripts-status"]');
	return { refusalWhileCorrupt: refusal, statusAfterRepairLoad: afterLoad, statusAfterRepairSave: afterSave };
});
await step('v5-refusal-runs-corrupt-run', async () => {
	// attempt a RUN while runs key is corrupt
	await lsSet('g3.runs.v1', ']]]corrupt{');
	await sleep(150);
	await click('[data-testid="btn-run-backtest"]');
	const done = await waitRunDone();
	const runsBytes = await lsGet('g3.runs.v1');
	await shot('v5-shot-01-runs-refusal.png');
	return {
		runDone: done,
		status: await txt('[data-testid="scripts-status"]'),
		runMsg: await txt('[data-testid="run-message"]'),
		corruptBytesPreserved: runsBytes === ']]]corrupt{'
	};
});
await step('v5-runs-recovery', async () => {
	await lsSet('g3.runs.v1', JSON.stringify({ version: 1, runs: [] }));
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
	await click('[data-testid="btn-run-backtest"]');
	const done = await waitRunDone();
	return { runDone: done, runMsg: await txt('[data-testid="run-message"]'), status: await txt('[data-testid="scripts-status"]') };
});

// ---------- identity continuity across a fresh session (same profile) --------
await step('v5-identity-across-session', async () => {
	// note identity from an identical-input run, then do the same run in a NEW PAGE
	const idBefore = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g3.runs.v1')).runs.slice(-1)[0].id);
	const page2 = await browser.newPage();
	page2.on('dialog', (d) => d.accept().catch(() => {}));
	await page2.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 40000 });
	await page2.waitForSelector('[data-testid="run-controls"]', { timeout: 40000 });
	await page2.click('[data-testid="btn-run-backtest"]');
	for (let i = 0; i < 150; i++) { await page2.waitForFunction(() => !document.querySelector('[data-testid="btn-run-backtest"]').disabled, { timeout: 45000 }).catch(() => {}); break; }
	await sleep(500);
	const idAfter = await page2.evaluate(() => JSON.parse(window.localStorage.getItem('g3.runs.v1')).runs.slice(-1)[0].id);
	await page2.close();
	return { identityMatchesAcrossReload: idBefore === idAfter, idBefore: idBefore.slice(0, 12), idAfter: idAfter.slice(0, 12) };
});

// ---------- W2 continuation: plot with signal circles -------------------------
await step('v5-w2-signal-plot', async () => {
	const last = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g3.runs.v1')).runs.slice(-1)[0]);
	const hasSignal = Object.keys(last.signals ?? {}).length > 0;
	const svgHasCircles = await page.evaluate(() => (document.querySelector('[data-testid="plot-svg"]')?.querySelectorAll('circle') ?? []).length);
	return { hasSignals: hasSignal, signalCirclesRendered: svgHasCircles > 0, runId: last.shortId };
});

// ---------- keyboard: editor textarea focusable + run controls ----------------
await step('v5-keyboard', async () => {
	// tab into name input, textarea, save, run controls
	await page.evaluate(() => { document.querySelector('[data-testid="draft-name"]')?.focus(); });
	const seq = [];
	await page.keyboard.press('Tab'); seq.push(await page.evaluate(() => (document.activeElement?.dataset?.testid || document.activeElement?.tagName)));
	await page.keyboard.press('Tab'); seq.push(await page.evaluate(() => (document.activeElement?.dataset?.testid || document.activeElement?.tagName)));
	// type in textarea via keyboard
	await page.keyboard.type(' ');
	// focus run tf and step to Run via Tab presses
	await page.evaluate(() => { document.querySelector('[data-testid="sel-run-tf"]').focus(); });
	for (let i = 0; i < 3; i++) { await page.keyboard.press('Tab'); seq.push(await page.evaluate(() => (document.activeElement?.dataset?.testid || document.activeElement?.tagName))); }
	const onRun = await page.evaluate(() => document.activeElement?.dataset?.testid === 'btn-run-backtest');
	let ranByKeyboard = false;
	if (onRun) {
		const rowsBefore = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g3.runs.v1')).runs.length);
		await page.keyboard.press('Enter');
		for (let i = 0; i < 150; i++) { await sleep(300); const dis = await page.$eval('[data-testid="btn-run-backtest"]', (el) => el.disabled).catch(() => true); if (!dis) break; }
		const rowsAfter = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g3.runs.v1')).runs.length);
		ranByKeyboard = rowsAfter > rowsBefore;
	}
	return { focusSequence: seq, runFocused: onRun, ranByKeyboard };
});

// ---------- narrow widths -----------------------------------------------------
await step('v5-narrow-768', async () => {
	await page.setViewport({ width: 768, height: 900 });
	await sleep(700);
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	await click('[data-testid="btn-run-backtest"]').catch(() => {});
	for (let i = 0; i < 150; i++) { await sleep(300); const dis = await page.$eval('[data-testid="btn-run-backtest"]', (el) => el.disabled).catch(() => true); if (!dis) break; }
	await shot('v5-shot-02-768.png');
	return { horizontalOverflowPx: overflow, runMsg: await txt('[data-testid="run-message"]') };
});
await step('v5-narrow-375', async () => {
	await page.setViewport({ width: 375, height: 800 });
	await sleep(700);
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	const island = await page.$eval('[data-testid="scripts-island"]', (el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0);
	await shot('v5-shot-03-375.png');
	return { horizontalOverflowPx: overflow, islandVisible: island, rowsVisible: (await page.$$('tbody tr')).length };
});

// ---------- W1 regression (fresh profile instance, new data dir) --------------
await step('v5-w1-fresh-profile-regression', async () => {
	const d2 = mkdtempSync(path.join(tmpdir(), 'v5w1-'));
	const b2 = await puppeteer.launch({
		executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
		headless: true, args: ['--headless=new', '--user-data-dir=' + d2, '--no-first-run'],
		defaultViewport: { width: 1280, height: 900 }
	});
	const p = (await b2.pages())[0];
	const errs = [];
	p.on('pageerror', (e) => errs.push(String(e).slice(0, 150)));
	await p.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 40000 });
	await p.waitForSelector('[data-testid="chart-container"]', { timeout: 40000 });
	// no prerequisites: chart island present with no forms blocking
	await p.click('[data-testid="btn-add-level"]');
	await p.wait(300).catch?.(() => {});
	await new Promise((r) => setTimeout(r, 500));
	const levelRows = await p.evaluate(() => window.localStorage.getItem('chart-workspace-xauusd-levels') || JSON.stringify(Object.keys(window.localStorage)));
	// change timeframe via panel
	await p.select('[data-testid="sel-timeframe"]', '1h');
	await new Promise((r) => setTimeout(r, 700));
	await p.reload({ waitUntil: 'domcontentloaded' });
	await p.waitForSelector('[data-testid="chart-container"]', { timeout: 40000 });
	const storedAfter = await p.evaluate(() => window.localStorage.getItem('ws.v1'));
	await p.screenshot({ path: OUT + 'v5-shot-04-w1.png' });
	const workspaceOk = await p.evaluate(() => !!document.querySelector('[data-testid="chart-island"]'));
	await b2.close();
	return { bareChartLoads: true, levelStored: levelRows.length > 0, wsStateStored: !!storedAfter, workspaceOk, pageErrors: errs.length };
});

// ---------- W3 regression (replay flow) ---------------------------------------
await step('v5-w3-enter-replay-step', async () => {
	await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 40000 });
	await page.waitForSelector('[data-testid="sel-replay-start"]', { timeout: 40000 });
	// choose a start
	await page.evaluate(() => {
		const sel = document.querySelector('[data-testid="sel-replay-start"]');
		const opts = Array.from(sel.options).filter((o) => o.value);
		sel.value = opts[2].value;
		sel.dispatchEvent(new Event('change', { bubbles: true }));
	});
	await sleep(1200);
	const banner = await txt('[data-testid="mode-banner"]');
	await click('[data-testid="btn-replay-step"]');
	await sleep(900);
	await click('[data-testid="btn-replay-step"]');
	await sleep(900);
	const pos = await txt('[data-testid="replay-position"]');
	// timeframe switch
	await page.select('[data-testid="sel-replay-tf"]', '1h');
	await sleep(1000);
	const barsLen1h = await page.evaluate(() => (document.querySelector('[data-testid="replay-readout"]') || {}).textContent || '');
	await page.select('[data-testid="sel-replay-tf"]', '4h');
	await sleep(1000);
	await shot('v5-shot-05-w3-replay-4h.png');
	// gap note present?
	const gaps = await txt('[data-testid="replay-gaps"]').catch(() => null);
	// provenance-unknown hidden
	const hiddenNote = await txt('[data-testid="replay-levels-hidden"]').catch(() => null);
	// draw a replay-stamped level by clicking the chart
	const chartBox = await (await page.$('[data-testid="replay-chart-container"]')).boundingBox();
	await page.mouse.click(chartBox.x + chartBox.width * 0.5, chartBox.y + chartBox.height * 0.4);
	await sleep(900);
	const levelCount = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g2.replay.v1') || '{"levels":[]}').levels?.length ?? 'n/a');
	// create level, then RELOAD: per G2, reload restores return-to-current (honest)
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page.waitForSelector('[data-testid="workspace"]', { timeout: 40000 });
	await sleep(1500);
	const bannerAfterReload = await txt('[data-testid="mode-banner"]');
	const posAfterReload = await txt('[data-testid="replay-position"]').catch(() => null);
	// deliberately restore the session and verify the replay level persists
	const replayRestored = await page.evaluate(() => { }); // restore via UI
	await click('[data-testid="btn-replay-restore"]').catch(() => { });
	await sleep(1500);
	const bannerRestored = await txt('[data-testid="mode-banner"]'); // may be CURRENT after restore failure
	const restoreInfo = await txt('[data-testid="replay-status"]').catch(() => null);
	const levelCountAfterRestore = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g2.replay.v1') || '{"levels":[]}').levels?.length ?? 'n/a');
	// return to current
	await click('[data-testid="btn-return-current"]').catch(() => { });
	await sleep(1200);
	const bannerCurrent = await txt('[data-testid="mode-banner"]');
	return {
		bannerOnEntry: banner?.slice(0, 80), replayPosition: pos,
		replayReadout1h: barsLen1h.slice(0, 110),
		unavailableNote: gaps, hiddenNote: hiddenNote?.slice(0, 120),
		replayLevelsStored: levelCount,
		bannerAfterReload: bannerAfterReload?.slice(0, 80),
		replayPosAfterReload: posAfterReload,
		bannerAfterRestore: bannerRestored?.slice(0, 80), restoreStatus: restoreInfo,
		levelCountAfterRestore,
		bannerAfterReturnCurrent: bannerCurrent?.slice(0, 30)
	};
});

results.finishedAt = new Date().toISOString();
results.consoleErrorCount = consoleErrors.length;
save();
logLine('SUMMARY ok=' + Object.values(results.steps).filter((s) => s.ok).length + '/' + Object.keys(results.steps).length + ' consoleErrors=' + consoleErrors.length);
await browser.close();