import { createRequire } from 'module';
const req = createRequire('C:/Users/RZ1/.pi/agent/skills/browser-tools/package.json');
const puppeteerMod = await import('file:///' + req.resolve('puppeteer-core').replace(/\\/g, '/'));
const puppeteer = puppeteerMod.default ?? puppeteerMod;
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--headless=new', '--no-first-run'], defaultViewport: { width: 1280, height: 900 } });
const page = (await browser.pages())[0];
await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded', timeout: 40000 });
await page.waitForSelector('[data-testid="scripts-island"]', { timeout: 40000 });
await page.click('[data-testid="btn-add-sma"]');
await new Promise((r) => setTimeout(r, 600));
await page.click('[data-testid="btn-run-backtest"]');
for (let i = 0; i < 150; i++) { await new Promise((r) => setTimeout(r, 300)); const dis = await page.$eval('[data-testid="btn-run-backtest"]', (el) => el.disabled).catch(() => true); if (!dis) break; }
const info = await page.evaluate(() => {
	const run = JSON.parse(window.localStorage.getItem('g3.runs.v1')).runs.filter((r) => r.status === 'succeeded').slice(-1)[0];
	return {
		barTimesLen: run.barTimes.length,
		plotLens: Object.entries(run.plots).map(([k, v]) => k + ':' + v.length),
		barsInRun: run.rangeBars,
		timeframe: run.timeframe,
		firstBarTime: run.barTimes[0], lastBarTime: run.barTimes[run.barTimes.length - 1],
		fromTime: run.fromTime, toTime: run.toTime
	};
});
console.log(JSON.stringify(info, null, 1));
await browser.close();