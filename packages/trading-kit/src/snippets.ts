/**
 * Kit guest snippets — executed by the sandbox adapter before the script.
 */
/**
 * PINNED DATE (criterion-5 repair round 2): the no-arg Date constructor and
 * the function-call form are wall-clock reads the Date.now pinning did not
 * cover. Global Date is replaced with a wrapper whose no-arg paths consult
 * Date.now() (which the kit driver re-pins per bar to the bar's market
 * close); arg-constructors and static parse/UTC keep real semantics.
 * Instances are REAL Dates, so all prototype methods and instanceof work.
 */
export const PINNED_DATE_SNIPPET = `
(function () {
  var RealDate = Date;
  function PinnedDate(a, b, c, d, e, f, g) {
    // consult Date.now() DYNAMICALLY (globalThis at call time): the kit
    // driver re-pins global Date.now per bar — the constructor must follow
    // that pin, not a captured reference
    var pinned = typeof Date.now === 'function' ? Date.now() : 0;
    if (!(this instanceof PinnedDate)) {
      // function call form: Date() -> string of the PINNED time
      return new RealDate(pinned).toString();
    }
    if (arguments.length === 0) return new RealDate(pinned);
    if (arguments.length === 1) return new RealDate(a);
    if (arguments.length === 2) return new RealDate(a, b);
    if (arguments.length === 3) return new RealDate(a, b, c);
    if (arguments.length === 4) return new RealDate(a, b, c, d);
    if (arguments.length === 5) return new RealDate(a, b, c, d, e);
    if (arguments.length === 6) return new RealDate(a, b, c, d, e, f);
    return new RealDate(a, b, c, d, e, f, g);
  }
  PinnedDate.prototype = RealDate.prototype;
  PinnedDate.now = function () { return typeof RealDate.now === 'function' ? RealDate.now() : 0; };
  PinnedDate.parse = RealDate.parse;
  PinnedDate.UTC = RealDate.UTC;
  globalThis.Date = PinnedDate;
})();
`;