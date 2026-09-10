/* ============================================================
   cloud-sync.js — Mirrors Storage's data to Supabase, in the
   background, without changing Storage's public API.

   WHY A CACHE, NOT A DIRECT REWRITE:
   Every screen in features.js reads Storage.getResumes() etc.
   SYNCHRONOUSLY, inline, while building HTML strings — that's the
   whole reason the app has no loading spinners on Dashboard,
   Resume Analyzer's saved list, the Job Tracker table, and so on.
   Supabase queries are inherently asynchronous. Converting every
   render() in features.js to async (and awaiting a network call
   before drawing a page) would touch all nine feature screens for
   no user-visible benefit — preserving the existing Storage
   interface means feature screens need no rewrites.

   So: localStorage stays the synchronous read path Storage already
   has (unchanged). CloudSync makes Supabase the durable source of
   truth on top of it:
     - HYDRATE on sign-in: pull everything Supabase has for this
       user and overwrite the local cache, so a returning user (or
       a new device) sees their real data before anything renders.
     - PUSH on every write: after Storage.addResume/addApplication/
       etc. writes to localStorage, also fire-and-forget the same
       change to Supabase. UI never waits on this.
     - CLEAR on sign-out: wipe the local cache so the next person
       on a shared device doesn't see the previous user's data.

   SCHEMA NOTE — applications vs. job_analyses:
   The live database splits what the app calls one "application"
   across two tables: `job_analyses` holds the JD-analysis fields
   (job_description, match_score, analysis) and `applications` holds
   the tracker fields (status, notes, resume_id) plus a
   job_analysis_id foreign key back to the analysis row. The local
   app model has always treated these as one record (one id, from
   Storage.addApplication) — so each local application optionally
   carries a `_jobAnalysisId` once it's been synced once, purely to
   remember which job_analyses row to update on the next push. That
   field is never read or shown by any feature screen.

   SCHEMA NOTE — interviews:
   The live `interviews` table has no `type` or `resume_id` column,
   and stores each grading dimension as its own column
   (communication_score, confidence_score, etc.) rather than one
   score plus a feedback blob. Interview `type` therefore stays
   local-only — Storage/localStorage still has it (Mock Interview
   and the Dashboard both read it from there), it just isn't mirrored
   to Supabase since the table has nowhere to put it.

   None of this runs at all if Supabase isn't configured (SB is
   null) or nobody is signed in — Storage behaves exactly as it did
   before this file existed.
   ============================================================ */

