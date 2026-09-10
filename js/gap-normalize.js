/* ============================================================
   gap-normalize.js — Career Gap response normalization.

   The AI is asked for plain strings everywhere (see the schema in
   Features.runGap's system prompt in features.js), but a live model
   occasionally drifts — returning an object like {name, reason}
   instead of a bare string, or wrapping the roadmap in
   {phases: [...]} instead of a bare array. Left as-is, those render
   as literal "[object Object]" (UI.escape() just calls String() on
   whatever it's given) or make a genuinely-present roadmap look
   empty ((obj || []).map is not a function inside a template
   literal — no roadmap array to iterate).

   These helpers coerce whatever shape comes back into the plain
   strings/arrays Features.runGap's rendering expects, so a
   same-meaning-different-shape response displays correctly instead
   of falling back to raw object stringification or a false "empty"
   state. Genuinely absent data still renders as absent afterward —
   this only widens what counts as "present".

   Kept in its own file (rather than inline in features.js) so it
   has no DOM/browser dependency and can be unit-tested directly
   with Node's built-in test runner — see test/gap-normalize.test.mjs.
   Loaded as a plain global via <script> in the browser (before
   features.js) and via module.exports under Node.
   ============================================================ */

function gapToText(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(gapToText).filter(Boolean).join(', ');
  if (typeof v === 'object') {
    const preferred = v.title ?? v.name ?? v.text ?? v.label ?? v.description ?? v.value ?? v.resource ?? v.action;
    if (preferred !== undefined) return gapToText(preferred);
    // No obviously-right field — fall back to any string/number
    // values the object does have, rather than "[object Object]".
    const parts = Object.values(v).filter(x => typeof x === 'string' || typeof x === 'number');
    return parts.length ? parts.join(' — ') : '';
  }
  return '';
}

function gapToStringArray(v) {
  const arr = Array.isArray(v) ? v : (v === null || v === undefined || v === '' ? [] : [v]);
  return arr.map(gapToText).filter(s => s !== '');
}

function gapNormalizeRoadmap(v) {
  let arr;
  if (Array.isArray(v)) arr = v;
  else if (v && typeof v === 'object') arr = Array.isArray(v.phases) ? v.phases : [v];
  else arr = [];
  return arr
    .map(p => (p && typeof p === 'object') ? {
      phase: gapToText(p.phase) || 'Phase',
      focus: gapToText(p.focus),
      actions: gapToStringArray(p.actions),
      resources: gapToStringArray(p.resources),
    } : { phase: 'Phase', focus: gapToText(p), actions: [], resources: [] })
    .filter(p => p.focus || p.actions.length || p.resources.length);
}

// Dual export: a plain global for the browser <script> tag, and
// module.exports for Node-based unit tests — no bundler either way.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { gapToText, gapToStringArray, gapNormalizeRoadmap };
}
