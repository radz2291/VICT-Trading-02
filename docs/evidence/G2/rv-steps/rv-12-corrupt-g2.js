const raw = localStorage.getItem('g2.replay.v1');
localStorage.setItem('g2.replay.v1', raw.slice(0, Math.floor(raw.length / 2)));
const g2 = localStorage.getItem('g2.replay.v1');
return { g2Len: g2.length, g2: g2, g1Len: (localStorage.getItem('g1.levels.v1') || '').length, g1: localStorage.getItem('g1.levels.v1') };
