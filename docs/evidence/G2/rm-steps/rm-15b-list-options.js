const sel = document.querySelector('[data-testid="sel-replay-start"]');
if (!sel) return { error: 'no select', banner: document.querySelector('[data-testid="mode-banner"]')?.textContent.trim(), status: document.querySelector('[data-testid="replay-status"]')?.textContent.trim() };
return { labels: [...sel.options].map((o) => o.label) };
