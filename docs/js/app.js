// ============================================================
// app.js — entry point
// ============================================================

import { initRouter, registerRoute } from './utils/router.js';
import { renderNav, updateNavActive } from './components/nav.js';
import { getSession } from './supabase.js';
import { renderLogin } from './screens/login.js';

import { renderDashboard }  from './screens/dashboard.js';
import { renderSearch }     from './screens/search.js';
import { renderDetail }     from './screens/detail.js';
import { renderLibrary }    from './screens/library.js';
import { renderCalendar }   from './screens/calendar.js';
import { renderSettings }   from './screens/settings.js';

async function boot() {
  // Handle magic link redirect — Supabase puts tokens in the URL hash
  const hash = window.location.hash;
  if (hash.includes('access_token') || hash.includes('error=')) {
    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const error = params.get('error_description');

    if (error) {
      // Link expired — clear hash and show login with message
      window.location.hash = '';
      renderLogin('Link expired. Please request a new one.');
      return;
    }

    if (accessToken && refreshToken) {
      // Set the session from the magic link tokens
      const { db } = await import('./supabase.js');
      await db.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      window.location.hash = '/';
      window.location.reload();
      return;
    }
  }

  const session = await getSession();

  if (!session) {
    renderLogin();
    return;
  }

  // Logged in — register routes and start router
  registerRoute('/',                renderDashboard);
  registerRoute('/search',          renderSearch);
  registerRoute('/library',         renderLibrary);
  registerRoute('/calendar',        renderCalendar);
  registerRoute('/settings',        renderSettings);
  registerRoute('/title/:type/:id', renderDetail);

  window.addEventListener('hashchange', updateNavActive);

  renderNav();
  initRouter();
}

boot();