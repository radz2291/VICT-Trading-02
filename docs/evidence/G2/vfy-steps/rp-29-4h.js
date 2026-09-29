const tfSel = document.querySelector('[data-testid="sel-replay-tf"]');
tfSel.value = '4h';
tfSel.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 300));
$ = null;
return {
	stats: document.querySelector('[data-testid="replay-slice-stats"]').textContent.replace(/\s+/g, ' ').trim(),
	position: document.querySelector('[data-testid="replay-position"]').textContent.replace(/\s+/g, ' ').trim()
};
