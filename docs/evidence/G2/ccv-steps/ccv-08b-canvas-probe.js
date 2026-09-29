const out = { canvases: document.querySelectorAll('canvas').length, iframeless: document.body.innerHTML.includes('chart-container') };
const cont = document.querySelector('[data-testid="chart-container"]');
out.contHTMLlen = cont ? cont.innerHTML.length : 0;
out.contSample = cont ? cont.innerHTML.slice(0, 300) : null;
const shadowHost = document.querySelector('vict-host');
out.shadow = !!shadowHost && !!shadowHost.shadowRoot;
if (out.shadow) {
	out.shadowCanvases = shadowHost.shadowRoot.querySelectorAll('canvas').length;
	out.shadowSample = shadowHost.shadowRoot.innerHTML.slice(0,200);
}
return JSON.stringify(out);
