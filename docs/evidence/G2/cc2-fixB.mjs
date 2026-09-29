// cc2 FIX B harness — transactional session ops under failing ports.
// Ports {ok:false} and {throw} × ops {start, step, createLevel, removeLevel,
// play, pause, restore, returnToCurrent, reset(remove-failure)}:
// refused? state-before == state-after? bytes before == after? recovery works?
import { readFileSync, writeFileSync } from 'fs';
import { createReplayClock, createDataSession, ReplaySession } from '@vict-trading/trading-kit';

const fixture = JSON.parse(readFileSync('fixture.json', 'utf8'));
const BASE = 900;
const HORIZON = fixture.horizonInstant;
const T_START = Math.floor(Date.parse('2026-01-05T00:00:00Z') / 1000);

function makeStore() {
  return { bytes: null, ops: [] };
}

function makePort(store, initialMode) {
  const port = {
    store,
    mode: initialMode,
  };
  // mode: 'ok' | 'ok:false' | 'throw' — failing WRITE only; read stays healthy
  Object.assign(port, {
    read() {
      if (store.bytes === 'corrupt') throw new Error('read failed');
      return store.bytes ? JSON.parse(store.bytes) : null;
    },
    async write(record) {
      const mode = port.mode;
      if (mode === 'ok:false') return { ok: false, code: 'STORAGE_VERIFY_FAILED', message: 'synthetic: port refuses every write' };
      if (mode === 'throw') throw new Error('synthetic: port write throws');
      store.bytes = JSON.stringify(record);
      store.ops.push('write');
      return { ok: true };
    },
    async remove() {
      if (port.mode === 'throw') throw new Error('synthetic: port remove throws');
      store.bytes = null;
      store.ops.push('remove');
    }
  });
  return port;
}

function snapshotState(sess, clock) {
  return JSON.stringify({
    instant: clock.now(),
    step: sess.currentStep(),
    levels: sess.levelsAll(),
    playing: sess.isPlaying,
    returnedToCurrent: sess.hasReturnedToCurrent,
    clockOps: clock.records().length
  });
}

async function healthySession(store) {
  const clock = createReplayClock({ horizon: HORIZON, start: T_START });
  const port = makePort(store, 'ok');
  const sess = new ReplaySession({ clock, persistence: port });
  sess.acknowledgeState(port.read());
  return { clock, port, sess };
}

const results = { table: [], allPass: true, notApplicable: [] };
results.notApplicable = ['reset(remove) under an ok:false remove — the remove() contract has no ok:false value; the only removal failure shape is a throw (recorded as not-applicable)'];

const OPS = ['start', 'step', 'createLevel', 'removeLevel', 'play', 'pause', 'returnToCurrent'];

for (const failMode of ['ok:false', 'throw']) {
  for (const op of OPS) {
    // build a HEALTHY session state first (successful writes), then flip the port to failing
    const store = makeStore();
    let ctx = await healthySession(store);
    const started = await ctx.sess.start(T_START);
    if (started.ok) await ctx.sess.step(BASE), (await ctx.sess.step(BASE));
    await ctx.sess.createLevel(2650.0, 'healthy');
    ctx.port.mode = failMode; // now ALL writes fail
    const beforeState = snapshotState(ctx.sess, ctx.clock);
    const beforeBytes = store.bytes;
    let r;
    if (op === 'start') r = await ctx.sess.start(Math.floor(Date.parse('2026-01-05T01:00:00Z') / 1000));
    else if (op === 'step') r = await ctx.sess.step(BASE);
    else if (op === 'createLevel') r = await ctx.sess.createLevel(2649, 'f');
    else if (op === 'removeLevel') r = await ctx.sess.removeLevel(ctx.sess.levelsAll()[0].id);
    else if (op === 'play') r = await ctx.sess.play();
    else if (op === 'pause') r = await ctx.sess.pause();
    else if (op === 'returnToCurrent') r = await ctx.sess.returnToCurrent();
    const expectedCode = failMode === 'ok:false' ? 'WRITE_REFUSED' : 'PORT_ERROR';
    const afterState = snapshotState(ctx.sess, ctx.clock);
    const row = {
      failMode, op,
      refused: r.ok === false,
      code: r.code,
      codeTruthful: r.code === expectedCode,
      stateBeforeEqualsAfter: beforeState === afterState,
      bytesBeforeEqualsAfter: beforeBytes === store.bytes,
      message: r.message
    };
    row.pass = row.refused && row.codeTruthful && row.stateBeforeEqualsAfter && row.bytesBeforeEqualsAfter;
    if (!row.pass) results.allPass = false;
    results.table.push(row);
  }
}

