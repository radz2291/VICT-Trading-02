// cc2 bounded single browser run — fresh headless Chrome, temp profile, port 9345.
// Hard internal watchdog: force-exit after 75s total; per-step Promise.race 15s.
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import(new URL('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/')));
const puppeteer = puppeteerMod.default ?? puppeteerMod;
const OUT = 'C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G2/';
process.on('uncaughtException', (e) => { try { results.fatal = String(e); writeFileSync(OUT + 'cc2-browser-results.json', JSON.stringify(results, null, 2)); } catch {} process.exit(1); });

const START = Date.now();
const hard = setTimeout(() => { console.log('HARD-CAP exceeded — aborting browser route'); try { results.fatal = 'hard-cap 75s'; writeFileSync(OUT + 'cc2-browser-results.json', JSON.stringify(results, null, 2)); } catch {}; process.exit(2); }, 75000);
const results = { steps: {} };
const save = () => writeFileSync(OUT + 'cc2-browser-results.json', JSON.stringify(results, null, 2));

const dataDir = mkdtempSync(path.join(tmpdir(), 'cc2prof-'));
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  debuggingPort: 9345,
  args: ['--headless=new', '--remote-debugging-port=9345', '--user-data-dir=' + dataDir, '--no-first-run', '--disable-extensions', '--window-size=1280,900'],
  defaultViewport: { width: 1280, height: 900 },
  protocolTimeout: 15000
});
const page = (await browser.pages())[0];
const step = async (name, fn) => {
  try { results.steps[name] = { ok: true, ...(await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error('step-timeout 15s')), 15000))])) }; }
  catch (e) { results.steps[name] = { ok: false, error: String(e).slice(0, 250) }; }
  save();
};
const consoleMsgs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleMsgs.push({ level: m.type(), text: String(m.text()).slice(0, 160) }); });
page.on('dialog', async (d) => { try { await d.accept(); } catch {} });
const txt = (sel) => page.$$eval(sel, (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()).join(' | ')).catch(() => null);
const bytes = () => page.evaluate(() => ({ g2: localStorage.getItem('g2.replay.v1'), g1len: (localStorage.getItem('g1.levels.v1') || '').length }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await step('load', async () => {
  await page.goto('http://localhost:5311/', { waitUntil: 'domcontentloaded', timeout: 12000 });
  await page.waitForSelector('[data-testid="workspace"]', { timeout: 12000 });
  // ensure the panel is open
  const hasSelect = await page.$('[data-testid="sel-replay-start"]');
  if (!hasSelect) {
    const toggle = await page.$('[data-testid="btn-toggle-panel"]');
    if (toggle) { await page.click('[data-testid="btn-toggle-panel"]'); await sleep(400); }
    await page.evaluate(() => { localStorage.setItem('g1.workspace.v1', JSON.stringify({ id: 'active', symbol: 'XAUUSD', timeframe: '15m', panelOpen: 1 })); });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 12000 });
    await page.waitForSelector('[data-testid="workspace"]', { timeout: 12000 });
  }
  return { hasSelect: !!(await page.$('[data-testid="sel-replay-start"]')) };
});
await page.screenshot({ path: OUT + 'cc2-01-current-smoke.png' }).catch(() => {});

await step('replay-enter-step2', async () => {
  await page.select('[data-testid="sel-replay-start"]', '0');
  await sleep(800);
  await page.click('[data-testid="btn-replay-step"]'); await sleep(400);
  await page.click('[data-testid="btn-replay-step"]'); await sleep(400);
  return { position: await txt('[data-testid="replay-position"]'), banner: await txt('[data-testid="mode-banner"]'), g2len: (await bytes()).g2.length };
});
await page.screenshot({ path: OUT + 'cc2-02-replay-step2.png' }).catch(() => {});

await step('failing-write-step', async () => {
  const before = await bytes();
  const pos0 = await txt('[data-testid="replay-position"]');
  await page.evaluate(() => { const o = Storage.prototype.setItem; window.__heal = () => { Storage.prototype.setItem = o; }; Storage.prototype.setItem = function () { throw new Error('synthetic quota'); }; });
  await page.click('[data-testid="btn-replay-step"]'); await sleep(500);
  const after = await bytes();
  const status = await txt('.replay-status');
  await page.screenshot({ path: OUT + 'cc2-03-step-refused-failing-write.png' }).catch(() => {});
  await page.evaluate(() => window.__heal && window.__heal());
  await page.click('[data-testid="btn-replay-step"]'); await sleep(500);
  const posH = await txt('[data-testid="replay-position"]');
  await page.screenshot({ path: OUT + 'cc2-04-recovery-after-healed.png' }).catch(() => {});
  return { statusRendered: status, positionUnchanged: pos0 !== undefined && pos0 === await txt('[data-testid="replay-position"]').catch(() => null), g2BytesUnchanged: before.g2 === after.g2, positionAfterRecovery: posH };
});

await step('frv2-corrupt-at-start', async () => {
  await page.click('[data-testid="btn-return-current"]'); await sleep(500);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 12000 });
  await page.waitForSelector('[data-testid="workspace"]', { timeout: 12000 });
  await page.evaluate(() => { localStorage.setItem('g2.replay.v1', '{"version":1,"symbol":"","instan'); });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 12000 });
  await page.waitForSelector('[data-testid="workspace"]', { timeout: 12000 });
  const b0 = (await bytes()).g2;
  await page.click('[data-testid="btn-replay-restore"]'); await sleep(600);
  const statusRestore = await txt('[data-testid="replay-status"]');
  await page.screenshot({ path: OUT + 'cc2-05-corrupt-at-start-refusal-rendered-current-mode.png' }).catch(() => {});
  const sel = await page.$('[data-testid="sel-replay-start"]');
  let statusStart = null;
  if (sel) { await page.select('[data-testid="sel-replay-start"]', '0'); await sleep(600); statusStart = await txt('[data-testid="replay-status"]'); await page.screenshot({ path: OUT + 'cc2-06-refused-start-rendered.png' }).catch(() => {}); }
  const b1 = (await bytes()).g2;
  return { statusRestore, statusStart, corruptBytesUnchanged: b0 === b1 || (b0 || '').length === (b1 || '').length };
});

await step('recovery-then-return', async () => {
  await page.evaluate(() => localStorage.setItem('g2.replay.v1', JSON.stringify({ version: 1, symbol: '', instant: 1767572100, stepIndex: 3, playing: false, levels: [], returnedToCurrent: false })));
  await page.click('[data-testid="btn-replay-restore"]'); await sleep(600);
  const restored = await txt('[data-testid="replay-position"]');
  await page.screenshot({ path: OUT + 'cc2-07-recovery-restored.png' }).catch(() => {});
  await page.click('[data-testid="btn-return-current"]'); await sleep(500);
  const banner = await txt('[data-testid="mode-banner"]');
  await page.screenshot({ path: OUT + 'cc2-07-return-to-current.png' }).catch(() => {});
  return { restored, bannerAfterReturn: banner };
});

results.console = consoleMsgs;
writeFileSync(OUT + 'cc2-console-final.json', JSON.stringify(consoleMsgs, null, 2));
save();
clearTimeout(hard);
await browser.close();
console.log('DONE ok=', Object.values(results.steps).every((s) => s.ok));