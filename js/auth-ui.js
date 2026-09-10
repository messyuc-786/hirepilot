/* ============================================================
   auth-ui.js — Sign up / log in / reset password screens.

   Rendered into the same #views container Features.* uses. All
   three screens share one illustrated shell (_shell) — a career
   visual + message on one side, the actual form on the other —
   so the layout is written once, not three times, and Login/
   Signup/Reset always stay visually consistent with each other.
   ============================================================ */

const AuthUI = {

  /* icon+text bullets shown beside the illustration (desktop only —
     hidden on mobile to keep the auth screen compact there). */
  _bullets: [
    ['doc', 'Stronger Resumes'],
    ['target', 'Smarter Job Search'],
    ['bars', 'Stand Out with AI'],
    ['bolt', 'A Brighter Future'],
  ],

  /* One shared shell: illustration + headline + bullets + quote on
     the left, the screen-specific form on the right. */
  _shell(eyebrow, title, sub, formHTML) {
    return `
      <div class="auth-shell">
        <div class="auth-visual-col">
          <div class="eyebrow">${UI.escape(eyebrow)}</div>
          <h1>${UI.escape(title)}</h1>
          <p class="muted">${UI.escape(sub)}</p>
          <div class="auth-visual-img">
            <img src="img/13_login_hero.jpg" alt="A career-focused illustration of someone planning their next move, surrounded by notes reading Better Resume, More Opportunities, Dream Job" loading="lazy">
          </div>
          <div class="auth-bullets">
            ${this._bullets.map(([icon, label]) => `
              <div class="bullet">${UI.icon(icon, 16)}<span>${UI.escape(label)}</span></div>
            `).join('')}
          </div>
          <p class="auth-quote">"A great career isn't about luck — it's about preparation."</p>
        </div>
        <div class="auth-form-col">
          <div class="auth-card">
            ${formHTML}
          </div>
        </div>
      </div>
      <div class="app-footer">Created by Urvashi Chandan</div>
    `;
  },

  login() {
    UI.render(this._shell(
      'Welcome back',
      'Your Career Journey Matters',
      'Plan better. Prepare smarter. Get hired.',
      `${UI.panel('', `
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
      `)}`
    ));

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
    UI.render(this._shell(
      'Get started',
      'Same You. A Brighter Tomorrow.',
      'Free to begin — takes about a minute.',
      `${UI.panel('', `
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
      `)}`
    ));

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
    UI.render(this._shell(
      'Password reset',
      'Get Back Into Your Account',
      "We'll email you a link to set a new password.",
      `${UI.panel('', `
        <label for="authEmail">Email</label>
        <input type="email" id="authEmail" autocomplete="email" placeholder="you@example.com">

        <div class="btn-row">
          <button class="btn" id="authSubmit">Send Reset Link</button>
        </div>

        <div class="auth-links">
          <button class="link-btn" id="authGoLogin">Back to log in</button>
        </div>
      `)}`
    ));

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
