// ct-02: enter replay at earliest start (index 0), step twice, snapshot state + storage bytes
const sel = document.querySelector('[data-testid="sel-replay-start"]');
if (!sel) return { error: 'no replay start select' };
const first = sel.options[0];
const evHandler = { value: first.value };
sel.value = first.value;
sel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 600));
const stepBtn = document.querySelector('[data-testid="btn-replay-step"]');
stepBtn.click(); await new Promise((r) => setTimeout(r, 300));
stepBtn.click(); await new Promise((r) => setTimeout(r, 300));
const sha = (s) => {
  try {
    // synchronous digest via crypto subtle is async; return length-only here, digest in next call via crypto.subtle
  } catch {}
  return null;
};
const snap = (k) => { const v = localStorage.getItem(k); return v === null ? null : { len: v.length, head: v.slice(0, 100) }; };
return JSON.stringify({
  banner: document.querySelector('[data-testid="mode-banner"]')?.textContent.trim(),
  position: document.querySelector('[data-testid="replay-position"]')?.textContent.trim(),
  gaps: document.querySelector('[data-testid="replay-gaps"]')?.textContent.trim() ?? null,
  bytes: { replay: snap('g2.replay.v1'), levels: snap('g1.levels.v1'), workspace: snap('g1.workspace.v1') },
  keys: Object.keys(localStorage)
});