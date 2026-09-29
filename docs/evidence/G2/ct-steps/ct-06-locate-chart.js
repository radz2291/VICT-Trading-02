// ct-06: attempt DRAWINGS SAVE (replay-stamped level) with corrupt storage — real chart click
// find the replay chart canvas and click near its center to create a level at that price
const cont = document.querySelector('[data-testid="replay-chart-container"]');
if (!cont) return { error: 'no replay chart container' };
const r = cont.getBoundingClientRect();
const cx = r.left + r.width * 0.5, cy = r.top + r.height * 0.5;
return JSON.stringify({ containerRect: { x: cx, y: cy }, levelsBefore: [...document.querySelectorAll('[data-testid="replay-levels"] li')].map((l) => l.textContent.trim()) });