/* ============================================================
   app.js — Starts the app and handles navigation.

   This file runs LAST (see the script order in index.html), because
   it depends on every other file being loaded first.

   Its jobs:
     1. Route between the ten feature screens
     2. Manage the API key settings modal
     3. Show whether the API is connected
   ============================================================ */

const App = {

  /* Maps the data-view attribute on each nav button
     to the matching function in features.js */
  routes: {
    dashboard: () => Features.dashboard(),
    resume:    () => Features.resume(),
    jd:        () => Features.jd(),
    optimizer: () => Features.optimizer(),
    linkedin:  () => Features.linkedin(),
    cover:     () => Features.cover(),
    interview: () => Features.interview(),
    gap:       () => Features.gap(),
    recruiter: () => Features.recruiter(),
    tracker:   () => Features.tracker(),
  },

  /* ---------- STARTUP ---------- */

  init() {
    this.bindNav();
    this.bindSettings();
    this.updateStatus();

    // Show the dashboard first.
    this.go('dashboard');

    // Nudge first-time users toward setting up their key.
    if (!Storage.hasApiKey()) {
      setTimeout(() => {
        UI.toast('Add your free Groq API key to get started — click "API Settings".');
      }, 700);
    }
  },

  /* ---------- NAVIGATION ---------- */

  bindNav() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => this.go(btn.dataset.view));
    });
  },

  go(view) {
    const route = this.routes[view];
    if (!route) {
      console.warn(`Unknown view: ${view}`);
      return;
    }

    // Highlight the active nav button.
    document.querySelectorAll('.nav-item').forEach(b => {
      b.classList.toggle('active', b.dataset.view === view);
    });

    route();

    // On mobile the nav sits above content, so jump back to the top.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /* ---------- SETTINGS MODAL ---------- */

  bindSettings() {
    const modal  = document.getElementById('settingsModal');
    const keyIn  = document.getElementById('apiKeyInput');
    const model  = document.getElementById('modelSelect');

    const open = () => {
      keyIn.value = Storage.getApiKey();
      model.value = Storage.getModel();
      modal.hidden = false;
      keyIn.focus();
    };

    const close = () => { modal.hidden = true; };

    document.getElementById('settingsBtn').addEventListener('click', open);
    document.getElementById('cancelSettings').addEventListener('click', close);

    // Click the dark backdrop to dismiss.
    modal.addEventListener('click', e => {
      if (e.target === modal) close();
    });

    // Escape key to dismiss.
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !modal.hidden) close();
    });

    document.getElementById('saveSettings').addEventListener('click', async () => {
      const key = keyIn.value.trim();

      if (!key) {
        UI.toast('Please paste your Groq API key.', 'err');
        return;
      }

      Storage.setApiKey(key);
      Storage.setModel(model.value);

      UI.toast('Testing your key...');

      try {
        await API.test();
        this.updateStatus();
        close();
        UI.toast('Connected. You are ready to go.', 'ok');
      } catch (err) {
        this.updateStatus();
        UI.toast(err.message, 'err');
      }
    });
  },

  /* ---------- CONNECTION INDICATOR ---------- */

  updateStatus() {
    const el = document.getElementById('apiStatus');
    if (Storage.hasApiKey()) {
      el.className = 'status live';
      el.innerHTML = '<span class="dot"></span> Connected';
    } else {
      el.className = 'status';
      el.innerHTML = '<span class="dot"></span> Not connected';
    }
  },
};

/* ------------------------------------------------------------
   Wait for the HTML to finish parsing before touching the DOM.
   Without this, getElementById would return null.
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => App.init());
