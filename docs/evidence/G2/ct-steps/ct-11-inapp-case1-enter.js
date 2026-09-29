// ct-11: in-app Case 1: enter replay at 00:00Z, step to 06:15Z, switch tf 1h
const sel = document.querySelector('[data-testid="sel-replay-start"]');
sel.options[0].selected = true;
sel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 600));
const stepBtn = document.querySelector('[data-testid="btn-replay-step"]');
for (let i = 0; i < 24; i++) { stepBtn.click(); await new Promise((r) => setTimeout(r, 120)); }
await new Promise((r) => setTimeout(r, 400));
const tf = document.querySelector('[data-testid="sel-replay-tf"]');
tf.value = '1h';
tf.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 500));
return JSON.stringify({
  position: document.querySelector('[data-testid="replay-position"]')?.textContent.trim(),
  gaps: document.querySelector('[data-testid="replay-gaps"]')?.textContent.trim() ?? null,
  readout: document.querySelector('[data-testid="replay-readout"]')?.textContent.trim()
});