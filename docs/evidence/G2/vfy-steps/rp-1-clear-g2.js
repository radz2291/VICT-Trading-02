const had = window.localStorage.getItem('g2.replay.v1');
window.localStorage.removeItem('g2.replay.v1');
return 'g2 key cleared (had: ' + had + ')';
