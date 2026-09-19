// ============================================================
// library.js — My Library screen
// ============================================================

import { getTitles, updateTitle, deleteTitle } from '../supabase.js';
import { img } from '../tmdb.js';
import { navigate } from '../utils/router.js';
import { STATUSES } from '../utils/status.js';

export async function renderLibrary() {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="loading-spinner"></div>';

  const all = await getTitles();
  let activeStatus = 'watching';
  let activeType = 'all';

  function renderList() {
    const filtered = all.filter(t =>
      t.status === activeStatus &&
      (activeType === 'all' || t.media_type === activeType)
    );

    const listEl = document.getElementById('library-list');
    if (!listEl) return;

    if (!filtered.length) {
      listEl.innerHTML = `<div class="error-state"><p>Nothing here yet.</p></div>`;
      return;
    }

    listEl.innerHTML = `<div class="poster-grid">${filtered.map(t => `
      <div class="poster-card" data-id="${t.id}" data-tmdb="${t.tmdb_id}" data-type="${t.media_type}">
        <img src="${img.poster(t.poster_path)}" alt="${t.title}" loading="lazy" />
        <div class="poster-info">
          <div class="poster-title">${t.title}</div>
          <div class="poster-year" style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:var(--muted);font-size:10px;">${t.year || ''}</span>
            <span style="font-size:10px;">${t.media_type === 'tv' ? '📺' : '🎬'}</span>
          </div>
          ${t.user_rating ? `<div class="poster-rating">★ ${t.user_rating}</div>` : ''}
        </div>
      </div>
    `).join('')}</div>`;

    listEl.querySelectorAll('.poster-card').forEach(card => {
      card.addEventListener('click', () =>
        navigate(`/title/${card.dataset.type}/${card.dataset.tmdb}`)
      );
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, card, all, renderList);
      });
    });
  }

  app.innerHTML = `
    <div class="screen-header">
      <span class="screen-title">Library</span>
      <div style="display:flex;gap:6px;">
        <button class="type-btn ${activeType==='all'?'active':''}" data-type="all" style="font-size:11px;padding:4px 10px;border-radius:20px;border:1px solid var(--border);background:${activeType==='all'?'var(--accent)':'var(--card)'};color:${activeType==='all'?'#fff':'var(--muted)'};cursor:pointer;">All</button>
        <button class="type-btn" data-type="movie" style="font-size:11px;padding:4px 10px;border-radius:20px;border:1px solid var(--border);background:var(--card);color:var(--muted);cursor:pointer;">🎬</button>
        <button class="type-btn" data-type="tv" style="font-size:11px;padding:4px 10px;border-radius:20px;border:1px solid var(--border);background:var(--card);color:var(--muted);cursor:pointer;">📺</button>
      </div>
    </div>

    <div class="tab-bar">
      ${STATUSES.map(s => `
        <button class="tab ${s.key === activeStatus ? 'active' : ''}" data-status="${s.key}">
          ${s.label} <span style="opacity:0.6;font-size:10px;">${all.filter(t=>t.status===s.key).length}</span>
        </button>
      `).join('')}
    </div>

    <div id="library-list"></div>
  `;

  renderList();

  app.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      app.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeStatus = tab.dataset.status;
      renderList();
    });
  });

  app.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeType = btn.dataset.type;
      app.querySelectorAll('.type-btn').forEach(b => {
        b.style.background = 'var(--card)';
        b.style.color = 'var(--muted)';
      });
      btn.style.background = 'var(--accent)';
      btn.style.color = '#fff';
      renderList();
    });
  });
}

function showContextMenu(e, card, all, renderList) {
  document.getElementById('ctx-menu')?.remove();

  const entry = all.find(t => t.id === card.dataset.id);
  if (!entry) return;

  const menu = document.createElement('div');
  menu.id = 'ctx-menu';
  menu.style.cssText = `position:fixed;top:${e.clientY}px;left:${e.clientX}px;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:6px;z-index:999;min-width:160px;box-shadow:0 8px 24px rgba(0,0,0,0.3);`;

  const actions = [
    ...STATUSES.filter(s => s.key !== entry.status).map(s => ({
      label: `Move to ${s.label}`,
      action: async () => {
        await updateTitle(entry.id, { status: s.key });
        entry.status = s.key;
        renderList();
      }
    })),
    { label: '🗑 Remove', action: async () => {
      await deleteTitle(entry.id);
      all.splice(all.indexOf(entry), 1);
      renderList();
    }, danger: true },
  ];

  menu.innerHTML = actions.map((a, i) => `
    <button data-i="${i}" style="display:block;width:100%;text-align:left;padding:8px 12px;border:none;background:none;color:${a.danger?'#e05':'var(--text)'};font-family:inherit;font-size:13px;cursor:pointer;border-radius:6px;">
      ${a.label}
    </button>
  `).join('');

  menu.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('mouseenter', () => btn.style.background = 'var(--card2)');
    btn.addEventListener('mouseleave', () => btn.style.background = 'none');
    btn.addEventListener('click', () => { actions[btn.dataset.i].action(); menu.remove(); });
  });

  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
}