// ct-07: state after chart-click drawing attempt (with corrupt storage that has now been healed by step)
const snap = (k) => localStorage.getItem(k);
return JSON.stringify({
  replayLevelPanel: [...document.querySelectorAll('div.island + *, [data-testid="replay-island"] ~ *')].length,
  levelsVisibleInPanel: (() => {
    // find the replay drawings list items under the replay section
    const items = [...document.querySelectorAll('li')].map((l) => l.textContent.trim()).filter((t) => t.includes('creation step') || t.includes('replay'));
    return items;
  })(),
  storedReplay: (snap('g2.replay.v1') || '').slice(0, 200),
  g1Levels: (snap('g1.levels.v1') || '').slice(0, 100),
  keys: Object.keys(localStorage)
});