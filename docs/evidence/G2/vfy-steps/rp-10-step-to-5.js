document.querySelector('[data-testid="btn-replay-step"]').click();
await new Promise((r) => setTimeout(r, 300));
return document.querySelector('[data-testid="replay-position"]').textContent.replace(/\s+/g, ' ').trim();