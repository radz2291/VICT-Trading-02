const $=(s)=>document.querySelector(s);
const alert=$('[data-testid="replay-status"]');
const r=alert?.getBoundingClientRect();
return JSON.stringify({text: alert?.textContent.replace(/\s+/g,' ').trim(), role:alert?.getAttribute('role'), visible:!!r&&r.width>0&&r.height>0, pos: $('[data-testid="replay-position"]')?.textContent.replace(/\s+/g,' ').trim(), g2Len:(localStorage.getItem('g2.replay.v1')||'').length, banner: $('[data-testid="mode-banner"]')?.textContent.replace(/\s+/g,' ').slice(0,60)});
