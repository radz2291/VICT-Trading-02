// G3 browser verification — W2 (unplanned exploration) + W5 (mechanical idea)
// + carried-findings checks (F-C2-2 production WRITE_REFUSED, F-AVC-1,
// F-3 wording) + W1/W3 regression smokes + narrow widths.
// Fresh headless Chrome, temp profile, bounded watchdog. PREVIEW server (built app).
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import(new URL('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/')));
const puppeteer = puppeteerMod.default ?? puppeteerMod;
const OUT = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G3/';
process.on('uncaughtException', (e) => { try { results.fatal = String(e); writeFileSync(OUT + 'browser-results.json', JSON.stringify(results, null, 2)); } catch {} process.exit(1); });
const hard = setTimeout(() => { console.log('HARD CAP'); try { writeFileSync(OUT + 'browser-results.json', JSON.stringify(results, null, 2)); } catch {} process.exit(2); }, 420000);
const results = { steps: {}, consoleErrors: [] };
const save = () => writeFileSync(OUT + 'browser-results.json', JSON.stringify(results, null, 2));

const dataDir = mkdtempSync(path.join(tmpdir(), 'g3full-'));
const browser = await puppeteer.launch({
	executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
	headless: true, debuggingPort: 9365,
	args: ['--headless=new', '--user-data-dir=' + dataDir, '--no-first-run', '--disable-extensions', '--window-size=1280,900'],
	defaultViewport: { width: 1280, height: 900 }, protocolTimeout: 40000
});
const page = (await browser.pages())[0];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) results.consoleErrors.push(String(m.text()).slice(0, 200)); });
page.on('dialog', async (d) => { try { await d.accept(); } catch {} });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = async (name, fn) => {
	try { results.steps[name] = { ok: true, ...(await fn()) }; }
	catch (e) { results.steps[name] = { ok: false, error: String(e).slice(0, 300) }; }
	save();
	console.log(name, '=>', JSON.stringify(results.steps[name]).slice(0, 200));
};
const txt = (sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, ' ').trim());
const lsGet = (key) => page.evaluate((k) => window.localStorage.getItem(k), key);
const lsSet = (key, v) => page.evaluate((kv) => window.localStorage.setItem(kv[0], kv[1]), [key, v]);

const SMA_ORDERS = [
	'function onBar(bar, api) {',
	"  const period = Math.max(2, Math.round(Number(api.input('period', 20))));",
	"  const closes = api.bars().bars.map(function (b) { return b.close; });",
	'  let m = null;',
	'  if (closes.length >= period) {',
	'    let s = 0;',
	'    for (let i = closes.length - period; i < closes.length; i++) s += closes[i];',
	'    m = s / period;',
	'  }',
	"  api.plot('sma', m);",
	'  if (m === null) return;',
	'  const st = api.state();',
	'  if (bar.close > m && st.position <= 0) api.order(\'buy\', 10);',
	'  if (bar.close < m && st.position > 0) api.order(\'sell\', 10);',
	'}'
].join('\n');

// ---------- W2: unplanned exploration ----------
await step('w2-load', async () => {
	await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 30000 });
	await page.waitForSelector('[data-testid="workspace"]', { timeout: 30000 });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 15000 });
	return {};
});

await step('w2-add-sma-indicator', async () => {
	await page.click('[data-testid="btn-add-sma"]');
	await sleep(400);
	const src = await page.$eval('[data-testid="draft-source"]', (el) => el.value);
	const name = await page.$eval('[data-testid="draft-name"]', (el) => el.value);
	return { editorOpened: true, name, srcHasSma: src.includes("api.plot('sma'"), srcLen: src.length };
});

