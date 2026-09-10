/* ============================================================
   features.js — All ten features of HirePilot AI.

   CONTENTS
     00  Dashboard
     01  Resume Analyzer
     02  Job Description Analyzer
     03  Resume Optimizer
     04  LinkedIn Optimizer
     05  Cover Letter Generator
     06  Mock Interview
     07  Career Gap Analysis
     08  Recruiter View
     09  Job Tracker

   Every feature follows the same shape:
     render()  draws the screen
     run()     calls the AI and shows results

   The AI prompts live right next to the code that uses them. When a
   result looks wrong, the prompt is the first thing to edit.
   ============================================================ */

// Career Gap's response-shape normalization (gapToText,
// gapToStringArray, gapNormalizeRoadmap) lives in js/gap-normalize.js
// — loaded as a global before this file — so it has no DOM
// dependency and is unit-testable on its own (test/gap-normalize.test.mjs).

const Features = {

/* ============================================================
   00 — DASHBOARD
   ============================================================ */
dashboard() {
  const s = Storage.getStats();
  const allApps = Storage.getApplications();
  const apps = allApps.slice(0, 5);
  const isNew = s.resumes === 0 && s.applications === 0;
  const activeApps = allApps.filter(a => a.status === 'applied' || a.status === 'interview').length;
  const resumeScore = Storage.getResumes()[0]?.analysis?.strength_score ?? null;

  UI.render(`
    <section class="hero">
      <div class="hero-grid">
        <div class="hero-copy">
          <div class="hero-eyebrow">Same You. New Possibilities. <span>A Brighter Tomorrow.</span></div>
          <h1>Your Next Career Move<br><span class="accent">Starts Here.</span></h1>
          <p>Analyze. Improve. Prepare. Apply smarter. All in one place, with the power of AI.</p>
          <div class="btn-row" style="margin-top:22px">
            <button class="btn btn-lg" id="heroPreHired">${UI.icon('bolt', 18)} PreHired — Get Application-Ready</button>
            <button class="btn-ghost btn-lg" id="heroGetStarted">Get Started &rarr;</button>
          </div>
          <div class="hero-fine">It's free to begin. No credit card required.</div>
        </div>
        <div class="hero-visual">
          <img src="img/01_hero_homepage.jpg" alt="HirePilot: plan, prepare, and get hired with AI-powered career tools" loading="lazy">
        </div>
      </div>

      <div class="hero-strip">
        <div class="hero-strip-item">
          ${UI.icon('doc')}
          <div><strong>AI-Powered Tools</strong><span>Resume, JD, cover letter &amp; more</span></div>
        </div>
        <div class="hero-strip-item">
          ${UI.icon('bars')}
          <div><strong>Real-World Insights</strong><span>Role fit, skills gap, interview prep</span></div>
        </div>
        <div class="hero-strip-item">
          ${UI.icon('user')}
          <div><strong>For Every Career Stage</strong><span>Students, professionals, career switchers</span></div>
        </div>
        <div class="hero-strip-item">
          ${UI.icon('bolt')}
          <div><strong>Built for Your Next Step</strong><span>Plan. Prepare. Get Hired.</span></div>
        </div>
      </div>
    </section>

    ${UI.panel('Career Progress', `
      <div class="progress-lines">
        <div class="progress-line">
          <span class="pl-label">Resume Strength</span>
          <div class="bar"><span style="width:${resumeScore ?? 0}%"></span></div>
          <span class="pl-value">${resumeScore ?? '—'}</span>
        </div>
        <div class="progress-line">
          <span class="pl-label">Applications</span>
          <span class="pl-value-text">${s.applications ? `${s.applications} tracked · ${activeApps} active` : 'None yet'}</span>
        </div>
        <div class="progress-line">
          <span class="pl-label">Interviews</span>
          <span class="pl-value-text">${s.interviews ? `${s.interviews} completed · avg ${s.avgInterviewScore}/100` : 'None yet'}</span>
        </div>
      </div>
    `)}

    <div class="panel">
      <h2>What would you like to do?</h2>
      <div class="quick-actions">
        <button class="quick-action" data-go="resume">
          <span class="qa-icon">${UI.icon('doc')}</span>
          <div><strong>Analyze Resume</strong><span>Skills, ATS score, gaps</span></div>
        </button>
        <button class="quick-action" data-go="jd">
          <span class="qa-icon">${UI.icon('target')}</span>
          <div><strong>Analyze a Job</strong><span>See your fit score</span></div>
        </button>
        <button class="quick-action" data-go="interview">
          <span class="qa-icon">${UI.icon('chat')}</span>
          <div><strong>Prepare for Interview</strong><span>5 questions, real feedback</span></div>
        </button>
      </div>
      <button class="more-tools" id="moreToolsBtn">More tools &rarr;</button>
    </div>

    ${UI.panel('Recent Applications', apps.length ? `
      <div class="table-wrap"><table>
        <thead>
          <tr><th>Role</th><th>Company</th><th>Match</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${apps.map(a => `
            <tr>
              <td>${UI.escape(a.jobTitle || 'Untitled')}</td>
              <td>${UI.escape(a.company || '—')}</td>
              <td style="font-family:var(--mono);color:var(--navy)">
                ${a.matchScore != null ? a.matchScore + '%' : '—'}
              </td>
              <td><span class="badge ${a.status}">${a.status}</span></td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    ` : `
      <div class="empty-cta">
        <p class="muted">No activity yet. Start with your resume or a job.</p>
        <button class="btn" data-go="resume">Analyze Resume</button>
      </div>
    `)}
  `);

  document.getElementById('heroGetStarted')
    ?.addEventListener('click', () => App.go(isNew ? 'resume' : 'jd'));

  document.getElementById('heroPreHired')
    ?.addEventListener('click', () => App.go('prehired'));

  document.querySelectorAll('[data-go]').forEach(btn => {
    btn.addEventListener('click', () => App.go(btn.dataset.go));
  });

  document.getElementById('moreToolsBtn')
    ?.addEventListener('click', () => App.openDrawer());
},


/* ============================================================
   01 — RESUME ANALYZER
   Upload a resume, get skills / ATS score / grammar / keywords.
   ============================================================ */
resume() {
  const saved = Storage.getResumes();

  UI.render(`
    ${UI.moduleHead('resume')}

    <div class="split" style="margin-bottom:18px">
      ${UI.panel('Upload', `
        ${UI.drop('resumeFile')}
        <label for="resumeText">Or paste your resume text</label>
        <textarea id="resumeText" placeholder="Paste the full text of your resume..."></textarea>
        <div class="btn-row">
          <button class="btn" id="analyzeBtn">Analyze Resume</button>
        </div>
      `)}
      ${UI.visual('img/02_resume_analysis.jpg', 'A resume analysis in progress, with a green "Great Start!" check', 'Skills, ATS score, grammar, and missing keywords — in one pass.', true)}
    </div>

    <div id="resumeResult"></div>

    ${saved.length ? UI.panel('Saved Resumes', `
      <div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Date</th><th>Strength</th><th></th></tr></thead>
        <tbody>
          ${saved.map(r => `
            <tr>
              <td>${UI.escape(r.name || 'Resume')}</td>
              <td class="muted">${UI.date(r.createdAt)}</td>
              <td style="font-family:var(--mono);color:var(--amber)">
                ${r.analysis?.strength_score ?? '—'}
              </td>
              <td><button class="btn-ghost" data-del-resume="${r.id}">Delete</button></td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    `) : ''}
  `);

  // --- wire up the file picker ---
  const fileInput = document.getElementById('resumeFile');
  fileInput?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      UI.toast('Reading file...');
      const text = await Parser.extract(file);
      document.getElementById('resumeText').value = text;
      UI.toast(`Loaded ${file.name} (${text.length} characters)`, 'ok');
    } catch (err) {
      UI.toast(err.message, 'err');
    }
  });

  UI.busyClick(document.getElementById('analyzeBtn'), 'Analyzing...', () => this.runResume());

  // delete buttons
  document.querySelectorAll('[data-del-resume]').forEach(btn => {
    btn.addEventListener('click', () => {
      Storage.deleteResume(btn.dataset.delResume);
      this.resume();
      UI.toast('Resume deleted', 'ok');
    });
  });
},

