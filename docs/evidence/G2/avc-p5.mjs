// avc-p5.mjs — informational probe: acknowledgeState() is a synchronous
// consumer API OUTSIDE the FIFO queue. Records actual behavior when a consumer
// calls it with a STALE record while an op write is pending (API misuse per
// the docstring, which requires acknowledging a SUCCESSFUL read; documented
// here so the boundary of the FIFO guarantee is evidence-backed, not guessed).
import { writeFileSync } from 'node:fs';
import { T0, loadFixture, initFixture, makeEnv, setupCommitted, sample, installRejectionTrap, flush, same, resetIdCounter, deterministicGenId } from './avc-harness.mjs';

const fixture = loadFixture();
initFixture(fixture);
const trap = { unhandledRejections: [] };
installRejectionTrap(trap);
resetIdCounter();
const env = makeEnv(fixture, { genId: deterministicGenId });
await setupCommitted(env);
env.port.mode = 'auto-ok';
await env.session.createLevel(2650, 'L1'); // committed: T0/1, levels [L1]
env.port.mode = 'manual';
const committedRecord = env.port.read(); // record WITH L1

const pr = env.session.step(3600); pr.catch(() => {});
await flush(); // op executing, write pending
// mid-pending misuse: acknowledge a STALE record without levels
env.session.acknowledgeState({ ...committedRecord, levels: [] });
env.port.settle(env.port.pendingIds()[0], 'ok');
const outcome = await pr.catch(() => null);
await flush();
const post = sample(env);
const rec = env.port.record ? JSON.parse(JSON.stringify(env.port.record)) : null;
const results = {
	probe: 'avc-p5 acknowledgeState mid-pending (informational)',
	scenario: 'consumer calls acknowledgeState(STALE record, levels:[]) while a step() write is pending, then the write succeeds',
	outcome,
	live: { instant: post.clockNow, stepIndex: post.stepIndex, levelCount: post.levels.length },
	stored: rec ? { instant: rec.instant, stepIndex: rec.stepIndex, levelCount: (rec.levels || []).length } : null,
	liveStorageDivergence: rec ? (post.levels.length !== (rec.levels || []).length) : true,
	note: 'acknowledgeState is documented as consumer-side acknowledgment of a successful read (call it after your read succeeds); it is NOT part of the FIFO queue. Misuse can desynchronize live drawings from the committed record until the next commit — recorded as the evidence-backed boundary of the per-session FIFO guarantee.'
};
results.pass = true; // informational: no pass/fail claim
writeFileSync('avc-p5-results.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 1));
