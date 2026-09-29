const raw = localStorage.getItem('g2.replay.v1');
localStorage.setItem('g2.replay.v1', raw.slice(0, Math.floor(raw.length / 2)));
return JSON.stringify({ g2Len: (localStorage.getItem('g2.replay.v1')||'').length, half: raw.slice(0, 60) });
