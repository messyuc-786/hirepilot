# HirePilot AI

An AI-powered career platform: resume analysis, job matching, mock interviews,
and application tracking. Built with plain HTML, CSS, and JavaScript — no build
step, no framework, no npm install.

---

## What You Are Building

Ten features, all working from a single page:

| # | Feature | What it does |
|---|---------|--------------|
| 00 | Dashboard | Stats across everything you've done |
| 01 | Resume Analyzer | Skills, ATS score, grammar, missing keywords |
| 02 | JD Analyzer | Extracts requirements, scores your match |
| 03 | Resume Optimizer | Stronger bullets — never invents experience |
| 04 | LinkedIn Optimizer | Headline, About, recruiter visibility score |
| 05 | Cover Letter | Tailored to one specific job |
| 06 | Mock Interview | 5 questions built from your resume |
| 07 | AI Feedback | Scores communication, confidence, STAR usage |
| 08 | Career Gap | Skills gap plus a learning roadmap |
| 09 | Recruiter View | What a recruiter notices, including red flags |
| 10 | Job Tracker | Applications, rounds, follow-ups, outcomes |

---

## Step 1 — Run It Locally (5 minutes)

You need no tools installed for this step. None.

1. Put all the files in one folder, keeping the structure:

```
hirepilot-ai/
├── index.html
├── .gitignore
├── README.md
├── css/
│   └── style.css
└── js/
    ├── config.js
    ├── storage.js
    ├── api.js
    ├── parser.js
    ├── ui.js
    ├── features.js
    └── app.js
```

2. Double-click `index.html`. It opens in your browser. That's it — the app is running.

If you have Python installed, a local server behaves slightly better:

```bash
cd hirepilot-ai
python3 -m http.server 8000
```

Then open `http://localhost:8000`. (On Windows: `python -m http.server 8000`.)

---

## Step 2 — Get Your Free AI Key (2 minutes)

This project uses **Groq**, which is genuinely free — no credit card, no trial
that expires.

1. Go to **console.groq.com**
2. Sign up (Google or email)
3. Click **API Keys** → **Create API Key**
4. Copy it (starts with `gsk_`)
5. In HirePilot, click **API Settings** in the sidebar, paste it, click Save

The app tests the key immediately. Green dot means you're connected.

**Free tier limits:** roughly 14,400 requests per day and 30 per minute. You will
not hit that as one person testing your own app.

### Why not Claude or OpenAI?

Both are excellent but neither has a genuinely free tier — you get trial credits
that run out. Groq runs open models (Llama) for free indefinitely. Since the
request format is identical to OpenAI's, you can switch providers later by
changing two lines in `config.js`.

---

## Step 3 — Push to GitHub

### First time only: install Git

Download from **git-scm.com**. Accept every default.

Then tell Git who you are:

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### Create the repository

1. Go to **github.com** → click **+** → **New repository**
2. Name it `hirepilot-ai`
3. **Public** is fine — your API key is not in the code
4. Do **not** tick "Add a README" (you already have one)
5. Click **Create repository**

### Upload your code

In your project folder:

```bash
git init
git add .
git commit -m "Initial commit: HirePilot AI"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/hirepilot-ai.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

### What each command did

| Command | Meaning |
|---------|---------|
| `git init` | Start tracking this folder |
| `git add .` | Stage all files (except those in `.gitignore`) |
| `git commit -m "..."` | Save a snapshot with a message |
| `git branch -M main` | Name the main line of work "main" |
| `git remote add origin ...` | Point at your GitHub repo |
| `git push -u origin main` | Upload |

### Every time you change something after this

```bash
git add .
git commit -m "Describe what you changed"
git push
```

Three commands. That's the whole daily loop.

---

## Step 4 — Deploy It Live (3 minutes)

### Option A: GitHub Pages (simplest)

1. In your GitHub repo, click **Settings**
2. Click **Pages** in the left sidebar
3. Under Source, choose **main** branch, folder **/ (root)**
4. Click **Save**
5. Wait about a minute, then refresh

Your app is live at:
`https://YOUR-USERNAME.github.io/hirepilot-ai/`

