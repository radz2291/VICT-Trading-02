const raw = localStorage.getItem('g2.replay.v1');
localStorage.setItem('g2.replay.v1', raw.slice(0, Math.floor(raw.length / 2)));
return { g2Len: (localStorage.getItem('g2.replay.v1')||'').length, g1Len: (localStorage.getItem('g1.levels.v1')||'').length };
