const sel = document.querySelector('[data-testid="sel-replay-start"]');
if (!sel) return { error: 'no replay start select' };
const opts = [...sel.options].map((o) => o.value + ' | ' + o.textContent.trim());
return { options: opts.slice(0, 6), count: opts.length };
