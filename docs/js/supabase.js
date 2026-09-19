// ============================================================
// supabase.js — database client + auth + all DB operations
// ============================================================

const SUPABASE_URL = 'https://cazhvtvmtucegajvwhwp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_8Dp4Bd51yLI69q6hJM2nDA__bbS8dBz';

const { createClient } = window.supabase ?? supabase;
export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Auth ──────────────────────────────────────────────────────
export async function getSession() {
  const { data } = await db.auth.getSession();
  return data.session;
}

export async function sendOTP(email) {
  const { error } = await db.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false }
  });
  if (error) throw error;
}

export async function verifyOTP(email, token) {
  const { data, error } = await db.auth.verifyOtp({
    email, token, type: 'email'
  });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  await db.auth.signOut();
}

// ── Settings ─────────────────────────────────────────────────
export async function getSetting(key) {
  const { data } = await db.from('settings').select('value').eq('key', key).single();
  return data?.value ?? null;
}

export async function setSetting(key, value) {
  await db.from('settings').upsert({ key, value });
}

// ── Titles (library) ─────────────────────────────────────────
export async function getTitles(status = null) {
  let query = db.from('titles').select('*').order('date_added', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) console.error('getTitles:', error);
  return data ?? [];
}

export async function getTitle(tmdbId, mediaType) {
  const { data } = await db.from('titles').select('*')
    .eq('tmdb_id', tmdbId).eq('media_type', mediaType).single();
  return data ?? null;
}

export async function addTitle(title) {
  const { data, error } = await db.from('titles').insert(title).select().single();
  if (error) console.error('addTitle:', error);
  return data;
}

export async function updateTitle(id, updates) {
  const { error } = await db.from('titles').update(updates).eq('id', id);
  if (error) console.error('updateTitle:', error);
}

export async function deleteTitle(id) {
  await db.from('titles').delete().eq('id', id);
}

// ── Episode progress ──────────────────────────────────────────
export async function getEpisodeProgress(titleId) {
  const { data } = await db.from('episode_progress').select('*')
    .eq('title_id', titleId).order('season_number').order('episode_number');
  return data ?? [];
}

export async function markEpisodeWatched(titleId, season, episode, runtimeMinutes, watched = true) {
  await db.from('episode_progress').upsert({
    title_id: titleId,
    season_number: season,
    episode_number: episode,
    runtime_minutes: runtimeMinutes,
    watched,
    watched_at: watched ? new Date().toISOString() : null,
  }, { onConflict: 'title_id,season_number,episode_number' });

  if (watched && runtimeMinutes) {
    await db.from('watch_sessions').insert({
      title_id: titleId,
      media_type: 'episode',
      duration_minutes: runtimeMinutes,
    });
  }
}

// ── Watch sessions ────────────────────────────────────────────
export async function logMovieWatched(titleId, runtimeMinutes) {
  await db.from('watch_sessions').insert({
    title_id: titleId,
    media_type: 'movie',
    duration_minutes: runtimeMinutes,
  });
}

export async function getWatchStats() {
  const { data } = await db.from('watch_sessions').select('media_type, duration_minutes, watched_at');
  if (!data) return { totalMinutes: 0, movieMinutes: 0, tvMinutes: 0, byDay: {} };

  const totalMinutes = data.reduce((s, r) => s + (r.duration_minutes ?? 0), 0);
  const movieMinutes = data.filter(r => r.media_type === 'movie').reduce((s, r) => s + (r.duration_minutes ?? 0), 0);
  const tvMinutes = totalMinutes - movieMinutes;

  const byDay = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    byDay[d.toISOString().slice(0, 10)] = 0;
  }
  data.forEach(r => {
    const day = r.watched_at?.slice(0, 10);
    if (day && byDay[day] !== undefined) byDay[day] += r.duration_minutes ?? 0;
  });

  return { totalMinutes, movieMinutes, tvMinutes, byDay };
}

// ── Metadata cache ────────────────────────────────────────────
export async function getCachedMetadata(tmdbId, mediaType) {
  const { data } = await db.from('metadata_cache').select('data, expires_at')
    .eq('tmdb_id', tmdbId).eq('media_type', mediaType).single();
  if (!data) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  return data.data;
}

export async function setCachedMetadata(tmdbId, mediaType, payload) {
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  await db.from('metadata_cache').upsert({
    tmdb_id: tmdbId,
    media_type: mediaType,
    data: payload,
    cached_at: new Date().toISOString(),
    expires_at: expires.toISOString(),
  }, { onConflict: 'tmdb_id,media_type' });
}