-- ============================================================
-- HirePilot — Supabase schema + Row Level Security
--
-- Run this once in the Supabase SQL Editor (Project → SQL Editor →
-- New query → paste this whole file → Run) after creating your
-- project. It creates one table per existing HirePilot data type
-- and locks every row to its owner via RLS.
--
-- Mirrors the current localStorage shape (see js/storage.js) as
-- closely as possible so migrating the frontend is a drop-in swap
-- of the storage layer, not a redesign of what's stored.
-- ============================================================

-- ---------- profiles ----------
-- One row per signed-up user, created automatically on signup.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row the moment someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- resumes ----------
-- Mirrors Storage.addResume() in js/storage.js: name, text, analysis.
create table if not exists public.resumes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text,
  resume_text text,
  analysis   jsonb,
  created_at timestamptz not null default now()
);

alter table public.resumes enable row level security;

create policy "resumes: owner all" on public.resumes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists resumes_user_id_idx on public.resumes(user_id);

-- ---------- applications ----------
-- Mirrors Storage.addApplication(): job title/company/JD, resume
-- link, match score, status, notes. Covers both the JD Analyzer
-- and the manual Job Tracker entries.
create table if not exists public.applications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  resume_id   uuid references public.resumes(id) on delete set null,
  job_title   text,
  company     text,
  jd_text     text,
  match_score int,
  analysis    jsonb,
  status      text not null default 'applied'
              check (status in ('applied','interview','offer','rejected')),
  notes       text default '',
  created_at  timestamptz not null default now()
);

alter table public.applications enable row level security;

create policy "applications: owner all" on public.applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists applications_user_id_idx on public.applications(user_id);

-- ---------- interviews ----------
-- Mirrors Storage.addInterview(): type, score, resume link, full
-- feedback payload from the mock-interview grading step.
create table if not exists public.interviews (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  resume_id  uuid references public.resumes(id) on delete set null,
  type       text,
  score      int,
  feedback   jsonb,
  created_at timestamptz not null default now()
);

alter table public.interviews enable row level security;

create policy "interviews: owner all" on public.interviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists interviews_user_id_idx on public.interviews(user_id);

-- ---------- career_gaps ----------
-- One row per Career Gap Analysis run (not currently saved to
-- localStorage at all — Module 07 is display-only today. Table
-- exists so a future save-this-analysis feature has somewhere to
-- go; safe to leave empty/unused until that's built).
create table if not exists public.career_gaps (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  resume_id      uuid references public.resumes(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,
  analysis       jsonb,
  created_at     timestamptz not null default now()
);

alter table public.career_gaps enable row level security;

create policy "career_gaps: owner all" on public.career_gaps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists career_gaps_user_id_idx on public.career_gaps(user_id);

-- ---------- cover_letters ----------
-- One row per generated cover letter (also currently display-only
-- in the UI — same rationale as career_gaps above).
create table if not exists public.cover_letters (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  resume_id      uuid references public.resumes(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,
  tone           text,
  letter         text,
  created_at     timestamptz not null default now()
);

alter table public.cover_letters enable row level security;

create policy "cover_letters: owner all" on public.cover_letters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists cover_letters_user_id_idx on public.cover_letters(user_id);

-- ---------- linkedin_reviews ----------
-- One row per LinkedIn Optimizer run (display-only today, same
-- rationale as career_gaps/cover_letters).
create table if not exists public.linkedin_reviews (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  profile_text   text,
  analysis       jsonb,
  created_at     timestamptz not null default now()
);

alter table public.linkedin_reviews enable row level security;

create policy "linkedin_reviews: owner all" on public.linkedin_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists linkedin_reviews_user_id_idx on public.linkedin_reviews(user_id);

-- ============================================================
-- job_analyses was deliberately NOT created as a separate table:
-- a JD analysis IS an application row (job_title/company/jd_text/
-- match_score/analysis all live on public.applications already,
-- matching how js/features.js's runJD() calls Storage.addApplication()
-- today). Splitting it out would duplicate the same data across two
-- tables for no benefit — see "do not over-engineer" in the brief.
-- ============================================================
