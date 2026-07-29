/* ============================================================
   config.js — All app settings in one place.
   Change values here, not scattered through the code.
   ============================================================ */

const CONFIG = {

  // ---- AI PROVIDER ----
  // Groq is free, needs no credit card, and is very fast.
  // Get a key at https://console.groq.com
  API_URL: 'https://api.groq.com/openai/v1/chat/completions',

  DEFAULT_MODEL: 'llama-3.3-70b-versatile',

  // How long the AI's answer can be. Higher = more detail, slower.
  MAX_TOKENS: 3000,

  // 0 = predictable and factual. 1 = creative and varied.
  // Resume analysis wants consistency, so we keep it low.
  TEMPERATURE: 0.3,

  // ---- STORAGE KEYS ----
  // These are the "drawer labels" for browser localStorage.
  KEYS: {
    API_KEY:      'hirepilot_api_key',
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
