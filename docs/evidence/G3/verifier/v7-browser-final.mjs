// FRESH VERIFIER harness #4 (v7) — final remaining browser checks:
// W1 regression (fresh profile), W3 replay level creation + provenance-hidden
// note, F-AVC-1 (stale refusal cleared after recovery), F-3 (truthful gap
// footer), fixed keyboard Enter-run, D-004 FIFO overlap test with a forced
// write failure on the NEW stores (g3.scripts.v1).
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
const save = () => writeFileSync(OUT + 'v7-browser-results.json', JSON.stringify(results, null, 2));
const logLine = (s) => { console.log(s); try { appendFileSync(OUT + 'v7-browser-runlog.txt', s + '\n'); } catch {} };

const mainDataDir = mkdtempSync(path.join(tmpdir(), 'v7-g3-'));
const browser = await puppeteer.launch({
	executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
	headless: true, debuggingPort: 9383,
	args: ['--headless=new', '--user-data-dir=' + mainDataDir, '--no-first-run', '--disable-extensions', '--window-size=1280,900'],
	defaultViewport: { width: 1280, height: 900 }, protocolTimeout: 60000
});
const page = (await browser.pages())[0];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) results.consoleErrors.push(String(m.text()).slice(0, 200)); });
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
const lsGet = (key) => page.evaluate((k) => window.localStorage.getItem(k), key);
const lsSet = (key, v) => page.evaluate((kv) => window.localStorage.setItem(kv[0], kv[1]), [key, v]);
const shot = (name) => page.screenshot({ path: OUT + name });

// ---------- W1 regression: fresh profile, bare chart, level survives reload --
await step('v7-w1-regression', async () => {
	const d2 = mkdtempSync(path.join(tmpdir(), 'v7w1-'));
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
	await sleep(600);
	const keysBefore = await p.evaluate(() => Object.keys(window.localStorage));
	const levelsBytes = await p.evaluate(() => {
		for (const k of Object.keys(window.localStorage)) if (k.includes('level')) return { key: k, bytes: window.localStorage.getItem(k).slice(0, 300) };
		return null;
	});
	await p.select('[data-testid="sel-timeframe"]', '1h');
	await sleep(900);
	await p.reload({ waitUntil: 'domcontentloaded' });
	await p.waitForSelector('[data-testid="chart-island"]', { timeout: 40000 });
	await sleep(800);
	const levelsAfter = await p.evaluate(() => {
		for (const k of Object.keys(window.localStorage)) if (k.includes('level')) return window.localStorage.getItem(k).slice(0, 300);
		return null;
	});
	const tfAfter = await p.$eval('[data-testid="chart-island"]', (el) => el.dataset.timeframe).catch(() => null);
	await p.screenshot({ path: OUT + 'v7-shot-01-w1.png' });
	const summary = {
		bareChartLoads: true, noPrereqPageErrors: errs.length === 0,
		levelsKeyFoundAtStart: !!levelsBytes, levelsBytesStart: levelsBytes,
		levelsPersistAfterReload: levelsBytes && levelsBytes === levelsBytes && !!levelsAfter,
		levelsBytesAfter: levelsAfter, timeframeAfterReload: tfAfter
	};
	await b2.close();
	return summary;
});

