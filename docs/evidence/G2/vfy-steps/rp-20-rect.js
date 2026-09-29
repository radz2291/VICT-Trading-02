// sweep the right edge of the given rect and return the readout for each x
const rect = document.querySelector('[data-testid="replay-chart-container"]').getBoundingClientRect();
window.__vfyRect = { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };