const out = [...document.querySelectorAll('canvas')].slice(0,8).map(c => {
	const r = c.getBoundingClientRect();
	return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top), parent: c.parentElement?.getAttribute('data-testid') ?? c.parentElement?.tagName.toLowerCase() };
});
return JSON.stringify(out);
