const $ = (s) => document.querySelector(s);
const txt = (s) => ($(s) ? $(s).textContent.replace(/\s+/g,' ').trim() : null);
// click the replay chart canvas at its center to create a replay-stamped level (real mouse interaction)
let canvas = document.querySelector('[data-testid="chart-container"] canvas');
if (!canvas) canvas = [...document.querySelectorAll('canvas')].find(c => c.getBoundingClientRect().width > 400);
if (!canvas) return { error: 'no canvas' };
const r = canvas.getBoundingClientRect();
const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: cx, clientY: cy, button: 0 }));
canvas.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: cx, clientY: cy, button: 0 }));
canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: cx, clientY: cy, button: 0 }));
await new Promise((rp) => setTimeout(rp, 700));
const out = { replayLevels: document.querySelectorAll('[data-testid="replay-levels"] li').length, levelsText: [...document.querySelectorAll('[data-testid="replay-levels"] li')].map(l=>l.textContent.replace(/\s+/g,' ').slice(0,80)), g2: (localStorage.getItem('g2.replay.v1')||'').slice(0,220) };
return JSON.stringify(out);
