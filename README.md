# HirePilot AI

An AI-powered career platform: resume analysis, job matching, mock interviews,
and application tracking. Built with plain HTML, CSS, and JavaScript — no
bundler, no framework, no `npm install`. Supabase (via CDN) handles
accounts and the database; Groq handles the AI.

---

## What You Are Building

Nine tools, reached through the hamburger menu, plus a compact Home screen:

| Module | Feature | What it does |
|---|---------|--------------|
| — | Home | Your snapshot, quick actions, recent applications |
| 01 | Resume Analyzer | Skills, ATS score, grammar, missing keywords |
| 02 | JD Analyzer | Extracts requirements, scores your match |
| 03 | Resume Optimizer | Stronger bullets — never invents experience |
| 04 | LinkedIn Optimizer | Headline, About, recruiter visibility score |
| 05 | Cover Letter | Tailored to one specific job |
| 06 | Mock Interview | 5 questions built from your resume, then scored |
| 07 | Career Gap | Skills gap plus a learning roadmap |
| 08 | Recruiter View | What a recruiter notices, including red flags |
| 09 | Job Tracker | Applications, rounds, follow-ups, outcomes |

Users sign up, land on Home, and use any tool through the hamburger — no API
key required for normal use once mock mode is off and a backend AI proxy is
in place (see **Where This Still Falls Short of "Normal SaaS"** below; that
last piece isn't built yet).

---

## Step 1 — Run It Locally (5 minutes)

You need no tools installed for this step.

1. Keep the file structure as-is:

```
hirepilot-ai/
├── index.html
├── .gitignore
├── README.md
├── css/
│   └── style.css
├── img/                    the approved 3D visual assets
├── supabase/
│   ├── schema.sql          run this once in your Supabase project
│   └── README.md
└── js/
    ├── config.js            settings + AI_MODE toggle
    ├── supabase-client.js   your Project URL + anon key go here
    ├── auth.js              sign up / log in / log out / reset
    ├── storage.js            localStorage read/write (unchanged API)
    ├── cloud-sync.js         mirrors Storage's writes to Supabase
    ├── mock-ai.js            canned AI responses for mock mode
    ├── api.js                talks to Groq (or returns mock data)
    ├── parser.js             pulls text out of PDFs
    ├── ui.js                 reusable interface pieces
    ├── auth-ui.js            login/signup/reset screens
    ├── features.js           the nine tools + Home
    └── app.js                routing, drawer, auth gate — runs last
```

2. If you have Python installed:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. (On Windows: `python -m http.server 8000`.)
Double-clicking `index.html` directly also works, but a local server behaves
slightly more like production.

3. You'll land on a **Log In** screen — see Step 2.

---

## Step 2 — Set Up Supabase (10 minutes, one time)

Auth and your data live in Supabase. You need your own project.

1. Go to **supabase.com** → sign up → **New Project**. Note your **Project
   URL** and **anon/publishable key** (Settings → API).
2. Open **SQL Editor** → **New query**, paste the contents of
   `supabase/schema.sql`, and run it. This creates every table the app
   needs, each locked down with Row Level Security so a user can only ever
   see their own rows.
3. Paste your Project URL and anon key into `js/supabase-client.js`:

```javascript
const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-public-key';
```

The anon key is *designed* to be public — it's safe in frontend code. Row
Level Security (already in `schema.sql`) is what actually protects the data.
**Never** put a `service_role` key or your database password here.

4. Reload the app. You should see a **Sign Up** / **Log In** screen instead
   of Home. Create an account — you'll land on Home immediately.

If you skip this step, `SUPABASE_URL`/`SUPABASE_ANON_KEY` stay as
placeholders and the app runs exactly like it did before auth existed: no
login screen, local-only data. Nothing breaks either way.

---

## Step 3 — Test Without Spending AI Credits

The app has a **mock AI mode**: every AI call returns a realistic, canned
response instead of hitting Groq. No API key, no network call, no quota
spent.

Turn it on by adding `?aimode=mock` to the URL once — it's remembered
(via `localStorage`) until you turn it off:

```
http://localhost:8000/?aimode=mock
```

A **Mock Mode** badge appears in the header whenever it's active, so it's
never silently on. Turn it off with `?aimode=live`.

Do all your UI/UX/navigation/responsive testing in mock mode. Only switch to
live mode for a small, deliberate smoke test — see Step 4.

---

## Step 4 — Get Your Free Groq Key (for live-mode testing)

`?aimode=live` (the default) still calls Groq directly from the browser with
a key you paste into Settings. This is a known, temporary state — see
**Where This Still Falls Short of "Normal SaaS"** below.

1. Go to **console.groq.com**, sign up, **API Keys** → **Create API Key**.
2. In HirePilot, open the hamburger menu → **API Settings**, paste it, Save.

The app tests the key immediately — the status dot in the header turns
green. Free tier: roughly 14,400 requests/day, 30/minute — plenty for
testing your own app.

---

## Step 5 — Push to GitHub & Deploy

Same as any static site:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/hirepilot-ai.git
git push -u origin main
```

Then **Settings → Pages** on the repo → source: `main` branch, `/ (root)` →
Save. Live in about a minute at
`https://YOUR-USERNAME.github.io/hirepilot-ai/`.

Netlify (drag-and-drop) and Vercel work too — this is a plain static site,
no build step to configure on any of them.

**Before you share the link:** make sure `js/supabase-client.js` has your
real project's URL/anon key (not the placeholders) — otherwise everyone who
visits gets the no-auth local-only fallback instead of real accounts.

---

## How the Auth + Database Layer Works

- **`js/auth.js`** wraps Supabase Auth: sign up, log in, log out, password
  reset. Session persistence and restoring a session on page reload are
  handled by the Supabase client itself — it keeps its own token in
  `localStorage` under its own key, separate from anything HirePilot writes.
- **`js/app.js`** gates the whole app on `Auth`: signed out → `AuthUI.login()`
  and nothing else renders; signed in → the normal Home/drawer/tools. A
  background token refresh (Supabase does this periodically) is distinguished
  from a real sign-in/out, so it never yanks you back to Home mid-task.
- **`js/storage.js`** is untouched — every feature screen still calls
  `Storage.getResumes()`, `Storage.addApplication()`, etc. exactly as
  before, synchronously, reading/writing `localStorage`. No feature screen
  had to become async.
- **`js/cloud-sync.js`** is what makes that safe: it mirrors every write to
  Supabase in the background (fire-and-forget — the UI never waits on it),
  and on sign-in it hydrates the local cache from Supabase, so a returning
  user sees their real data. On sign-out, the local cache is wiped so the
  next person on a shared device doesn't inherit it.
- Row Level Security (in `schema.sql`) enforces ownership at the database
  level — even a hand-crafted, unfiltered query from the browser can only
  ever return the signed-in user's own rows.

---

## Where This Still Falls Short of "Normal SaaS"

Auth and the database are real. The AI call is not yet fully backend-only:

**Today:** `?aimode=live` still sends the user's own Groq key straight from
the browser to Groq (same as before auth existed). A user who wants live
results still has to paste a key into Settings.

**The remaining piece:** a server-side AI proxy (e.g. a Supabase Edge
Function) that holds the Groq key as a server secret, so the frontend calls
your own `/api/ai`-style endpoint and never touches a provider key at all.
That's the last step toward "sign in and use it" with zero configuration —
not yet built. See the in-repo conversation history (or ask) for the phased
plan; it's blocked on picking and standing up that backend, which needs to
be deployed and tested against a real endpoint before it can replace the
client-side Groq call.

---

## Security: Read This Before You Share Your Link

- **Supabase anon key** — safe in frontend code by design. RLS protects the
  data, not secrecy of this key.
- **Groq key** — each user pastes their own into Settings; it's stored only
  in their browser and sent only to Groq. Never put a Groq key in your
  source code or commit it — anyone can read anything shipped to the
  browser.
- **Never** put a Supabase `service_role` key or your database password in
  any frontend file. Only the anon/publishable key belongs in
  `supabase-client.js`.
- Mock mode makes zero external network calls of any kind — safe to leave
  on for demos where you don't want to touch anyone's real quota.

---

## Testing Checklist

**Auth**
- [ ] Sign up creates an account and lands on Home
- [ ] Log in works for a returning user
- [ ] Log out returns to the login screen
- [ ] Session survives a page refresh
- [ ] Password reset sends an email

**Setup**
- [ ] App loads with no console errors (F12)
- [ ] Mock Mode badge shows when `?aimode=mock` is set, hidden otherwise
- [ ] API Settings modal opens/closes; a bad Groq key shows a clear error

**Data**
- [ ] Resume/application/interview saved while signed in appears in
      Supabase (Table Editor)
- [ ] Signing in from a different browser/device shows the same data
- [ ] A second account never sees the first account's data

**Feature screens** (run each once in mock mode)
- [ ] Resume Analyzer, JD Analyzer, Optimizer, LinkedIn, Cover Letter,
      Mock Interview, Career Gap, Recruiter View, Job Tracker all produce
      results with no console errors

**Responsive**
- [ ] No horizontal overflow at 1440/1280/1024/768/430/375px
- [ ] Hamburger drawer opens/closes (X, backdrop click, ESC) at every size

### Browser console

Press **F12** → **Console**. Red text means an error worth chasing down —
these are the ones that bite later if ignored.

---

## How the Code Is Organised

```
config.js         Settings + AI_MODE (mock/live) toggle.
supabase-client.js  Your Project URL + anon key. Nothing else.
auth.js            Sign up / log in / log out / reset — wraps Supabase Auth.
storage.js         localStorage read/write. Public API never changes.
cloud-sync.js      Mirrors Storage's writes to Supabase in the background.
mock-ai.js         Canned responses for every AI call, keyed by prompt.
api.js             Talks to Groq, or returns mock-ai.js's response.
parser.js          Pulls text out of PDFs.
ui.js              Reusable interface pieces (panels, tags, score bars...).
auth-ui.js         Login / signup / reset-password screens.
features.js        The nine tools + Home. Each has render() + run().
app.js             Routing, the nav drawer, and the auth gate. Runs last.
```

Load order matters (see the `<script>` tags in `index.html`) — later files
depend on earlier ones being ready.

**The pattern each AI-backed feature follows:**

```javascript
featureName() {
  UI.render(`...the screen...`);
  document.getElementById('btn').addEventListener('click', () => this.runFeature());
},

async runFeature() {
  out.innerHTML = UI.loading('Working');
  const system = `...instructions for the AI...`;
  try {
    const r = await API.ask(system, userContent); // real or mock, transparently
    out.innerHTML = `...display r...`;
  } catch (err) {
    UI.toast(err.message, 'err');
  }
}
```

Once you understand one feature, you understand all nine.

---

## Common Problems

**Stuck on the login screen and I don't want auth yet**
Leave `SUPABASE_URL`/`SUPABASE_ANON_KEY` in `js/supabase-client.js` as the
placeholder strings — the app falls back to local-only mode automatically.

**"Sign-up is not available yet — Supabase isn't configured"**
You haven't pasted real credentials into `js/supabase-client.js` yet, or the
Supabase JS CDN script failed to load (check your connection/console).

**Signed up but nothing happens**
Check whether your Supabase project requires email confirmation
(Authentication → Providers → Email). If so, the toast will say to check
your inbox before logging in.

**My data isn't showing up on another device**
Confirm you're signed into the *same* account, and that
`supabase/schema.sql` was actually run in your project (Table Editor should
show `resumes`, `applications`, `job_analyses`, `interviews`, etc. with a
padlock icon next to each, meaning RLS is on).

**"No API key set" in live mode**
Open the hamburger → API Settings, paste your Groq key, Save. Or just use
mock mode (`?aimode=mock`) instead.

**PDF upload does nothing**
Check the console. If PDF.js failed to load, check your internet connection
— it loads from a CDN.

**Changes don't show up**
Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac). Browsers can
aggressively cache individual JS/CSS files even when the HTML page itself
reloads.

---

## Where to Take It Next

1. **Server-side AI proxy** — the one piece standing between this and a
   true zero-config SaaS experience (see above).
2. **`.docx` support** — add Mammoth.js (instructions in `parser.js`).
3. **Export to PDF** — add jsPDF, let users download optimized resumes.
4. **Save Career Gap / LinkedIn / Cover Letter results** — those three
   screens are display-only today; `schema.sql` already has
   `career_gaps`/`linkedin_reviews`/`cover_letters` tables ready for when
   that's built.
5. **Email reminders** — follow-up nudges on stale applications.

---

## A Note on the Optimizer

Modules 03, 04, and 05 write content for you. Every prompt explicitly forbids
inventing experience, but AI models sometimes drift.

**Read everything before you send it to an employer.** If the optimizer
produces a bullet describing something you did not do, delete it. A resume
that overstates your experience fails at the interview, and lying on an
application is grounds for withdrawing an offer.

The tool exists to make your real experience sound as strong as it actually
is. That's genuinely valuable. Keep it there.

---

## License

MIT — do whatever you like with it.
