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

  /* Model preference only — no provider key is ever stored here.
     Live-mode AI requests are authenticated with the user's
     Supabase session instead (see js/api.js, supabase/functions/ai). */
  getModel()       { return this.get(CONFIG.KEYS.MODEL, CONFIG.DEFAULT_MODEL); },
  setModel(m)      { return this.set(CONFIG.KEYS.MODEL, m); },

  /* ---------- RESUMES ---------- */

  getResumes()     { return this.get(CONFIG.KEYS.RESUMES, []); },

  addResume(resume) {
    const all = this.getResumes();
    // newest first, so the most recent resume is always index 0
    const record = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...resume,
    };
    all.unshift(record);
    this.set(CONFIG.KEYS.RESUMES, all);
    CloudSync?.push('resumes', 'upsert', record);
    return all[0];
  },

  getResume(id) {
    return this.getResumes().find(r => r.id === id) || null;
  },

  deleteResume(id) {
    this.set(CONFIG.KEYS.RESUMES, this.getResumes().filter(r => r.id !== id));
    CloudSync?.push('resumes', 'delete', { id });
  },

  /* ---------- APPLICATIONS ---------- */

  getApplications() { return this.get(CONFIG.KEYS.APPLICATIONS, []); },

  addApplication(app) {
    const all = this.getApplications();
    const record = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'applied',
      notes: '',
      ...app,
    };
    all.unshift(record);
    this.set(CONFIG.KEYS.APPLICATIONS, all);
    CloudSync?.push('applications', 'upsert', record);
    return all[0];
  },

  updateApplication(id, changes) {
    let updated = null;
    const all = this.getApplications().map(a => {
      if (a.id !== id) return a;
      updated = { ...a, ...changes };
      return updated;
    });
    this.set(CONFIG.KEYS.APPLICATIONS, all);
    if (updated) CloudSync?.push('applications', 'upsert', updated);
  },

  deleteApplication(id) {
    this.set(
      CONFIG.KEYS.APPLICATIONS,
      this.getApplications().filter(a => a.id !== id)
    );
    CloudSync?.push('applications', 'delete', { id });
  },

  /* ---------- INTERVIEWS ---------- */

  getInterviews() { return this.get(CONFIG.KEYS.INTERVIEWS, []); },

  addInterview(interview) {
    const all = this.getInterviews();
    const record = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...interview,
    };
    all.unshift(record);
    this.set(CONFIG.KEYS.INTERVIEWS, all);
    CloudSync?.push('interviews', 'upsert', record);
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
