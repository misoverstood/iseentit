// ============================================================
// app.js — entry point
// ============================================================

import { initRouter, registerRoute } from './utils/router.js';
import { renderNav, updateNavActive } from './components/nav.js';

import { renderDashboard }  from './screens/dashboard.js';
import { renderSearch }     from './screens/search.js';
import { renderDetail }     from './screens/detail.js';
import { renderLibrary }    from './screens/library.js';
import { renderCalendar }   from './screens/calendar.js';
import { renderSettings }   from './screens/settings.js';

// Register all routes
registerRoute('/',                    renderDashboard);
registerRoute('/search',              renderSearch);
registerRoute('/library',             renderLibrary);
registerRoute('/calendar',            renderCalendar);
registerRoute('/settings',            renderSettings);
registerRoute('/title/:type/:id',     renderDetail);

// Re-render nav active state on every route change
window.addEventListener('hashchange', updateNavActive);

// Boot
renderNav();
initRouter();