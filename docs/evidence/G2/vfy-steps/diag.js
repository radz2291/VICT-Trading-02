return JSON.stringify({
	readyState: document.readyState,
	loading: document.querySelector('[data-testid="workspace-loading"]')?.textContent ?? null,
	bodyLen: document.body.innerHTML.length,
	title: document.title,
	scripts: [...document.querySelectorAll('script')].length,
	snapshot: document.body.innerHTML.slice(0, 400)
});
