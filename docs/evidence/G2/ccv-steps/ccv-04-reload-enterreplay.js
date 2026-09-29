const $ = (s) => document.querySelector(s);
const txt = (s) => ($(s) ? $(s).textContent.replace(/\s+/g,' ').trim() : null);
const out = {};
location.reload();
return 'reloaded';
