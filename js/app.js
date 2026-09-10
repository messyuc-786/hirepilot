/* ============================================================
   app.js — Starts the app and handles navigation.

   This file runs LAST (see the script order in index.html), because
   it depends on every other file being loaded first.

   Its jobs:
     1. Route between the ten feature screens
     2. Open/close the hamburger nav drawer
     3. Manage the API key settings modal
     4. Show whether the API is connected

   NAVIGATION MODEL
   There is no permanent sidebar. One header (logo + status +
   hamburger) persists across every screen. The hamburger opens a
   drawer listing all nine tools, grouped the way a user thinks about
   their job search rather than as a flat list. Selecting a tool
   navigates AND closes the drawer — the drawer is a doorway, not a
   panel you work alongside.
   ============================================================ */

const App = {

  /* Maps the data-view attribute on each drawer item (and the
     dashboard's own quick-action buttons) to the matching function
     in features.js. Unchanged by the navigation restructure — only
     the UI that triggers these routes moved. */
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

  /* Icon shown beside each drawer item, keyed by view name. */
  drawerIcons: {
    resume: 'doc', optimizer: 'bolt', jd: 'target', cover: 'mail',
    linkedin: 'link', interview: 'chat', gap: 'bars', recruiter: 'user',
    tracker: 'list',
  },

  /* ---------- STARTUP ---------- */

  init() {
    this.fillDrawerIcons();
    this.bindNav();
    this.bindDrawer();
    this.bindSettings();
    this.updateStatus();

    // Show the dashboard first.
    this.go('dashboard');

    // Nudge first-time users toward setting up their key.
    if (!Storage.hasApiKey()) {
      setTimeout(() => {
        UI.toast('Add your free Groq API key to get started — open the menu and choose API Settings.');
      }, 700);
    }
  },

  /* The drawer's icon slots are plain <span id="di..."> placeholders
     in index.html (icon markup lives in ui.js, not hand-written HTML
     for every tool). Fill them once at startup. */
  fillDrawerIcons() {
    document.querySelectorAll('.drawer-item[data-view]').forEach(btn => {
      const slot = btn.querySelector('.di-icon');
      const icon = this.drawerIcons[btn.dataset.view];
      if (slot && icon) slot.innerHTML = UI.icon(icon, 18);
    });
  },

  /* ---------- NAVIGATION ---------- */

  bindNav() {
    document.getElementById('homeBtn')?.addEventListener('click', () => this.go('dashboard'));

    // Drawer items double as navigation: pick one, go there, close.
    document.querySelectorAll('.drawer-item[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.go(btn.dataset.view);
        this.closeDrawer();
      });
    });

    // The dashboard's own quick-action buttons (data-go="resume" etc.)
    // are bound directly in Features.dashboard() each time it renders,
    // same as before — this method only owns the drawer's items.
  },

  go(view) {
    const route = this.routes[view];
    if (!route) {
      console.warn(`Unknown view: ${view}`);
      return;
    }

    // Highlight the matching drawer item, if this view has one
    // (the dashboard itself isn't listed in the drawer — it's
    // reached via the logo).
    document.querySelectorAll('.drawer-item[data-view]').forEach(b => {
      b.classList.toggle('active', b.dataset.view === view);
    });

    route();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /* ---------- NAV DRAWER ---------- */

  bindDrawer() {
    const drawer   = document.getElementById('drawer');
    const backdrop = document.getElementById('drawerBackdrop');
    const menuBtn  = document.getElementById('menuBtn');
    const closeBtn = document.getElementById('drawerClose');

    menuBtn.addEventListener('click', () => this.toggleDrawer());
    closeBtn.addEventListener('click', () => this.closeDrawer());
    backdrop.addEventListener('click', () => this.closeDrawer());

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) this.closeDrawer();
    });

    document.getElementById('helpBtn')?.addEventListener('click', () => {
      this.closeDrawer();
      UI.toast('Check the README in the project for help and FAQs.');
    });
  },

  openDrawer() {
    this._lastFocus = document.activeElement;

    document.getElementById('drawer').classList.add('open');
    document.getElementById('drawerBackdrop').classList.add('open');
    document.getElementById('menuBtn').classList.add('open');
    document.getElementById('menuBtn').setAttribute('aria-expanded', 'true');
    document.getElementById('drawer').setAttribute('aria-hidden', 'false');

    // Move focus into the drawer so keyboard users land somewhere useful.
    document.getElementById('drawerClose').focus();
  },

  closeDrawer() {
    document.getElementById('drawer').classList.remove('open');
    document.getElementById('drawerBackdrop').classList.remove('open');
    document.getElementById('menuBtn').classList.remove('open');
    document.getElementById('menuBtn').setAttribute('aria-expanded', 'false');
    document.getElementById('drawer').setAttribute('aria-hidden', 'true');

    // Return focus to whatever opened the drawer (the hamburger, or
    // a "More tools" link on the dashboard), so keyboard users don't
    // lose their place.
    this._lastFocus?.focus?.();
  },

  toggleDrawer() {
    document.getElementById('drawer').classList.contains('open')
      ? this.closeDrawer()
      : this.openDrawer();
  },

  /* ---------- SETTINGS MODAL ---------- */

  bindSettings() {
    const modal  = document.getElementById('settingsModal');
    const keyIn  = document.getElementById('apiKeyInput');
    const model  = document.getElementById('modelSelect');

    const open = () => {
      this.closeDrawer();
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

    UI.busyClick(document.getElementById('saveSettings'), 'Testing...', async () => {
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
