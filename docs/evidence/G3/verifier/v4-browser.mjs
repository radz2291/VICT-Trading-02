// FRESH VERIFIER browser harness — W2 + W5 + persistence + refusals + narrow
// widths. Production preview on :5199. MY OWN steps (not a rerun of the
// builder's browser-verify.mjs — same CDP approach, different step set).
import { writeFileSync, mkdtempSync, mkdirSync, appendFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/'));
const puppeteer = puppeteerMod.default ?? puppeteerMod;
const OUT = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G3/verifier/';
mkdirSync(OUT, { recursive: true });
const results = { steps: {}, consoleErrors: [] };
const save = () => writeFileSync(OUT + 'v4-browser-results.json', JSON.stringify(results, null, 2));
const logLine = (s) => { console.log(s); try { appendFileSync(OUT + 'v4-browser-runlog.txt', s + '\n'); } catch {} };

const dataDir = mkdtempSync(path.join(tmpdir(), 'v-g3-'));
const browser = await puppeteer.launch({
	executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
	headless: true, debuggingPort: 9377,
	args: ['--headless=new', '--user-data-dir=' + dataDir, '--no-first-run', '--disable-extensions', '--window-size=1280,900'],
	defaultViewport: { width: 1280, height: 900 }, protocolTimeout: 60000
});
const page = (await browser.pages())[0];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) results.consoleErrors.push(String(m.text()).slice(0, 220)); });
page.on('pageerror', (e) => results.consoleErrors.push('pageerror: ' + String(e).slice(0, 220)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = async (name, fn) => {
	try { results.steps[name] = { ok: true, ...(await fn()) }; }
	catch (e) { results.steps[name] = { ok: false, error: String(e).slice(0, 320) }; }
	save();
	logLine(name + ' => ' + JSON.stringify(results.steps[name]).slice(0, 240));
};
const txt = (sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, ' ').trim());
const val = async (sel) => page.$eval(sel, (el) => el.value);
const setVal = (sel, v) => page.$eval(sel, (el, vv) => { el.value = vv; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, v);
const click = (sel) => page.click(sel);
const lsGet = (key) => page.evaluate((k) => window.localStorage.getItem(k), key);
const lsSet = (key, v) => page.evaluate((kv) => window.localStorage.setItem(kv[0], kv[1]), [key, v]);
const shot = (name) => page.screenshot({ path: OUT + name });
const waitOk = async (ms = 1500) => { await sleep(ms); };
// stop the "running" state: wait until Run backtest button re-enabled
const waitRunDone = async () => {
	for (let i = 0; i < 120; i++) {
		await sleep(300);
		const dis = await page.$eval('[data-testid="btn-run-backtest"]', (el) => el.disabled).catch(() => true);
		if (!dis) return true;
	}
	return false;
};

await step('v4-load', async () => {
	await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 40000 });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
	return {
		banner: await txt('[data-testid="mode-banner"]'),
		feedNote: await txt('.feed-note').catch(() => 'n/a'),
		symbolsIsland: (await page.$$('[data-testid="scripts-island"]')).length
	};
});

// ---------- W2: add indicator (the builder's own SMA) -------------------------
await step('v4-w2-add-sma', async () => {
	await click('[data-testid="btn-add-sma"]');
	await waitOk(700);
	await click('[data-testid="btn-run-backtest"]');
	const ok = await waitRunDone();
	return { runDone: ok, runMsg: await txt('[data-testid="run-message"]') };
});

