// ct-10: recovery — restore the pre-corruption valid record, then click Restore; recovery must work
localStorage.setItem('g2.replay.v1', window.__ctSaved.replay);
const restoredValidity = (() => { try { JSON.parse(window.__ctSaved.replay); return 'valid'; } catch { return 'invalid'; } })();
document.querySelector('[data-testid="btn-replay-restore"]').click();
await new Promise((r) => setTimeout(r, 800));
return JSON.stringify({
  preexistingRecordValidity: restoredValidity,
  afterRestore: {
    banner: document.querySelector('[data-testid="mode-banner"]')?.textContent.trim(),
    position: document.querySelector('[data-testid="replay-position"]')?.textContent.trim(),
    levels: [...document.querySelectorAll('li')].map((l) => l.textContent.trim()).filter((t) => t.includes('replay level')),
    storedBytesMatchOriginal: localStorage.getItem('g2.replay.v1') === window.__ctSaved.replay ||
      (localStorage.getItem('g2.replay.v1') || '').includes('1767573000')
  }
});