await step('w2-new-draft-hide-reopen', async () => {
	await page.type('[data-testid="new-draft-name"]', 'w2probe');
	await page.click('[data-testid="btn-new-draft"]');
	await sleep(300);
	await page.click('[data-testid="draft-source"]');
	await page.evaluate(() => { document.querySelector('[data-testid="draft-source"]').value = ''; });
	const sentinel = 'function onBar(bar, api) { api.plot("w2sentinel", bar.close); }';
	await page.type('[data-testid="draft-source"]', sentinel);
	await page.click('[data-testid="btn-save-draft"]');
	await sleep(400);
	await page.click('[data-testid="btn-toggle-editor"]'); // hide (autosaves)
	await sleep(300);
	const hidden = (await page.$('[data-testid="draft-source"]')) === null;
	await page.click('[data-testid="btn-toggle-editor"]'); // reopen
	await sleep(300);
	const reopened = await page.$eval('[data-testid="draft-source"]', (el) => el.value);
	return { hidden, byteExactAfterReopen: reopened === sentinel };
});

await step('w2-reload-draft-survives', async () => {
	await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 20000 });
	await sleep(400);
	const hasDraft = !!(await page.$('[data-testid="draft-w2probe"]'));
	await page.click('[data-testid="draft-w2probe"]');
	await sleep(200);
	await page.click('[data-testid="btn-toggle-editor"]').catch(() => {});
	await sleep(200);
	const src = (await page.$('[data-testid="draft-source"]')) ? await page.$eval('[data-testid="draft-source"]', (el) => el.value) : '';
	return { draftInList: hasDraft, contentAfterReload: src.includes('w2sentinel') };
});

await step('w5-invalid-edit-actionable', async () => {
	await page.click('[data-testid="draft-w2probe"]');
	await sleep(200);
	await page.evaluate(() => { document.querySelector('[data-testid="draft-source"]').value = ''; });
	await page.type('[data-testid="draft-source"]', 'function onBar(bar, api) { const x = {;');
	await page.click('[data-testid="btn-save-draft"]');
	await sleep(400);
	await page.click('[data-testid="btn-run-backtest"]');
	await page.waitForFunction("document.querySelector('[data-testid=\"run-message\"]') && document.querySelector('[data-testid=\"run-message\"]').textContent.includes('run failed')", { timeout: 30000 });
	const msg = await txt('[data-testid="run-message"]');
	const status = await txt('[data-testid="scripts-status"]');
	const rowsAfter = (await lsGet('g3.runs.v1')) || '[]';
	return { msg: msg.slice(0, 90), status: status.slice(0, 40), runsBytesContainSyntaxError: rowsIncludes(rowsAfter, 'SCRIPT_SYNTAX_ERROR') };
	function rowsIncludes(bytes, needle) { return bytes.includes(needle); }
});

// ---------- W5: mechanical idea ----------
await step('w5-fix-and-run', async () => {
	await page.click('[data-testid="draft-w2probe"]');
	await sleep(200);
	await page.evaluate((src) => { document.querySelector('[data-testid="draft-source"]').value = src; }, [SMA_ORDERS]);
	await page.type('[data-testid="draft-source"]', ' ');
	await page.evaluate(() => { const el = document.querySelector('[data-testid="draft-source"]'); el.value = el.value.trim(); });
	await page.click('[data-testid="btn-save-draft"]');
	await sleep(400);
	await page.evaluate(() => { const el = document.querySelector('[data-testid="run-inputs"]'); el.value = '{"period": 20}'; el.dispatchEvent(new Event('input', { bubbles: true })); });
	await page.click('[data-testid="btn-run-backtest"]');
	await page.waitForFunction("document.querySelector('[data-testid=\"run-message\"]') && document.querySelector('[data-testid=\"run-message\"]').textContent.includes('run ')", { timeout: 90000 });
	await sleep(300);
	const msg = await txt('[data-testid="run-message"]');
	const overlayLegend = await txt('[data-testid="overlay-legend"]').catch(() => null);
	const svgPaneGone = (await page.$('[data-testid="plot-svg"]')) === null;
	const runs = JSON.parse(await lsGet('g3.runs.v1'));
	const succeeded = runs.runs.filter((r) => r.status === 'succeeded');
	const last = succeeded[succeeded.length - 1];
	return { msg: msg.slice(0, 100), fills: last.stats.tradeCount, identity: last.id.slice(0, 12), tradesStored: last.trades.length, overlayLegendFound: !!overlayLegend && overlayLegend.includes(last.id.slice(0, 12)), svgPaneRemoved: svgPaneGone };
});

