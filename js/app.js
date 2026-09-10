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

  async init() {
    this.fillDrawerIcons();
    this.bindNav();
    this.bindDrawer();
    this.bindSettings();
    this.bindLogout();

    if (!Auth.enabled()) {
      // Supabase isn't configured (see js/supabase-client.js) —
      // run exactly as before auth existed: no gate, local-only data.
      this.enterApp();
      return;
    }

    await Auth.init();
    // Fires immediately with the current session (if the browser
    // still has one from a previous visit), then again on every
    // future sign-in/out/token-refresh.
    Auth.onChange(user => this.handleAuthChange(user));
  },

  /* Distinguishes an actual sign-in/sign-out transition from a
     background token refresh (Supabase fires onAuthStateChange for
     those too, with the same user) — a refresh must NOT yank
     someone back to Dashboard while they're mid-task. */
  async handleAuthChange(user) {
    const nowSignedIn = !!user;

    if (nowSignedIn && !this._signedIn) {
      this._signedIn = true;
      document.getElementById('topbarNav').hidden = false;
      await CloudSync.hydrate();
      this.enterApp();
    } else if (!nowSignedIn && this._signedIn) {
      this._signedIn = false;
      CloudSync.clearLocalCache();
      document.getElementById('topbarNav').hidden = true;
      AuthUI.login();
    } else if (!nowSignedIn && this._signedIn === undefined) {
      // First load, never signed in this session.
      this._signedIn = false;
      document.getElementById('topbarNav').hidden = true;
      AuthUI.login();
    }
    // nowSignedIn && this._signedIn already true: a token refresh —
    // intentionally does nothing, stay on whatever screen is open.
  },

  /* Enters the normal app (dashboard + mock-mode badge + first-run
     nudge) — called once auth (if enabled) has resolved to "signed in",
     or immediately when Supabase isn't configured at all. */
  enterApp() {
    this.updateStatus();

    const mock = Config.aiMode() === 'mock';
    document.getElementById('mockBadge').hidden = !mock;

    this.go('dashboard');
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
    // Defense in depth: the hamburger/quick-actions are already
    // hidden while signed out, so this path only matters against a
    // direct App.go(...) call (e.g. from devtools) — it renders no
    // real data (the local cache is cleared on sign-out) and no AI
    // call can succeed unauthenticated (see API.ask()), but the
    // screen itself shouldn't render at all without a session.
    if (Auth.enabled() && !Auth.isSignedIn()) {
      AuthUI.login();
      return;
    }

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
      this.openInfoModal('helpModal');
    });

    document.getElementById('aboutBtn')?.addEventListener('click', () => {
      this.closeDrawer();
      this.openInfoModal('aboutModal');
    });

    this.bindInfoModal('helpModal', 'closeHelp');
    this.bindInfoModal('aboutModal', 'closeAbout');
  },

  /* ---------- HELP / ABOUT (simple info modals) ---------- */

  openInfoModal(id) {
    document.getElementById(id).hidden = false;
  },

  bindInfoModal(modalId, closeBtnId) {
    const modal = document.getElementById(modalId);
    const close = () => { modal.hidden = true; };

    document.getElementById(closeBtnId).addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !modal.hidden) close();
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
    const modal = document.getElementById('settingsModal');
    const model = document.getElementById('modelSelect');

    const open = () => {
      this.closeDrawer();
      model.value = Storage.getModel();
      modal.hidden = false;
      model.focus();
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

    UI.busyClick(document.getElementById('saveSettings'), 'Checking...', async () => {
      Storage.setModel(model.value);

      if (Config.aiMode() === 'mock') {
        close();
        UI.toast('Saved. (Mock mode is on — no real request was made.)', 'ok');
        return;
      }

      UI.toast('Checking connection...');

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

  /* ---------- LOGOUT ---------- */

  bindLogout() {
    const btn = document.getElementById('logoutBtn');
    if (!Auth.enabled()) return; // stays hidden — nothing to log out of
    btn.hidden = false;

    UI.busyClick(btn, 'Logging out...', async () => {
      this.closeDrawer();
      try {
        await Auth.signOut();
        UI.toast('Logged out.', 'ok');
      } catch (err) {
        UI.toast(err.message, 'err');
      }
    });
  },

  /* ---------- CONNECTION INDICATOR ---------- */

  updateStatus() {
    const el = document.getElementById('apiStatus');
    // "Connected" now means "signed in and able to reach the AI
    // backend" — there is no provider key of the user's own to
    // check anymore. Mock mode also counts as connected (it works
    // with or without a session).
    const connected = Config.aiMode() === 'mock' || Auth.isSignedIn();
    if (connected) {
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
