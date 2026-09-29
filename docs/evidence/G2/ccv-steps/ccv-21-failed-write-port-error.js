const $=(s)=>document.querySelector(s);
const txt=(s)=>$(s)?$(s).textContent.replace(/\s+/g,' ').trim():null;
const orig = Storage.prototype.setItem;
Storage.prototype.setItem = function(){ throw new Error('DOMException: quota exceeded (simulated)'); };
window.__ccvOrigSetItem = orig;
const before = { pos: txt('[data-testid="replay-position"]'), g2Len: (localStorage.getItem('g2.replay.v1')||'').length, g1Len: (localStorage.getItem('g1.levels.v1')||'').length, levels: document.querySelectorAll('[data-testid="replay-levels"] li').length };
document.querySelector('[data-testid="btn-replay-step"]').click();
await new Promise(r=>setTimeout(r,1000));
const alert=document.querySelector('[data-testid="replay-status"]');
const r=alert?.getBoundingClientRect();
const refusedTextStr = alert ? alert.textContent.replace(/\s+/g,' ').trim() : null;
const after = { pos: txt('[data-testid="replay-position"]'), g2Len: (localStorage.getItem('g2.replay.v1')||'').length, g1Len: (localStorage.getItem('g1.levels.v1')||'').length, levels: document.querySelectorAll('[data-testid="replay-levels"] li').length };
const out = {
  refusedText: refusedTextStr,
  role: alert && alert.getAttribute('role'),
  visible: !!r && r.width>0 && r.height>0,
  PORT_ERROR_wording: refusedTextStr ? /could not be completed|write could not/.test(refusedTextStr) : false,
  WRITE_REFUSED_wording: refusedTextStr ? /write refused|state unchanged/.test(refusedTextStr) : false,
  stateUnchanged: JSON.stringify(before)===JSON.stringify(after),
  before, after
};
Storage.prototype.setItem = orig;
document.querySelector('[data-testid="btn-replay-step"]').click();
await new Promise(r=>setTimeout(r,1100));
out.recoveryText = txt('[data-testid="replay-status"]');
out.recoveryPos = txt('[data-testid="replay-position"]');
return JSON.stringify(out);
