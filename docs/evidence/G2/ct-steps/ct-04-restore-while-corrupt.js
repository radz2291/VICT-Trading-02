// ct-04: attempt RESTORE with corrupt storage; record refusal + bytes + visible status
const before = { replay: localStorage.getItem('g2.replay.v1'), levels: localStorage.getItem('g1.levels.v1') };
document.querySelector('[data-testid="btn-replay-restore"]').click();
await new Promise((r) => setTimeout(r, 700));
const after = { replay: localStorage.getItem('g2.replay.v1'), levels: localStorage.getItem('g1.levels.v1') };
const body = document.body.innerText;
return JSON.stringify({
  restoreRefusalVisibleInDOM: {
    unavailableShown: body.includes('unavailable'),
    readFailedShown: body.includes('READ_FAILED') || body.includes('READ_NOT_ACKNOWLEDGED'),
    corruptWordShown: body.toLowerCase().includes('unreadable') || body.toLowerCase().includes('corrupt')
  },
  bytesUnchanged: { replay: before.replay === after.replay, levels: before.levels === after.levels },
  replayLenAfter: (after.replay || '').length,
  bannerNow: document.querySelector('[data-testid="mode-banner"]')?.textContent.trim(),
  position: document.querySelector('[data-testid="replay-position"]')?.textContent.trim(),
  bodyTextSample: body.slice(0, 100)
});