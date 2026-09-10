/* ============================================================
   supabase-client.js — One Supabase client, configured once.

   Paste your project's values below (Supabase dashboard →
   Settings → API). The anon/public key is DESIGNED to be public —
   it's safe in frontend code; Row Level Security (see
   supabase/schema.sql) is what actually protects the data. Never
   put the service_role key or a database password here.

   If these are left as placeholders, SB stays null and the whole
   app falls back to local-only mode (exactly how it behaved before
   auth existed) — nothing breaks, auth/sync just don't activate.
   That's deliberate: it's what lets the rest of the app keep
   working while a Supabase project isn't configured yet.
   ============================================================ */

const SUPABASE_URL = 'https://vhaipswxnlcrkjlmsqwv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gX5J056hlnw3ti5vDGRF7w_SxYNx5Jd';

const SB = (
  typeof supabase !== 'undefined' &&
  SUPABASE_URL.startsWith('http') &&
  SUPABASE_ANON_KEY.length > 20
) ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

if (!SB) {
  console.warn(
    'Supabase is not configured (see js/supabase-client.js). ' +
    'Running in local-only mode: no auth, no sync — same behavior as before auth existed.'
  );
}
