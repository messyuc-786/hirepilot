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

  /* One place holding each module's label, title, description, and
     contextual quote — so the header markup below is written once
     and every screen just looks itself up by view name. */
  MODULES: {
    resume:    { num: '01', title: 'Resume Analyzer',
      desc: 'Upload your resume for a full breakdown: skills, ATS compatibility, and gaps.',
      quote: 'Your resume opens the door. Make sure it tells your story.' },
    jd:        { num: '02', title: 'Job Description Analyzer',
      desc: 'Break down what a job actually asks for, and how well you match it.',
      quote: 'The right opportunity starts with understanding what it asks for.' },
    optimizer: { num: '03', title: 'Resume Optimizer',
      desc: 'Rewrite your bullets to be stronger and better targeted, using only what you have actually done.',
      quote: 'Small improvements can make a strong resume even stronger.' },
    linkedin:  { num: '04', title: 'LinkedIn Optimizer',
      desc: 'Make your profile findable by recruiters searching for your skills.',
      quote: 'Your professional story continues beyond your resume.' },
    cover:     { num: '05', title: 'Cover Letter Generator',
      desc: 'A letter built from your real background and this specific job.',
      quote: 'A good application connects your experience to the opportunity.' },
    interview: { num: '06', title: 'Mock Interview',
      desc: 'Practice with questions built from your actual resume and target job.',
      quote: 'Confidence grows when preparation becomes practice.' },
    gap:       { num: '07', title: 'Career Gap Analysis',
      desc: 'What stands between you and the role you want, and how to close it.',
      quote: 'Knowing what to build next is part of moving forward.' },
    recruiter: { num: '08', title: 'Recruiter View',
      desc: 'What a recruiter notices in the first thirty seconds, including the things you would rather they did not.',
      quote: 'See your profile the way a recruiter sees it.' },
    tracker:   { num: '09', title: 'Job Tracker',
      desc: 'Every application, every round, every follow-up.',
      quote: "Every application is a step. Keep track of where you're going." },
  },

  /* Compact module header: label, title, one-line description, and
     a short contextual quote — replaces UI.head() on the nine
     feature screens. Look up by view name (e.g. UI.moduleHead('resume')). */
  moduleHead(view) {
    const m = this.MODULES[view];
    if (!m) return '';
    return `
      <div class="view-head module-head">
        <div class="eyebrow">Module ${m.num}</div>
        <h1>${this.escape(m.title)}</h1>
        <p class="muted">${this.escape(m.desc)}</p>
        <p class="module-quote">${this.escape(m.quote)}</p>
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

  /* Small inline icon set used in the hero strip and section heads.
     Kept as literal SVG (not an icon font/CDN) so the app has no
     extra network dependency. */
  _icons: {
    doc:  '<path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v6h6" fill="none" stroke-width="1.6"/>',
    bars: '<path d="M4 20V10M11 20V4M18 20v-7"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="none" stroke-width="1.6"/>',
    bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>',
    target: '<circle cx="12" cy="12" r="8" fill="none" stroke-width="1.6"/><circle cx="12" cy="12" r="4" fill="none" stroke-width="1.6"/><circle cx="12" cy="12" r="1.4"/>',
    chat: '<path d="M4 5h16v11H9l-4 4v-4H4Z" fill="none" stroke-width="1.6" stroke-linejoin="round"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11" stroke-width="1.6"/><circle cx="4.5" cy="6" r="1.4"/><circle cx="4.5" cy="12" r="1.4"/><circle cx="4.5" cy="18" r="1.4"/>',
    mail: '<path d="M3 5h18v14H3Z" fill="none" stroke-width="1.6" stroke-linejoin="round"/><path d="m3 6 9 7 9-7" fill="none" stroke-width="1.6" stroke-linejoin="round"/>',
    link: '<path d="M9.5 14.5 14.5 9.5" stroke-width="1.8"/><path d="M11 6.5 13 4.4a3.6 3.6 0 0 1 5.1 5.1L16 11.5" fill="none" stroke-width="1.8"/><path d="M13 17.5 11 19.6a3.6 3.6 0 0 1-5.1-5.1L8 12.5" fill="none" stroke-width="1.8"/>',
  },
  icon(name, size = 20) {
    const body = this._icons[name] || '';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  },

  /* Illustration card used beside a module's form (the approved
     HirePilot visual asset for that screen). Pass the image path
     relative to index.html, e.g. 'img/02_resume_analysis.jpg'.
     Set crop:true for the handful of source images that have a
     filename caption baked into the bottom edge — see .crop-caption
     in style.css. */
  visual(src, alt, caption = '', crop = false) {
    return `
      <figure class="feature-visual">
        <img src="${this.escape(src)}" alt="${this.escape(alt)}" loading="lazy" class="${crop ? 'crop-caption' : ''}">
        ${caption ? `<figcaption>${this.escape(caption)}</figcaption>` : ''}
      </figure>`;
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