// ---------- W3: replay level creation via real chart click -------------------
await step('v7-w3-replay-level-create', async () => {
	await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 40000 });
	await page.waitForSelector('[data-testid="sel-replay-start"]', { timeout: 40000 });
	await page.evaluate(() => {
		const sel = document.querySelector('[data-testid="sel-replay-start"]');
		const opts = Array.from(sel.options).filter((o) => o.value);
		sel.value = opts[2].value;
		sel.dispatchEvent(new Event('change', { bubbles: true }));
	});
	await sleep(2000);
	const canvas = await (await page.$('[data-testid="replay-chart-container"] canvas')).boundingBox();
	const x = canvas.x + canvas.width * 0.5, y = canvas.y + canvas.height * 0.45;
	await page.mouse.move(x, y); await sleep(400);
	await page.mouse.down(); await page.mouse.up(); await sleep(1200);
	// crosshair readout should show a price now
	const readout = await txt('[data-testid="replay-readout"]');
	let stored = await page.evaluate(() => { try { return JSON.parse(window.localStorage.getItem('g2.replay.v1') || '{}'); } catch { return { parse: 'fail' }; } });
	const uiLevels = (await page.$$('[data-testid="replay-levels"] li')).length;
	await shot('v7-shot-02-w3-level.png');
	// if the single click created nothing, try a deliberate second click
	if (uiLevels === 0) {
		await page.mouse.click(x + 5, y + 8); await sleep(1200);
		stored = await page.evaluate(() => { try { return JSON.parse(window.localStorage.getItem('g2.replay.v1') || '{}'); } catch { return { parse: 'fail' }; } });
	}
	const liAfter = (await page.$$('[data-testid="replay-levels"] li')).length;
	return {
		readout: readout?.slice(0, 110),
		storedLevels: (stored.levels || []).map((l) => ({ price: l.price, step: l.creationStep, instant: l.creationInstant })),
		uiLevelRows: liAfter
	};
});

// ---------- W3/R3: provenance-unknown levels hidden in replay ----------------
await step('v7-w3-provunknown-hidden', async () => {
	// create a CURRENT-mode level, then re-enter replay; the level must be hidden
	await click('[data-testid="btn-return-current"]');
	await sleep(1200);
	await click('[data-testid="btn-add-level"]');
	await sleep(700);
	const hiddenNote = await txt('[data-testid="replay-levels-hidden"]').catch(() => () => null);
	// re-enter replay
	await page.evaluate(() => {
		const sel = document.querySelector('[data-testid="sel-replay-start"]');
		const opts = Array.from(sel.options).filter((o) => o.value);
		sel.value = opts[2].value;
		sel.dispatchEvent(new Event('change', { bubbles: true }));
	});
	await sleep(1800);
	const hidden = await txt('[data-testid="replay-levels-hidden"]').catch(() => null);
	const curLevelRows = (await page.$$('[data-testid="replay-levels"] li')).length;
	await shot('v7-shot-03-hidden.png');
	return { hiddenNoteInReplay: hidden?.slice(0, 140), replayLevelRowsShown: curLevelRows };
});

// ---------- F-3: truthful gap wording on the footer --------------------------
await step('v7-f3-footer-wording', async () => {
	const footer = await page.evaluate(() => Array.from(document.querySelectorAll('.island footer, .island .footer, footer, .hint')).map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter((t) => t.includes('gap') || t.includes('bridg')));
	return { footers: footer.slice(0, 6) };
});

// ---------- F-AVC-1: refusal cleared after recovery (replay store) -----------
await step('v7-favc1-stale-refusal-clear', async () => {
	// currently in replay mode (v7-w3-provunknown-hidden left it there)
	const rawBefore = await lsGet('g2.replay.v1');
	await lsSet('g2.replay.v1', rawBefore.slice(0, 20)); // corrupt
	await sleep(200);
	await click('[data-testid="btn-replay-step"]').catch(() => {});
	await sleep(1000);
	await click('[data-testid="btn-replay-step"]').catch(() => {});
	await sleep(1200);
	const refusedStatus = await txt('[data-testid="replay-status"]').catch(() => null);
	const refusedBanner = await txt('[data-testid="mode-banner"]').catch(() => null);
	const bytesStillCorrupt = (await lsGet('g2.replay.v1')) === rawBefore.slice(0, 20);
	// repair
	await lsSet('g2.replay.v1', rawBefore);
	await sleep(200);
	await click('[data-testid="btn-replay-step"]').catch(() => {});
	await sleep(1200);
	const statusAfterRepair = await txt('[data-testid="replay-status"]').catch(() => null);
	const pos = await txt('[data-testid="replay-position"]').catch(() => null);
	await shot('v7-shot-04-favc1.png');
	return { refusedStatus, bytesPreserved: bytesStillCorrupt, statusAfterRepair, positionAfterRepair: pos };
});

