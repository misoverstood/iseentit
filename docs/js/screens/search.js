// ============================================================
// search.js — Search & Discover screen
// ============================================================

import { searchMulti, getTrending, img } from '../tmdb.js';
import { navigate } from '../utils/router.js';

export async function renderSearch() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="screen-header">
      <span class="screen-title">Search</span>
    </div>
    <div class="search-bar">
      <span class="search-icon">⊕</span>
      <input type="text" id="search-input" placeholder="Movies, TV shows..." autocomplete="off" />
    </div>
    <div class="tab-bar">
      <button class="tab active" data-filter="all">All</button>
      <button class="tab" data-filter="movie">Movies</button>
      <button class="tab" data-filter="tv">TV Shows</button>
    </div>
    <div id="search-results"></div>
  `;

  let currentFilter = 'all';
  let currentResults = [];
  let debounceTimer = null;

  const input    = document.getElementById('search-input');
  const results  = document.getElementById('search-results');
  const tabs     = app.querySelectorAll('.tab');

  function renderGrid(items) {
    const filtered = currentFilter === 'all'
      ? items
      : items.filter(r => r.media_type === currentFilter);

    if (!filtered.length) {
      results.innerHTML = '<div class="error-state"><p>No results found.</p></div>';
      return;
    }

    results.innerHTML = `<div class="poster-grid">${filtered.map(r => `
      <div class="poster-card" data-id="${r.id}" data-type="${r.media_type}">
        <img src="${img.poster(r.poster_path)}" alt="${r.title || r.name}" loading="lazy" />
        <div class="poster-info">
          <div class="poster-title">${r.title || r.name}</div>
          <div class="poster-year" style="display:flex; justify-content:space-between;">
            <span>${(r.release_date || r.first_air_date || '').slice(0,4)}</span>
            ${r.vote_average ? `<span class="poster-rating">★ ${r.vote_average.toFixed(1)}</span>` : ''}
          </div>
        </div>
      </div>
    `).join('')}</div>`;

    results.querySelectorAll('.poster-card[data-id]').forEach(card => {
      card.addEventListener('click', () =>
        navigate(`/title/${card.dataset.type}/${card.dataset.id}`)
      );
    });
  }

  async function doSearch(query) {
    results.innerHTML = '<div class="loading-spinner"></div>';
    try {
      currentResults = query.trim()
        ? await searchMulti(query)
        : await getTrending();
      renderGrid(currentResults);
    } catch (e) {
      results.innerHTML = '<div class="error-state"><p>Search failed. Check your connection.</p></div>';
    }
  }

  // Load trending on open
  doSearch('');

  // Debounced search on input
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => doSearch(input.value), 300);
  });

  // Filter tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderGrid(currentResults);
    });
  });

  input.focus();
}