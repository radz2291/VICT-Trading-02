const before = Object.keys(window.localStorage);
window.localStorage.clear();
location.reload();
return 'cleared: had ' + before.join(',');
