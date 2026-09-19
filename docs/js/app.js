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
  const session = await getSession();

  if (!session) {
    // Not logged in — show login screen, no nav
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