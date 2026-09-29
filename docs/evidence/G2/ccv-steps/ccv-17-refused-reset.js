const $=(s)=>document.querySelector(s);
$('[data-testid="btn-replay-reset"]').click(); // dialog opens
await new Promise(r=>setTimeout(r,700));
const dlgOpen = !!document.querySelector('.modal, dialog, [role="dialog"], .confirm');
const dlgText = document.body.textContent.includes('discard') || document.body.textContent.includes('Discard') || document.body.textContent.includes('reset') || '';
return JSON.stringify({dlgOpen, dlgText: document.querySelector('.modal,dialog,[role="dialog"]')?.textContent?.replace(/\s+/g,' ').slice(0,140) ?? document.body.textContent.match(/.{0,80}(discard|Reset).{0,80}/i)?.[0] ?? 'unknown'});
