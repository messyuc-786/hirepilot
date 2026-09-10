/* ============================================================
   auth.js — Supabase Auth wrapper.

   Everything here is a thin pass-through to the Supabase JS client
   (see supabase-client.js). Session persistence, refresh, and
   storage are all handled internally by that client — it keeps its
   own tokens in localStorage under its own key (sb-<project>-auth-
   token), separate from HirePilot's own data keys. That's the
   standard, expected way Supabase JS works: it is NOT the same
   thing as the old "paste your Groq key" pattern this replaces —
   a session token isn't a provider secret, and Supabase's anon key
   is designed to be public (RLS is what enforces ownership).

   When SB is null (Supabase not configured — see supabase-
   client.js), every method here fails softly so the rest of the
   app keeps working in local-only mode instead of throwing.
   ============================================================ */

const Auth = {
  _user: null,
  _listeners: [],

  enabled() { return !!SB; },

  /* Call once at startup. Resolves once we know whether a session
     already exists (e.g. the user refreshed the page). */
  async init() {
    if (!SB) return null;

    const { data: { session } } = await SB.auth.getSession();
    this._user = session?.user ?? null;

    SB.auth.onAuthStateChange((_event, session) => {
      this._user = session?.user ?? null;
      this._listeners.forEach(fn => fn(this._user));
    });

    return this._user;
  },

  /* Fires immediately with the current user (or null), then again
     on every future sign-in/sign-out. */
  onChange(fn) {
    this._listeners.push(fn);
    fn(this._user);
  },

  currentUser() { return this._user; },
  isSignedIn() { return !!this._user; },

  async signUp(email, password, fullName) {
    if (!SB) throw new Error('Sign-up is not available yet — Supabase isn\'t configured.');
    const { data, error } = await SB.auth.signUp({
      email, password,
      options: { data: { full_name: fullName || '' } },
    });
    if (error) throw new Error(this._friendly(error));
    return data;
  },

  async signIn(email, password) {
    if (!SB) throw new Error('Sign-in is not available yet — Supabase isn\'t configured.');
    const { data, error } = await SB.auth.signInWithPassword({ email, password });
    if (error) throw new Error(this._friendly(error));
    return data;
  },

  async signOut() {
    if (!SB) return;
    const { error } = await SB.auth.signOut();
    if (error) throw new Error(this._friendly(error));
  },

  async resetPassword(email) {
    if (!SB) throw new Error('Password reset is not available yet — Supabase isn\'t configured.');
    const { error } = await SB.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + location.pathname,
    });
    if (error) throw new Error(this._friendly(error));
  },

  /* Supabase's error messages are already fairly plain-English;
     this only smooths the couple that read oddly out of context. */
  _friendly(error) {
    const msg = error.message || 'Something went wrong. Please try again.';
    if (/already registered/i.test(msg)) return 'An account with that email already exists — try logging in instead.';
    if (/invalid login credentials/i.test(msg)) return 'Incorrect email or password.';
    if (/email not confirmed/i.test(msg)) return 'Check your inbox and confirm your email before logging in.';
    return msg;
  },
};
