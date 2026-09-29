const $=(s)=>document.querySelector(s);
$('[data-testid="btn-replay-restore"]').click();
await new Promise(r=>setTimeout(r,900));
const alert=$('[data-testid="replay-status"]');
const r=alert?.getBoundingClientRect();
return JSON.stringify({present:!!alert, role:alert?.getAttribute('role'), visible:!!r&&r.width>0&&r.height>0, text:$('[data-testid="replay-status"]').textContent.replace(/\s+/g,' ').trim(), pos:$('[data-testid="replay-position"]')?.textContent.replace(/\s+/g,' ').trim(), g2Len:(localStorage.getItem('g2.replay.v1')||'').length});
