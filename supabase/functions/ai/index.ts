// ============================================================
// supabase/functions/ai/index.ts — server-side AI proxy.
//
// The only place the Groq key exists. It lives in this function's
// environment (a Supabase Edge Function secret — set with
// `supabase secrets set GROQ_API_KEY=...`, never committed, never
// sent to the client). The frontend (js/api.js) calls this function
// with the signed-in user's Supabase access token instead of a
// provider key.
//
// Request shape (matches what API.ask() already builds — see
// js/api.js): { model, max_tokens, temperature, messages,
// response_format }. Response shape matches Groq's own chat-
// completions response, so the frontend's existing parsing code
// (data.choices[0].message.content) needs no changes.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  // CORS preflight.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: { message: 'Method not allowed.' } }, 405);
  }

  // ---------- auth: require a real, valid Supabase user ----------
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: { message: 'Missing Authorization header. Please log in.' } }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: { message: 'Server is misconfigured (missing Supabase env).' } }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return json({ error: { message: 'Invalid or expired session. Please log in again.' } }, 401);
  }

  // ---------- validate the request body ----------
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: { message: 'Request body must be valid JSON.' } }, 400);
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: { message: 'Request must include a non-empty messages array.' } }, 400);
  }

  // ---------- the only place GROQ_API_KEY is ever read ----------
  const groqKey = Deno.env.get('GROQ_API_KEY');
  if (!groqKey) {
    return json({ error: { message: 'AI provider is not configured on the server yet.' } }, 500);
  }

  // ---------- call Groq server-side ----------
  let groqRes: Response;
  try {
    groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: typeof body.model === 'string' ? body.model : 'openai/gpt-oss-120b',
        max_tokens: typeof body.max_tokens === 'number' ? body.max_tokens : 3000,
        temperature: typeof body.temperature === 'number' ? body.temperature : 0.3,
        messages,
        response_format: body.response_format ?? { type: 'json_object' },
      }),
    });
  } catch {
    return json({ error: { message: 'Could not reach the AI provider. Try again shortly.' } }, 502);
  }

  const data = await groqRes.json().catch(() => null);

  if (!groqRes.ok) {
    // Forward Groq's own error message (never the key) with its status.
    return json({ error: data?.error ?? { message: 'AI provider request failed.' } }, groqRes.status);
  }

  return json(data, 200);
});