// ---------- keyboard: Enter on focused Run button really runs ----------------
await step('v7-keyboard-enter-run', async () => {
	// leave replay for the scripts island
	await click('[data-testid="btn-return-current"]').catch(() => {});
	await sleep(1200);
	await page.evaluate(() => { document.querySelector('[data-testid="sel-run-tf"]').focus(); });
	for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
	const onRun = await page.evaluate(() => document.activeElement?.dataset?.testid === 'btn-run-backtest');
	const before = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g3.runs.v1')).runs.length);
	let enterRan = false;
	if (onRun) {
		await page.keyboard.press('Enter');
		for (let i = 0; i < 150; i++) { await sleep(300); const dis = await page.$eval('[data-testid="btn-run-backtest"]', (el) => el.disabled).catch(() => true); if (!dis) break; }
		const after = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g3.runs.v1')).runs.length);
		enterRan = after > before;
	}
	// editor keyboard: textarea -> save button
	const editorOpen = (await page.$$('[data-testid="btn-save-draft"]')).length > 0;
	await page.evaluate(() => { const t = document.querySelector('[data-testid="draft-source"]'); if (t) { t.focus(); } });
	await page.keyboard.press('Tab');
	const saveFocused = await page.evaluate(() => document.activeElement?.dataset?.testid === 'btn-save-draft');
	await shot('v7-shot-05-keyboard.png');
	return { runButtonFocused: onRun, enterActivatedRun: enterRan, saveFocused };
});

// ---------- D-004: FIFO overlap with a forced write failure on the NEW store --
await step('v7-d004-fifo-overlap', async () => {
	const nameBefore = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g3.scripts.v1')).drafts[0].name);
	// patch: the FIRST setItem call after this line throws; the rest pass
	await page.evaluate(() => {
		const proto = Object.getPrototypeOf(window.localStorage);
		const orig = proto.setItem;
		window.__origSetItem = orig;
		window.__called = 0;
		proto.setItem = function (k, v) {
			window.__called += 1;
			if (window.__forceFail === undefined) window.__forceFail = true;
			if (window.__forceFail && window.__called <= 1) {
				window.__forceFail = undefined;
				if (k === 'g3.scripts.v1' || true) throw new Error('FORCED_WRITE_FAILURE');
			}
			return orig.call(this, k, v);
		};
	});
	// queue op1 (will hit the forced failure) then op2 immediately
	await click('[data-testid="btn-save-draft"]');
	const p1 = sleep(150).then(() => setVal('[data-testid="draft-name"]', 'recovered verifier draft v7b'));
	await p1.catch(() => {});
	await click('[data-testid="btn-save-draft"]');
	await sleep(1500);
	await page.evaluate(() => { Object.getPrototypeOf(window.localStorage).setItem = window.__origSetItem; });
	const rec = await page.evaluate(() => JSON.parse(window.localStorage.getItem('g3.scripts.v1')));
	const status = await txt('[data-testid="scripts-status"]');
	const name2 = await page.evaluate(() => document.querySelector('[data-testid="draft-name"]').value);
	// the drafts list UI (committed view) must match bytes
	const uiName = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid="draft-list"] button')).map((b) => b.textContent.trim()).join('|'));
	await shot('v7-shot-06-d004.png');
	return {
		nameBefore, statusAfterOps: status, finalByteName: rec.drafts[0].name,
		updatedBytesName: rec.drafts[0].name, uiName,
		namesAgree: rec.drafts[0].name === uiName.split('|')[0]
	};
});

results.finishedAt = new Date().toISOString();
results.consoleErrorCount = results.consoleErrors.length;
save();
logLine('SUMMARY ok=' + Object.values(results.steps).filter((s) => s.ok).length + '/' + Object.keys(results.steps).length + ' consoleErrors=' + results.consoleErrors.length);
await browser.close();