async runResume() {
  const text = document.getElementById('resumeText').value.trim();
  const out  = document.getElementById('resumeResult');

  if (text.length < 100) {
    UI.toast('Please provide at least 100 characters of resume text.', 'err');
    return;
  }

  out.innerHTML = UI.loading('Analyzing resume');

  try {
    const r = await AIActions.analyzeResume(text);

    out.innerHTML = `
      <div class="grid grid-3" style="margin-bottom:18px">
        ${UI.panel('', UI.score(r.strength_score, 'Resume Strength'))}
        ${UI.panel('', UI.score(r.ats_score, 'ATS Compatibility', true))}
        ${UI.panel('', `
          <div class="stat-label">Experience Level</div>
          <div class="stat-value" style="font-size:21px;text-transform:capitalize">
            ${UI.escape(r.experience_level || '—')}
          </div>
          <p class="muted" style="margin-top:8px">
            ${UI.escape(r.years_experience || 0)} years
          </p>
        `)}
      </div>

      <div class="grid grid-2">
        ${UI.panel('Skills Detected', UI.tags(r.skills, 'good'))}
        ${UI.panel('Missing Keywords', UI.tags(r.missing_keywords, 'miss'))}
      </div>

      <div class="grid grid-2">
        ${UI.panel('Strengths', UI.list(r.strengths, 'cyan'))}
        ${UI.panel('Improvements', UI.list(r.improvements))}
      </div>

      <div class="grid grid-2">
        ${UI.panel('ATS Issues', UI.list(r.ats_issues, 'red'))}
        ${UI.panel('Grammar & Formatting', UI.list(r.grammar_issues, 'red'))}
      </div>

      ${r.certifications?.length
        ? UI.panel('Certifications', UI.tags(r.certifications, 'good'))
        : ''}
    `;

    Storage.addResume({
      name: r.candidate_name && r.candidate_name !== 'Unknown'
        ? `${r.candidate_name} — Resume`
        : 'Resume',
      text,
      analysis: r,
    });

    UI.toast('Analysis complete and saved.', 'ok');

  } catch (err) {
    out.innerHTML = '';
    UI.toast(err.message, 'err');
  }
},


/* ============================================================
   02 — JOB DESCRIPTION ANALYZER
   Paste a JD, extract requirements, score the match.
   ============================================================ */
jd() {
  const resumes = Storage.getResumes();

  UI.render(`
    ${UI.moduleHead('jd')}

    <div class="split" style="margin-bottom:18px">
      ${!resumes.length ? UI.panel('', UI.empty(
        'Analyze a resume first (Module 01). The match score needs something to compare against.'
      )) : UI.panel('Job Description', `
        <label for="jdResume">Compare against</label>
        <select id="jdResume">
          ${resumes.map(r =>
            `<option value="${r.id}">${UI.escape(r.name)} — ${UI.date(r.createdAt)}</option>`
          ).join('')}
        </select>

        <div class="grid grid-2" style="margin-top:4px">
          <div>
            <label for="jdTitle">Job Title</label>
            <input type="text" id="jdTitle" placeholder="Senior Backend Engineer">
          </div>
          <div>
            <label for="jdCompany">Company</label>
            <input type="text" id="jdCompany" placeholder="Acme Corp">
          </div>
        </div>

        <label for="jdText">Job Description</label>
        <textarea id="jdText" placeholder="Paste the full job posting here..."></textarea>

        <div class="btn-row">
          <button class="btn" id="jdBtn">Analyze & Match</button>
        </div>
      `)}
      ${UI.visual('img/03_jd_analysis.jpg', 'Finding your match against a job description', 'See required vs. preferred skills, and exactly what you\'re missing.', true)}
    </div>

    <div id="jdResult"></div>
  `);

  UI.busyClick(document.getElementById('jdBtn'), 'Analyzing...', () => this.runJD());
},

