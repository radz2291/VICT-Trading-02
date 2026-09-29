const $=(s)=>document.querySelector(s);
const txt=(s)=>$(s)?$(s).textContent.replace(/\s+/g,' ').trim():null;
document.querySelector('[data-testid="btn-return-current"]').click();
await new Promise(r=>setTimeout(r,1000));
const banner=document.querySelector('[data-testid="mode-banner"]');
const r=banner?.getBoundingClientRect();
return JSON.stringify({banner: banner?.textContent.replace(/\s+/g,' ').trim(), visible:!!r&&r.width>0&&r.height>0, status: txt('[data-testid="replay-status"]'), g2:(localStorage.getItem('g2.replay.v1')||'').slice(0,240), g1Intact:(localStorage.getItem('g1.levels.v1')||'').includes('2649.5'), replayControlsGone: !document.querySelector('[data-testid="btn-replay-step"]')});
