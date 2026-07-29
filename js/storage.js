/* ============================================================
   storage.js — Saves data in the browser's localStorage.

   localStorage is a small key-value store built into every browser.
   It survives page refreshes and browser restarts. It holds about
   5MB, which is plenty for text.

   It can only store STRINGS, so we JSON.stringify going in and
   JSON.parse coming out. Every read is wrapped in try/catch because
   corrupted data would otherwise crash the whole app.
   ============================================================ */

const Storage = {

  /* ---------- CORE READ / WRITE ---------- */

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.warn(`Storage.get failed for "${key}":`, e);
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      // Usually means storage is full (quota exceeded).
      console.error(`Storage.set failed for "${key}":`, e);
      UI?.toast('Could not save — browser storage may be full.', 'err');
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  /* ---------- API KEY ---------- */

  getApiKey()      { return this.get(CONFIG.KEYS.API_KEY, ''); },
  setApiKey(k)     { return this.set(CONFIG.KEYS.API_KEY, k); },
  hasApiKey()      { return !!this.getApiKey(); },

  getModel()       { return this.get(CONFIG.KEYS.MODEL, CONFIG.DEFAULT_MODEL); },
  setModel(m)      { return this.set(CONFIG.KEYS.MODEL, m); },

  /* ---------- RESUMES ---------- */

  getResumes()     { return this.get(CONFIG.KEYS.RESUMES, []); },

  addResume(resume) {
    const all = this.getResumes();
    // newest first, so the most recent resume is always index 0
    all.unshift({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...resume,
    });
    this.set(CONFIG.KEYS.RESUMES, all);
    return all[0];
  },

  getResume(id) {
    return this.getResumes().find(r => r.id === id) || null;
  },

  deleteResume(id) {
    this.set(CONFIG.KEYS.RESUMES, this.getResumes().filter(r => r.id !== id));
  },

  /* ---------- APPLICATIONS ---------- */

  getApplications() { return this.get(CONFIG.KEYS.APPLICATIONS, []); },

  addApplication(app) {
    const all = this.getApplications();
    all.unshift({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'applied',
      notes: '',
      ...app,
    });
    this.set(CONFIG.KEYS.APPLICATIONS, all);
    return all[0];
  },

  updateApplication(id, changes) {
    const all = this.getApplications().map(a =>
      a.id === id ? { ...a, ...changes } : a
    );
    this.set(CONFIG.KEYS.APPLICATIONS, all);
  },

  deleteApplication(id) {
    this.set(
      CONFIG.KEYS.APPLICATIONS,
      this.getApplications().filter(a => a.id !== id)
    );
  },

  /* ---------- INTERVIEWS ---------- */

  getInterviews() { return this.get(CONFIG.KEYS.INTERVIEWS, []); },

  addInterview(interview) {
    const all = this.getInterviews();
    all.unshift({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...interview,
    });
    this.set(CONFIG.KEYS.INTERVIEWS, all);
    return all[0];
  },

  /* ---------- STATS (for the dashboard) ---------- */

  getStats() {
    const apps       = this.getApplications();
    const interviews = this.getInterviews();

    const offers = apps.filter(a => a.status === 'offer').length;

    return {
      resumes:     this.getResumes().length,
      applications: apps.length,
      interviews:  interviews.length,
      offers,
      // Guard against divide-by-zero on a fresh install.
      successRate: apps.length
        ? Math.round((offers / apps.length) * 100)
        : 0,
      avgInterviewScore: interviews.length
        ? Math.round(
            interviews.reduce((sum, i) => sum + (i.score || 0), 0) /
            interviews.length
          )
        : 0,
    };
  },

  /* ---------- EXPORT / RESET ---------- */

  exportAll() {
    return {
      exportedAt:   new Date().toISOString(),
      resumes:      this.getResumes(),
      applications: this.getApplications(),
      interviews:   this.getInterviews(),
    };
  },

  clearAll() {
    // Deliberately does NOT clear the API key.
    this.remove(CONFIG.KEYS.RESUMES);
    this.remove(CONFIG.KEYS.APPLICATIONS);
    this.remove(CONFIG.KEYS.INTERVIEWS);
  },
};