async runJD() {
  const resumeId = document.getElementById('jdResume').value;
  const jdText   = document.getElementById('jdText').value.trim();
  const title    = document.getElementById('jdTitle').value.trim();
  const company  = document.getElementById('jdCompany').value.trim();
  const out      = document.getElementById('jdResult');

  if (jdText.length < 100) {
    UI.toast('Please paste at least 100 characters of the job description.', 'err');
    return;
  }

  const resume = Storage.getResume(resumeId);
  if (!resume) { UI.toast('Could not find that resume.', 'err'); return; }

  out.innerHTML = UI.loading('Comparing resume against job description');

  try {
    const r = await AIActions.matchResumeToJD(resume.text, jdText);

    out.innerHTML = `
      <div class="grid grid-2" style="margin-bottom:18px">
        ${UI.panel('', `
          ${UI.score(r.match_percentage, 'Match Score')}
          <p class="muted" style="margin-top:12px">${UI.escape(r.verdict || '')}</p>
        `)}
        ${UI.panel('Role Requirements', `
          <p class="muted"><strong>Experience:</strong> ${UI.escape(r.experience_required || '—')}</p>
          <div style="margin-top:10px">
            <div class="stat-label">Certifications</div>
            ${UI.tags(r.certifications_required)}
          </div>
        `)}
      </div>

      <div class="grid grid-2">
        ${UI.panel('You Have', UI.tags(r.matched_skills, 'good'))}
        ${UI.panel('You Are Missing', UI.tags(r.missing_skills, 'miss'))}
      </div>

      <div class="grid grid-2">
        ${UI.panel('Required Skills', UI.tags(r.required_skills))}
        ${UI.panel('Preferred Skills', UI.tags(r.preferred_skills))}
      </div>

      ${UI.panel('Key Responsibilities', UI.list(r.key_responsibilities))}
      ${UI.panel('Priority Fixes', UI.list(r.priority_fixes, 'cyan'))}
    `;

    Storage.addApplication({
      jobTitle: title || 'Untitled Role',
      company: company || 'Unknown',
      jdText,
      resumeId,
      matchScore: r.match_percentage,
      analysis: r,
    });

    UI.toast('Match complete. Added to your Job Tracker.', 'ok');

  } catch (err) {
    out.innerHTML = '';
    UI.toast(err.message, 'err');
  }
},


/* ============================================================
   03 — RESUME OPTIMIZER
   Improve wording. Never invent experience.
   ============================================================ */
optimizer() {
  const resumes = Storage.getResumes();
  const apps    = Storage.getApplications();

  UI.render(`
    ${UI.moduleHead('optimizer')}

    ${UI.panel('', `
      <div class="notice" style="border-left-color:var(--amber);margin-top:0">
        This tool never invents experience, skills, or certifications. It only
        rewords and reorganises what is already in your resume. If it ever
        suggests something you have not done, do not use it.
      </div>
    `)}

    <div class="split" style="margin-bottom:18px">
      ${!resumes.length || !apps.length ? UI.panel('', UI.empty(
        'You need one analyzed resume (Module 01) and one job description (Module 02) first.'
      )) : UI.panel('Optimize', `
        <label for="optResume">Resume</label>
        <select id="optResume">
          ${resumes.map(r => `<option value="${r.id}">${UI.escape(r.name)}</option>`).join('')}
        </select>

        <label for="optJob">Target job</label>
        <select id="optJob">
          ${apps.map(a => `
            <option value="${a.id}">
              ${UI.escape(a.jobTitle)} — ${UI.escape(a.company)}
            </option>`).join('')}
        </select>

        <div class="btn-row">
          <button class="btn" id="optBtn">Generate Optimized Version</button>
        </div>
      `)}
      ${UI.visual('img/04_resume_optimizer.jpg', 'A resume optimized for more impact, ATS-friendly keywords, and visibility', 'Stronger bullets, better keywords — never invented experience.')}
    </div>

    <div id="optResult"></div>
  `);

  UI.busyClick(document.getElementById('optBtn'), 'Optimizing...', () => this.runOptimizer());
},

async runOptimizer() {
  const resume = Storage.getResume(document.getElementById('optResume').value);
  const app    = Storage.getApplications()
                  .find(a => a.id === document.getElementById('optJob').value);
  const out    = document.getElementById('optResult');

  if (!resume || !app) { UI.toast('Selection not found.', 'err'); return; }

  out.innerHTML = UI.loading('Rewriting for this role');

  try {
    const r = await AIActions.optimizeResume(resume.text, app.jdText);

    out.innerHTML = `
      ${UI.panel('Tailored Summary', `
        <p style="font-size:14.5px;line-height:1.7">${UI.escape(r.tailored_summary || '')}</p>
      `)}

      ${UI.panel('Rewritten Bullets', (r.improved_bullets || []).length
        ? (r.improved_bullets).map(b => `
          <div style="padding:16px 0;border-bottom:1px solid var(--line)">
            <div class="stat-label">Before</div>
            <p class="muted" style="margin-bottom:10px">${UI.escape(b.original)}</p>
            <div class="stat-label">After</div>
            <p style="color:var(--cyan);margin-bottom:8px">${UI.escape(b.improved)}</p>
            <p class="muted" style="font-size:12.5px">${UI.escape(b.why)}</p>
          </div>`).join('')
        : UI.empty('No bullet rewrites suggested.'))}

      <div class="grid grid-2">
        ${UI.panel('Keywords to Add', UI.tags(r.keywords_to_add, 'good'))}
        ${UI.panel('Skills You Likely Have', UI.tags(r.skills_to_add, 'good'))}
      </div>

      ${UI.panel('Add Numbers Here', UI.list(r.quantify_opportunities))}
      ${UI.panel('Structural Changes', UI.list(r.reorder_advice, 'cyan'))}
    `;

    UI.toast('Optimization complete.', 'ok');

  } catch (err) {
    out.innerHTML = '';
    UI.toast(err.message, 'err');
  }
},


