/* ============================================================
   ui.js — Small reusable pieces of interface.

   Without this file, every feature would rewrite its own loading
   spinner and score bar. Write it once here, use it ten times.

   IMPORTANT: escape() is used on anything a user typed. Without it,
   a resume containing <script> could run code in the page. That
   vulnerability is called XSS. Always escape user input.
   ============================================================ */

const UI = {

  /* ---------- SAFETY ---------- */

  escape(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /* ---------- TOAST NOTIFICATIONS ---------- */

  toast(message, type = '') {
    const el = document.getElementById('toast');
    if (!el) return;

    el.textContent = message;
    el.className = `toast ${type}`;
    el.hidden = false;

    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.hidden = true; }, 4000);
  },

  /* ---------- BUILDING BLOCKS ---------- */

  loading(label = 'Analyzing') {
    return `
      <div class="loading">
        <div class="spinner"></div>
        ${this.escape(label)}...
      </div>`;
  },

  empty(message) {
    return `<div class="empty">${this.escape(message)}</div>`;
  },

  head(eyebrow, title, sub = '') {
    return `
      <div class="view-head">
        <div class="eyebrow">${this.escape(eyebrow)}</div>
        <h1>${this.escape(title)}</h1>
        ${sub ? `<p class="muted" style="margin-top:6px">${this.escape(sub)}</p>` : ''}
      </div>`;
  },

  stat(label, value, cyan = false) {
    return `
      <div class="stat">
        <div class="stat-label">${this.escape(label)}</div>
        <div class="stat-value ${cyan ? 'cyan' : ''}">${this.escape(value)}</div>
      </div>`;
  },

  /* Big score with a progress bar underneath. */
  score(value, label = 'Score', cyan = false) {
    const n = Math.max(0, Math.min(100, Number(value) || 0));
    return `
      <div>
        <div class="stat-label">${this.escape(label)}</div>
        <div class="score-ring">
          <span class="n" ${cyan ? 'style="color:var(--cyan)"' : ''}>${n}</span>
          <span class="d">/ 100</span>
        </div>
        <div class="bar ${cyan ? 'cyan' : ''}"><span style="width:${n}%"></span></div>
      </div>`;
  },

  /* Coerce a value that SHOULD be an array (AI responses sometimes
     return a single string, an object, or null instead) into one,
     so a malformed shape degrades to "None found" instead of a
     silent-empty render or a thrown error. Logs so it's visible
     during testing that the model drifted from the requested schema. */
  toArray(items, context = '') {
    if (Array.isArray(items)) return items;
    if (items === null || items === undefined || items === '') return [];
    console.warn(`Expected an array${context ? ` for "${context}"` : ''} but got:`, items);
    return [items];
  },

  /* Bulleted list. colour: '' | 'cyan' | 'red' */
  list(items, colour = '') {
    const arr = this.toArray(items, 'list');
    if (!arr.length) {
      return `<p class="muted">None found.</p>`;
    }
    return `
      <ul class="list ${colour}">
        ${arr.map(i => `<li>${this.escape(i)}</li>`).join('')}
      </ul>`;
  },

  /* Chips. variant: '' | 'good' | 'miss' */
  tags(items, variant = '') {
    const arr = this.toArray(items, 'tags');
    if (!arr.length) {
      return `<p class="muted">None found.</p>`;
    }
    return `
      <div class="tags">
        ${arr.map(i => `<span class="tag ${variant}">${this.escape(i)}</span>`).join('')}
      </div>`;
  },

  panel(title, inner) {
    return `
      <div class="panel">
        ${title ? `<h2>${this.escape(title)}</h2>` : ''}
        ${inner}
      </div>`;
  },

  /* File upload drop zone. */
  drop(id, hint = 'PDF or TXT, up to 5MB') {
    return `
      <label class="drop" for="${id}">
        <div>Click to choose a file, or drag one here</div>
        <div class="drop-hint">${this.escape(hint)}</div>
        <input type="file" id="${id}" accept=".pdf,.txt">
      </label>`;
  },

  /* ---------- HELPERS ---------- */

  date(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return ''; }
  },

  /* Shorten long text for previews. */
  truncate(str, max = 90) {
    const s = String(str || '');
    return s.length > max ? s.slice(0, max) + '...' : s;
  },

  /* Fill the main content area. */
  render(html) {
    document.getElementById('views').innerHTML = html;
  },

  /* ---------- ASYNC BUTTON GUARD ----------
     Wraps a button's click handler so a second click while the first
     request is still in flight is ignored, instead of firing a
     duplicate API call (and, in features that save to Storage, a
     duplicate saved record). Disables + relabels the button while
     busy, then always restores it, success or failure. */
  busyClick(btn, busyLabel, handler) {
    if (!btn) return;
    let busy = false;
    const original = btn.textContent;
    btn.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      btn.disabled = true;
      if (busyLabel) btn.textContent = busyLabel;
      try {
        await handler();
      } finally {
        busy = false;
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  },
};
