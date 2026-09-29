const r = document.querySelector('[data-testid="replay-readout"]');
return r ? r.textContent.replace(/\s+/g, ' ').trim() : null;