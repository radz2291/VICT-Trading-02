const cont = document.querySelector('[data-testid="replay-chart-container"]');
const r = cont.getBoundingClientRect();
return JSON.stringify({ left: r.left, top: r.top, width: r.width, height: r.height });