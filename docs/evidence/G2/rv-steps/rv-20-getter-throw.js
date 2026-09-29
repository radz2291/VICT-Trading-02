// re-define window.localStorage accessor to throw — the app never stored a reference
try {
  Object.defineProperty(window, 'localStorage', { get() { throw new Error('accessing storage has been detected'); }, configurable: true });
  return 'getter-throw installed';
} catch (e) { return { error: e.message }; }
