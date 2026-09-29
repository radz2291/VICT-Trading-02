// W1 on a FRESH storage (localStorage wiped): bare -> create -> select/edit -> undo -> redo -> reload persistence
const $$ = (s) => document.querySelector(s);
const txt = (s) => ($$(s) ? $$(s).textContent.trim() : null);
const state = {
	url: location.href,
	keys: Object.keys(window.localStorage),
	banner: txt('[data-testid="mode-banner"]'),
	chartIsland: !!$$('[data-testid="chart-island"]'),
	panelEmpty: txt('[data-testid="panel-empty"]'),
	panelDrawings: [...document.querySelectorAll('[data-testid="panel-drawings"] li')].map((l) => l.textContent.trim()),
	levelsStore: window.localStorage.getItem('g1.levels.v1'),
	status: txt('[data-testid="mutation-status"]')
};
return state;