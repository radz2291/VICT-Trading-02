const $$ = (s) => document.querySelector(s);
const txt = (s) => ($$(s) ? $$(s).textContent.trim() : null);
const out = {};
const btn = $$('[data-testid="btn-add-level"]');
if (!btn) return { error: 'no button' };
btn.click();
await new Promise((r) => setTimeout(r, 400));
out.afterCreate = {
	panel: [...document.querySelectorAll('[data-testid="panel-drawings"] li')].map((l) => l.textContent.trim()),
	status: txt('[data-testid="mutation-status"]'),
	store: window.localStorage.getItem('g1.levels.v1')
};
// edit selected level price via fields
const priceField = $$('[data-testid="edit-price"]');
if (!priceField) return { error: 'no edit field after create', out };
priceField.value = '2649.50';
priceField.dispatchEvent(new Event('input', { bubbles: true }));
priceField.dispatchEvent(new Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 500));
out.afterEdit = {
	panel: [...document.querySelectorAll('[data-testid="panel-drawings"] li')].map((l) => l.textContent.trim()),
	status: txt('[data-testid="mutation-status"]'),
	store: window.localStorage.getItem('g1.levels.v1')
};
// undo
$$('[data-testid="btn-undo"]').click();
await new Promise((r) => setTimeout(r, 500));
out.afterUndo = {
	panel: [...document.querySelectorAll('[data-testid="panel-drawings"] li')].map((l) => l.textContent.trim()),
	status: txt('[data-testid="mutation-status"]'),
	store: window.localStorage.getItem('g1.levels.v1')
};
// redo (restore edit)
$$('[data-testid="btn-redo"]').click();
await new Promise((r) => setTimeout(r, 500));
out.afterRedo = {
	panel: [...document.querySelectorAll('[data-testid="panel-drawings"] li')].map((l) => l.textContent.trim()),
	store: window.localStorage.getItem('g1.levels.v1')
};
return out;
