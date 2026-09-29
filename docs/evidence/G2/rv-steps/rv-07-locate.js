const cont = document.querySelector('[data-testid="replay-chart-container"]');
if (!cont) return { error: 'no replay chart container' };
const r = cont.getBoundingClientRect();
return { left: r.left, top: r.top, width: r.width, height: r.height, innerWidth: window.innerWidth, innerHeight: window.innerHeight };
