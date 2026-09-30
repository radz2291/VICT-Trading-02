// FRESH VERIFIER harness #5 (v8) — keyboard Enter-run + D-004 FIFO overlap on
// the new stores (with a seeded draft first).
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
const save = () => writeFileSync(OUT + 'v8-browser-results.json', JSON.stringify(results, null, 2));
const logLine = (s) => { console.log(s); try { appendFileSync(OUT + 'v8-browser-runlog.txt', s + '\n'); } catch {} };

const dataDir = mkdtempSync(path.join(tmpdir(), 'v8-g3-'));
const browser = await puppeteer.launch({
	executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
	headless: true, debuggingPort: 9385,
	args: ['--headless=new', '--user-data-dir=' + dataDir, '--no-first-run', '--disable-extensions', '--window-size=1280,900'],
	defaultViewport: { width: 1280, height: 900 }, protocolTimeout: 60000
});
const page = (await browser.pages())[0];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon') && !m.text().includes('404')) results.consoleErrors.push(String(m.text()).slice(0, 200)); });
page.on('pageerror', (e) => results.consoleErrors.push('pageerror: ' + String(e).slice(0, 200)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = async (name, fn) => {
	try { results.steps[name] = { ok: true, ...(await fn()) }; }
	catch (e) { results.steps[name] = { ok: false, error: String(e).slice(0, 340) }; }
	save();
	logLine(name + ' => ' + JSON.stringify(results.steps[name]).slice(0, 300));
};
const txt = (sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, ' ').trim()).catch(() => null);
const setVal = (sel, v) => page.$eval(sel, (el, vv) => { el.value = vv; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, v);
const click = (sel) => page.click(sel);
const lsSet = (key, v) => page.evaluate((kv) => window.localStorage.setItem(kv[0], kv[1]), [key, v]);

const DRAFT = { id: 'v8', name: 'kb draft', source: 'function onBar(bar, api) {\n  api.plot("mv", bar.close);\n  const st = api.state();\n  if (st.position <= 0 && bar.close % 2 === 0) api.order("buy", 1);\n  if (st.position > 0 && bar.close % 2 === 1) api.order("sell", 1);\n}\n', builtin: false, updatedAt: 0 };

await step('v8-seed', async () => {
	await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 40000 });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
	await lsSet('g3.scripts.v1', JSON.stringify({ version: 1, drafts: [DRAFT] }));
	await lsSet('g3.runs.v1', JSON.stringify({ version: 1, runs: [] }));
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
	await click('[data-testid="draft-kb draft"]');
	await sleep(400);
	return { editorOpen: (await page.$$('[data-testid="btn-save-draft"]')).length > 0, status: await txt('[data-testid="scripts-status"]') };
});

await step('v8-keyboard-enter-run', async () => {
	const before = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g3.runs.v1')).runs.length);
	await page.evaluate(() => { document.querySelector('[data-testid="sel-run-tf"]').focus(); });
	const walk = ['sel-run-tf'];
	for (let i = 0; i < 3; i++) { await page.keyboard.press('Tab'); walk.push(await page.evaluate(() => document.activeElement?.dataset?.testid || document.activeElement?.tagName)); }
	const onRun = await page.evaluate(() => document.activeElement?.dataset?.testid === 'btn-run-backtest');
	let enterRan = false;
	if (onRun) {
		await page.keyboard.press('Enter');
		for (let i = 0; i < 150; i++) { await sleep(300); const dis = await page.$eval('[data-testid="btn-run-backtest"]', (el) => el.disabled).catch(() => true); if (!dis) break; }
		const after = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g3.runs.v1')).runs.length);
		enterRan = after > before;
	}
	// editor keyboard: textarea focus + Tab lands on Save, Enter saves
	await page.evaluate(() => { const t = document.querySelector('[data-testid="draft-source"]'); if (t) t.focus(); });
	await page.keyboard.press('Tab');
	const saveFocused = await page.evaluate(() => document.activeElement?.dataset?.testid === 'btn-save-draft');
	if (saveFocused) await page.keyboard.press('Enter');
	await sleep(800);
	const status = await txt('[data-testid="scripts-status"]');
	return { tabWalkToRun: walk, runFocused: onRun, enterActivatedRun: enterRan, saveFocused, statusAfterEnterSave: status };
});

await step('v8-d004-fifo-overlap', async () => {
	// Force the FIRST write to fail (PORT_ERROR), queue a second op immediately
	// that CHANGES the name; per D-004 the second op re-bases and must succeed,
	// with the committed bytes matching the second op, and truthful statuses.
	const origName = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g3.scripts.v1')).drafts[0].name);
	await page.evaluate(() => {
		const proto = Object.getPrototypeOf(window.localStorage);
		const orig = proto.setItem; let n = 0;
		proto.setItem = function (k, v) { if (++n === 1) throw new Error('FORCED_WRITE_FAILURE'); return orig.call(this, k, v); };
		proto.__victRestore = orig;
	});
	await click('[data-testid="btn-toggle-editor"]'); // open editor
	await sleep(400);
	await click('[data-testid="btn-save-draft"]'); // op1 — will throw
	await setVal('[data-testid="draft-name"]', 'kb draft v8-b');
	await click('[data-testid="btn-save-draft"]'); // op2 — re-base, should succeed
	await sleep(1500);
	await page.evaluate(() => { Object.getPrototypeOf(window.localStorage).setItem = Object.getPrototypeOf(window.localStorage).__victRestore; });
	const bytes = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g3.scripts.v1')));
	const uiName = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="draft-list"] button')).map((b) => b.textContent.trim()).join('|'));
	const status = await txt('[data-testid="scripts-status"]');
	return {
		nameBefore: origName,
		committedName: bytes.drafts[0]?.name,
		uiCommittedName: uiName,
		status: status?.slice(0, 120),
		re_basedSuccess: bytes.drafts[0]?.name === 'kb draft v8-b' && uiName.includes('kb draft v8-b')
	};
});

results.finishedAt = new Date().toISOString();
results.consoleErrorCount = results.consoleErrors.length;
save();
logLine('SUMMARY ok=' + Object.values(results.steps).filter((s) => s.ok).length + '/' + Object.keys(results.steps).length + ' consoleErrors=' + results.consoleErrors.length);
await browser.close();