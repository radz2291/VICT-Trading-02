const $=(s)=>document.querySelector(s);
const btn=$('[data-testid="btn-replay-step"]');
btn.focus();
btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
await new Promise(r=>setTimeout(r,900));
// Enter on a focused BUTTON triggers native click; also explicit keyboard event path
const pos1=(document.querySelector('[data-testid="replay-position"]')||{}).textContent?.replace(/\s+/g,' ').trim();
if (!String(pos1||'').startsWith('step 6')) {
	btn.click === undefined ? null : null;
}
return JSON.stringify({afterEnter: pos1});
