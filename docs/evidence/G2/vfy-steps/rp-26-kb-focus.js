// focus the Step button by Tab from the panel, then press Enter (real keyboard)
// simpler deterministic path: keyboard.focus + keyboard.press in driver; here we verify
// from page: document focus + keydown handler result — focus the Step button,
// record focus state, then the DRIVER presses Enter (separate invocation).
const stepBtn = document.querySelector('[data-testid="btn-replay-step"]');
if (!stepBtn) return { error: 'no step btn' };
stepBtn.focus();
const st = { focusedIsStep: document.activeElement === stepBtn };
window.__vfyStFocused = st.focusedIsStep;
return st;