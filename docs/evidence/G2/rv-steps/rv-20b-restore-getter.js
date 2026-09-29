delete window.localStorage;
try { const n = (localStorage.getItem('g2.replay.v1') || '').length; return { getterRestored: true, g2Len: n }; } catch (e) { return { getterRestored: false, err: e.message }; }
