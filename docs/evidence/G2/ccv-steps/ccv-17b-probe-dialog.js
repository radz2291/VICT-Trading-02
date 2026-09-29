// dialog might use native confirm() or a custom element; check via __ccvDialogs capture + DOM
const out = { dialogFired: 0 };
// custom dialog test ids?
out.modals = [...document.querySelectorAll('[class*="modal"],[class*="dialog"],[class*="confirm"]')].map(e => ({cls: e.className.toString().slice(0,60), visible: e.getBoundingClientRect().width > 0, text: e.textContent.replace(/\s+/g,' ').slice(0,120)}));
return JSON.stringify(out);
