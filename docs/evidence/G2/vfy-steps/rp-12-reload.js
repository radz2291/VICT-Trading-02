// move record to step 5 (level visible), then reload the page
const rec = JSON.parse(window.localStorage.getItem('g2.replay.v1'));
const rec5 = { ...rec, instant: 1769451300, stepIndex: 5, playing: false };
window.localStorage.setItem('g2.replay.v1', JSON.stringify(rec5));
location.reload();
return 'reloading';