// rm-15: open-ended gap at mid-gap clock — reset, then start at 2026-01-05 04:00Z
window.__vfyDialogAnswer = true;
document.querySelector('[data-testid="btn-replay-reset"]').click();
await new Promise((r) => setTimeout(r, 800));
const sel = document.querySelector('[data-testid="sel-replay-start"]');
if (!sel) return { error: 'no select (still replay?)', banner: document.querySelector('[data-testid="mode-banner"]')?.textContent.trim() };
const opt = [...sel.options].find((o) => o.label.includes('2026-01-05 04:00'));
if (!opt) return { error: 'no 04:00 option', labels: [...sel.options].map((o) => o.label).slice(90, 110) };
sel.selectedIndex = [...sel.options].indexOf(opt);
sel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 800));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
return {
  position: txt('[data-testid="replay-position"]'),
  gaps: txt('[data-testid="replay-gaps"]'),
  banner: txt('[data-testid="mode-banner"]')
};