await step('w5-identical-inputs-identical-run', async () => {
	const bytesBefore = await lsGet('g3.runs.v1');
	await page.click('[data-testid="btn-run-backtest"]');
	await page.waitForFunction((n) => { const d = JSON.parse(window.localStorage.getItem('g3.runs.v1')); return d.runs.length === n; }, { timeout: 90000 }, JSON.parse(bytesBefore).runs.length + 1);
	await sleep(200);
	const runs = JSON.parse(await lsGet('g3.runs.v1'));
	const succ = runs.runs.filter((r) => r.status === 'succeeded');
	const a = succ[succ.length - 2];
	const b = succ[succ.length - 1];
	const identical = a.id === b.id && JSON.stringify(a.trades) === JSON.stringify(b.trades) && JSON.stringify(a.equity) === JSON.stringify(b.equity);
	return { runA: a.id.slice(0, 12), runB: b.id.slice(0, 12), identicalIdentityAndResults: identical };
});
await page.screenshot({ path: OUT + 'br-01-desktop-w5.png' }).catch(() => {});

await step('w5-one-input-change-flips-identity', async () => {
	await page.evaluate(() => { const el = document.querySelector('[data-testid="run-inputs"]'); el.value = '{"period": 24}'; el.dispatchEvent(new Event('input', { bubbles: true })); });
	await page.click('[data-testid="btn-run-backtest"]');
	await page.waitForFunction("document.querySelector('[data-testid=\"run-message\"]') && document.querySelector('[data-testid=\"run-message\"]').textContent.includes('run ')", { timeout: 90000 });
	await sleep(200);
	const runs = JSON.parse(await lsGet('g3.runs.v1'));
	const succ = runs.runs.filter((r) => r.status === 'succeeded');
	const a = succ[succ.length - 2];
	const b = succ[succ.length - 1];
	return { differentIdentity: a.id !== b.id, bInputs: JSON.stringify(b.inputs) };
});

await step('w5-draft-edit-cannot-rewrite-run', async () => {
	const bytesBefore = await lsGet('g3.runs.v1');
	// edit the draft source and save (draft mutates freely)
	await page.evaluate(() => { const el = document.querySelector('[data-testid="draft-source"]'); el.value += '\n// edited after runs'; });
	await page.type('[data-testid="draft-source"]', ' ');
	await page.evaluate(() => { const el = document.querySelector('[data-testid="draft-source"]'); el.value = el.value.trim(); });
	await page.click('[data-testid="btn-save-draft"]');
	await sleep(500);
	const bytesAfter = await lsGet('g3.runs.v1');
	return { runsBytesUnchangedAfterDraftEdit: bytesBefore === bytesAfter };
});

await step('w5-compare-two-runs', async () => {
	const runs = JSON.parse(await lsGet('g3.runs.v1'));
	const succ = runs.runs.filter((r) => r.status === 'succeeded');
	const a = succ[succ.length - 2];
	const b = succ[succ.length - 1];
	await page.evaluate((ids) => {
		const [aid, bid] = ids;
		const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
		for (const r of radios) {
			if (r.value === aid && r.name === 'cmpA') r.click();
			if (r.value === bid && r.name === 'cmpB') r.click();
		}
	}, [a.id, b.id]);
	await sleep(300);
	const cmp = (await page.$('[data-testid="run-compare"]')) ? await txt('[data-testid="run-compare"]') : '';
	return { compareRendered: cmp.includes('Compare'), showsBothIdentities: cmp.includes(a.id.slice(0, 12)) && cmp.includes(b.id.slice(0, 12)), snippet: cmp.slice(0, 150) };
});

