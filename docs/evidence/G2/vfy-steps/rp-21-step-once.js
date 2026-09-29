// advance one 15m step (17:15 -> 17:30, still mid-bucket)
document.querySelector('[data-testid="btn-replay-step"]').click();
await new Promise((r) => setTimeout(r, 300));
return { position: document.querySelector('[data-testid="replay-position"]').textContent.replace(/\s+/g, ' ').trim() };