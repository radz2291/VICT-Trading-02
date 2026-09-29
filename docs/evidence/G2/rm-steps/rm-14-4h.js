const tfSel = document.querySelector('[data-testid="sel-replay-tf"]');
tfSel.value = '4h';
tfSel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 600));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
return { position: txt('[data-testid="replay-position"]'), gaps: txt('[data-testid="replay-gaps"]'), readout: (document.querySelector('[data-testid="replay-readout"]')||{}).textContent ?? null };
