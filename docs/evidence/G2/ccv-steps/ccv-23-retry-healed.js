const $=(s)=>document.querySelector(s);
const txt=(s)=>$(s)?$(s).textContent.replace(/\s+/g,' ').trim():null;
// verify write path is really healed first, then Step via real click
let writeTest = null;
try { localStorage.setItem('__ccv_probe','1'); writeTest = localStorage.getItem('__ccv_probe')==='1'; localStorage.removeItem('__ccv_probe'); } catch(e) { writeTest = 'still-broken: '+e.message; }
document.querySelector('[data-testid="btn-replay-step"]').click();
await new Promise(r=>setTimeout(r,1200));
return JSON.stringify({writeTest, status: txt('[data-testid="replay-status"]'), pos: txt('[data-testid="replay-position"]'), g2Len:(localStorage.getItem('g2.replay.v1')||'').length});
