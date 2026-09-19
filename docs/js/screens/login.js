// ============================================================
// login.js — magic link login screen
// ============================================================

import { sendOTP } from '../supabase.js';

export async function renderLogin(message = '') {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
      <div style="width:100%;max-width:360px;">

        <div style="text-align:center;margin-bottom:40px;">
          <div style="font-size:48px;margin-bottom:12px;">🎬</div>
          <div style="font-size:28px;font-weight:900;letter-spacing:-1px;">iseentit</div>
          <div style="font-size:13px;color:var(--muted);margin-top:4px;">Your personal TV &amp; movie tracker</div>
        </div>

        <div id="step-email">
          ${message ? `<div style="color:#e05;font-size:13px;margin-bottom:12px;text-align:center;">${message}</div>` : ''}
          <div style="font-size:13px;color:var(--muted);margin-bottom:12px;text-align:center;">
            Enter your email to receive a sign-in link
          </div>
          <input id="email-input" type="email" placeholder="your@email.com"
            style="width:100%;padding:14px 16px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:inherit;font-size:15px;outline:none;margin-bottom:12px;" />
          <button id="btn-send-otp" class="btn btn-primary" style="width:100%;justify-content:center;padding:14px;">
            Send sign-in link
          </button>
          <div id="email-error" style="color:#e05;font-size:12px;margin-top:8px;text-align:center;"></div>
        </div>

        <div id="step-sent" style="display:none;text-align:center;">
          <div style="font-size:40px;margin-bottom:12px;">📬</div>
          <div style="font-weight:700;font-size:15px;margin-bottom:6px;">Check your email</div>
          <div style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:20px;">
            We sent a sign-in link to<br /><strong id="sent-email" style="color:var(--text);"></strong>
          </div>
          <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:20px;">
            Click the link in the email to sign in. The link expires in 10 minutes and can only be used once.
          </div>
          <button id="btn-back" class="btn btn-secondary" style="width:100%;justify-content:center;padding:12px;">
            Use a different email
          </button>
        </div>

      </div>
    </div>
  `;

  const emailInput = document.getElementById('email-input');
  const stepEmail  = document.getElementById('step-email');
  const stepSent   = document.getElementById('step-sent');
  const emailError = document.getElementById('email-error');

  document.getElementById('btn-send-otp').addEventListener('click', async () => {
    const btn = document.getElementById('btn-send-otp');
    emailError.textContent = '';
    const email = emailInput.value.trim();
    if (!email) { emailError.textContent = 'Enter your email.'; return; }
    btn.textContent = 'Sending...';
    btn.disabled = true;
    try {
      await sendOTP(email);
      document.getElementById('sent-email').textContent = email;
      stepEmail.style.display = 'none';
      stepSent.style.display = 'block';
    } catch (e) {
      emailError.textContent = e.message || 'Failed to send link.';
      btn.textContent = 'Send sign-in link';
      btn.disabled = false;
    }
  });

  document.getElementById('btn-back').addEventListener('click', () => {
    stepSent.style.display = 'none';
    stepEmail.style.display = 'block';
    emailInput.value = '';
    emailError.textContent = '';
  });

  emailInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-send-otp').click();
  });

  emailInput.focus();
}