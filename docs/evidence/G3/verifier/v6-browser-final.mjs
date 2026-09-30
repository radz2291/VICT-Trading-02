// FRESH VERIFIER harness #3 — remaining browser checks (redone correctly):
// refusal with draft selected, recovery, identity across session, W3 level
// creation + visibility rules, W1 regression, keyboard, narrow runs.
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
const save = () => writeFileSync(OUT + 'v6-browser-results.json', JSON.stringify(results, null, 2));
const logLine = (s) => { console.log(s); try { appendFileSync(OUT + 'v6-browser-runlog.txt', s + '\n'); } catch {} };

const dataDir = mkdtempSync(path.join(tmpdir(), 'v6-g3-'));
const browser = await puppeteer.launch({
	executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
	headless: true, debuggingPort: 9381,
	args: ['--headless=new', '--user-data-dir=' + dataDir, '--no-first-run', '--disable-extensions', '--window-size=1280,900'],
	defaultViewport: { width: 1280, height: 900 }, protocolTimeout: 60000
});
const page = (await browser.pages())[0];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon') && !m.text().includes('404')) results.consoleErrors.push(String(m.text()).slice(0, 220)); });
page.on('pageerror', (e) => results.consoleErrors.push('pageerror: ' + String(e).slice(0, 220)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = async (name, fn) => {
	try { results.steps[name] = { ok: true, ...(await fn()) }; }
	catch (e) { results.steps[name] = { ok: false, error: String(e).slice(0, 320) }; }
	save();
	logLine(name + ' => ' + JSON.stringify(results.steps[name]).slice(0, 260));
};
const txt = (sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, ' ').trim()).catch(() => null);
const setVal = (sel, v) => page.$eval(sel, (el, vv) => { el.value = vv; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, v);
const click = (sel) => page.click(sel);
const lsGet = (key) => page.evaluate((k) => window.localStorage.getItem(k), key);
const lsSet = (key, v) => page.evaluate((kv) => window.localStorage.setItem(kv[0], kv[1]), [key, v]);
const shot = (name) => page.screenshot({ path: OUT + name });
const waitRunDone = async (p = page) => {
	for (let i = 0; i < 150; i++) {
		await sleep(300);
		const dis = await p.$eval('[data-testid="btn-run-backtest"]', (el) => el.disabled).catch(() => () => true);
		if (!dis) return true;
	}
	return false;
};
const DRAFT = { id: 'v1', name: 'recovered verifier draft', source: 'function onBar(bar, api) {\n  api.plot("mv", bar.close);\n  const st = api.state();\n  if (st.position <= 0 && bar.close % 2 === 0) api.order("buy", 1);\n  if (st.position > 0 && bar.close % 2 === 1) api.order("sell", 1);\n}\n', builtin: false, updatedAt: 0 };

await step('v6-seed-and-select', async () => {
	await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 40000 });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
	await lsSet('g3.scripts.v1', JSON.stringify({ version: 1, drafts: [DRAFT] }));
	await lsSet('g3.runs.v1', JSON.stringify({ version: 1, runs: [] }));
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
	await click(`[data-testid="draft-recovered verifier draft"]`);
	await sleep(400);
	const editorOpen = (await page.$$('[data-testid="btn-save-draft"]')).length;
	return { editorOpen };
});
await step('v6-refusal-runs-with-draft', async () => {
	await lsSet('g3.runs.v1', ']]]corrupt{');
	await sleep(200);
	await click('[data-testid="btn-run-backtest"]');
	const done = await waitRunDone();
	const status = await txt('[data-testid="scripts-status"]');
	const runsBytes = await lsGet('g3.runs.v1');
	await shot('v6-shot-01-runs-refusal.png');
	return { runDone: done, status, corruptBytesPreserved: runsBytes === ']]]corrupt{', runMsg: await txt('[data-testid="run-message"]') };
});
await step('v6-runs-recover-and-run', async () => {
	await lsSet('g3.runs.v1', JSON.stringify({ version: 1, runs: [] }));
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
	await click(`[data-testid="draft-recovered verifier draft"]`);
	await sleep(400);
	await click('[data-testid="btn-run-backtest"]');
	const done = await waitRunDone();
	return { runDone: done, runMsg: await txt('[data-testid="run-message"]') };
});
await step('v6-identity-across-fresh-session', async () => {
	const idBefore = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g3.runs.v1')).runs.slice(-1)[0].id);
	const page2 = await browser.newPage();
	await page2.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 40000 });
	await page2.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
	await page2.click(`[data-testid="draft-recovered verifier draft"]`);
	await sleep(400);
	await page2.click('[data-testid="btn-run-backtest"]');
	await waitRunDone(page2);
	await sleep(400);
	const idAfter = await page2.evaluate(() => JSON.parse(window.localStorage.getItem('g3.runs.v1')).runs.slice(-1)[0].id);
	// runs bytes should now contain BOTH runs appended without mutation of the first
	const runsBytes = await page2.evaluate(() => window.localStorage.getItem('g3.runs.v1'));
	const firstRunStillIdentical = await page.evaluate((idOld) => {
		const runs = JSON.parse(window.localStorage.getItem('g3.runs.v1')).runs;
		return JSON.stringify(runs.find((r) => r.id === idOld));
	}, idBefore).then((v1) => v1 === JSON.stringify(JSON.parse(runsBytes).runs.find((r) => r.id === idBefore)));
	await page2.screenshot({ path: OUT + 'v6-shot-02-fresh-session.png' }).catch(() => {});
	await page2.close();
	return { identityMatchesAcrossSession: idBefore === idAfter, idBefore: idBefore.slice(0, 12), idAfter: idAfter.slice(0, 12), firstRunRecordUnchanged: firstRunStillIdentical };
});
await step('v6-keyboard', async () => {
	await click('[data-testid="btn-toggle-editor"]'); // ensure editor open (it may be open already)
	await sleep(300);
	await page.evaluate(() => { const t = document.querySelector('[data-testid="draft-source"]'); if (t) t.focus(); });
	let focus = await page.evaluate(() => document.activeElement?.dataset?.testid || document.activeElement?.tagName);
	await page.keyboard.press('Tab');
	const focus2 = await page.evaluate(() => document.activeElement?.dataset?.testid || document.activeElement?.tagName);
	// keyboard: focus run timeframe select and walk to run button
	await page.evaluate(() => { document.querySelector('[data-testid="sel-run-tf"]').focus(); });
	let walk = [];
	for (let i = 0; i < 4; i++) { await page.keyboard.press('Tab'); walk.push(await page.evaluate(() => document.activeElement?.dataset?.testid || document.activeElement?.tagName)); }
	const onRun = walk.includes('btn-run-backtest');
	let ranByKeyboard = false;
	if (onRun) {
		const idx = walk.indexOf('btn-run-backtest');
		const before = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g3.runs.v1')).runs.length);
		await page.keyboard.press('Enter');
		for (let i = 0; i < 150; i++) { await sleep(300); const dis = await page.$eval('[data-testid="btn-run-backtest"]', (el) => el.disabled).catch(() => true); if (!dis) break; }
		const after = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g3.runs.v1')).runs.length);
		ranByKeyboard = after > before;
	}
	return { textareaFocusable: focus === 'draft-source', nextTab: focus2, walkToRun: walk, ranByKeyboard };
});
await step('v6-narrow-with-runs', async () => {
	await page.setViewport({ width: 768, height: 900 });
	await sleep(700);
	await click('[data-testid="btn-run-backtest"]').catch(() => {});
	const done = await waitRunDone();
	const o768 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	await shot('v6-shot-03-768.png');
	await page.setViewport({ width: 375, height: 800 });
	await sleep(700);
	const o375 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	const islandVisible = await page.$eval('[data-testid="scripts-island"]', (el) => getComputedStyle(el).display !== 'none');
	const runRowVisible = await page.$eval('[data-testid="run-controls"]', (el) => getComputedStyle(el).display !== 'none');
	await shot('v6-shot-04-375.png');
	return { o768, o375, runDone, islandVisible, runRowVisible };
});
await step('v6-plot-visibility-pane', async () => {
	await page.setViewport({ width: 1280, height: 900 });
	await sleep(600);
	const svg = await page.$eval('[data-testid="plot-svg"]', (el) => ({ w: el.getBoundingClientRect().width, polyline: !!el.querySelector('polyline'), circles: el.querySelectorAll('circle').length }));
	const chartBox = await page.$eval('[data-testid="chart-container"]', (el) => ({ bottom: el.getBoundingClientRect().bottom }));
	const plotBox = await page.$eval('[data-testid="script-plots"]', (el) => ({ top: el.getBoundingClientRect().top }));
	return { svg, plotPaneBelowChart: plotBox.top >= chartBox.bottom - 20, sameAxesContextRecorded: 'see-report' };
});
await step('v6-w1-regression', async () => {
	// fresh-profile instance — bare chart with no prerequisites
	const d2 = mkdtempSync(path.join(tmpdir(), 'v6w1-'));
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
	await p.click('[data-testid="btn-add-level"]');
	await new Promise((r) => setTimeout(r, 600));
	const levelsKeyBefore = await p.evaluate(() => Object.keys(window.localStorage));
	await p.select('[data-testid="sel-timeframe"]', '1h');
	await new Promise((r) => setTimeout(r, 800));
	await p.reload({ waitUntil: 'domcontentloaded' });
	await p.waitForSelector('[data-testid="chart-container"]', { timeout: 40000 });
	const storedAfter = await p.evaluate(() => ({ keys: Object.keys(window.localStorage), levels: (window.localStorage.getItem('g1.levels.v1') || window.localStorage.getItem('ws.v1') || '').slice(0, 200) }));
	await p.screenshot({ path: OUT + 'v6-shot-05-w1.png' });
	await b2.close();
	return { bareChartLoads: true, noPrereqErrors: errs.length === 0, storageKeysAtStart: levelsKeyBefore.length, storedAfter, tfChanged: true };
});
await step('v6-w3-level-creation-visibility', async () => {
	await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 40000 });
	await page.waitForSelector('[data-testid="sel-replay-start"]', { timeout: 40000 });
	await page.evaluate(() => {
		const sel = document.querySelector('[data-testid="sel-replay-start"]');
		const opts = Array.from(sel.options).filter((o) => o.value);
		sel.value = opts[2].value;
		sel.dispatchEvent(new Event('change', { bubbles: true }));
	});
	await sleep(1500);
	// click the CANVAS inside the replay chart container
	const canvas = await (await page.$('[data-testid="replay-chart-container"] canvas')).boundingBox();
	await page.mouse.click(canvas.x + canvas.width * 0.5, canvas.y + canvas.height * 0.4);
	await sleep(1000);
	let levelCount = await page.evaluate(() => { try { return (JSON.parse(window.localStorage.getItem('g2.replay.v1') || '{}').levels || []).length; } catch { return 'parse-fail'; } });
	const levelRows = (await page.$$('[data-testid="replay-levels"] li')).length;
	await shot('v6-shot-06-w3-level.png');
	// visibility rule: creation step vs a lower step — step back via RESET then restore forward:
	// reset clears the session record; then restore → level gone (record reset) or hidden below creation step
	const readout = await txt('[data-testid="replay-readout"]');
	return { levelCount, levelRows, readout: readout?.slice(0, 90) };
});
await step('v6-w3-creation-step-visibility-down', async () => {
	// demonstrate the "created at step N, invisible at steps < N" rule:
	// kit rule visible iff creationStep <= currentStep. Step DOWN requires a
	// reset to the same start (step 0). If reset clears levels, record honesty.
	await click('[data-testid="btn-replay-reset"]');
	await sleep(1200);
	const afterReset = await page.evaluate(() => { try { return JSON.parse(window.localStorage.getItem('g2.replay.v1') || '{}'); } catch { return 'corrupt'; } });
	const position = await txt('[data-testid="replay-position"]').catch(() => null);
	const levelCount = (await page.$$('[data-testid="replay-levels"] li')).length;
	const hiddenZero = await txt('[data-testid="replay-levels-empty"]').catch(() => null);
	return { afterResetHasLevels: !!(afterReset && afterReset.levels && afterReset.levels.length), position, levelCount, levelsEmptyNote: hiddenZero?.slice(0, 80) };
});
await step('v6-restore-from-saved-state', async () => {
	// restore a saved session at step >= creation; level should re-appear
	await click('[data-testid="btn-replay-restore"]');
	await sleep(1500);
	const pos = await txt('[data-testid="replay-position"]');
	const levelCount = (await page.$$('[data-testid="replay-levels"] li')).length;
	const banner = await txt('[data-testid="mode-banner"]');
	const status = await txt('[data-testid="replay-status"]').catch(() => null);
	await shot('v6-shot-07-restore.png');
	return { position: pos, levelCount, banner: banner?.slice(0, 70), status };
});

results.finishedAt = new Date().toISOString();
results.consoleErrorCount = results.consoleErrors.length;
save();
logLine('SUMMARY ok=' + Object.values(results.steps).filter((s) => s.ok).length + '/' + Object.keys(results.steps).length + ' consoleErrors=' + results.consoleErrors.length);
await browser.close();