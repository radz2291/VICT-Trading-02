// the first crashed run's window.__ccvOrigSetItem holds the genuine original
if (window.__ccvOrigSetItem) {
	let candidate = window.__ccvOrigSetItem;
	// guard: if it was captured post-patch (it throws), walk to a working one
	try { Storage.prototype.setItem = candidate; } catch(e) {}
}
let ok = false;
try { Storage.prototype.setItem.call(localStorage, '__ccv_probe', '1'); ok = localStorage.getItem('__ccv_probe') === '1'; localStorage.removeItem('__ccv_probe'); } catch (e) { ok = 'broken: ' + e.message; }
return JSON.stringify({ writeOK: ok });