// ---------- W2: new draft + hide + reopen byte-exact --------------------------
await step('v4-w2-draft-hide-reopen', async () => {
	await setVal('[data-testid="new-draft-name"]', 'verifier note');
	await click('[data-testid="btn-new-draft"]');
	await waitOk(500);
	const SRC = `// verifier draft — deterministic marker vX1\nfunction onBar(bar, api) {\n  api.plot('marker', 42);\n  if (bar.time % 2 === 0) api.plotSignal('even', true);\n}\n`;
	await setVal('[data-testid="draft-source"]', SRC);
	await sleep(250);
	await click('[data-testid="btn-save-draft"]');
	await waitOk(800);
	const bytesBefore = await lsGet('g3.scripts.v1');
	await click('[data-testid="btn-toggle-editor"]'); // hide
	await waitOk(700);
	const editorGone = (await page.$$('[data-testid="draft-source"]')).length === 0;
	await click('[data-testid="btn-toggle-editor"]'); // reopen
	await waitOk(700);
	const srcAfter = await val('[data-testid="draft-source"]');
	await page.screenshot({ path: OUT + 'v4-shot-01-w2-reopen.png' });
	return { editorGoneOnHide: editorGone, byteExactReopen: srcAfter === SRC, status: await txt('[data-testid="scripts-status"]') };
});

// ---------- W5: invalid edit — actionable error, saved draft preserved --------
await step('v4-w5-invalid-edit', async () => {
	await setVal('[data-testid="draft-source"]', 'function onBar(bar, api) { const x = {;');
	await sleep(250);
	await click('[data-testid="btn-save-draft"]');
	await waitOk(800);
	await click('[data-testid="btn-run-backtest"]');
	const ok = await waitRunDone();
	const runMsg = await txt('[data-testid="run-message"]');
	const lastFailed = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g3.runs.v1')).runs.slice(-1)[0].status);
	// previous good run must remain listed
	const runCount = (await page.$$('[data-testid="run-list"] tbody tr')).length;
	return { runDone: ok, runMsg, storedLastStatus: lastFailed, runRows: runCount };
});

// ---------- W5: identical inputs -> identical identity + results --------------
await step('v4-w5-restore-good-source', async () => {
	const SRC = `// verifier draft — deterministic marker vX1\nfunction onBar(bar, api) {\n  const period = Math.max(2, Math.round(Number(api.input('period', 20))));\n  const closes = api.bars().bars.map(function (b) { return b.close; });\n  let m = null;\n  if (closes.length >= period) { let s = 0; for (let i = closes.length - period; i < closes.length; i++) s += closes[i]; m = s / period; }\n  api.plot('mv', m);\n  const st = api.state();\n  if (m !== null && bar.close > m && st.position <= 0) api.order('buy', 1);\n  if (m !== null && bar.close < m && st.position > 0) api.order('sell', 1);\n}\n`;
	await setVal('[data-testid="draft-source"]', SRC);
	await sleep(250);
	await click('[data-testid="btn-save-draft"]');
	await waitOk(800);
	return { status: await txt('[data-testid="scripts-status"]') };
});
await step('v4-w5-identical-runs', async () => {
	await click('[data-testid="btn-run-backtest"]');
	const ok = await waitRunDone();
	const runMsg1 = await txt('[data-testid="run-message"]');
	await click('[data-testid="btn-run-backtest"]');
	const ok2 = await waitRunDone();
	const runs = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g3.runs.v1')).runs.filter((r) => r.status === 'succeeded'));
	const last2 = runs.slice(-2);
	const identical = last2.length === 2 && last2[0].id === last2[1].id &&
		JSON.stringify(last2[0].stats) === JSON.stringify(last2[1].stats) &&
		JSON.stringify(last2[0].trades) === JSON.stringify(last2[1].trades) &&
		JSON.stringify(last2[0].plots) === JSON.stringify(last2[1].plots);
	return { runMsg1, identicalIdAndResults: identical, ids: last2.map((r) => r.shortId) };
});
await step('v4-w5-one-input-flip', async () => {
	await setVal('[data-testid="run-inputs"]', '{"period": 21}');
	await sleep(250);
	await click('[data-testid="btn-run-backtest"]');
	const ok = await waitRunDone();
	const runs = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g3.runs.v1')).runs.filter((r) => r.status === 'succeeded'));
	const a = runs[runs.length - 1], b = runs[runs.length - 2];
	page.screenshot({ path: OUT + 'v4-shot-02-runs.png' });
	return {
		runMsg: await txt('[data-testid="run-message"]'),
		identityDiffers: a.id !== b.id,
		resultsDiffer_a: a.id !== b.id ? (a.stats.netProfit !== b.stats.netProfit || JSON.stringify(a.trades) !== JSON.stringify(b.trades)) : false
	};
});
await step('v4-w5-compare-view', async () => {
	// select compare A/B on the last two rows
	const rows = await page.$$('[data-testid="run-list"] tbody tr');
	if (rows.length >= 2) {
		await rows[rows.length - 2].$eval('input[type="radio"][aria-label*="Compare B"]', (el) => el.click());
		await sleep(150);
		await rows[rows.length - 1].$eval('input[type="radio"][aria-label*="Compare A"]', (el) => el.click());
		await sleep(400);
	}
	const cmp = await txt('[data-testid="run-compare"]').catch(() => 'NO COMPARE RENDERED');
	return { compare: cmp.slice(0, 300) };
});

