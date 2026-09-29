const $=s=>document.querySelector(s);
return JSON.stringify({replayLevels: document.querySelectorAll('[data-testid="replay-levels"] li, .drawings li').length,
 any: [...document.querySelectorAll('li')].map(l=>l.textContent.trim()).filter(t=>t.includes('step')&&t.length<80).slice(0,5),
 g2: (localStorage.getItem('g2.replay.v1')||'').slice(0,260)});
