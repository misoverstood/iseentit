# ============================================================
# Migrate-Excel.ps1 — builds iseentit_import.json from the
# Media_Tracker_With_API_20260311.xlsm data (10 shows, 13 movies)
#
# Usage (PowerShell 7 or Windows PowerShell 5.1):
#   .\Migrate-Excel.ps1 -TmdbToken "eyJhbGciOi..."
#
# Output: iseentit_import.json in the same folder as this script.
# Import it via Settings > Import JSON in the app.
#
# Status mapping (Excel -> app):
#   TV:     Completed -> completed | Watching -> watching | On Hold -> watching
#           Plan to Watch -> plan_to_watch | Dropped -> dropped
#   Movies: Watched / Rewatched -> completed | Watchlist -> plan_to_watch
# Episodes: the first N episodes (in S/E order, specials excluded) are marked
#           watched, where N = WATCHED EP. from the spreadsheet.
# ============================================================

param(
  [Parameter(Mandatory = $true)]
  [string]$TmdbToken
)

$ErrorActionPreference = 'Stop'
$Headers = @{ Authorization = "Bearer $TmdbToken"; accept = 'application/json' }
$Base    = 'https://api.themoviedb.org/3'
$OutFile = Join-Path $PSScriptRoot 'iseentit_import.json'

function Get-Tmdb($Path) {
  Invoke-RestMethod -Uri "$Base$Path" -Headers $Headers -Method Get
}

function Search-Title($Type, $Name, $Year) {
  $q = [uri]::EscapeDataString($Name)
  $yearParam = if ($Type -eq 'tv') { "first_air_date_year=$Year" } else { "year=$Year" }
  $r = Get-Tmdb "/search/$Type`?query=$q&$yearParam&include_adult=false&language=en-US&page=1"
  if (-not $r.results -or $r.results.Count -eq 0) {
    $r = Get-Tmdb "/search/$Type`?query=$q&include_adult=false&language=en-US&page=1"
  }
  if (-not $r.results -or $r.results.Count -eq 0) { throw "No TMDB match for $Type '$Name' ($Year)" }
  return $r.results[0]
}

function To-Iso($DateString, $Hour = 20) {
  if ([string]::IsNullOrWhiteSpace($DateString)) { return $null }
  return ([datetime]::ParseExact($DateString, 'yyyy-MM-dd', $null)).AddHours($Hour).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
}

function Parse-Rating($s) {
  if ($s -match '^(\d+)/10') { return [int]$Matches[1] }
  return $null
}

# ── Source data (from the spreadsheet) ─────────────────────────
$Shows = @(
  @{ title='Breaking Bad';        year=2008; status='completed';     watched=62; rating='10/10'; started='2023-01-10'; finished='2023-02-14'; rewatch=$true;  notes='Best TV show ever made' }
  @{ title='The Bear';            year=2022; status='watching';      watched=23; rating='9/10';  started='2024-06-01'; finished=$null;        rewatch=$true;  notes='Carmy arc is incredible' }
  @{ title='Severance';           year=2022; status='watching';      watched=11; rating='9/10';  started='2024-02-20'; finished=$null;        rewatch=$true;  notes='Lumon Industries conspiracy' }
  @{ title='Shogun';              year=2024; status='completed';     watched=10; rating='10/10'; started='2024-03-05'; finished='2024-04-09'; rewatch=$true;  notes='Masterpiece' }
  @{ title='House of the Dragon'; year=2022; status='watching';      watched=12; rating='7/10';  started='2022-08-21'; finished=$null;        rewatch=$false; notes='On Hold - Waiting for season 3' }
  @{ title='The Last of Us';      year=2023; status='completed';     watched=16; rating='9/10';  started='2023-01-15'; finished='2024-04-14'; rewatch=$true;  notes='Pedro Pascal is perfect' }
  @{ title='Succession';          year=2018; status='plan_to_watch'; watched=0;  rating=$null;   started=$null;        finished=$null;        rewatch=$false; notes="Everyone says it's amazing" }
  @{ title='Dark';                year=2017; status='completed';     watched=26; rating='10/10'; started='2023-05-01'; finished='2023-06-10'; rewatch=$true;  notes='German mind-bender' }
  @{ title='Andor';               year=2022; status='plan_to_watch'; watched=0;  rating=$null;   started=$null;        finished=$null;        rewatch=$true;  notes="Heard it's the best Star Wars" }
  @{ title='Peaky Blinders';      year=2013; status='dropped';       watched=14; rating='6/10';  started='2023-07-01'; finished=$null;        rewatch=$false; notes='Lost interest after season 3' }
)