### Option B: Netlify (drag and drop)

1. Go to **netlify.com** and sign up
2. Drag your project folder onto the upload area
3. Done — you get a live URL instantly

### Option C: Vercel

1. Go to **vercel.com**, sign in with GitHub
2. **Add New** → **Project** → pick your repo
3. Framework preset: **Other**
4. Click **Deploy**

All three are free. GitHub Pages is the natural choice since your code is
already there.

---

## Step 5 — Testing

### Manual test checklist

Work down this list. Every box should tick before you share the link.

**Setup**
- [ ] App loads with no errors in the console (press F12 to check)
- [ ] Settings modal opens and closes
- [ ] Bad API key shows a clear error, not a crash
- [ ] Good API key turns the status dot green

**Resume Analyzer**
- [ ] PDF upload extracts text
- [ ] Pasted text works too
- [ ] Under 100 characters shows a warning
- [ ] Analysis returns scores and lists
- [ ] Resume appears in the saved list
- [ ] Delete removes it

**Job Matching**
- [ ] JD analysis produces a match percentage
- [ ] Matched and missing skills both populate
- [ ] Application is added to the tracker automatically

**Optimizer**
- [ ] Suggestions reference your actual resume content
- [ ] **Nothing is invented** — verify this one carefully

**Mock Interview**
- [ ] Five questions generate
- [ ] Progress bar advances
- [ ] Short answers are rejected
- [ ] Feedback scores all five dimensions

**Tracker**
- [ ] Manual add works
- [ ] Status dropdown saves
- [ ] Delete works
- [ ] Data survives a page refresh

**Responsive**
- [ ] Usable on a phone-width window
- [ ] Nav scrolls horizontally on mobile

### Testing edge cases deliberately

Good testing means trying to break your own app:

| Try this | Should happen |
|----------|---------------|
| Upload a 10MB file | Clear size error |
| Upload a scanned PDF | "No text found" message |
| Upload a `.docx` | Message telling you to save as PDF |
| Paste 50,000 characters | Either works or gives a length error |
| Turn off wifi, click Analyze | "Network error" message |
| Click Analyze twice fast | No duplicate garbage |

### Browser console

Press **F12** → **Console** tab. Red text means an error. Errors here that you
can't see in the interface are the ones that bite later.

---

## Step 6 — Adding a Database

Right now your data lives in **localStorage** — a small store inside your
browser. This is a deliberate choice, not a shortcut.

**localStorage is right when:**
- One person uses the app on one device
- Data is private and doesn't need sharing
- You want zero backend complexity

**You need a real database when:**
- Users log in and access data from multiple devices
- You want data to survive clearing browser history
- Multiple people share data
- You need more than ~5MB

### Adding Supabase (free tier)

Supabase gives you a Postgres database plus authentication, free.

**1. Create the project**

Go to **supabase.com** → New Project. Note your Project URL and anon key
(Settings → API).

**2. Create the tables**

In the SQL Editor, run:

```sql
create table resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text,
  content text,
  analysis jsonb,
  created_at timestamptz default now()
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  job_title text,
  company text,
  jd_text text,
  match_score int,
  status text default 'applied',
  notes text,
  created_at timestamptz default now()
);

create table interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  type text,
  score int,
  feedback jsonb,
  created_at timestamptz default now()
);

-- Row Level Security: users can only see their own rows.
-- Do not skip this. Without it, anyone can read everyone's data.
alter table resumes enable row level security;
alter table applications enable row level security;
alter table interviews enable row level security;

create policy "own resumes" on resumes
  for all using (auth.uid() = user_id);
create policy "own applications" on applications
  for all using (auth.uid() = user_id);
create policy "own interviews" on interviews
  for all using (auth.uid() = user_id);
```

