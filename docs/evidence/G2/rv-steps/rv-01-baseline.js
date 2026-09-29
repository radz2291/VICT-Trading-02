await localStorage.clear();
const btn = [...document.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(t=>t&&t.length<30);
return { url: location.href, buttons: btn.slice(0,25), storage: { g1: localStorage.getItem('g1.levels.v1'), g2: localStorage.getItem('g2.replay.v1') } };
