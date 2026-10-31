// Run from any directory with Node 24: node docs/evidence/G3-R/ownership-audit/reproduce.mjs
// Source audit reproduction; no package install or app browser is involved.
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const temp = await mkdtemp(join(tmpdir(), 'vict-ownership-'));
try {
  for (const name of ['types', 'clock', 'data']) {
    const source = await readFile(join(root, 'packages/trading-kit/src', name + '.ts'), 'utf8');
    await writeFile(join(temp, name + '.ts'), source.replaceAll("'./types.js'", "'./types.ts'").replaceAll("'./clock.js'", "'./clock.ts'"));
  }
  const { buildInstrument, aggregate } = await import(pathToFileURL(join(root, 'host/src/lib/fixture.ts')).href);
  const { createReplayClock } = await import(pathToFileURL(join(temp, 'clock.ts')).href);
  const { createDataSession } = await import(pathToFileURL(join(temp, 'data.ts')).href);
  const source = buildInstrument('XAUUSD');
  const horizon = source.at(-1).time + 900;
  const clock = createReplayClock({start: horizon, horizon});
  const data = createDataSession({clock, source: {bars: source}, rules: {symbol: 'XAUUSD', baseTimeframe: '15m'}});
  const results = [];
  for (const [tf, seconds] of [['1h', 3600], ['4h', 14400]]) {
    const host = aggregate(source, tf);
    const kit = data.bars({granularity: tf}).bars;
    const expectedSlots = seconds / 900;
    const incomplete = host.filter(b => source.filter(s => s.time >= b.time && s.time < b.time + seconds).length !== expectedSlots);
    results.push({timeframe: tf, baseBars: source.length, hostBars: host.length, kitBars: kit.length, hostPartialBuckets: incomplete.length,
      examples: incomplete.slice(0, 3).map(b => ({time: new Date(b.time * 1000).toISOString(), sourceSlots: source.filter(s => s.time >= b.time && s.time < b.time + seconds).length, expectedSlots, returnedByKit: kit.some(k => k.time === b.time)}))});
  }
  console.log(JSON.stringify({baseline: 'b075c3e086154c84fc10e71d4334cdf027248cea', note: 'Same source, horizon after last close. Kit source copied with .js import suffixes changed to .ts solely for Node execution; no algorithm changes.', results}, null, 2));
} finally {
  await rm(temp, {recursive: true, force: true});
}
