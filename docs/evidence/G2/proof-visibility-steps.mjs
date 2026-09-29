#!/usr/bin/env node
/**
 * R3 step-visibility proof (kit level) — a replay-stamped drawing created at
 * step N is INVISIBLE at every step < N and VISIBLE at/after N, including
 * after a session restore. Programmatic (the app has no rewind control by
 * design; the same visibilityAt predicate gates the app display).
 */
import {
	createReplayClock,
	createDataSession,
	ReplaySession,
	visibilityAt,
	stampReplayCreation
} from '../../../packages/trading-kit/dist/index.js';
import { readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(`${here}/fixture/g2-fixture-baseline.json`, 'utf8'));
const store = new Map(); // in-memory port stand-in (app adapter proven in-browser)

const persistence = {
	read: () => store.get('rec') ?? null,
	write: async (rec) => { store.set('rec', rec); return { ok: true }; },
	remove: () => { store.delete('rec'); }
};

const clock = createReplayClock({ horizon: fx.horizonInstant, start: fx.bars[0].time });
const session = new ReplaySession({ clock, persistence });
session.acknowledgeState(persistence.read());
await session.start(fx.bars[1500].time);      // step 1
await session.step(900);                      // 2
await session.step(900);                      // 3
await session.step(900);                      // 4
const created = await session.createLevel(2650.25, 'support'); // stamped at step 4
const lvl = { id: created.id, provenance: 'replay-stamped', creationInstant: clock.now(), creationStep: session.currentStep() };

const results = {};
for (let step = 1; step <= 6; step++) {
	results['visibleAtStep' + step] = visibilityAt(lvl, {
		mode: 'replay',
		currentStep: step,
		now: fx.bars[1500].time + step * 900
	}).visible;
}
// hidden at steps 1..3, visible from 4 on
const ok = !results.visibleAtStep1 && !results.visibleAtStep2 && !results.visibleAtStep3
	&& results.visibleAtStep4 && results.visibleAtStep5 && results.visibleAtStep6;

// provenance-unknown class: HIDDEN in replay, visible in current (D-003)
const unknownReplay = visibilityAt({ id: 'x', provenance: 'provenance-unknown' }, { mode: 'replay', currentStep: 99, now: fx.horizonInstant });
const unknownCurrent = visibilityAt({ id: 'x', provenance: 'provenance-unknown' }, { mode: 'current', currentStep: 0, now: 0 });

// restore exactness: persist, move the clock forward, restore, verify
await session.step(900); // step 5
const saved = persistence.read();
clock.advance(900 * 100); // drift far ahead
const rs = await session.restore();
const restoredOk = rs.ok && clock.now() === saved.instant && session.currentStep() === saved.stepIndex;

const out = {
	stampExample: stampReplayCreation(clock.now(), session.currentStep()),
	levelVisibilityByStep: results,
	levelCreated: { creationStep: lvl.creationStep, creationInstant: lvl.creationInstant },
	stepVisibilityRule: ok,
	provenanceUnknownHiddenInReplay: unknownReplay.visible === false,
	provenanceUnknownVisibleInCurrent: unknownCurrent.visible === true,
	restoreExact: restoredOk,
	restoredInstant: clock.now(),
	restoredStep: session.currentStep()
};
console.log(JSON.stringify(out, null, 1));
writeFileSync(`${here}/visibility-step-results.json`, JSON.stringify(out, null, 1));
if (!ok || unknownReplay.visible || !unknownCurrent.visible || !restoredOk) process.exit(1);
