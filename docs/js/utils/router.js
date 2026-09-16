// ============================================================
// router.js — hash-based client-side router
// ============================================================

const routes = {};
let currentCleanup = null;

export function registerRoute(pattern, handler) {
  routes[pattern] = handler;
}

export function navigate(path) {
  window.location.hash = path;
}

export function getCurrentPath() {
  return window.location.hash.slice(1) || '/';
}

function matchRoute(path) {
  for (const [pattern, handler] of Object.entries(routes)) {
    const regexStr = pattern
      .replace(/:[^/]+/g, '([^/]+)')
      .replace(/\//g, '\\/');
    const match = path.match(new RegExp(`^${regexStr}$`));
    if (match) {
      return { handler, params: match.slice(1) };
    }
  }
  return null;
}

async function handleRoute() {
  const path = getCurrentPath();
  const app = document.getElementById('app');

  if (typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }

  const matched = matchRoute(path);
  if (matched) {
    app.innerHTML = '<div class="loading-spinner"></div>';
    currentCleanup = await matched.handler(...matched.params) ?? null;
  } else {
    app.innerHTML = '<div class="error-state"><p>Page not found.</p></div>';
  }
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}