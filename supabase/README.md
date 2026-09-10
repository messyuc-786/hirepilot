# HirePilot — Supabase setup

This folder holds the database side of the auth/backend migration
described in-conversation. It does **not** run automatically — apply
it once, by hand, after creating your Supabase project.

## 1. Apply the schema

1. Open your project at [supabase.com](https://supabase.com) →
   **SQL Editor** → **New query**.
2. Paste the entire contents of `schema.sql` and click **Run**.
3. Confirm in **Table Editor** that `profiles`, `resumes`,
   `applications`, `interviews`, `career_gaps`, `cover_letters`, and
   `linkedin_reviews` all exist, each with RLS enabled (a small
   padlock icon next to the table name in Table Editor means RLS is
   on).

## 2. What's in here

- **`schema.sql`** — every table HirePilot needs, each with
  `user_id references auth.users(id)` and a Row Level Security
  policy restricting every operation to `auth.uid() = user_id`. A
  `profiles` table plus a trigger that creates a profile row the
  moment someone signs up.
- Tables mirror the shapes already used by `js/storage.js` today
  (`Storage.addResume`, `Storage.addApplication`,
  `Storage.addInterview`) so migrating the frontend's storage layer
  is a drop-in swap, not a redesign.
- `career_gaps`, `cover_letters`, and `linkedin_reviews` exist for
  completeness (per the requested schema) even though those three
  features are currently display-only in the UI — nothing writes to
  them yet. They're ready for whenever "save this result" is added
  to those screens.

## 3. What's NOT in here yet

- **Frontend wiring** (Supabase client, sign-up/login/logout UI,
  swapping `js/storage.js` to read/write these tables instead of
  `localStorage`) — waiting on your Project URL + anon key.
- **The server-side AI proxy** (`/api/ai` equivalent) that will hold
  the Groq key — waiting on a decision for where it's hosted
  (Supabase Edge Function vs. another platform).

Once you've applied this and shared your Project URL + anon key,
the next step is the frontend Supabase client and the auth screens.
