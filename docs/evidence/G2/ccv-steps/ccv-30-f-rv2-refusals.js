const $=(s)=>document.querySelector(s);
const txt=(s)=>$(s)?$(s).textContent.replace(/\s+/g,' ').trim():null;
const out={banner: (document.querySelector('[data-testid="mode-banner"]')||{}).textContent?.trim(), g2LenBefore:(localStorage.getItem('g2.replay.v1')||'').length, pill: txt('[data-testid="panel-status"]')};
// Restore click in CURRENT mode (corrupt record)
document.querySelector('[data-testid="btn-replay-restore"]').click();
await new Promise(r=>setTimeout(r,1000));
const scanAlert = () => {
	const a = document.querySelector('[data-testid="replay-status"]');
	const r = a?.getBoundingClientRect();
	return a && { present: true, role: a.getAttribute('role'), visible: !!r && r.width>0 && r.height>0, text: a.textContent.replace(/\s+/g,' ').trim() };
};
out.afterRestoreClick = scanAlert();
out.replayActive = !!document.querySelector('[data-testid="btn-replay-step"]');
// Reset click (confirm dialog auto-accepted) in CURRENT mode
document.querySelector('[data-testid="btn-replay-reset"]').click();
await new Promise(r=>setTimeout(r,1200));
out.corruptSurvivedReset = ((localStorage.getItem('g2.replay.v1')||'').length) === out.g2LenBefore;
return JSON.stringify(out);
