const $=(s)=>document.querySelector(s);
const alert=$('[data-testid="replay-status"]');
const r=alert?.getBoundingClientRect();
const g2=(localStorage.getItem('g2.replay.v1')||'');
return JSON.stringify({text: alert?alert.textContent.replace(/\s+/g,' ').trim():null, role:alert?.getAttribute('role'), visible:!!r&&r.width>0&&r.height>0, levels: document.querySelectorAll('[data-testid="replay-levels"] li').length, g2Len:g2.length, ghostAdded: g2.includes('888')||g2.length>121});
