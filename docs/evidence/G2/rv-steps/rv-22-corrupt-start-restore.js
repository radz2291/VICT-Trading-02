document.querySelector('[data-testid="btn-replay-restore"]').click();
await new Promise((r) => setTimeout(r, 600));
const all = [...document.querySelectorAll('.replay-status, .hint, .pill, [role="alert"], [data-testid="panel-status"]')].map((e) => ({ t: e.getAttribute('data-testid') || e.className, role: e.getAttribute('role'), text: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 90), visible: !!(e.offsetParent || e.getClientRects().length) }));
const hasFailureSignal = all.some((x) => /unavailable|failed|refused/.test(x.text) && x.visible);
return { hasFailureSignal, elements: all.filter(x => x.visible).slice(0, 12) };
