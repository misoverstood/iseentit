// ============================================================
// nav.js — bottom navigation bar
// ============================================================

import { navigate, getCurrentPath } from '../utils/router.js';

const NAV_ITEMS = [
  { path: '/',         icon: '◈', label: 'Dashboard' },
  { path: '/search',   icon: '⊕', label: 'Search'    },
  { path: '/library',  icon: '▣', label: 'Library'   },
  { path: '/calendar', icon: '◷', label: 'Calendar'  },
  { path: '/settings', icon: '⚙', label: 'Settings'  },
];

export function renderNav() {
  const existing = document.getElementById('main-nav');
  if (existing) existing.remove();

  const nav = document.createElement('nav');
  nav.id = 'main-nav';
  nav.innerHTML = NAV_ITEMS.map(item => `
    <button class="nav-item ${getCurrentPath() === item.path ? 'active' : ''}"
            data-path="${item.path}">
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
    </button>
  `).join('');

  nav.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.path));
  });

  document.body.appendChild(nav);
}

export function updateNavActive() {
  const path = getCurrentPath();
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.path === path);
  });
}