const valid = '{"version":1,"symbol":"","instant":1767573900,"stepIndex":4,"playing":false,"levels":[{"id":"rlvl-rm01i20i","symbol":"","price":2649.856819371728,"note":"replay level","creationInstant":1767573900,"creationStep":4}],"returnedToCurrent":false}';
localStorage.setItem('g2.replay.v1', valid);
document.querySelector('[data-testid="btn-replay-restore"]').click();
await new Promise(r=>setTimeout(r,1000));
const alert=document.querySelector('[data-testid="replay-status"]');
const r=alert?.getBoundingClientRect();
return JSON.stringify({text: alert?.textContent.replace(/\s+/g,' ').trim(), visible:!!r&&r.width>0&&r.height>0, role:alert?.getAttribute('role'), pos:document.querySelector('[data-testid="replay-position"]')?.textContent.replace(/\s+/g,' ').trim(), levels:document.querySelectorAll('[data-testid="replay-levels"] li').length, pillsaved:!!document.querySelector('[data-testid="replay-status"]')});