$Movies = @(
  @{ title='Oppenheimer';                year=2023; status='completed';     watched='2023-07-22'; rating='9/10';  runtime=180; rewatch=$true;  notes='Absolutely stunning IMAX experience' }
  @{ title='Barbie';                     year=2023; status='completed';     watched='2023-07-22'; rating='8/10';  runtime=114; rewatch=$false; notes='Funnier than expected' }
  @{ title='Dune: Part Two';             year=2024; status='completed';     watched='2024-03-03'; rating='10/10'; runtime=166; rewatch=$true;  notes='Perfect sequel, visually breathtaking' }
  @{ title='Past Lives';                 year=2023; status='completed';     watched='2023-10-14'; rating='9/10';  runtime=106; rewatch=$true;  notes='Quietly devastating' }
  @{ title='Poor Things';                year=2023; status='completed';     watched='2024-01-19'; rating='8/10';  runtime=141; rewatch=$false; notes='Emma Stone is incredible' }
  @{ title='Killers of the Flower Moon'; year=2023; status='completed';     watched='2023-11-05'; rating='9/10';  runtime=206; rewatch=$true;  notes='Devastating and necessary' }
  @{ title='The Zone of Interest';       year=2023; status='completed';     watched='2024-02-10'; rating='9/10';  runtime=105; rewatch=$false; notes='Haunting and unique perspective' }
  @{ title='Alien: Romulus';             year=2024; status='completed';     watched='2024-08-16'; rating='8/10';  runtime=119; rewatch=$true;  notes='Best Alien film in decades' }
  @{ title='Wicked';                     year=2024; status='plan_to_watch'; watched=$null;        rating=$null;   runtime=160; rewatch=$false; notes='Want to watch with family' }
  @{ title='Conclave';                   year=2024; status='plan_to_watch'; watched=$null;        rating=$null;   runtime=120; rewatch=$false; notes='Heard great things' }
  @{ title='Interstellar';               year=2014; status='completed';     watched='2024-05-20'; rating='10/10'; runtime=169; rewatch=$true;  notes='3rd rewatch - still perfect' }
  @{ title='The Substance';              year=2024; status='completed';     watched='2024-09-28'; rating='8/10';  runtime=141; rewatch=$false; notes='Gloriously disgusting' }
)

# ── Build payload ──────────────────────────────────────────────
$Titles   = New-Object System.Collections.ArrayList
$Progress = New-Object System.Collections.ArrayList
$Sessions = New-Object System.Collections.ArrayList