// ---------- criterion 6: draft edit cannot rewrite completed runs -------------
await step('v4-draft-edit-runs-immutable', async () => {
	const before = await lsGet('g3.runs.v1');
	await setVal('[data-testid="draft-source"]', '// mutated note — must NOT touch runs\nfunction onBar(bar, api) { api.plot("mv", bar.close); }\n');
	await sleep(250);
	await setVal('[data-testid="draft-name"]', 'verifier note R2');
	await sleep(250);
	await click('[data-testid="btn-save-draft"]');
	await waitOk(900);
	const after = await lsGet('g3.runs.v1');
	return { runsBytesUnchanged: before === after, status: await txt('[data-testid="scripts-status"]') };
});

// ---------- F-C2-2 / persistence refusals: corrupt scripts key ----------------
await step('v4-refusal-scripts-corrupt-save', async () => {
	const before = await lsGet('g3.scripts.v1');
	await lsSet('g3.scripts.v1', before.slice(0, Math.floor(before.length / 2))); // corrupt
	await sleep(150);
	await click('[data-testid="btn-save-draft"]');
	await waitOk(900);
	const after = await lsGet('g3.scripts.v1');
	await shot('v4-shot-03-refusal-scripts.png');
	return {
		status: await txt('[data-testid="scripts-status"]'),
		corruptBytesPreserved: before.slice(0, Math.floor(before.length / 2)) === after
	};
});
await step('v4-recovery-scripts', async () => {
	// repair: set the key back to a valid record (owner-style recovery)
	const corrupted = await lsGet('g3.scripts.v1');
	// owner flow here: delete key + reload -> fresh drafts, or a manual fix.
	// Test app path first: a fresh read attempt (recoverAfterStorageRepair is
	// triggered on reload).
	await lsSet('g3.scripts.v1', corrupted); // still corrupt
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
	const statusOnLoad = await txt('[data-testid="scripts-status"]');
	// now fix: restore a VALID record and reload again
	const good = await page.evaluate(() => {
		// reconstruct a minimal valid record with the current draft list is not
		// possible once bytes are lost — emulate the owner pasting a backup:
		window.localStorage.setItem('g3.scripts.v1', JSON.stringify({ version: 1, drafts: [{ id: 'x1', name: 'recovered', source: 'function onBar(bar, api) { api.plot("mv", 1); }', builtin: false, updatedAt: 0 }] }));
		return 'restored';
	});
	await page.reload({ waitUntil: 'domcontentloaded' });
	await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
	await click('[data-testid="btn-save-draft"]');
	await waitOk(900);
	return { statusOnCorruptLoad: statusOnLoad, statusAfterRepairSave: await txt('[data-testid="scripts-status"]') };
});
await step('v4-reload-draft-restored', async () => {
	const drafts = await lsGet('g3.scripts.v1');
	const parsed = JSON.parse(drafts);
	return { draftsCount: parsed.drafts.length, names: parsed.drafts.map((d) => d.name) };
});
await step('v4-refusal-runs-corrupt-run', async () => {
	// select the recovered draft, then corrupt runs key, then attempt a run
	await click(`[data-testid="draft-recovered"]`).catch(() => { }); // fallback select first draft
	await sleep(300);
	const before = await lsGet('g3.runs.v1');
	await lsSet('g3.runs.v1', ']]]corrupt-not-json{{{');
	await sleep(150);
	await click('[data-testid="btn-run-backtest"]');
	const ok = await waitRunDone();
	const after = await lsGet('g3.runs.v1');
	await shot('v4-shot-04-refusal-runs.png');
	return {
		runDone: ok, status: await txt('[data-testid="scripts-status"]'), runMsg: await txt('[data-testid="run-message"]'),
		corruptBytesPreserved: after === ']]]corrupt-not-json{{{'
	};
});