**3. Swap the storage layer**

Add to `index.html`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

Then rewrite the methods in `storage.js` to call Supabase instead of
localStorage. Because every feature goes through `Storage`, this is the only
file you change. That's why the code is organised this way.

```javascript
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async getResumes() {
  const { data, error } = await db
    .from('resumes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}
```

The Supabase anon key is safe in frontend code — Row Level Security is what
protects the data.

---

## Security: Read This Before You Share Your Link

**How the API key works here:** each user enters their own Groq key, and it stays
in their browser. Nothing is shared, nothing is exposed in your repo.

**Why this matters:** the common beginner mistake is putting your key in the
code and deploying it. Anyone can then open DevTools, read it, and spend your
quota. Frontend code has no secrets — everything shipped to the browser is
readable.

**If you ever want users to not need their own key**, you need a backend proxy
that holds the key server-side. A Vercel serverless function is the easy path:

```javascript
// api/chat.js — runs on the server, key never reaches the browser
export default async function handler(req, res) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_KEY}`, // server-side only
    },
    body: JSON.stringify(req.body),
  });
  res.json(await r.json());
}
```

Then point `CONFIG.API_URL` at `/api/chat` instead. Add rate limiting before you
open that to the public, or one user can drain your whole quota.

---

## How the Code Is Organised

```
config.js    Settings. Change values here, not in the code.
storage.js   Saving and loading. Swap this to change database.
api.js       Talks to the AI. All error handling lives here.
parser.js    Pulls text out of PDFs.
ui.js        Reusable interface pieces.
features.js  The ten features. Each has render + run.
app.js       Navigation and startup. Runs last.
```

Load order matters — `app.js` uses everything else, so it goes last in
`index.html`.

**The pattern each feature follows:**

```javascript
featureName() {
  UI.render(`...the screen...`);
  document.getElementById('btn').addEventListener('click', () => this.runFeature());
},

async runFeature() {
  out.innerHTML = UI.loading('Working');
  const system = `...instructions for the AI...`;
  try {
    const r = await API.ask(system, userContent);
    out.innerHTML = `...display r...`;
  } catch (err) {
    UI.toast(err.message, 'err');
  }
}
```

Once you understand one feature, you understand all ten.

---

## Common Problems

**Nothing happens when I click Analyze**
Press F12, check the Console. A red error names the file and line.

**"No API key set"**
Click API Settings, paste your Groq key, Save.

**"Invalid API key"**
Check for spaces before or after when you pasted. It should start with `gsk_`.

**"Rate limit hit"**
You've made too many requests too fast. Wait a minute.

**PDF upload does nothing**
Check the Console. If PDF.js failed to load, check your internet connection —
it loads from a CDN.

**"Almost no text found"**
Your PDF is a scan (an image). Export a real text PDF from Word or Google Docs.

**My data disappeared**
Clearing browser history clears localStorage. This is exactly why you'd move to
a real database.

**Changes don't show up**
Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac).

---

## Where to Take It Next

Roughly in order of effort:

1. **`.docx` support** — add Mammoth.js (instructions in `parser.js`)
2. **Export to PDF** — add jsPDF, let users download optimized resumes
3. **Dark/light toggle** — the CSS variables at the top of `style.css` make this easy
4. **Resume versioning** — track every version you generate
5. **Supabase + login** — multi-device, real accounts
6. **Backend proxy** — users no longer need their own key
7. **Email reminders** — follow-up nudges on applications

---

## A Note on the Optimizer

Modules 03, 04, and 05 write content for you. Every prompt explicitly forbids
inventing experience, but AI models sometimes drift.

**Read everything before you send it to an employer.** If the optimizer produces
a bullet describing something you did not do, delete it. A resume that
overstates your experience fails at the interview, and lying on an application
is grounds for withdrawing an offer.

The tool exists to make your real experience sound as strong as it actually is.
That's genuinely valuable. Keep it there.

---

## License

MIT — do whatever you like with it.