foreach ($s in $Shows) {
  Write-Host "TV    : $($s.title)" -NoNewline
  $hit = Search-Title 'tv' $s.title $s.year
  $show = Get-Tmdb "/tv/$($hit.id)"
  $titleId = [guid]::NewGuid().ToString()
  $dateAdded = if ($s.started) { To-Iso $s.started 12 } else { (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ') }
  $dateCompleted = if ($s.status -eq 'completed') { To-Iso $s.finished } else { $null }
  $firstYear = if ($show.first_air_date) { [int]$show.first_air_date.Substring(0,4) } else { $s.year }

  [void]$Titles.Add([ordered]@{
    id = $titleId; tmdb_id = $hit.id; media_type = 'tv'; title = $show.name
    poster_path = $show.poster_path; backdrop_path = $show.backdrop_path; year = $firstYear
    status = $s.status; user_rating = (Parse-Rating $s.rating); notes = $s.notes
    rewatch = [bool]$s.rewatch; date_added = $dateAdded; date_completed = $dateCompleted
  })
  Write-Host "  -> tmdb $($hit.id) '$($show.name)'"

  if ($s.watched -gt 0) {
    $defaultRt = if ($show.episode_run_time -and $show.episode_run_time.Count -gt 0) { [int]$show.episode_run_time[0] } else { 45 }
    $remaining = $s.watched
    $seasonAt = if ($s.finished) { $s.finished } else { $s.started }
    $baseDate = [datetime]::ParseExact($seasonAt, 'yyyy-MM-dd', $null)
    $seasons = $show.seasons | Where-Object { $_.season_number -ge 1 } | Sort-Object season_number
    $i = 0
    foreach ($sn in $seasons) {
      if ($remaining -le 0) { break }
      $season = Get-Tmdb "/tv/$($hit.id)/season/$($sn.season_number)"
      foreach ($ep in ($season.episodes | Sort-Object episode_number)) {
        if ($remaining -le 0) { break }
        $rt = if ($ep.runtime) { [int]$ep.runtime } else { $defaultRt }
        $at = $baseDate.AddMinutes($i).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
        [void]$Progress.Add([ordered]@{
          id = [guid]::NewGuid().ToString(); title_id = $titleId
          season_number = $ep.season_number; episode_number = $ep.episode_number
          episode_name = $ep.name; runtime_minutes = $rt; watched = $true; watched_at = $at
        })
        [void]$Sessions.Add([ordered]@{
          id = [guid]::NewGuid().ToString(); title_id = $titleId
          media_type = 'episode'; duration_minutes = $rt; watched_at = $at
        })
        $remaining--; $i++
      }
    }
    Write-Host "         $($s.watched - $remaining)/$($s.watched) episodes marked watched"
  }
}

foreach ($m in $Movies) {
  Write-Host "MOVIE : $($m.title)" -NoNewline
  $hit = Search-Title 'movie' $m.title $m.year
  $movie = Get-Tmdb "/movie/$($hit.id)"
  $titleId = [guid]::NewGuid().ToString()
  $rt = if ($movie.runtime) { [int]$movie.runtime } else { $m.runtime }
  $watchedIso = To-Iso $m.watched
  $dateAdded = if ($watchedIso) { $watchedIso } else { (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ') }
  $relYear = if ($movie.release_date) { [int]$movie.release_date.Substring(0,4) } else { $m.year }

  [void]$Titles.Add([ordered]@{
    id = $titleId; tmdb_id = $hit.id; media_type = 'movie'; title = $movie.title
    poster_path = $movie.poster_path; backdrop_path = $movie.backdrop_path; year = $relYear
    status = $m.status; user_rating = (Parse-Rating $m.rating); notes = $m.notes
    rewatch = [bool]$m.rewatch; date_added = $dateAdded
    date_completed = $(if ($m.status -eq 'completed') { $watchedIso } else { $null })
  })
  Write-Host "  -> tmdb $($hit.id) '$($movie.title)' ($rt min)"

  if ($m.status -eq 'completed') {
    [void]$Sessions.Add([ordered]@{
      id = [guid]::NewGuid().ToString(); title_id = $titleId
      media_type = 'movie'; duration_minutes = $rt; watched_at = $watchedIso
    })
  }
}

$Payload = [ordered]@{
  exported_at      = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
  version          = 1
  titles           = $Titles
  episode_progress = $Progress
  watch_sessions   = $Sessions
}

$Payload | ConvertTo-Json -Depth 6 | Set-Content -Path $OutFile -Encoding UTF8
Write-Host ""
Write-Host "Wrote $OutFile"
Write-Host "  titles: $($Titles.Count)   episode_progress: $($Progress.Count)   watch_sessions: $($Sessions.Count)"
