// ============================================================
// release-alerts.mjs — daily Pushover alert for release days
//
// Reads Watching TV shows and Plan to Watch movies from Supabase,
// checks TMDB for anything airing/releasing today (Toronto time),
// and sends one Pushover message listing it. Sends nothing on quiet
// days unless FORCE=true, in which case it sends an "upcoming" summary.
// Runs on Node 20+ (native fetch), no dependencies.
// ============================================================

const {
  SUPABASE_URL, SUPABASE_SERVICE_KEY, TMDB_TOKEN,
  PUSHOVER_TOKEN, PUSHOVER_USER, FORCE,
} = process.env;

for (const [k, v] of Object.entries({ SUPABASE_URL, SUPABASE_SERVICE_KEY, TMDB_TOKEN, PUSHOVER_TOKEN, PUSHOVER_USER })) {
  if (!v) { console.error(`Missing env ${k}`); process.exit(1); }
}

const APP_URL = 'https://iseentit.com/';
const TZ = 'America/Toronto';
const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); // YYYY-MM-DD
const force = String(FORCE).toLowerCase() === 'true';

console.log(`Today (${TZ}): ${today}  force=${force}`);

// ── Supabase ──────────────────────────────────────────────────
const sbHeaders = { apikey: SUPABASE_SERVICE_KEY, Accept: 'application/json' };
if (SUPABASE_SERVICE_KEY.startsWith('eyJ')) sbHeaders.Authorization = `Bearer ${SUPABASE_SERVICE_KEY}`; // legacy JWT keys need this too

async function getTitles() {
  const url = `${SUPABASE_URL}/rest/v1/titles?select=id,tmdb_id,media_type,title,status&status=in.(watching,plan_to_watch)`;
  const r = await fetch(url, { headers: sbHeaders });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

// ── TMDB ──────────────────────────────────────────────────────
async function tmdb(path) {
  const r = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}`, Accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`TMDB ${r.status} on ${path}`);
  return r.json();
}

const RELEASE_TYPES = { 1: 'Premiere', 2: 'Limited theatrical', 3: 'Theatrical', 4: 'Digital', 5: 'Physical', 6: 'TV' };

function daysUntil(dateStr) {
  const a = new Date(`${today}T00:00:00Z`), b = new Date(`${dateStr}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}
function fmtWhen(dateStr) {
  const d = daysUntil(dateStr);
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  return `in ${d} days (${dateStr})`;
}

// ── Main ──────────────────────────────────────────────────────
const titles = await getTitles();
console.log(`Loaded ${titles.length} titles`);

const todayLines = [];
const upcoming = []; // { when, line }

for (const t of titles) {
  try {
    if (t.media_type === 'tv' && t.status === 'watching') {
      const show = await tmdb(`/tv/${t.tmdb_id}`);
      for (const ep of [show.next_episode_to_air, show.last_episode_to_air]) {
        if (!ep?.air_date) continue;
        const tag = `S${ep.season_number}E${ep.episode_number}${ep.name ? ` · ${ep.name}` : ''}`;
        if (ep.air_date === today) {
          todayLines.push(`📺 <b>${t.title}</b> ${tag} airs today`);
        } else if (ep === show.next_episode_to_air && daysUntil(ep.air_date) > 0) {
          upcoming.push({ when: ep.air_date, line: `📺 ${t.title} ${tag} ${fmtWhen(ep.air_date)}` });
        }
      }
      if (!show.next_episode_to_air) console.log(`  ${t.title}: no next episode scheduled`);
    }

    if (t.media_type === 'movie' && t.status === 'plan_to_watch') {
      const rel = await tmdb(`/movie/${t.tmdb_id}/release_dates`);
      const region = rel.results?.find(r => r.iso_3166_1 === 'CA') ?? rel.results?.find(r => r.iso_3166_1 === 'US');
      const dates = (region?.release_dates ?? [])
        .filter(d => d.type === 3 || d.type === 4)
        .map(d => ({ date: d.release_date.slice(0, 10), type: RELEASE_TYPES[d.type] }));
      let matched = false;
      for (const d of dates) {
        if (d.date === today) { todayLines.push(`🎬 <b>${t.title}</b> ${d.type.toLowerCase()} release today`); matched = true; }
        else if (daysUntil(d.date) > 0) upcoming.push({ when: d.date, line: `🎬 ${t.title} ${d.type.toLowerCase()} ${fmtWhen(d.date)}` });
      }
      if (!dates.length) console.log(`  ${t.title}: no CA/US theatrical or digital dates on TMDB`);
      void matched;
    }
  } catch (err) {
    console.error(`  ${t.title}: ${err.message}`);
  }
}

// ── Compose ───────────────────────────────────────────────────
let message = null, title = null;

if (todayLines.length) {
  title = `iseentit · ${todayLines.length} release${todayLines.length > 1 ? 's' : ''} today`;
  message = todayLines.join('\n');
} else if (force) {
  upcoming.sort((a, b) => a.when.localeCompare(b.when));
  title = 'iseentit · nothing today';
  message = upcoming.length
    ? `Nothing releases today. Next up:\n${upcoming.slice(0, 8).map(u => u.line).join('\n')}`
    : 'Nothing releases today and nothing is scheduled on TMDB for your Watching shows or Plan to Watch movies.';
}

if (!message) { console.log('Nothing today, no notification sent.'); process.exit(0); }

console.log(`Sending:\n${title}\n${message.replace(/<\/?b>/g, '')}`);

// ── Pushover ──────────────────────────────────────────────────
const body = new URLSearchParams({
  token: PUSHOVER_TOKEN, user: PUSHOVER_USER,
  title, message, html: '1',
  url: APP_URL, url_title: 'Open iseentit',
  priority: todayLines.length ? '0' : '-1',
});
const r = await fetch('https://api.pushover.net/1/messages.json', { method: 'POST', body });
const json = await r.json().catch(() => ({}));
if (!r.ok || json.status !== 1) { console.error('Pushover error:', r.status, json); process.exit(1); }
console.log('Pushover accepted, request', json.request);
