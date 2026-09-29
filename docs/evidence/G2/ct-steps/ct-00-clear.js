const ks = ['g2.replay.v1','g1.levels.v1','g1.workspace.v1'];
const snap = {};
for (const k of ks) { const v = localStorage.getItem(k); snap[k] = v === null ? null : { len: v.length, head: v.slice(0,80) }; }
localStorage.clear();
return JSON.stringify({ cleared: true, priorKeys: snap, remaining: Object.keys(localStorage) });