// ---------- F-C2-2: production WRITE_REFUSED path ----------
await step('fc22-refused-write-rendered', async () => {
	// corrupt the scripts storage key (a getter-safe corrupt: invalid JSON)
	await lsSet('g3.scripts.v1', '{corrupt!!');
	await page.click('[data-testid="btn-save-draft"]');
	await sleep(500);
	const status = await txt('[data-testid="scripts-status"]');
	const bytesAfter = await lsGet('g3.scripts.v1');
	// heal + retry: recovery must restore truthful saved state (F-AVC-1 family)
	const draftsGood = JSON.stringify({ version: 1, drafts: JSON.parse((await lsGet('g3.scripts.v1')) === '{corrupt!!' ? '{"version":1,"drafts":[]}' : '{}') });
	void draftsGood;
	await lsSet('g3.scripts.v1', JSON.stringify({ version: 1, drafts: [] }));
	await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 20000 });
	await sleep(400);
	await page.click('[data-testid="draft-w2probe"]').catch(() => {});
	await sleep(200);
	await page.click('[data-testid="btn-save-draft"]').catch(() => {});
	await sleep(500);
	const statusAfterHeal = await txt('[data-testid="scripts-status"]');
	return {
		refusalRendered: status.includes('READ_FAILED') || status.includes('refused'),
		corruptBytesPreserved: bytesAfter === '{corrupt!!',
		afterHealStatus: statusAfterHeal.slice(0, 30)
	};
});

// ---------- F-AVC-1: replay stale refusal after recovery ----------
await step('favc1-replay-recovery-clears-stale', async () => {
	// enter replay
	await page.waitForSelector('[data-testid="sel-replay-start"]', { timeout: 10000 });
	await page.select('[data-testid="sel-replay-start"]', '0');
	await sleep(600);
	await page.click('[data-testid="btn-replay-step"]');
	await sleep(400);
	// corrupt storage, step -> refusal rendered
	await lsSet('g2.replay.v1', '{corrupt');
	await page.click('[data-testid="btn-replay-step"]');
	await sleep(500);
	const refusal = await txt('[data-testid="replay-status"]');
	// heal storage (valid session record) -> step again -> status must CLEAR
	const validRecord = JSON.stringify({ version: 1, symbol: 'XAUUSD', instant: 1767225600, stepIndex: 1, playing: false, levels: [], returnedToCurrent: false });
	await lsSet('g2.replay.v1', validRecord);
	await page.click('[data-testid="btn-replay-step"]');
	await sleep(500);
	const after = await txt('[data-testid="replay-status"]');
	return {
		refusalRendered: refusal.toLowerCase().includes('unavailable') || refusal.toLowerCase().includes('failed'),
		staleAfterRecovery: after === refusal,
		after: after.slice(0, 60)
	};
});

// ---------- W1 regression ----------
await step('w1-regression-level-drawing', async () => {
	// return to current first
	const ret = await page.$('[data-testid="btn-return-current"]');
	if (ret) { await ret.click(); await sleep(400); }
	await page.click('[data-testid="btn-add-level"]');
	await sleep(300);
	const status = await txt('[data-testid="mutation-status"]');
	await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
	await page.waitForSelector('[data-testid="workspace"]', { timeout: 20000 });
	await sleep(500);
	const levels = JSON.parse(await lsGet('g1.levels.v1') || '[]');
	const rows = Array.isArray(levels) ? levels.length : (levels.rows ? levels.rows.length : 0);
	return { mutationStatus: status.slice(0, 30), persistedLevels: rows };
});

// ---------- narrow widths ----------
await step('narrow-375', async () => {
	await page.setViewport({ width: 375, height: 720 });
	await sleep(500);
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	await page.screenshot({ path: OUT + 'br-02-narrow-375.png' }).catch(() => {});
	return { horizontalOverflowPx: overflow };
});
await step('narrow-768', async () => {
	await page.setViewport({ width: 768, height: 900 });
	await sleep(500);
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	await page.screenshot({ path: OUT + 'br-03-narrow-768.png' }).catch(() => {});
	return { horizontalOverflowPx: overflow };
});
await page.setViewport({ width: 1280, height: 900 }).catch(() => {});
await page.screenshot({ path: OUT + 'br-04-final-desktop.png' }).catch(() => {});

results.consoleErrors = results.consoleErrors.slice(0, 12);
save();
await browser.close();
clearTimeout(hard);
console.log('DONE');