/* ============================================================
   04 — LINKEDIN OPTIMIZER
   ============================================================ */
linkedin() {
  const apps = Storage.getApplications();

  UI.render(`
    ${UI.moduleHead('linkedin')}

    <div class="split" style="margin-bottom:18px">
      ${UI.panel('Your Profile', `
        <p class="muted" style="margin-bottom:14px">
          Copy your headline, About section, and experience descriptions from
          LinkedIn and paste them below.
        </p>

        <label for="liText">Profile content</label>
        <textarea id="liText" placeholder="Headline: ...&#10;&#10;About: ...&#10;&#10;Experience: ..."></textarea>

        ${apps.length ? `
          <label for="liJob">Optionally target a specific job</label>
          <select id="liJob">
            <option value="">General optimization</option>
            ${apps.map(a => `
              <option value="${a.id}">
                ${UI.escape(a.jobTitle)} — ${UI.escape(a.company)}
              </option>`).join('')}
          </select>` : ''}

        <div class="btn-row">
          <button class="btn" id="liBtn">Optimize Profile</button>
        </div>
      `)}
      ${UI.visual('img/05_linkedin_optimizer.jpg', 'Standing out on LinkedIn with a stronger profile and headlines', 'Better headlines, stronger profile, more recruiter visibility.')}
    </div>

    <div id="liResult"></div>
  `);

  UI.busyClick(document.getElementById('liBtn'), 'Reviewing...', () => this.runLinkedIn());
},

async runLinkedIn() {
  const text  = document.getElementById('liText').value.trim();
  const jobId = document.getElementById('liJob')?.value;
  const out   = document.getElementById('liResult');

  if (text.length < 80) {
    UI.toast('Please paste at least 80 characters from your profile.', 'err');
    return;
  }

  out.innerHTML = UI.loading('Reviewing profile');

  const app = jobId ? Storage.getApplications().find(a => a.id === jobId) : null;

  const system = `You are a LinkedIn strategist who understands recruiter search.

Recruiters find candidates through keyword search. A profile succeeds when it
contains the terms recruiters actually type. Judge this profile on that basis.

Respond with ONLY a JSON object in this exact shape:
{
  "visibility_score": number 0-100,
  "headline_suggestions": ["3 rewritten headlines, each under 220 characters"],
  "about_feedback": ["specific problems with the About section"],
  "about_rewrite": "a rewritten About section, first person, 3-4 short paragraphs",
  "experience_feedback": ["how to improve the experience descriptions"],
  "keywords_to_add": ["search terms recruiters use that are missing"],
  "skills_to_list": ["skills to add to the Skills section"],
  "quick_wins": ["small changes with outsized impact"]
}
Never invent experience. Work only with what the profile states.`;

  const user = app
    ? `PROFILE:\n${text}\n\n---\n\nTARGET JOB:\n${app.jdText}`
    : `PROFILE:\n${text}`;

  try {
    const r = await API.ask(system, user);

    out.innerHTML = `
      ${UI.panel('', UI.score(r.visibility_score, 'Recruiter Visibility', true))}

      ${UI.panel('Headline Options', (r.headline_suggestions || []).map((h, i) => `
        <div style="padding:12px 0;border-bottom:1px solid var(--line)">
          <div class="stat-label">Option ${i + 1}</div>
          <p style="color:var(--cyan)">${UI.escape(h)}</p>
        </div>`).join('') || UI.empty('None suggested.'))}

      ${UI.panel('Rewritten About Section', `
        <p style="white-space:pre-wrap;line-height:1.75">${UI.escape(r.about_rewrite || '')}</p>
      `)}

      <div class="grid grid-2">
        ${UI.panel('About: What to Fix', UI.list(r.about_feedback))}
        ${UI.panel('Experience: What to Fix', UI.list(r.experience_feedback))}
      </div>

      <div class="grid grid-2">
        ${UI.panel('Keywords to Add', UI.tags(r.keywords_to_add, 'good'))}
        ${UI.panel('Skills to List', UI.tags(r.skills_to_list, 'good'))}
      </div>

      ${UI.panel('Quick Wins', UI.list(r.quick_wins, 'cyan'))}
    `;

    UI.toast('Profile review complete.', 'ok');

  } catch (err) {
    out.innerHTML = '';
    UI.toast(err.message, 'err');
  }
},


/* ============================================================
   05 — COVER LETTER GENERATOR
   ============================================================ */
cover() {
  const resumes = Storage.getResumes();
  const apps    = Storage.getApplications();

  UI.render(`
    ${UI.moduleHead('cover')}

    <div class="split" style="margin-bottom:18px">
      ${!resumes.length || !apps.length ? UI.panel('', UI.empty(
        'You need one analyzed resume and one job description first.'
      )) : UI.panel('Generate', `
        <label for="clResume">Resume</label>
        <select id="clResume">
          ${resumes.map(r => `<option value="${r.id}">${UI.escape(r.name)}</option>`).join('')}
        </select>

        <label for="clJob">Job</label>
        <select id="clJob">
          ${apps.map(a => `
            <option value="${a.id}">
              ${UI.escape(a.jobTitle)} — ${UI.escape(a.company)}
            </option>`).join('')}
        </select>

        <label for="clTone">Tone</label>
        <select id="clTone">
          <option value="professional">Professional</option>
          <option value="conversational">Conversational</option>
          <option value="enthusiastic">Enthusiastic</option>
          <option value="concise">Concise and direct</option>
        </select>

        <div class="btn-row">
          <button class="btn" id="clBtn">Write Cover Letter</button>
        </div>
      `)}
      ${UI.visual('img/06_cover_letter.jpg', 'Writing a personalized, professional, impactful cover letter', 'Personalized to one specific role — never generic.')}
    </div>

    <div id="clResult"></div>
  `);

  UI.busyClick(document.getElementById('clBtn'), 'Writing...', () => this.runCover());
},

