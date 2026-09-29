const g1corrupt = localStorage.getItem('g1.levels.v1');
// attempt an edit-op too (removeLevel via panel? use add-level flow with undo) — just verify bytes once more, then heal
const statusCorrupt = document.querySelector('[data-testid="panel-status"]')?.textContent.trim();
localStorage.setItem('g1.levels.v1', '[{"id":"lvl-wu5f8osj","price":2649.5,"note":"level","symbol":"XAUUSD","createdAt":1790670368}]');
document.querySelector('[data-testid="btn-add-level"]').click();
await new Promise((r) => setTimeout(r, 600));
const $ = (s) => document.querySelector(s);
return { statusCorrupt, statusHealed: $('[data-testid="panel-status"]')?.textContent.replace(/\s+/g,' ').trim(), levelsAfterHeal: [...document.querySelectorAll('[data-testid="panel-drawings"] li')].length, g1Now: (localStorage.getItem('g1.levels.v1') || '').length };
