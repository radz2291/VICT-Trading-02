// ct-03: save exact byte values, then corrupt g2.replay.v1 in place (valid keys otherwise intact)
const snap = (k) => localStorage.getItem(k);
window.__ctSaved = { replay: snap('g2.replay.v1'), levels: snap('g1.levels.v1'), workspace: snap('g1.workspace.v1') };
// corrupt: truncated record with valid prefix (JSON.parse will throw)
localStorage.setItem('g2.replay.v1', '{"version":1,"symbol":"","instant":1767573000,"stepIndex":3', );
return JSON.stringify({
  savedForRecovery: !!window.__ctSaved.replay,
  corruptNow: localStorage.getItem('g2.replay.v1'),
  g1LevelsUnchanged: localStorage.getItem('g1.levels.v1') === window.__ctSaved.levels
});