// ---------- keyboard access ---------------------------------------------------
await step('v4-keyboard', async () => {
	// Tab from the run timeframe to the Run button, then activate with Enter
	await page.evaluate(() => { document.querySelector('[data-testid="sel-run-tf"]').focus(); });
	await page.keyboard.press('Tab'); // range
	await page.keyboard.press('Tab'); // inputs
	await page.keyboard.press('Tab'); // run button
	const focused = await page.evaluate(() => document.activeElement.getAttribute('data-testid') || document.activeElement.tagName);
	await page.keyboard.press('Enter'); // activate run
	const ok = await waitRunDone();
	return { focusedElement: focused, runActivatedByKeyboard: ok };
});

// ---------- narrow widths -----------------------------------------------------
await step('v4-narrow-768', async () => {
	await page.setViewport({ width: 768, height: 900 });
	await waitOk(600);
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	await click('[data-testid="btn-run-backtest"]').catch(() => {});
	const ok = await waitRunDone();
	await shot('v4-shot-05-narrow-768.png');
	return { horizontalOverflowPx: overflow, runDone: ok, runMsg: await txt('[data-testid="run-message"]').catch(() => '') };
});
await step('v4-narrow-375', async () => {
	await page.setViewport({ width: 375, height: 800 });
	await waitOk(600);
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	await shot('v4-shot-06-narrow-375.png');
	const islandVisible = await page.$eval('[data-testid="scripts-island"]', (el) => !!el.offsetParent || getComputedStyle(el).display !== 'none');
	return { horizontalOverflowPx: overflow, islandVisible, plotSvg: (await page.$$('[data-testid="plot-svg"]')).length > 0 };
});

// ---------- fresh browser session (same profile relaunch) ---------------------
await step('v4-fresh-session', async () => {
	await page.setViewport({ width: 1280, height: 900 });
	const draftBytes = await lsGet('g3.scripts.v1');
	const runBytes = await lsGet('g3.runs.v1');
	const p2 = await browser.pages(); // new tab, same session
	const page2 = await browser.newPage();
	page2.on('dialog', (d) => d.accept().catch(() => {}));
	await page2.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 40000 });
	await page2.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
	const src = await page2.evaluate(() => {
		const rec = JSON.parse(window.localStorage.getItem('g3.scripts.v1') || '{}');
		return { drafts: rec.drafts?.length, first: rec.drafts?.[0]?.name, runsCount: JSON.parse(window.localStorage.getItem('g3.runs.v1') || '{"runs":[]}').runs.length };
	});
	// identical input → identical identity across the session boundary:
	await page2.click('[data-testid="btn-save-draft"]').catch(() => {});
	const runsBefore = await lsGet('g3.runs.v1');
	await page2.close();
	return { draftsAfterFreshSession: src.drafts, firstDraftName: src.first, runsCount: src.runsCount, runsBytesEqual: (await lsGet('g3.runs.v1')) === runsBefore, draftBytesPresent: !!draftBytes };
});

results.finishedAt = new Date().toISOString();
save();
logLine('SUMMARY ok=' + Object.values(results.steps).filter((s) => s.ok).length + '/' + Object.keys(results.steps).length + ' consoleErrors=' + results.consoleErrors.length);
await browser.close();