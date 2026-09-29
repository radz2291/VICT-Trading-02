// rm-11 (page-side): capture readout testid and chart rect for the hover sweep
const rect = document.querySelector('[data-testid="replay-chart-container"]').getBoundingClientRect();
window.__rmRect = { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
const ids = [...document.querySelectorAll('[data-testid]')].map((e) => e.dataset.testid).filter((t) => /read|ohlc|hover|cross/i.test(t));
return { rect: window.__rmRect, readoutIds: ids, readoutText: (document.querySelector('[data-testid="replay-readout"]') || {}).textContent ?? null };
