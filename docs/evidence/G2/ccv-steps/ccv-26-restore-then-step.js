const $=(s)=>document.querySelector(s);
const txt=(s)=>$(s)?$(s).textContent.replace(/\s+/g,' ').trim():null;
document.querySelector('[data-testid="btn-replay-restore"]').click();
await new Promise(r=>setTimeout(r,900));
const restored = {status: txt('[data-testid="replay-status"]'), pos: txt('[data-testid="replay-position"]'), banner: txt('[data-testid="mode-banner"]')?.slice(0,60), levels: document.querySelectorAll('[data-testid="replay-levels"] li').length};
// step again with healed storage (real click)
document.querySelector('[data-testid="btn-replay-step"]').click();
await new Promise(r=>setTimeout(r,1000));
const stepped = {status: txt('[data-testid="replay-status"]'), pos: txt('[data-testid="replay-position"]'), g2Len:(localStorage.getItem('g2.replay.v1')||'').length};
return JSON.stringify({restored, stepped, STEP_SAVED_OK: String(stepped.pos).startsWith('step 5')});
