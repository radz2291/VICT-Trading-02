// restore the session stored at horizon (record from previous run persists)
const rec = JSON.parse(window.localStorage.getItem('g2.replay.v1'));
if (!rec) { const sel = document.querySelector('[data-testid="sel-replay-start"]'); const t=[...sel.options].find(o=>o.value==='1997'); sel.selectedIndex=[...sel.options].indexOf(t); sel.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,400)); document.querySelector('[data-testid="btn-replay-step"]').click(); await new Promise(r=>setTimeout(r,300)); }
else { document.querySelector('[data-testid="btn-replay-restore"]').click(); await new Promise(r=>setTimeout(r,400)); }
return 'replay entered:' + document.querySelector('[data-testid="replay-position"]').textContent.trim();
