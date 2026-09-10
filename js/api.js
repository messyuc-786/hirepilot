/* ============================================================
   api.js — Talks to HirePilot's server-side AI proxy.

   Every feature in this app funnels through ONE function: API.ask().
   That means error handling, retries, and JSON parsing are written
   once instead of ten times.

   LIVE MODE: the request goes to a Supabase Edge Function
   (supabase/functions/ai) authenticated with the signed-in user's
   Supabase access token — never a provider key. The Groq key lives
   only in that function's server-side environment; it is never
   sent to, or storable by, the browser. See supabase/functions/ai/
   index.ts for the server side of this.

   MOCK MODE: no network call at all — see mock-ai.js.
   ============================================================ */

const API = {

  /* ------------------------------------------------------------
     ask() — send a prompt, get a JavaScript object back.

     system: instructions describing the AI's role
     user:   the actual content to analyse
     ------------------------------------------------------------ */
  async ask(system, user) {
    // Mock mode: no network call, no auth, no quota spent. See
    // config.js (CONFIG.AI_MODE / Config.aiMode()) and mock-ai.js.
    if (Config.aiMode() === 'mock') {
      await new Promise(r => setTimeout(r, 350)); // feels like a real call, for loading-state QA
      return MockAI.respond(system);
    }

    if (!Auth.enabled()) {
      throw new Error('AI features need Supabase configured — see js/supabase-client.js.');
    }
    if (!Auth.isSignedIn()) {
      throw new Error('Please log in to use AI features.');
    }

    const { data: { session } } = await SB.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      throw new Error('Your session has expired. Please log in again.');
    }

    let response;
    try {
      response = await fetch(`${SUPABASE_URL}/functions/v1/ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          model: Storage.getModel(),
          max_tokens: CONFIG.MAX_TOKENS,
          temperature: CONFIG.TEMPERATURE,
          messages: [
            { role: 'system', content: system },
            { role: 'user',   content: user },
          ],
          // Ask Groq to guarantee valid JSON. Saves a lot of parsing pain.
          response_format: { type: 'json_object' },
        }),
      });
    } catch (networkError) {
      // fetch() only rejects on network failure, not on HTTP errors.
      throw new Error('Network error — check your internet connection.');
    }

    if (!response.ok) {
      throw new Error(await this.explainError(response));
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('The AI returned an empty response. Try again.');
    }

    return this.parseJSON(text);
  },

  /* ------------------------------------------------------------
     explainError() — turn HTTP status codes into plain English.
     A beginner should never see "401" with no explanation.
     ------------------------------------------------------------ */
  async explainError(response) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body?.error?.message || '';
    } catch { /* body wasn't JSON; ignore */ }

    switch (response.status) {
      case 401:
        return 'Your session has expired. Please log in again.';
      case 429:
        return 'Rate limit hit. Wait about a minute and try again.';
      case 413:
        return 'Your text is too long. Try a shorter resume or job description.';
      case 500:
      case 502:
      case 503:
        return 'The AI service is temporarily down. Try again shortly.';
      default:
        return `Request failed (${response.status}). ${detail}`;
    }
  },

  /* ------------------------------------------------------------
     parseJSON() — safely turn the AI's text into an object.

     Even with response_format set, models occasionally wrap output
     in markdown fences. This strips those before parsing.
     ------------------------------------------------------------ */
  parseJSON(text) {
    // Remove ```json ... ``` fences if present.
    let clean = text.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');

    try {
      return JSON.parse(clean);
    } catch {
      // Last resort: grab the outermost {...} block.
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch { /* fall through */ }
      }
      console.error('Unparseable AI response:', text);
      throw new Error('The AI returned malformed data. Please try again.');
    }
  },

  /* ------------------------------------------------------------
     test() — verify the AI backend is reachable, used by Settings.
     ------------------------------------------------------------ */
  async test() {
    await this.ask(
      'You are a test endpoint. Reply with JSON only.',
      'Return exactly: {"ok": true}'
    );
    return true;
  },
};
