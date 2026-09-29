// ct-08: re-corrupt storage (step had healed it), then attempt RESET with corrupt bytes
const corruptStr = '{"version":1,"symbol":"","instant":1767573000,"stepIndex":4,';
localStorage.setItem('g2.replay.v1', corruptStr);
const g1Before = localStorage.getItem('g1.levels.v1');
window.__vfyDialogAnswer = true; // accept the confirm dialog like a user clicking OK
document.querySelector('[data-testid="btn-replay-reset"]').click();
await new Promise((r) => setTimeout(r, 800));
const after = localStorage.getItem('g2.replay.v1');
const afterLevels = localStorage.getItem('g1.levels.v1');
return JSON.stringify({
  corruptLenWritten: corruptStr.length,
  outcome: {
    replayKeyStillPresent: after !== null,
    replayBytesUnchanged: (after || '').length === corruptStr.length,
    levelsBytesUnchanged: g1Before === afterLevels
  },
  bannerNow: (document.querySelector('[data-testid="mode-banner"]')?.textContent.trim() || '').slice(0, 40),
  keysNow: Object.keys(localStorage)
});