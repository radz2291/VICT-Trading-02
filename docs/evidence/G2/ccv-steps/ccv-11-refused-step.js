const $=(s)=>document.querySelector(s);
const txt=(s)=>$(s)?$(s).textContent.replace(/\s+/g,' ').trim():null;
const out={positionBefore:txt('[data-testid="replay-position"]'), g2Before:(localStorage.getItem('g2.replay.v1')||'').length};
$('[data-testid="btn-replay-step"]').click();
await new Promise(r=>setTimeout(r,900));
const alert=$('[data-testid="replay-status"]');
const r=alert?.getBoundingClientRect();
out.refusedRendered = {
	present: !!alert, role: alert?.getAttribute('role'),
	visibleOnScreen: !!r && r.width>0 && r.height>0 && (getComputedStyle(alert).visibility!=='hidden') && (getComputedStyle(alert).display!=='none'),
	text: txt('[data-testid="replay-status"]')
};
out.WORDING_truthful = out.refusedRendered.text?.includes('storage read failed') || false;
out.positionAfter = txt('[data-testid="replay-position"]');
out.g2After = (localStorage.getItem('g2.replay.v1')||'').length;
out.bytesUnchanged = out.g2Before===out.g2After;
out.positionUnchanged = out.positionBefore===out.positionAfter;
return JSON.stringify(out);
