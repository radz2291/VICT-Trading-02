document.querySelector('[data-testid="btn-replay-step"]').click();
await new Promise((r) => setTimeout(r, 500));
return document.querySelector('[data-testid="replay-status"]')?.textContent.trim() ?? null;
