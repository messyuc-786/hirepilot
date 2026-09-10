/* ============================================================
   auth-ui.js — Sign up / log in / reset password screens.

   Rendered into the same #views container Features.* uses, with
   the same UI.panel/.btn/input building blocks — no new visual
   language, just three small forms. Shown instead of the app when
   nobody is signed in (see App.showAuthGate() in app.js).
   ============================================================ */

const AuthUI = {

  login() {
    UI.render(`
      ${UI.head('Welcome back', 'Log In', 'Pick up where you left off.')}
      <div class="auth-card">
        ${UI.panel('', `
          <label for="authEmail">Email</label>
          <input type="email" id="authEmail" autocomplete="email" placeholder="you@example.com">

          <label for="authPassword">Password</label>
          <input type="password" id="authPassword" autocomplete="current-password" placeholder="••••••••">

          <div class="btn-row">
            <button class="btn" id="authSubmit">Log In</button>
          </div>

          <div class="auth-links">
            <button class="link-btn" id="authGoReset">Forgot password?</button>
            <button class="link-btn" id="authGoSignup">Need an account? Sign up</button>
          </div>
        `)}
      </div>
    `);

    UI.busyClick(document.getElementById('authSubmit'), 'Logging in...', async () => {
      const email = document.getElementById('authEmail').value.trim();
      const password = document.getElementById('authPassword').value;
      if (!email || !password) { UI.toast('Enter your email and password.', 'err'); return; }
      try {
        await Auth.signIn(email, password);
        UI.toast('Welcome back.', 'ok');
      } catch (err) {
        UI.toast(err.message, 'err');
      }
    });

    document.getElementById('authGoReset').addEventListener('click', () => this.reset());
    document.getElementById('authGoSignup').addEventListener('click', () => this.signup());
  },

  signup() {
    UI.render(`
      ${UI.head('Get Started', 'Create Your Account', 'Free — takes about a minute.')}
      <div class="auth-card">
        ${UI.panel('', `
          <label for="authName">Name</label>
          <input type="text" id="authName" autocomplete="name" placeholder="Jamie Rivera">

          <label for="authEmail">Email</label>
          <input type="email" id="authEmail" autocomplete="email" placeholder="you@example.com">

          <label for="authPassword">Password</label>
          <input type="password" id="authPassword" autocomplete="new-password" placeholder="At least 6 characters">

          <div class="btn-row">
            <button class="btn" id="authSubmit">Create Account</button>
          </div>

          <div class="auth-links">
            <button class="link-btn" id="authGoLogin">Already have an account? Log in</button>
          </div>
        `)}
      </div>
    `);

    UI.busyClick(document.getElementById('authSubmit'), 'Creating account...', async () => {
      const name = document.getElementById('authName').value.trim();
      const email = document.getElementById('authEmail').value.trim();
      const password = document.getElementById('authPassword').value;
      if (!email || !password) { UI.toast('Enter your email and password.', 'err'); return; }
      if (password.length < 6) { UI.toast('Password must be at least 6 characters.', 'err'); return; }
      try {
        const { session } = await Auth.signUp(email, password, name);
        UI.toast(
          session ? 'Account created. Welcome to HirePilot.' : 'Account created — check your email to confirm it, then log in.',
          'ok'
        );
        if (!session) this.login();
      } catch (err) {
        UI.toast(err.message, 'err');
      }
    });

    document.getElementById('authGoLogin').addEventListener('click', () => this.login());
  },

  reset() {
    UI.render(`
      ${UI.head('Password Reset', 'Reset Your Password', 'We\'ll email you a link to set a new one.')}
      <div class="auth-card">
        ${UI.panel('', `
          <label for="authEmail">Email</label>
          <input type="email" id="authEmail" autocomplete="email" placeholder="you@example.com">

          <div class="btn-row">
            <button class="btn" id="authSubmit">Send Reset Link</button>
          </div>

          <div class="auth-links">
            <button class="link-btn" id="authGoLogin">Back to log in</button>
          </div>
        `)}
      </div>
    `);

    UI.busyClick(document.getElementById('authSubmit'), 'Sending...', async () => {
      const email = document.getElementById('authEmail').value.trim();
      if (!email) { UI.toast('Enter your email.', 'err'); return; }
      try {
        await Auth.resetPassword(email);
        UI.toast('Check your inbox for a reset link.', 'ok');
      } catch (err) {
        UI.toast(err.message, 'err');
      }
    });

    document.getElementById('authGoLogin').addEventListener('click', () => this.login());
  },
};
