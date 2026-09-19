// ============================================================
// tmdb.js — TMDB API wrapper
// ============================================================

import { getSetting, getCachedMetadata, setCachedMetadata } from './supabase.js';

const IMG_BASE = 'https://image.tmdb.org/t/p/';

let cachedToken = null;

async function getToken() {
  if (cachedToken) return cachedToken;
  cachedToken = await getSetting('tmdb_token');
  return cachedToken;
}

export const img = {
  poster:   (path) => path ? `${IMG_BASE}w300${path}` : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"%3E%3Crect fill="%23222" width="300" height="450"/%3E%3C/svg%3E',
  backdrop: (path) => path ? `${IMG_BASE}w1280${path}` : null,
  cast:     (path) => path ? `${IMG_BASE}w185${path}` : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 185 185"%3E%3Crect fill="%23222" width="185" height="185"/%3E%3C/svg%3E',
};

async function tmdbFetch(endpoint) {
  const token = await getToken();
  const res = await fetch(`https://api.themoviedb.org/3${endpoint}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`);
  return res.json();
}

// ── Search ────────────────────────────────────────────────────
export async function searchMulti(query) {
  if (!query?.trim()) return [];
  const data = await tmdbFetch(`/search/multi?query=${encodeURIComponent(query)}&include_adult=false`);
  return (data.results ?? []).filter(r => r.media_type === 'movie' || r.media_type === 'tv');
}

export async function getTrending() {
  const data = await tmdbFetch('/trending/all/week?language=en-US');
  return (data.results ?? []).filter(r => r.media_type === 'movie' || r.media_type === 'tv');
}

// ── Movie ─────────────────────────────────────────────────────
export async function getMovie(id) {
  const cached = await getCachedMetadata(id, 'movie');
  if (cached) return cached;
  const [detail, credits, similar] = await Promise.all([
    tmdbFetch(`/movie/${id}?language=en-US`),
    tmdbFetch(`/movie/${id}/credits?language=en-US`),
    tmdbFetch(`/movie/${id}/similar?language=en-US`),
  ]);
  const payload = { ...detail, credits, similar: similar.results ?? [] };
  await setCachedMetadata(id, 'movie', payload);
  return payload;
}

// ── TV Show ───────────────────────────────────────────────────
export async function getTVShow(id) {
  const cached = await getCachedMetadata(id, 'tv');
  if (cached) return cached;
  const [detail, credits, similar] = await Promise.all([
    tmdbFetch(`/tv/${id}?language=en-US`),
    tmdbFetch(`/tv/${id}/credits?language=en-US`),
    tmdbFetch(`/tv/${id}/similar?language=en-US`),
  ]);
  const payload = { ...detail, credits, similar: similar.results ?? [] };
  await setCachedMetadata(id, 'tv', payload);
  return payload;
}

export async function getTVSeason(showId, seasonNumber) {
  const data = await tmdbFetch(`/tv/${showId}/season/${seasonNumber}?language=en-US`);
  return data.episodes ?? [];
}

// ── Upcoming ──────────────────────────────────────────────────
export async function getUpcomingMovies() {
  const data = await tmdbFetch('/movie/upcoming?language=en-US&region=CA');
  return data.results ?? [];
}

export async function getTVAiringToday() {
  const data = await tmdbFetch('/tv/airing_today?language=en-US');
  return data.results ?? [];
}