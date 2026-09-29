document.querySelector('[data-testid="btn-return-current"]').click();
await new Promise((r) => setTimeout(r, 700));
const $ = (s) => document.querySelector(s);
return { banner: [...document.querySelectorAll('[data-testid="mode-banner"]')].map(x=>x.textContent.trim().slice(0,40)), status: $('[data-testid="replay-status"]')?.textContent.trim(), levels: [...document.querySelectorAll('[data-testid="panel-drawings"] li')].length, g2: localStorage.getItem('g2.replay.v1') };
