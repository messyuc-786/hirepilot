/* ============================================================
   prehired.js — "PreHired": a guided journey through the existing
   standalone tools, for someone who just wants to get ONE
   application ready without hopping between nine separate screens.

   CV → JD → (auto) analyze + match → optimize (one click) →
   (auto) re-evaluate → Before/After → one-click next steps.

   Reuses, does not duplicate:
     - AIActions.analyzeResume/matchResumeToJD/optimizeResume
       (the exact same system prompts as Resume Analyzer, JD
       Analyzer, and Resume Optimizer — see js/ai-actions.js)
     - Storage.addResume/addApplication (same shape the standalone
       screens already save, so a PreHired resume/application shows
       up in Job Tracker and every other tool's dropdowns normally)
     - App.go() to hand off to Cover Letter / LinkedIn / Mock
       Interview / Job Tracker for the one-click next steps —
       those screens are completely untouched.

   State persists to localStorage (CONFIG.KEYS.PREHIRED) after every
   change, so a refresh or navigating away and back resumes exactly
   where the user left off — cleared on sign-out (cloud-sync.js)
   like the rest of the local cache, and by "Start a new
   application" here.
   ============================================================ */

const PreHired = {

  _defaultState() {
    return {
      resumeId: null, resumeName: null, resumeText: null,
      jobTitle: '', company: '', jdText: '',
      appId: null,
      before: null, matchedFor: null,
      optimize: null, optimizedText: null, after: null, optimizedFor: null,
      status: 'idle',      // idle | busy | error
      statusLabel: '',
      errorMessage: null,
      errorRetry: null,    // 'match' | 'optimize' — which step Retry re-runs
    };
  },

  _key(resumeId, jdText) {
    return JSON.stringify({ resumeId, jdText });
  },

  save() { Storage.set(CONFIG.KEYS.PREHIRED, this.state); },

  start() {
    this.state = Storage.get(CONFIG.KEYS.PREHIRED) || this._defaultState();
    // A resume picked in an earlier session may since have been
    // deleted — don't strand the user on a dead reference.
    if (this.state.resumeId && !Storage.getResume(this.state.resumeId)) {
      this.state = this._defaultState();
    }
    this.render();
  },

  reset() {
    this.state = this._defaultState();
    this.save();
    this.render();
  },

  /* ---------- RENDER ---------- */

  render() {
    const s = this.state;
    const step = !s.resumeId ? 'cv' : (!s.before ? 'jd' : 'ready');

    UI.render(`
      ${UI.head('PreHired', 'Get One Application Ready',
        'CV, job description, match, optimization, and next steps — guided, in order.')}
      <div class="split" style="margin-bottom:18px">
        <div>
          ${step === 'cv' ? this._cvStepHTML() : ''}
          ${step === 'jd' ? this._jdStepHTML() : ''}
          ${step === 'ready' ? this._readyStepHTML() : ''}
          ${this._statusHTML()}
        </div>
        ${UI.visual('img/08_career_gap.jpg', 'A guided path from resume to a ready application', 'One guided path — same tools, no tab-hopping.')}
      </div>
      ${step !== 'cv' ? `<button class="link-btn" id="phReset">Start a new PreHired application</button>` : ''}
    `);

    this._bind(step);
  },

  _statusHTML() {
    const s = this.state;
    if (s.status === 'busy') return UI.loading(s.statusLabel || 'Working');
    if (s.status === 'error') {
      return `
        <div class="notice" style="border-left-color:var(--red);margin-top:14px">
          <p style="margin-bottom:10px">${UI.escape(s.errorMessage || 'Something went wrong.')}</p>
          <button class="btn-ghost" id="phRetry">Retry</button>
        </div>`;
    }
    return '';
  },

  /* ---------- STEP: CV ---------- */

  _cvStepHTML() {
    const resumes = Storage.getResumes();
    return `
      ${resumes.length ? UI.panel('Use an existing resume', `
        <select id="phResumeSelect">
          ${resumes.map(r => `<option value="${r.id}">${UI.escape(r.name)}</option>`).join('')}
        </select>
        <div class="btn-row"><button class="btn" id="phUseResume">Continue with this resume</button></div>
      `) : ''}
      ${UI.panel(resumes.length ? 'Or paste a new resume' : 'Paste your resume', `
        ${UI.drop('phResumeFile')}
        <label for="phResumeText">Resume text</label>
        <textarea id="phResumeText" placeholder="Paste the full text of your resume..."></textarea>
        <div class="btn-row"><button class="btn" id="phAnalyzeResume">Analyze &amp; Continue</button></div>
      `)}
    `;
  },

  /* ---------- STEP: JD ---------- */

  _jdStepHTML() {
    const resume = Storage.getResume(this.state.resumeId);
    return `
      <div class="notice" style="margin-top:0">
        Using <strong>${UI.escape(resume?.name || 'your resume')}</strong>.
        <button class="link-btn" id="phChangeResume" style="display:inline;padding:0">Change</button>
      </div>
      ${UI.panel('Add the job description', `
        <div class="grid grid-2">
          <div>
            <label for="phJobTitle">Job Title</label>
            <input type="text" id="phJobTitle" value="${UI.escape(this.state.jobTitle)}" placeholder="Senior Backend Engineer">
          </div>
          <div>
            <label for="phCompany">Company</label>
            <input type="text" id="phCompany" value="${UI.escape(this.state.company)}" placeholder="Acme Corp">
          </div>
        </div>
        <label for="phJdText">Job Description</label>
        <textarea id="phJdText" placeholder="Paste the full job posting here...">${UI.escape(this.state.jdText)}</textarea>
        <div class="btn-row"><button class="btn" id="phAnalyzeJD">Analyze &amp; Match</button></div>
      `)}
    `;
  },

  /* ---------- STEP: READY (match done, optimize offered/done) ---------- */

  _readyStepHTML() {
    const s = this.state;
    const before = s.before;

    const beforeCard = UI.panel('Your Match', `
      ${UI.score(before.match_percentage, 'Match Score')}
      <p class="muted" style="margin-top:12px">${UI.escape(before.verdict || '')}</p>
      <div class="grid grid-2" style="margin-top:14px">
        ${UI.panel('You Have', UI.tags(before.matched_skills, 'good'))}
        ${UI.panel('You Are Missing', UI.tags(before.missing_skills, 'miss'))}
      </div>
    `);

    if (!s.optimize) {
      return `
        ${beforeCard}
        ${UI.panel('', `
          <p class="muted" style="margin-bottom:12px">Ready to tailor this resume for this specific role?</p>
          <button class="btn" id="phOptimize">Optimize my CV for this job</button>
        `)}
      `;
    }

    const after = s.after;
    return `
      ${UI.panel('Before vs. After', `
        <div class="grid grid-2">
          <div>${UI.score(before.match_percentage, 'Before')}</div>
          <div>${UI.score(after?.match_percentage, 'After', true)}</div>
        </div>
      `)}

      ${UI.panel('What Changed', (s.optimize.improved_bullets || []).length
        ? s.optimize.improved_bullets.map(b => `
          <div style="padding:12px 0;border-bottom:1px solid var(--line)">
            <p class="muted" style="margin-bottom:6px">${UI.escape(b.original)}</p>
            <p style="color:var(--cyan)">${UI.escape(b.improved)}</p>
          </div>`).join('')
        : UI.empty('No bullet rewrites suggested.'))}

      ${UI.panel('Remaining Gaps', UI.tags(after?.missing_skills, 'miss'))}

      ${UI.panel('Your application is ready', `
        <p class="muted" style="margin-bottom:14px">Continue with the pieces that go with it.</p>
        <div class="quick-actions">
          <button class="quick-action" data-go="cover">
            <span class="qa-icon">${UI.icon('mail')}</span>
            <div><strong>Cover Letter</strong><span>Tailored to this role</span></div>
          </button>
          <button class="quick-action" data-go="linkedin">
            <span class="qa-icon">${UI.icon('link')}</span>
            <div><strong>LinkedIn Optimizer</strong><span>Strengthen your profile</span></div>
          </button>
          <button class="quick-action" data-go="interview">
            <span class="qa-icon">${UI.icon('chat')}</span>
            <div><strong>Mock Interview</strong><span>Practice for this role</span></div>
          </button>
          <button class="quick-action" data-go="tracker">
            <span class="qa-icon">${UI.icon('list')}</span>
            <div><strong>Job Tracker</strong><span>Already saved here</span></div>
          </button>
        </div>
      `)}
    `;
  },

  /* ---------- BIND ---------- */

  _bind(step) {
    document.getElementById('phReset')?.addEventListener('click', () => this.reset());
    document.getElementById('phRetry')?.addEventListener('click', () => {
      if (this.state.errorRetry === 'match') this._runMatch();
      else if (this.state.errorRetry === 'optimize') this._runOptimize();
    });

    if (step === 'cv') {
      document.getElementById('phResumeFile')?.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          UI.toast('Reading file...');
          const text = await Parser.extract(file);
          document.getElementById('phResumeText').value = text;
          UI.toast(`Loaded ${file.name} (${text.length} characters)`, 'ok');
        } catch (err) { UI.toast(err.message, 'err'); }
      });

      UI.busyClick(document.getElementById('phUseResume'), null, async () => {
        const id = document.getElementById('phResumeSelect').value;
        const resume = Storage.getResume(id);
        if (!resume) { UI.toast('Could not find that resume.', 'err'); return; }
        this.state.resumeId = resume.id;
        this.state.resumeName = resume.name;
        this.state.resumeText = resume.text;
        this.save();
        this.render();
      });

      UI.busyClick(document.getElementById('phAnalyzeResume'), 'Analyzing...', async () => {
        const text = document.getElementById('phResumeText').value.trim();
        if (text.length < 100) { UI.toast('Please provide at least 100 characters of resume text.', 'err'); return; }
        this.state.status = 'busy';
        this.state.statusLabel = 'Analyzing your resume';
        this.render();
        try {
          const analysis = await AIActions.analyzeResume(text);
          const resume = Storage.addResume({
            name: analysis.candidate_name && analysis.candidate_name !== 'Unknown'
              ? `${analysis.candidate_name} — Resume` : 'Resume',
            text, analysis,
          });
          this.state.resumeId = resume.id;
          this.state.resumeName = resume.name;
          this.state.resumeText = resume.text;
          this.state.status = 'idle';
          this.save();
          UI.toast('Resume analyzed and saved.', 'ok');
          this.render();
        } catch (err) {
          this.state.status = 'idle';
          this.save();
          UI.toast(err.message, 'err');
          this.render();
        }
      });
    }

    if (step === 'jd') {
      document.getElementById('phChangeResume')?.addEventListener('click', () => {
        this.state.resumeId = null;
        this.save();
        this.render();
      });

      UI.busyClick(document.getElementById('phAnalyzeJD'), null, async () => {
        this.state.jobTitle = document.getElementById('phJobTitle').value.trim();
        this.state.company = document.getElementById('phCompany').value.trim();
        this.state.jdText = document.getElementById('phJdText').value.trim();
        if (this.state.jdText.length < 100) { UI.toast('Please paste at least 100 characters of the job description.', 'err'); return; }
        this.save();
        await this._runMatch();
      });
    }

    if (step === 'ready') {
      document.getElementById('phOptimize')?.addEventListener('click', () => this._runOptimize());
      document.querySelectorAll('[data-go]').forEach(btn => {
        btn.addEventListener('click', () => App.go(btn.dataset.go));
      });
    }
  },

  /* ---------- AUTOMATIC STEPS ---------- */

  async _runMatch() {
    const s = this.state;
    const key = this._key(s.resumeId, s.jdText);

    // Duplicate-call guard: same resume + same JD text already matched.
    if (s.before && s.matchedFor === key) { this.render(); return; }

    // Inputs changed since any prior optimize/after — those no longer apply.
    s.optimize = null; s.optimizedText = null; s.after = null; s.optimizedFor = null;

    s.status = 'busy'; s.statusLabel = 'Analyzing the job and calculating your match'; s.errorMessage = null;
    this.save(); this.render();

    try {
      const result = await AIActions.matchResumeToJD(s.resumeText, s.jdText);
      s.before = result;
      s.matchedFor = key;
      s.status = 'idle';

      if (!s.appId) {
        const app = Storage.addApplication({
          jobTitle: s.jobTitle || 'Untitled Role',
          company: s.company || 'Unknown',
          jdText: s.jdText,
          resumeId: s.resumeId,
          matchScore: result.match_percentage,
          analysis: result,
        });
        s.appId = app.id;
      } else {
        Storage.updateApplication(s.appId, { matchScore: result.match_percentage, analysis: result });
      }

      this.save();
      UI.toast('Match complete. Added to your Job Tracker.', 'ok');
      this.render();
    } catch (err) {
      s.status = 'error'; s.errorMessage = err.message; s.errorRetry = 'match';
      this.save();
      this.render();
    }
  },

  async _runOptimize() {
    const s = this.state;
    const key = this._key(s.resumeId, s.jdText);

    // Duplicate-call guard: same resume + same JD already optimized & re-evaluated.
    if (s.optimize && s.after && s.optimizedFor === key) { this.render(); return; }

    s.status = 'busy'; s.statusLabel = 'Optimizing your resume for this role'; s.errorMessage = null;
    this.save(); this.render();

    try {
      const optimize = await AIActions.optimizeResume(s.resumeText, s.jdText);
      s.optimize = optimize;
      s.optimizedText = AIActions.buildOptimizedResumeText(s.resumeText, optimize);

      s.statusLabel = 'Re-evaluating your optimized resume against this role';
      this.save(); this.render();

      const after = await AIActions.matchResumeToJD(s.optimizedText, s.jdText);
      s.after = after;
      s.optimizedFor = key;
      s.status = 'idle';

      if (s.appId) Storage.updateApplication(s.appId, { matchScore: after.match_percentage });

      this.save();
      UI.toast('Your application is ready.', 'ok');
      this.render();
    } catch (err) {
      s.status = 'error'; s.errorMessage = err.message; s.errorRetry = 'optimize';
      this.save();
      this.render();
    }
  },
};
