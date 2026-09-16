// ============================================================
// detail.js — Movie / TV Show detail page
// ============================================================

import { getMovie, getTVShow, getTVSeason, img } from '../tmdb.js';
import { getTitle, addTitle, updateTitle, getEpisodeProgress, markEpisodeWatched, logMovieWatched } from '../supabase.js';
import { navigate } from '../utils/router.js';

export async function renderDetail(mediaType, tmdbId) {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="loading-spinner"></div>';

  const id = parseInt(tmdbId);
  const data = mediaType === 'movie' ? await getMovie(id) : await getTVShow(id);
  const inLibrary = await getTitle(id, mediaType);

  const year = (data.release_date || data.first_air_date || '').slice(0, 4);
  const runtime = mediaType === 'movie'
    ? (data.runtime ? `${data.runtime} min` : '')
    : (data.episode_run_time?.[0] ? `~${data.episode_run_time[0]} min/ep` : '');
  const rating = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
  const cast = (data.credits?.cast || []).slice(0, 10);
  const similar = (data.similar || []).slice(0, 8);
  const genres = (data.genres || []).map(g => g.name).join(' · ');

  app.innerHTML = `
    <!-- Hero backdrop -->
    <div style="position:relative; height:220px; overflow:hidden; background:var(--card);">
      ${data.backdrop_path
        ? `<img src="${img.backdrop(data.backdrop_path)}" style="width:100%;height:100%;object-fit:cover;opacity:0.5;" />`
        : ''}
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom, transparent 40%, var(--bg) 100%);"></div>
      <button onclick="history.back()" style="position:absolute;top:16px;left:16px;background:rgba(0,0,0,0.5);border:none;color:white;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;">‹</button>
    </div>

    <!-- Poster + basic info -->
    <div style="display:flex;gap:16px;padding:0 16px;margin-top:-60px;position:relative;">
      <img src="${img.poster(data.poster_path)}" style="width:100px;height:150px;object-fit:cover;border-radius:8px;flex-shrink:0;box-shadow:0 4px 20px rgba(0,0,0,0.4);" />
      <div style="padding-top:70px;">
        <div style="font-size:18px;font-weight:800;line-height:1.2;">${data.title || data.name}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px;">${year}${runtime ? ' · ' + runtime : ''}${genres ? ' · ' + genres : ''}</div>
        <div style="font-size:13px;color:#f5c518;margin-top:4px;">★ ${rating} <span style="color:var(--muted);">TMDB</span></div>
      </div>
    </div>

    <!-- Add to library / status -->
    <div style="padding:16px;" id="library-section">
      ${renderLibrarySection(inLibrary, mediaType)}
    </div>

    <!-- Overview -->
    ${data.overview ? `
      <div class="section-label">SYNOPSIS</div>
      <div style="padding:0 16px 16px;font-size:13px;color:var(--muted);line-height:1.6;">${data.overview}</div>
    ` : ''}

    <!-- Cast -->
    ${cast.length ? `
      <div class="section-label">CAST</div>
      <div style="display:flex;gap:10px;padding:0 16px 16px;overflow-x:auto;scrollbar-width:none;">
        ${cast.map(c => `
          <div style="flex-shrink:0;width:70px;text-align:center;">
            <img src="${img.cast(c.profile_path)}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;background:var(--card2);" />
            <div style="font-size:10px;font-weight:600;margin-top:4px;line-height:1.2;">${c.name}</div>
            <div style="font-size:9px;color:var(--muted);">${c.character}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- TV: Seasons -->
    ${mediaType === 'tv' && inLibrary ? `
      <div class="section-label">EPISODES</div>
      <div id="seasons-section" style="padding:0 16px 16px;">
        <div class="loading-spinner" style="width:24px;height:24px;margin:20px auto;"></div>
      </div>
    ` : ''}

    <!-- Similar -->
    ${similar.length ? `
      <div class="section-label">MORE LIKE THIS</div>
      <div class="poster-grid" style="padding-bottom:20px;">
        ${similar.map(r => `
          <div class="poster-card" data-id="${r.id}" data-type="${mediaType}">
            <img src="${img.poster(r.poster_path)}" alt="${r.title || r.name}" loading="lazy" />
            <div class="poster-info">
              <div class="poster-title">${r.title || r.name}</div>
              <div class="poster-year">${(r.release_date || r.first_air_date || '').slice(0,4)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;

  // Wire up similar titles
  app.querySelectorAll('.poster-card[data-id]').forEach(card => {
    card.addEventListener('click', () =>
      navigate(`/title/${card.dataset.type}/${card.dataset.id}`)
    );
  });

  // Library button
  bindLibraryActions(app, id, mediaType, data, inLibrary);

  // Load episodes if TV and in library
  if (mediaType === 'tv' && inLibrary) {
    loadSeasons(app, data, inLibrary);
  }
}

function renderLibrarySection(entry, mediaType) {
  if (!entry) {
    return `
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-primary" id="btn-add-watching">+ Watching</button>
        <button class="btn btn-secondary" id="btn-add-plan">Plan to Watch</button>
      </div>
    `;
  }
  return `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <span class="badge badge-${entry.status}" style="font-size:12px;padding:4px 12px;">${entry.status.replace(/_/g,' ')}</span>
      <select id="status-select" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:8px;font-family:inherit;font-size:12px;">
        <option value="watching"      ${entry.status==='watching'?'selected':''}>Watching</option>
        <option value="completed"     ${entry.status==='completed'?'selected':''}>Completed</option>
        <option value="plan_to_watch" ${entry.status==='plan_to_watch'?'selected':''}>Plan to Watch</option>
        <option value="dropped"       ${entry.status==='dropped'?'selected':''}>Dropped</option>
      </select>
      ${mediaType==='movie' ? `<button class="btn btn-secondary" id="btn-log-watched" style="font-size:12px;">Log watched</button>` : ''}
      <button class="btn btn-secondary" id="btn-remove" style="font-size:12px;color:#e05;">Remove</button>
    </div>
  `;
}

function bindLibraryActions(app, id, mediaType, data, entry) {
  const year = parseInt((data.release_date || data.first_air_date || '0').slice(0,4));

  app.querySelector('#btn-add-watching')?.addEventListener('click', async () => {
    const row = await addTitle({
      tmdb_id: id, media_type: mediaType,
      title: data.title || data.name,
      poster_path: data.poster_path,
      backdrop_path: data.backdrop_path,
      year, status: 'watching',
    });
    app.querySelector('#library-section').innerHTML = renderLibrarySection(row, mediaType);
    bindLibraryActions(app, id, mediaType, data, row);
    if (mediaType === 'tv') loadSeasons(app, data, row);
  });

  app.querySelector('#btn-add-plan')?.addEventListener('click', async () => {
    const row = await addTitle({
      tmdb_id: id, media_type: mediaType,
      title: data.title || data.name,
      poster_path: data.poster_path,
      backdrop_path: data.backdrop_path,
      year, status: 'plan_to_watch',
    });
    app.querySelector('#library-section').innerHTML = renderLibrarySection(row, mediaType);
    bindLibraryActions(app, id, mediaType, data, row);
  });

  app.querySelector('#status-select')?.addEventListener('change', async (e) => {
    await updateTitle(entry.id, { status: e.target.value });
    entry.status = e.target.value;
    const badge = app.querySelector('.badge');
    if (badge) { badge.className = `badge badge-${e.target.value}`; badge.textContent = e.target.value.replace(/_/g,' '); }
  });

  app.querySelector('#btn-log-watched')?.addEventListener('click', async () => {
    await logMovieWatched(entry.id, data.runtime ?? 90);
    await updateTitle(entry.id, { status: 'completed', date_completed: new Date().toISOString() });
    alert('Logged as watched!');
  });

  app.querySelector('#btn-remove')?.addEventListener('click', async () => {
    if (!confirm('Remove from library?')) return;
    const { deleteTitle } = await import('../supabase.js');
    await deleteTitle(entry.id);
    app.querySelector('#library-section').innerHTML = renderLibrarySection(null, mediaType);
    bindLibraryActions(app, id, mediaType, data, null);
    document.getElementById('seasons-section')?.remove();
  });
}

async function loadSeasons(app, show, entry) {
  const seasonsDiv = document.getElementById('seasons-section');
  if (!seasonsDiv) return;

  const seasons = (show.seasons || []).filter(s => s.season_number > 0);
  const progress = await getEpisodeProgress(entry.id);
  const watchedSet = new Set(progress.filter(e => e.watched).map(e => `${e.season_number}-${e.episode_number}`));

  seasonsDiv.innerHTML = seasons.map((season, si) => `
    <div style="margin-bottom:8px;">
      <button class="season-toggle" data-season="${season.season_number}"
        style="width:100%;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;">
        <span>Season ${season.season_number}</span>
        <span style="color:var(--muted);font-size:11px;">${season.episode_count} episodes ▼</span>
      </button>
      <div class="episode-list" data-season="${season.season_number}" style="display:none;"></div>
    </div>
  `).join('');

  seasonsDiv.querySelectorAll('.season-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sn = parseInt(btn.dataset.season);
      const list = seasonsDiv.querySelector(`.episode-list[data-season="${sn}"]`);
      if (list.style.display === 'none') {
        list.style.display = 'block';
        if (!list.innerHTML) {
          list.innerHTML = '<div class="loading-spinner" style="width:20px;height:20px;margin:12px auto;"></div>';
          const episodes = await getTVSeason(show.id, sn);
          list.innerHTML = episodes.map(ep => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--border);">
              <input type="checkbox" class="ep-check" data-season="${sn}" data-ep="${ep.episode_number}" data-runtime="${ep.runtime || 40}"
                ${watchedSet.has(`${sn}-${ep.episode_number}`) ? 'checked' : ''}
                style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer;" />
              <div>
                <div style="font-size:12px;font-weight:600;">E${ep.episode_number} · ${ep.name}</div>
                <div style="font-size:10px;color:var(--muted);">${ep.air_date || ''} ${ep.runtime ? '· ' + ep.runtime + ' min' : ''}</div>
              </div>
            </div>
          `).join('');

          list.querySelectorAll('.ep-check').forEach(cb => {
            cb.addEventListener('change', async () => {
              const sn = parseInt(cb.dataset.season);
              const en = parseInt(cb.dataset.ep);
              const rt = parseInt(cb.dataset.runtime);
              await markEpisodeWatched(entry.id, sn, en, rt, cb.checked);
              if (cb.checked) watchedSet.add(`${sn}-${en}`);
              else watchedSet.delete(`${sn}-${en}`);
            });
          });
        }
        btn.querySelector('span:last-child').textContent = btn.querySelector('span:last-child').textContent.replace('▼','▲');
      } else {
        list.style.display = 'none';
        btn.querySelector('span:last-child').textContent = btn.querySelector('span:last-child').textContent.replace('▲','▼');
      }
    });
  });
}