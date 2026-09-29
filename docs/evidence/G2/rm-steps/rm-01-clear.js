// rm-01: clear storage and report
localStorage.clear();
return { cleared: true, keys: Object.keys(localStorage) };
