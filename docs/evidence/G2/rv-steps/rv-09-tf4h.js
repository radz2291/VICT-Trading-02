const tf = document.querySelector('[data-testid="sel-replay-tf"]');
tf.value = '4h';
tf.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 700));
const txt = (s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null);
return { position: txt('[data-testid="replay-position"]'), gaps: txt('[data-testid="replay-gaps"]') };