async runCover() {
  const resume = Storage.getResume(document.getElementById('clResume').value);
  const app    = Storage.getApplications()
                  .find(a => a.id === document.getElementById('clJob').value);
  const tone   = document.getElementById('clTone').value;
  const out    = document.getElementById('clResult');

  if (!resume || !app) { UI.toast('Selection not found.', 'err'); return; }

  out.innerHTML = UI.loading('Writing cover letter');

  const system = `You write cover letters that sound like a real person, not a template.

Rules:
- Never invent experience, employers, or achievements.
- No opening cliches ("I am writing to express my interest").
- Connect specific resume experience to specific job requirements.
- Three to four short paragraphs.
- Tone requested: ${tone}

Respond with ONLY a JSON object in this exact shape:
{
  "letter": "the full cover letter text, with \\n\\n between paragraphs",
  "opening_alternatives": ["2 other ways to open"],
  "notes": ["what to personalise before sending, e.g. hiring manager name"]
}`;

  try {
    const r = await API.ask(system,
      `RESUME:\n${resume.text}\n\n---\n\nJOB (${app.jobTitle} at ${app.company}):\n${app.jdText}`);

    out.innerHTML = `
      ${UI.panel('Your Cover Letter', `
        <div style="white-space:pre-wrap;line-height:1.8;font-size:14.5px">
          ${UI.escape(r.letter || '')}
        </div>
        <div class="btn-row">
          <button class="btn-ghost" id="copyLetter">Copy to Clipboard</button>
        </div>
      `)}

      ${UI.panel('Other Openings', UI.list(r.opening_alternatives, 'cyan'))}
      ${UI.panel('Before You Send', UI.list(r.notes))}
    `;

    document.getElementById('copyLetter')?.addEventListener('click', () => {
      navigator.clipboard.writeText(r.letter || '');
      UI.toast('Copied to clipboard.', 'ok');
    });

    UI.toast('Cover letter ready.', 'ok');

  } catch (err) {
    out.innerHTML = '';
    UI.toast(err.message, 'err');
  }
},


/* ============================================================
   06 + 07 — MOCK INTERVIEW with AI FEEDBACK
   Two features in one flow: ask questions, then score the answers.
   ============================================================ */

// Holds the state of an in-progress interview.
_interview: null,