const CloudSync = {

  /* ---------- resumes (1:1 with the local shape) ---------- */

  _resumeToRow(r, userId) {
    return { id: r.id, user_id: userId, name: r.name || null, resume_text: r.text || null, analysis: r.analysis || null };
  },
  _resumeFromRow(row) {
    return { id: row.id, createdAt: row.created_at, name: row.name, text: row.resume_text, analysis: row.analysis };
  },

  /* ---------- applications (split across job_analyses + applications) ---------- */

  async _pushApplication(app, userId) {
    // 1. Upsert the analysis half into job_analyses. Reuse the
    //    linked row's id if this application has synced before.
    const analysisRow = {
      user_id: userId,
      job_title: app.jobTitle || null,
      company: app.company || null,
      job_description: app.jdText || null,
      match_score: app.matchScore ?? null,
      analysis: app.analysis || null,
    };
    if (app._jobAnalysisId) analysisRow.id = app._jobAnalysisId;

    const { data: jaData, error: jaError } = await SB.from('job_analyses').upsert(analysisRow).select('id').single();
    if (jaError) throw jaError;

    // Remember the link locally (silently — no re-render, no
    // recursive push; this only updates the cached copy so the
    // NEXT push knows which job_analyses row to update).
    if (!app._jobAnalysisId) {
      const all = Storage.getApplications().map(a => a.id === app.id ? { ...a, _jobAnalysisId: jaData.id } : a);
      Storage.set(CONFIG.KEYS.APPLICATIONS, all);
    }

    // 2. Upsert the tracker half into applications.
    const appRow = {
      id: app.id, user_id: userId,
      job_title: app.jobTitle || null, company: app.company || null,
      status: app.status || 'applied', notes: app.notes || '',
      resume_id: app.resumeId || null,
      job_analysis_id: jaData.id,
    };
    const { error: appError } = await SB.from('applications').upsert(appRow);
    if (appError) throw appError;
  },

  async _fetchApplications(userId) {
    const [apps, analyses] = await Promise.all([
      SB.from('applications').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      SB.from('job_analyses').select('*').eq('user_id', userId),
    ]);
    if (apps.error) throw apps.error;
    if (analyses.error) throw analyses.error;

    const byId = new Map(analyses.data.map(a => [a.id, a]));
    return apps.data.map(row => {
      const ja = row.job_analysis_id ? byId.get(row.job_analysis_id) : null;
      return {
        id: row.id, createdAt: row.created_at,
        jobTitle: row.job_title, company: row.company,
        status: row.status, notes: row.notes || '',
        resumeId: row.resume_id,
        jdText: ja?.job_description ?? '', matchScore: ja?.match_score ?? null, analysis: ja?.analysis ?? null,
        _jobAnalysisId: row.job_analysis_id || undefined,
      };
    });
  },

  /* ---------- interviews (type/resumeId stay local-only — see note above) ---------- */

  _interviewToRow(i, userId) {
    const f = i.feedback || {};
    return {
      id: i.id, user_id: userId,
      overall_score: i.score ?? f.overall_score ?? null,
      communication_score: f.communication ?? null,
      confidence_score: f.confidence ?? null,
      relevance_score: f.relevance ?? null,
      technical_score: f.technical_depth ?? null,
      star_score: f.star_usage ?? null,
      feedback: f,
    };
  },
  _interviewFromRow(row, localById) {
    // type/resumeId have no column — recover them from whatever's
    // already in the local cache (e.g. across a same-session
    // refresh) rather than losing them, falling back to unknown.
    const existing = localById.get(row.id);
    return {
      id: row.id, createdAt: row.created_at,
      type: existing?.type || 'general',
      resumeId: existing?.resumeId || null,
      score: row.overall_score,
      feedback: row.feedback || {},
    };
  },

  /* ---------- hydrate: Supabase -> localStorage cache ---------- */

  async hydrate() {
    if (!SB || !Auth.isSignedIn()) return;
    const userId = Auth.currentUser().id;
    const localInterviewsById = new Map(Storage.getInterviews().map(i => [i.id, i]));

    try {
      const [resumes, apps, interviews] = await Promise.all([
        SB.from('resumes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        this._fetchApplications(userId),
        SB.from('interviews').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);

      if (resumes.error) throw resumes.error;
      if (interviews.error) throw interviews.error;

      Storage.set(CONFIG.KEYS.RESUMES, resumes.data.map(this._resumeFromRow));
      Storage.set(CONFIG.KEYS.APPLICATIONS, apps);
      Storage.set(CONFIG.KEYS.INTERVIEWS, interviews.data.map(row => this._interviewFromRow(row, localInterviewsById)));
    } catch (e) {
      console.warn('CloudSync.hydrate failed — continuing with local cache.', e);
    }
  },

  /* Wipe the local cache on sign-out so the next user on this
     device doesn't inherit the previous one's data. */
  clearLocalCache() {
    Storage.remove(CONFIG.KEYS.RESUMES);
    Storage.remove(CONFIG.KEYS.APPLICATIONS);
    Storage.remove(CONFIG.KEYS.INTERVIEWS);
    Storage.remove(CONFIG.KEYS.PREHIRED); // in-progress guided-journey state — local-only, same reasoning as the three above
  },

  /* ---------- push: one write, fire-and-forget ---------- */

  push(table, action, payload) {
    if (!SB || !Auth.isSignedIn()) return;
    const userId = Auth.currentUser().id;

    const run = async () => {
      try {
        if (action === 'delete') {
          if (table === 'applications' && payload._jobAnalysisId) {
            await SB.from('job_analyses').delete().eq('id', payload._jobAnalysisId).eq('user_id', userId);
          }
          const { error } = await SB.from(table).delete().eq('id', payload.id).eq('user_id', userId);
          if (error) throw error;
          return;
        }

        if (table === 'applications') {
          await this._pushApplication(payload, userId);
          return;
        }

        const row =
          table === 'resumes'    ? this._resumeToRow(payload, userId) :
          table === 'interviews' ? this._interviewToRow(payload, userId) : null;
        if (!row) return;
        const { error } = await SB.from(table).upsert(row);
        if (error) throw error;
      } catch (e) {
        // Sync failures shouldn't interrupt the user — the local
        // write already succeeded. Surface it quietly for debugging.
        console.warn(`CloudSync.push(${table}, ${action}) failed:`, e);
      }
    };

    run();
  },
};
