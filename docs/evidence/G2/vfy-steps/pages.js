const targets = [];
// cannot enumerate pages from inside; report own URL + storage
return JSON.stringify({ url: location.href, keys: Object.keys(window.localStorage), store: (window.localStorage.getItem('g1.levels.v1')||'').slice(0,80) });
