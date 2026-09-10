/* ============================================================
   api.js — Talks to the Groq AI API.

   Every feature in this app funnels through ONE function: API.ask().
   That means error handling, retries, and JSON parsing are written
   once instead of ten times.

   Groq uses the same request format as OpenAI, so if you ever switch
   providers you only change CONFIG.API_URL and the model name.
   ============================================================ */

const API = {

  /* ------------------------------------------------------------
     ask() — send a prompt, get a JavaScript object back.

     system: instructions describing the AI's role
     user:   the actual content to analyse
     ------------------------------------------------------------ */
  async ask(system, user) {
    // Mock mode: no network call, no key, no quota spent. See
    // config.js (CONFIG.AI_MODE / Config.aiMode()) and mock-ai.js.
    if (Config.aiMode() === 'mock') {
      await new Promise(r => setTimeout(r, 350)); // feels like a real call, for loading-state QA
      return MockAI.respond(system);
    }

    const key = Storage.getApiKey();

    if (!key) {
      throw new Error('No API key set. Click "API Settings" in the sidebar.');
    }

    let response;
    try {
      response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
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
        return 'Invalid API key. Check it in API Settings.';
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
     test() — verify a key works, used by the Settings modal.
     ------------------------------------------------------------ */
  async test() {
    await this.ask(
      'You are a test endpoint. Reply with JSON only.',
      'Return exactly: {"ok": true}'
    );
    return true;
  },
};