interview() {
  const resumes = Storage.getResumes();
  const apps    = Storage.getApplications();
  const past    = Storage.getInterviews();

  UI.render(`
    ${UI.moduleHead('interview')}

    <div class="split" style="margin-bottom:18px">
      ${!resumes.length ? UI.panel('', UI.empty(
        'Analyze a resume first so the questions can be based on your background.'
      )) : UI.panel('Set Up', `
        <label for="ivResume">Resume</label>
        <select id="ivResume">
          ${resumes.map(r => `<option value="${r.id}">${UI.escape(r.name)}</option>`).join('')}
        </select>

        ${apps.length ? `
          <label for="ivJob">Target job (optional)</label>
          <select id="ivJob">
            <option value="">General interview</option>
            ${apps.map(a => `
              <option value="${a.id}">
                ${UI.escape(a.jobTitle)} — ${UI.escape(a.company)}
              </option>`).join('')}
          </select>` : ''}

        <label for="ivType">Interview type</label>
        <select id="ivType">
          ${CONFIG.INTERVIEW_TYPES.map(t =>
            `<option value="${t.id}">${t.label}</option>`).join('')}
        </select>

        <div class="btn-row">
          <button class="btn" id="ivStart">Start Interview</button>
        </div>
      `)}
      ${UI.visual('img/07_mock_interview.jpg', 'Practicing a mock interview to build confidence', 'Practice, get feedback, build confidence — before it counts.')}
    </div>

    <div id="ivArea"></div>

    ${past.length ? UI.panel('Past Interviews', `
      <div class="table-wrap"><table>
        <thead><tr><th>Type</th><th>Date</th><th>Score</th></tr></thead>
        <tbody>
          ${past.slice(0, 8).map(i => `
            <tr>
              <td style="text-transform:capitalize">${UI.escape(i.type)}</td>
              <td class="muted">${UI.date(i.createdAt)}</td>
              <td style="font-family:var(--mono);color:var(--amber)">${i.score}/100</td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    `) : ''}
  `);

  UI.busyClick(document.getElementById('ivStart'), 'Preparing...', () => this.startInterview());
},

async startInterview() {
  const resume = Storage.getResume(document.getElementById('ivResume').value);
  const jobId  = document.getElementById('ivJob')?.value;
  const type   = document.getElementById('ivType').value;
  const area   = document.getElementById('ivArea');

  if (!resume) { UI.toast('Select a resume.', 'err'); return; }

  area.innerHTML = UI.loading('Preparing questions');

  const app = jobId ? Storage.getApplications().find(a => a.id === jobId) : null;

  const typeGuide = {
    hr:         'screening questions about motivation, availability, salary expectations, and culture fit',
    technical:  'technical questions specific to the tools and technologies in the resume',
    managerial: 'questions about leadership, delegation, conflict, and decision-making',
    behavioral: 'STAR-format questions about past situations and how they were handled',
  }[type];

  const system = `You are an experienced interviewer conducting a ${type} interview.
Ask ${typeGuide}.
Base every question on the candidate's actual resume.

Respond with ONLY a JSON object in this exact shape:
{
  "questions": [
    { "question": "the question text", "looking_for": "what a strong answer contains" }
  ]
}
Provide exactly 5 questions.`;

  const user = app
    ? `RESUME:\n${resume.text}\n\n---\n\nJOB:\n${app.jdText}`
    : `RESUME:\n${resume.text}`;

  try {
    const r = await API.ask(system, user);

    this._interview = {
      type,
      resumeId: resume.id,
      questions: r.questions || [],
      answers: [],
      current: 0,
    };

    this.showQuestion();

  } catch (err) {
    area.innerHTML = '';
    UI.toast(err.message, 'err');
  }
},

showQuestion() {
  const iv = this._interview;
  const q  = iv.questions[iv.current];
  const area = document.getElementById('ivArea');

  area.innerHTML = UI.panel(`Question ${iv.current + 1} of ${iv.questions.length}`, `
    <div class="bar" style="margin-bottom:20px">
      <span style="width:${(iv.current / iv.questions.length) * 100}%"></span>
    </div>

    <p style="font-size:16px;line-height:1.65;margin-bottom:6px">
      ${UI.escape(q.question)}
    </p>

    <label for="ivAnswer">Your answer</label>
    <textarea id="ivAnswer" placeholder="Take your time. Aim for 3-6 sentences."></textarea>

    <div class="btn-row">
      <button class="btn" id="ivNext">
        ${iv.current === iv.questions.length - 1 ? 'Finish & Get Feedback' : 'Next Question'}
      </button>
    </div>
  `);

  UI.busyClick(document.getElementById('ivNext'), null, async () => {
    const answer = document.getElementById('ivAnswer').value.trim();
    if (answer.length < 20) {
      UI.toast('Give a fuller answer — at least 20 characters.', 'err');
      return;
    }

    iv.answers.push({ question: q.question, answer, looking_for: q.looking_for });
    iv.current++;

    if (iv.current < iv.questions.length) {
      this.showQuestion();
    } else {
      await this.gradeInterview();
    }
  });
},

async gradeInterview() {
  const iv   = this._interview;
  const area = document.getElementById('ivArea');

  area.innerHTML = UI.loading('Scoring your answers');

  const system = `You are an interview coach giving honest, useful feedback.

Score each answer on five dimensions, 0-100:
  communication   — clarity and structure
  confidence      — conviction without arrogance
  relevance       — did it actually answer the question
  technical_depth — substance and specificity
  star_usage      — Situation, Task, Action, Result structure

Be honest. Inflated scores help nobody.

Respond with ONLY a JSON object in this exact shape:
{
  "overall_score": number 0-100,
  "communication": number,
  "confidence": number,
  "relevance": number,
  "technical_depth": number,
  "star_usage": number,
  "strengths": ["what genuinely worked"],
  "improvements": ["specific things to do differently"],
  "per_question": [
    { "question": "...", "score": number, "feedback": "specific critique", "better_answer": "a stronger version of their answer using only their own content" }
  ]
}`;

  const transcript = iv.answers.map((a, i) =>
    `Q${i + 1}: ${a.question}\nLooking for: ${a.looking_for}\nAnswer: ${a.answer}`
  ).join('\n\n');

  try {
    const r = await API.ask(system, transcript);

    area.innerHTML = `
      ${UI.panel('Overall', UI.score(r.overall_score, 'Interview Score'))}

      <div class="grid grid-3" style="margin-bottom:18px">
        ${UI.panel('', UI.score(r.communication, 'Communication', true))}
        ${UI.panel('', UI.score(r.confidence, 'Confidence', true))}
        ${UI.panel('', UI.score(r.relevance, 'Relevance', true))}
      </div>
      <div class="grid grid-2">
        ${UI.panel('', UI.score(r.technical_depth, 'Technical Depth'))}
        ${UI.panel('', UI.score(r.star_usage, 'STAR Method'))}
      </div>

      <div class="grid grid-2">
        ${UI.panel('What Worked', UI.list(r.strengths, 'cyan'))}
        ${UI.panel('What to Change', UI.list(r.improvements))}
      </div>

      ${UI.panel('Question by Question', (r.per_question || []).map((p, i) => `
        <div style="padding:18px 0;border-bottom:1px solid var(--line)">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
            <strong style="font-size:14px">Q${i + 1}</strong>
            <span style="font-family:var(--mono);color:var(--amber)">${p.score}/100</span>
          </div>
          <p class="muted" style="margin:8px 0">${UI.escape(p.question)}</p>
          <p style="margin-bottom:10px">${UI.escape(p.feedback)}</p>
          <div class="stat-label">Stronger version</div>
          <p style="color:var(--cyan);font-size:13.5px">${UI.escape(p.better_answer || '')}</p>
        </div>`).join(''))}

      <div class="btn-row">
        <button class="btn" id="ivAgain">New Interview</button>
      </div>
    `;

    Storage.addInterview({
      type: iv.type,
      score: r.overall_score,
      resumeId: iv.resumeId,
      feedback: r,
    });

    document.getElementById('ivAgain')
      ?.addEventListener('click', () => this.interview());

    UI.toast('Interview scored and saved.', 'ok');

  } catch (err) {
    area.innerHTML = '';
    UI.toast(err.message, 'err');
  }
},


/* ============================================================
   08 — CAREER GAP ANALYSIS
   ============================================================ */
gap() {
  const resumes = Storage.getResumes();
  const apps    = Storage.getApplications();

  UI.render(`
    ${UI.moduleHead('gap')}

    <div class="split" style="margin-bottom:18px">
      ${!resumes.length || !apps.length ? UI.panel('', UI.empty(
        'You need one analyzed resume and one job description first.'
      )) : UI.panel('Analyze', `
        <label for="gapResume">Resume</label>
        <select id="gapResume">
          ${resumes.map(r => `<option value="${r.id}">${UI.escape(r.name)}</option>`).join('')}
        </select>

        <label for="gapJob">Target role</label>
        <select id="gapJob">
          ${apps.map(a => `
            <option value="${a.id}">
              ${UI.escape(a.jobTitle)} — ${UI.escape(a.company)}
            </option>`).join('')}
        </select>

        <div class="btn-row">
          <button class="btn" id="gapBtn">Analyze Gap</button>
        </div>
      `)}
      ${UI.visual('img/08_career_gap.jpg', 'Explaining a career gap and reframing it as growth', 'Explain. Reframe. Show growth — with a realistic roadmap.')}
    </div>

    <div id="gapResult"></div>
  `);

  UI.busyClick(document.getElementById('gapBtn'), 'Mapping...', () => this.runGap());
},

async runGap() {
  const resume = Storage.getResume(document.getElementById('gapResume').value);
  const app    = Storage.getApplications()
                  .find(a => a.id === document.getElementById('gapJob').value);
  const out    = document.getElementById('gapResult');

  if (!resume || !app) { UI.toast('Selection not found.', 'err'); return; }

  out.innerHTML = UI.loading('Mapping the gap');

  const system = `You are a career development advisor.

Compare what the candidate has against what the role demands, then build a
realistic learning plan. Prefer free and low-cost resources.

Respond with ONLY a JSON object in this exact shape:
{
  "readiness_score": number 0-100,
  "readiness_verdict": "one honest sentence",
  "skills_have": ["relevant skills the candidate already has"],
  "skills_needed": ["skills the role requires that are missing"],
  "certifications_missing": ["certifications worth getting for this role"],
  "roadmap": [
    {
      "phase": "e.g. Weeks 1-4",
      "focus": "what to learn in this phase",
      "actions": ["concrete steps"],
      "resources": ["specific free or cheap resources"]
    }
  ],
  "quick_wins": ["things achievable in under a week that move the needle"],
  "time_estimate": "realistic total time to become competitive"
}`;

  try {
    const raw = await API.ask(system,
      `RESUME:\n${resume.text}\n\n---\n\nTARGET ROLE:\n${app.jdText}`);
    // Model responses occasionally drift from the requested shape
    // (an object instead of a bare string, {phases:[...]} instead of
    // a bare roadmap array) — normalize before rendering so that
    // shows as readable text or a real empty state, never
    // "[object Object]" or a false "no data" message. See
    // gapToText/gapToStringArray/gapNormalizeRoadmap above.
    const r = {
      readiness_score: raw?.readiness_score,
      readiness_verdict: gapToText(raw?.readiness_verdict),
      time_estimate: gapToText(raw?.time_estimate),
      skills_have: gapToStringArray(raw?.skills_have),
      skills_needed: gapToStringArray(raw?.skills_needed),
      certifications_missing: gapToStringArray(raw?.certifications_missing),
      roadmap: gapNormalizeRoadmap(raw?.roadmap),
      quick_wins: gapToStringArray(raw?.quick_wins),
    };

    out.innerHTML = `
      ${UI.panel('', `
        ${UI.score(r.readiness_score, 'Readiness for this role')}
        <p class="muted" style="margin-top:12px">${UI.escape(r.readiness_verdict)}</p>
        <p class="muted" style="margin-top:6px">
          <strong>Estimated time to competitive:</strong> ${UI.escape(r.time_estimate || '—')}
        </p>
      `)}

      <div class="grid grid-2">
        ${UI.panel('Skills You Have', UI.tags(r.skills_have, 'good'))}
        ${UI.panel('Skills You Need', UI.tags(r.skills_needed, 'miss'))}
      </div>

      ${UI.panel('Certifications Worth Getting', UI.list(r.certifications_missing))}

      ${UI.panel('Learning Roadmap', r.roadmap.map(p => `
        <div style="padding:18px 0;border-bottom:1px solid var(--line)">
          <div class="eyebrow">${UI.escape(p.phase)}</div>
          <h3>${UI.escape(p.focus)}</h3>
          ${UI.list(p.actions, 'cyan')}
          <div class="stat-label" style="margin-top:12px">Resources</div>
          ${UI.tags(p.resources)}
        </div>`).join('') || UI.empty('No roadmap generated.'))}

      ${UI.panel('Quick Wins', UI.list(r.quick_wins, 'cyan'))}
    `;

    UI.toast('Gap analysis complete.', 'ok');

  } catch (err) {
    out.innerHTML = '';
    UI.toast(err.message, 'err');
  }
},


/* ============================================================
   09 — RECRUITER VIEW
   ============================================================ */
recruiter() {
  const resumes = Storage.getResumes();
  const apps    = Storage.getApplications();

  UI.render(`
    ${UI.moduleHead('recruiter')}

    <div class="split" style="margin-bottom:18px">
      ${!resumes.length ? UI.panel('', UI.empty('Analyze a resume first.'))
        : UI.panel('Analyze', `
        <label for="recResume">Resume</label>
        <select id="recResume">
          ${resumes.map(r => `<option value="${r.id}">${UI.escape(r.name)}</option>`).join('')}
        </select>

        ${apps.length ? `
          <label for="recJob">Reviewing for (optional)</label>
          <select id="recJob">
            <option value="">General review</option>
            ${apps.map(a => `
              <option value="${a.id}">
                ${UI.escape(a.jobTitle)} — ${UI.escape(a.company)}
              </option>`).join('')}
          </select>` : ''}

        <div class="btn-row">
          <button class="btn" id="recBtn">See Recruiter View</button>
        </div>
      `)}
      ${UI.visual('img/09_recruiter_view.jpg', 'Seeing your resume through a recruiter\'s lens', 'Insights, expectations, and how to improve your chances.', true)}
    </div>

    <div id="recResult"></div>
  `);

  UI.busyClick(document.getElementById('recBtn'), 'Reading...', () => this.runRecruiter());
},

async runRecruiter() {
  const resume = Storage.getResume(document.getElementById('recResume').value);
  const jobId  = document.getElementById('recJob')?.value;
  const out    = document.getElementById('recResult');

  if (!resume) { UI.toast('Select a resume.', 'err'); return; }

  out.innerHTML = UI.loading('Reading as a recruiter would');

  const app = jobId ? Storage.getApplications().find(a => a.id === jobId) : null;

  const system = `You are a recruiter who screens hundreds of resumes a week.
You spend about 30 seconds on each one.

Be blunt. The candidate needs to know what you actually think, including
concerns they cannot see themselves. Do not soften genuine red flags — but
distinguish real problems from things that merely need explaining.

Respond with ONLY a JSON object in this exact shape:
{
  "first_impression": "your honest reaction in 2-3 sentences",
  "interview_likelihood": number 0-100,
  "strengths_noticed": ["what stands out positively"],
  "weaknesses_noticed": ["what weakens the application"],
  "red_flags": ["genuine concerns: gaps, job hopping, vagueness, mismatches"],
  "questions_they_would_ask": ["specific questions this resume invites"],
  "how_to_address": ["how to pre-empt or explain each concern"]
}`;

  const user = app
    ? `RESUME:\n${resume.text}\n\n---\n\nROLE BEING SCREENED FOR:\n${app.jdText}`
    : `RESUME:\n${resume.text}`;

  try {
    const r = await API.ask(system, user);

    out.innerHTML = `
      ${UI.panel('First Impression', `
        <p style="font-size:15px;line-height:1.7;margin-bottom:16px">
          ${UI.escape(r.first_impression || '')}
        </p>
        ${UI.score(r.interview_likelihood, 'Chance of an interview call')}
      `)}

      <div class="grid grid-2">
        ${UI.panel('What Stands Out', UI.list(r.strengths_noticed, 'cyan'))}
        ${UI.panel('What Weakens It', UI.list(r.weaknesses_noticed))}
      </div>

      ${UI.panel('Red Flags', UI.list(r.red_flags, 'red'))}
      ${UI.panel('How to Address Them', UI.list(r.how_to_address, 'cyan'))}
      ${UI.panel('Questions You Should Prepare For', UI.list(r.questions_they_would_ask))}
    `;

    UI.toast('Recruiter view complete.', 'ok');

  } catch (err) {
    out.innerHTML = '';
    UI.toast(err.message, 'err');
  }
},


/* ============================================================
   10 — JOB APPLICATION TRACKER
   No AI here. Just good record keeping.
   ============================================================ */
tracker() {
  const apps = Storage.getApplications();

  UI.render(`
    ${UI.moduleHead('tracker')}

    <div class="split split-compact" style="margin-bottom:18px">
      ${UI.panel('Add Application Manually', `
        <div class="grid grid-2">
          <div>
            <label for="trTitle">Job Title</label>
            <input type="text" id="trTitle" placeholder="Backend Engineer">
          </div>
          <div>
            <label for="trCompany">Company</label>
            <input type="text" id="trCompany" placeholder="Acme Corp">
          </div>
        </div>
        <label for="trNotes">Notes</label>
        <input type="text" id="trNotes" placeholder="Referred by Sam. Recruiter call on Friday.">
        <div class="btn-row">
          <button class="btn" id="trAdd">Add</button>
        </div>
      `)}
      ${UI.visual('img/10_job_tracker.jpg', 'Tracking every application, round, and outcome', 'Stay organized, monitor progress, never miss a follow-up.', true)}
    </div>

    ${UI.panel(`All Applications (${apps.length})`, apps.length ? `
      <div class="table-wrap"><table>
        <thead>
          <tr>
            <th>Role</th><th>Company</th><th>Match</th>
            <th>Status</th><th>Applied</th><th>Notes</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${apps.map(a => `
            <tr>
              <td>${UI.escape(a.jobTitle || 'Untitled')}</td>
              <td>${UI.escape(a.company || '—')}</td>
              <td style="font-family:var(--mono);color:var(--amber)">
                ${a.matchScore != null ? a.matchScore + '%' : '—'}
              </td>
              <td>
                <select data-status="${a.id}" aria-label="Status for ${UI.escape(a.jobTitle || 'Untitled')} at ${UI.escape(a.company || 'Unknown')}" style="padding:4px 8px;font-size:12px;width:auto">
                  ${CONFIG.STATUSES.map(s => `
                    <option value="${s}" ${a.status === s ? 'selected' : ''}>${s}</option>
                  `).join('')}
                </select>
              </td>
              <td class="muted">${UI.date(a.createdAt)}</td>
              <td class="muted">${UI.escape(UI.truncate(a.notes, 40))}</td>
              <td><button class="btn-ghost" data-del-app="${a.id}">Delete</button></td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    ` : UI.empty('No applications yet. Analyze a job description to add one automatically.'))}
  `);

  // Add manually
  document.getElementById('trAdd')?.addEventListener('click', () => {
    const title = document.getElementById('trTitle').value.trim();
    if (!title) { UI.toast('Enter a job title.', 'err'); return; }

    Storage.addApplication({
      jobTitle: title,
      company: document.getElementById('trCompany').value.trim() || 'Unknown',
      notes: document.getElementById('trNotes').value.trim(),
      jdText: '',
      matchScore: null,
    });

    this.tracker();
    UI.toast('Application added.', 'ok');
  });

  // Status dropdowns
  document.querySelectorAll('[data-status]').forEach(sel => {
    sel.addEventListener('change', () => {
      Storage.updateApplication(sel.dataset.status, { status: sel.value });
      this.tracker();
      UI.toast('Status updated.', 'ok');
    });
  });

  // Delete buttons
  document.querySelectorAll('[data-del-app]').forEach(btn => {
    btn.addEventListener('click', () => {
      Storage.deleteApplication(btn.dataset.delApp);
      this.tracker();
      UI.toast('Application removed.', 'ok');
    });
  });
},

};
