const raw = localStorage.getItem('g1.levels.v1');
localStorage.setItem('g1.levels.v1', raw.slice(0, Math.floor(raw.length / 2)));
const before = localStorage.getItem('g1.levels.v1');
document.querySelector('[data-testid="btn-add-level"]').click();
await new Promise((r) => setTimeout(r, 600));
const $ = (s) => document.querySelector(s);
return {
  g1LenBefore: 94,
  g1LenAfter: (localStorage.getItem('g1.levels.v1') || '').length,
  statuses: [...document.querySelectorAll('[data-testid="panel-status"], [data-testid="panel-read-failed"]')].map(e => ({ tid: e.getAttribute('data-testid'), text: e.textContent.replace(/\s+/g,' ').trim().slice(0, 80), visible: !!(e.offsetParent || e.getClientRects().length) })),
  drawings: [...document.querySelectorAll('[data-testid="panel-drawings"] li')].length
};
