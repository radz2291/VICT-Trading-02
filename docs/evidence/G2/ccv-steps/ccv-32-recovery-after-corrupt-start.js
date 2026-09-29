const $=(s)=>document.querySelector(s);
const txt=(s)=>$(s)?$(s).textContent.replace(/\s+/g,' ').trim():null;
localStorage.setItem('g2.replay.v1', '{"version":1,"symbol":"","instant":1767574800,"stepIndex":5,"playing":false,"levels":[{"id":"rlvl-rm01i20i","symbol":"","price":2649.856819371728,"note":"replay level","creationInstant":1767573900,"creationStep":4}],"returnedToCurrent":false}');
document.querySelector('[data-testid="btn-replay-restore"]').click();
await new Promise(r=>setTimeout(r,1000));
const a=document.querySelector('[data-testid="replay-status"]');
return JSON.stringify({text: a?.textContent.replace(/\s+/g,' ').trim(), pos: txt('[data-testid="replay-position"]'), banner: (document.querySelector('[data-testid="mode-banner"]')||{}).textContent?.trim()?.slice(0,50), levels: document.querySelectorAll('[data-testid="replay-levels"] li').length});
