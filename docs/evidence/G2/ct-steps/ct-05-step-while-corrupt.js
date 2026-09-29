// ct-05: attempt STEP with corrupt storage — does it refuse? do bytes survive?
const before = { replay: localStorage.getItem('g2.replay.v1'), levels: localStorage.getItem('g1.levels.v1') };
document.querySelector('[data-testid="btn-replay-step"]').click();
await new Promise((r) => setTimeout(r, 700));
const after = { replay: localStorage.getItem('g2.replay.v1'), levels: localStorage.getItem('g1.levels.v1') };
return JSON.stringify({
  stepProceeded: {
    positionAfter: document.querySelector('[data-testid="replay-position"]')?.textContent.trim(),
    bannerAfter: document.querySelector('[data-testid="mode-banner"]')?.textContent.trim()
  },
  bytesUnchanged: { replay: (before.replay || '') === (after.replay || ''), levels: before.levels === after.levels },
  storedReplayAfterStep: (after.replay || '').slice(0, 140),
  jsonParsesAfterStep: (() => { try { JSON.parse(after.replay); return 'valid JSON — corrupt bytes REPLACED'; } catch { return 'still unparseable'; } })()
});