const raw = localStorage.getItem('g2.replay.v1');
localStorage.setItem('g2.replay.v1', raw.slice(0, 100));
location.reload();
return 'corrupted+reloading';
