// rm-06: drawing save refused while corrupt — real chart click
const cont = document.querySelector('[data-testid="replay-chart-container"]');
if (!cont) return { error: 'no replay chart container' };
const r = cont.getBoundingClientRect();
const cx = r.left + r.width * 0.5, cy = r.top + r.height * 0.55;
return { click: { x: Math.round(cx), y: Math.round(cy) }, before: localStorage.getItem('g2.replay.v1') };
