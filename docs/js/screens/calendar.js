// ============================================================
// calendar.js — Release calendar screen
// ============================================================

import { getTitles } from '../supabase.js';
import { getUpcomingMovies, getTVShow, img } from '../tmdb.js';
import { navigate } from '../utils/router.js';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DAYS = ['S','M','T','W','T','F','S'];

export async function renderCalendar() {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="loading-spinner"></div>';

  let viewDate = new Date();
  let showAll = false;
  let releases = [];

  // Build release list from library + TMDB upcoming
  async function loadReleases() {
    const library = await getTitles();
    const items = [];

    // Upcoming movies from TMDB
    try {
      const upcoming = await getUpcomingMovies();
      const libMovieIds = new Set(library.filter(t => t.media_type === 'movie').map(t => t.tmdb_id));
      upcoming.forEach(m => {
        if (!m.release_date) return;
        const inLib = libMovieIds.has(m.id);
        if (showAll || inLib) {
          items.push({
            date: m.release_date,
            title: m.title,
            type: 'movie',
            tmdb_id: m.id,
            poster_path: m.poster_path,
            inLibrary: inLib,
            subtitle: 'Movie release',
          });
        }
      });
    } catch (e) { console.error('upcoming movies:', e); }

    // Next episodes for shows you're watching
    const watching = library.filter(t => t.media_type === 'tv' && t.status === 'watching');
    for (const show of watching) {
      try {
        const detail = await getTVShow(show.tmdb_id);
        const next = detail.next_episode_to_air;
        if (next?.air_date) {
          items.push({
            date: next.air_date,
            title: show.title,
            type: 'tv',
            tmdb_id: show.tmdb_id,
            poster_path: show.poster_path,
            inLibrary: true,
            subtitle: `S${next.season_number}E${next.episode_number} · ${next.name || 'New episode'}`,
          });
        }
      } catch (e) { console.error('next episode:', show.title, e); }
    }

    return items;
  }

  releases = await loadReleases();

  function releasesOn(dateStr) {
    return releases.filter(r => r.date === dateStr);
  }

  function render() {
    const year  = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    const startPad = first.getDay();
    const daysInMonth = last.getDate();
    const todayStr = new Date().toISOString().slice(0, 10);

    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      cells.push({ day: d, dateStr, count: releasesOn(dateStr).length, isToday: dateStr === todayStr });
    }

    const monthReleases = releases
      .filter(r => r.date?.startsWith(`${year}-${String(month+1).padStart(2,'0')}`))
      .sort((a, b) => a.date.localeCompare(b.date));

    app.innerHTML = `
      <div class="screen-header">
        <span class="screen-title">Calendar</span>
        <button id="toggle-all" style="font-size:11px;padding:4px 10px;border-radius:20px;border:1px solid var(--border);background:${showAll?'var(--accent)':'var(--card)'};color:${showAll?'#fff':'var(--muted)'};cursor:pointer;font-family:inherit;">
          ${showAll ? 'All releases' : 'My library'}
        </button>
      </div>

      <!-- Month nav -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0 16px 12px;">
        <button id="prev-month" style="background:var(--card);border:1px solid var(--border);border-radius:8px;width:32px;height:32px;color:var(--text);cursor:pointer;font-size:16px;">‹</button>
        <div style="font-weight:800;font-size:16px;">${MONTHS[month]} ${year}</div>
        <button id="next-month" style="background:var(--card);border:1px solid var(--border);border-radius:8px;width:32px;height:32px;color:var(--text);cursor:pointer;font-size:16px;">›</button>
      </div>

      <!-- Day headers -->
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;padding:0 16px 4px;">
        ${DAYS.map(d => `<div style="text-align:center;font-size:10px;font-weight:700;color:var(--muted);">${d}</div>`).join('')}
      </div>

      <!-- Calendar grid -->
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;padding:0 16px 16px;">
        ${cells.map(c => {
          if (!c) return '<div></div>';
          return `
            <button class="cal-day" data-date="${c.dateStr}"
              style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
                     background:${c.isToday ? 'var(--accent)18' : 'var(--card)'};
                     border:1px solid ${c.isToday ? 'var(--accent)' : 'var(--border)'};
                     border-radius:8px;cursor:${c.count ? 'pointer' : 'default'};
                     color:var(--text);font-family:inherit;font-size:13px;
                     ${c.count ? '' : 'opacity:0.5;'}">
              <span style="font-weight:${c.isToday ? '800' : '500'};">${c.day}</span>
              ${c.count ? `<span style="width:5px;height:5px;border-radius:50%;background:var(--accent);"></span>` : ''}
            </button>
          `;
        }).join('')}
      </div>

      <!-- Month release list -->
      <div class="section-label">${MONTHS[month].toUpperCase()} RELEASES</div>
      <div id="release-list" style="padding:0 16px 20px;">
        ${monthReleases.length ? monthReleases.map(r => `
          <div class="release-row" data-type="${r.type}" data-id="${r.tmdb_id}"
            style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer;">
            <img src="${img.poster(r.poster_path)}" style="width:40px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;" />
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:13px;">${r.title}</div>
              <div style="font-size:11px;color:var(--muted);">${r.subtitle}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div style="font-size:11px;font-weight:700;">${new Date(r.date + 'T12:00:00').toLocaleDateString('en',{month:'short',day:'numeric'})}</div>
              <div style="font-size:14px;">${r.type === 'tv' ? '📺' : '🎬'}</div>
            </div>
          </div>
        `).join('') : `<div class="error-state" style="padding:40px 20px;"><p>No releases this month.</p></div>`}
      </div>
    `;

    // Month navigation
    document.getElementById('prev-month').addEventListener('click', () => {
      viewDate = new Date(year, month - 1, 1);
      render();
    });
    document.getElementById('next-month').addEventListener('click', () => {
      viewDate = new Date(year, month + 1, 1);
      render();
    });

    // Toggle all vs library
    document.getElementById('toggle-all').addEventListener('click', async () => {
      showAll = !showAll;
      app.innerHTML = '<div class="loading-spinner"></div>';
      releases = await loadReleases();
      render();
    });

    // Day click → scroll to that day's releases
    app.querySelectorAll('.cal-day').forEach(btn => {
      btn.addEventListener('click', () => {
        const dayReleases = releasesOn(btn.dataset.date);
        if (!dayReleases.length) return;
        const listEl = document.getElementById('release-list');
        listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Release row click → detail page
    app.querySelectorAll('.release-row').forEach(row => {
      row.addEventListener('click', () =>
        navigate(`/title/${row.dataset.type}/${row.dataset.id}`)
      );
    });
  }

  render();
}