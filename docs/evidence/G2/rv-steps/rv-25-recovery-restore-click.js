document.querySelector('[data-testid="btn-replay-restore"]').click();
await new Promise((r) => setTimeout(r, 700));
const $ = (s) => document.querySelector(s);
return { status: $('[data-testid="replay-status"]')?.textContent.trim(), position: $('[data-testid="replay-position"]')?.textContent.replace(/\s+/g,' ').trim(), banner: [...document.querySelectorAll('[data-testid="mode-banner"]')].map(x=>x.textContent.trim().slice(0,60)) };
