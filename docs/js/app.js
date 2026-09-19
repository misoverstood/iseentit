// ============================================================
// app.js — entry point
// ============================================================

import { initRouter, registerRoute } from './utils/router.js';
import { renderNav, updateNavActive } from './components/nav.js';
import { db } from './supabase.js';
import { renderLogin } from './screens/login.js';

import { renderDashboard }  from './screens/dashboard.js';
import { renderSearch }     from './screens/search.js';
import { renderDetail }     from './screens/detail.js';
import { renderLibrary }    from './screens/library.js';
import { renderCalendar }   from './screens/calendar.js';
import { renderSettings }   from './screens/settings.js';

function startApp() {
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

async function boot() {
  const { data, error } = await db.auth.getSession();

  if (error || !data?.session?.access_token) {
    document.getElementById('main-nav')?.remove();
    renderLogin();
    return;
  }

  startApp();
}

// Re-boot on auth state change (login / logout / token refresh)
db.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    document.getElementById('main-nav')?.remove();
    renderLogin();
  }
});

boot();