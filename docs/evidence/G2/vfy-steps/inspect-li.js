return JSON.stringify({
  liHTML: [...document.querySelectorAll('[data-testid="panel-drawings"] li')].map((l) => l.innerHTML),
  note: [...document.querySelectorAll('[data-testid="panel-drawings"] .d-note')].map((l) => l.textContent)
});