// reset(remove) — transactional removal: failing remove leaves state unchanged.
// NOTE: the SessionPersistence.remove contract returns Promise<void> — it has NO
// ok:false value channel, so the only failure shape for the removal is a THROW;
// the 'ok:false' row is recorded as not-applicable for the removal path.
const removeFailureModes = ['throw'];
for (const failMode of removeFailureModes) {
  const store = makeStore();
  const clock = createReplayClock({ horizon: HORIZON, start: T_START });
  const port = makePort(store, 'ok');
  delete port.remove; // remove() without failures handled below via custom port
  const sess = new ReplaySession({ clock, persistence: port });
  sess.acknowledgeState(port.read());
  await sess.start(T_START);
  await sess.step(BASE);
  await sess.createLevel(2650.1, 'healthy');
  const beforeState = snapshotState(sess, clock);
  const beforeBytes = store.bytes;
  const failingRemove = { ...port, remove: async () => { if (failMode === 'throw') throw new Error('synthetic: port remove throws'); return; } };
  const sess2 = { ...sess };
  // attach failing remove: swap persistence object reference
  const failingSess = new ReplaySession({ clock, persistence: failingRemove });
  failingSess.acknowledgeState(failingRemove.read());
  // replicate live state: adopt the persisted healthy state
  const record = failingRemove.read();
  failingSess.clock.setFrame(record.instant);
  failingSess.levels = record.levels;
  failingSess.stepCounter = record.stepIndex;
  const preFail = snapshotState(failingSess, failingSess.clock ?? clock);
  const preBytes = store.bytes;
  const rr = await failingSess.reset();
  const postFail = snapshotState(failingSess, clock);
  results.table.push({
    failMode, op: 'reset(remove failure)',
    refused: rr.ok === false,
    code: rr.code,
    stateBeforeEqualsAfter: preFail === postFail,
    bytesBeforeEqualsAfter: preBytes === store.bytes,
    message: rr.message,
    pass: rr.ok === false && rr.code === 'PORT_ERROR' && preFail === postFail && preBytes === store.bytes
  });
  if (!(rr.ok === false && rr.code === 'PORT_ERROR' && preFail === postFail && preBytes === store.bytes)) results.allPass = false;
}

// restore under failing writes (transactional restore): live state must NOT adopt the record
for (const failMode of ['ok:false', 'throw']) {
  const store = makeStore();
  let ctx = await healthySession(store);
  await ctx.sess.start(T_START);
  await ctx.sess.step(BASE); await ctx.sess.step(BASE);
  ctx.port.mode = failMode;
  // simulate "process restart": live session at clock start, record persisted at step 3
  const clock2 = createReplayClock({ horizon: HORIZON, start: T_START });
  const sess2 = new ReplaySession({ clock: clock2, persistence: ctx.port });
  sess2.acknowledgeState(null);
  const preState = snapshotState(sess2, clock2);
  const preBytes = store.bytes;
  const r = await sess2.restore();
  const postState = snapshotState(sess2, clock2);
  const expectedCode = failMode === 'ok:false' ? 'WRITE_REFUSED' : 'PORT_ERROR';
  const pass = r.ok === false && r.code === expectedCode && preState === postState && preBytes === store.bytes;
  results.table.push({ failMode, op: 'restore', refused: r.ok === false, code: r.code, stateBeforeEqualsAfter: preState === postState, bytesBeforeEqualsAfter: preBytes === store.bytes, pass });
  if (!pass) results.allPass = false;
}

// recovery: flip the port back to ok — a subsequent successful write works; reload = state from last SUCCESSFUL write
{
  const store = makeStore();
  let ctx = await healthySession(store);
  await ctx.sess.start(T_START);
  await ctx.sess.step(BASE);
  ctx.port.mode = 'ok:false';
  await ctx.sess.createLevel(1, 'ghost'); // refused — must not appear anywhere
  ctx.port.mode = 'ok';
  await ctx.sess.createLevel(2650.7, 'real');
  const record = JSON.parse(store.bytes);
  results.recovery = {
    ok: true,
    ghostLevelAbsent: record.levels.every((l) => l.note !== 'ghost'),
    realLevelPresent: record.levels.some((l) => l.note === 'real'),
    // reload simulation: fresh session + fresh clock adopting stored bytes must be EXACT
    stepMatchesRecord: record.stepIndex === ctx.sess.currentStep(),
    instantMatchesRecord: record.instant === ctx.sess.levels.includes(undefined) ? undefined : record.instant
  };
  const clock2 = createReplayClock({ horizon: HORIZON, start: record.instant });
  const port2 = { ...ctx.port, mode: 'ok' };
  port2.store = store;
  const sess2 = new ReplaySession({ clock: clock2, persistence: port2 });
  const adopted = port2.read();
  sess2.acknowledgeState(adopted);
  results.recovery.reloadExact = JSON.stringify(sess2.levelsAll()) === JSON.stringify(ctx.sess.levelsAll())
    && sess2.currentStep() === record.stepIndex;
  if (!results.recovery.ghostLevelAbsent || !results.recovery.realLevelPresent || !results.recovery.reloadExact) results.allPass = false;
}

writeFileSync('cc2-fixB-results.json', JSON.stringify(results, null, 2));
console.log('allPass:', results.allPass, ' rows:', results.table.length);
for (const t of results.table) console.log(t.failMode, t.op, t.code, t.pass ? 'PASS' : 'FAIL');