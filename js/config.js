/* ============================================================
   config.js — All app settings in one place.
   Change values here, not scattered through the code.
   ============================================================ */

const CONFIG = {

  // ---- AI MODE ----
  // 'live' — real AI calls, routed through the server-side Edge
  //          Function (supabase/functions/ai) using the signed-in
  //          user's session — no provider key ever touches the
  //          browser. This is the deployed/production default.
  // 'mock' — every AI call returns a deterministic canned response
  //          from mock-ai.js instead. No network call, no auth
  //          needed, no quota spent. This is what UI/UX/navigation/
  //          responsive QA should run under — never repeatedly hit
  //          the real API just to check a layout.
  // This is the static-site equivalent of a VITE_AI_MODE build-time
  // flag: there's no bundler here, so this value IS the "build-time"
  // setting for a given deployment. Config.aiMode() (below) layers a
  // localStorage/URL override on top, for flipping modes
  // interactively during development without editing this file.
  AI_MODE: 'live',

  DEFAULT_MODEL: 'openai/gpt-oss-120b',

  // Models currently offered in AI Settings (index.html #modelSelect).
  // Storage.getModel() validates against this list before trusting a
  // cached localStorage value — see the note there for why.
  AVAILABLE_MODELS: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'],

  // How long the AI's answer can be. Higher = more detail, slower.
  MAX_TOKENS: 3000,

  // 0 = predictable and factual. 1 = creative and varied.
  // Resume analysis wants consistency, so we keep it low.
  TEMPERATURE: 0.3,

  // ---- STORAGE KEYS ----
  // These are the "drawer labels" for browser localStorage.
  KEYS: {
    MODEL:        'hirepilot_model',
    RESUMES:      'hirepilot_resumes',
    APPLICATIONS: 'hirepilot_applications',
    INTERVIEWS:   'hirepilot_interviews',
  },

  // ---- APPLICATION STATUSES ----
  STATUSES: ['applied', 'interview', 'offer', 'rejected'],

  // ---- INTERVIEW TYPES ----
  INTERVIEW_TYPES: [
    { id: 'hr',          label: 'HR / Screening' },
    { id: 'technical',   label: 'Technical' },
    { id: 'managerial',  label: 'Managerial' },
    { id: 'behavioral',  label: 'Behavioral' },
  ],

  // ---- FILE UPLOAD ----
  MAX_FILE_MB: 5,
  ACCEPTED_TYPES: ['application/pdf', 'text/plain'],
};

// PDF.js needs to know where its worker script lives.
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* ------------------------------------------------------------
   Config.aiMode() — resolves the effective AI mode for this page
   load: CONFIG.AI_MODE, overridable for development only via
   ?aimode=mock|live in the URL (sticky — saved to localStorage so
   it survives navigating between screens) or by setting
   localStorage.hirepilot_ai_mode directly in the console. Neither
   override does anything in a context where you haven't
   deliberately set one — normal users always get CONFIG.AI_MODE.
   ------------------------------------------------------------ */
const Config = {
  aiMode() {
    try {
      const url = new URLSearchParams(location.search).get('aimode');
      if (url === 'mock' || url === 'live') {
        localStorage.setItem('hirepilot_ai_mode', url);
        return url;
      }
      const stored = localStorage.getItem('hirepilot_ai_mode');
      if (stored === 'mock' || stored === 'live') return stored;
    } catch { /* localStorage unavailable (private mode, etc.) — fall through */ }
    return CONFIG.AI_MODE;
  },
};
