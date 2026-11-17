import type {
  LiveCricketMatch,
  LiveCricketDetail,
  LiveCricketStatus,
  CricketTeamInfo,
  CricketInningsCard,
  CricketBatterCard,
  CricketBowlerCard
} from '../src/types/index.ts';

const ESPN_SCOREBOARD_URL = 'https://site.api.espn.com/apis/v2/scoreboard/header?sport=cricket';
const LIVE_CACHE_TTL_MS = 8000;
const UPCOMING_CACHE_TTL_MS = 120000;
const UPCOMING_DAYS_AHEAD = 10;

interface RawEspnCompetitor {
  id?: string | number;
  name?: string;
  displayName?: string;
  shortName?: string;
  abbreviation?: string;
  score?: string;
  winner?: boolean;
  homeAway?: string;
  order?: number;
  color?: string;
  logo?: string;
  logos?: Array<{ href?: string }>;
  team?: {
    id?: string | number;
    name?: string;
    displayName?: string;
    shortName?: string;
    abbreviation?: string;
    color?: string;
    logos?: Array<{ href?: string }>;
  };
}

interface RawEspnEvent {
  id?: string | number;
  name?: string;
  shortName?: string;
  date?: string;
  location?: string;
  status?: string;
  note?: string;
  fullStatus?: {
    summary?: string;
    longSummary?: string;
    session?: string;
    dayNumber?: number;
    presentLocalTime?: string;
    battingTeamId?: number | string;
    type?: {
      state?: string;
      shortDetail?: string;
      detail?: string;
      description?: string;
    };
  };
  competitors?: RawEspnCompetitor[];
  venue?: {
    fullName?: string;
    shortName?: string;
    address?: {
      city?: string;
      country?: string;
    };
  };
  class?: {
    generalClassCard?: string;
    eventType?: string;
    name?: string;
  };
}

interface RawEspnLeague {
  id?: string | number;
  name?: string;
  shortName?: string;
  abbreviation?: string;
  events?: RawEspnEvent[];
}

interface MatchesCacheEntry {
  matches: LiveCricketMatch[];
  fetchedAt: string;
  expiresAt: number;
}

interface UpcomingCacheEntry {
  matches: LiveCricketMatch[];
  expiresAt: number;
}

interface DetailCacheEntry {
  detail: LiveCricketDetail;
  expiresAt: number;
}

let matchesCache: MatchesCacheEntry | null = null;
let upcomingCache: UpcomingCacheEntry | null = null;
let upcomingInFlight: Promise<LiveCricketMatch[]> | null = null;
const detailCache = new Map<string, DetailCacheEntry>();

function formatEspnDateParam(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 8500): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ApexPredictLiveCricket/1.0)',
        Accept: 'application/json'
      }
    });
    if (!res.ok) {
      throw new Error(`ESPN Cricket API returned HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeStatus(rawStatus?: string, rawState?: string): LiveCricketStatus {
  const s = (rawState || rawStatus || '').toLowerCase();
  if (s === 'in' || s === 'live') return 'in';
  if (s === 'post' || s === 'final') return 'post';
  return 'pre';
}

function inferFormat(leagueName: string, evName: string, rawFormat?: string): string {
  if (rawFormat && rawFormat.trim()) return rawFormat.trim();
  const combined = `${leagueName} ${evName}`.toLowerCase();
  if (combined.includes('t20') || combined.includes('pro20') || combined.includes('ipl') || combined.includes('bbl') || combined.includes('psl') || combined.includes('cpl') || combined.includes('blast')) {
    return 'T20';
  }
  if (combined.includes('odi') || combined.includes('one day') || combined.includes('under-19') || combined.includes('list a') || combined.includes('50')) {
    return 'ODI';
  }
  if (combined.includes('test') || combined.includes('shield') || combined.includes('county') || combined.includes('national cricket league') || combined.includes('4-day')) {
    return 'Test';
  }
  return 'Cricket';
}

function normalizeTeam(comp: RawEspnCompetitor | undefined, battingTeamId: string): CricketTeamInfo {
  const teamObj = comp?.team;
  const id = String(comp?.id ?? teamObj?.id ?? '');
  const name = String(comp?.displayName || teamObj?.displayName || comp?.name || teamObj?.name || 'TBA');
  const shortName = String(comp?.shortName || teamObj?.shortName || name);
  const abbr = String(comp?.abbreviation || teamObj?.abbreviation || shortName.slice(0, 4).toUpperCase());
  const logo = comp?.logo || comp?.logos?.[0]?.href || teamObj?.logos?.[0]?.href;
  const color = comp?.color || teamObj?.color;

  return {
    id,
    name,
    shortName,
    abbreviation: abbr,
    score: String(comp?.score || '').trim(),
    logo,
    color: color ? (color.startsWith('#') ? color : `#${color}`) : undefined,
    winner: Boolean(comp?.winner),
    isBatting: Boolean(battingTeamId && id && battingTeamId === id)
  };
}

function normalizeScoreboardEvent(ev: RawEspnEvent, league: RawEspnLeague): LiveCricketMatch {
  const leagueId = String(league.id || '');
  const leagueName = String(league.name || league.shortName || 'Cricket Series');
  const fullStatus = ev.fullStatus || {};
  const status = normalizeStatus(ev.status, fullStatus.type?.state);
  const battingTeamId = fullStatus.battingTeamId ? String(fullStatus.battingTeamId) : '';
  const comps = Array.isArray(ev.competitors) ? ev.competitors : [];

  const homeComp = comps.find(c => c.homeAway === 'home') || comps[0];
  const awayComp = comps.find(c => c.homeAway === 'away' && c !== homeComp) || comps[1] || comps[0];

  const homeTeam = normalizeTeam(homeComp, battingTeamId);
  const awayTeam = normalizeTeam(awayComp, battingTeamId);

  const venue =
    ev.venue?.fullName ||
    ev.venue?.shortName ||
    ev.location ||
    'International Cricket Venue';

  return {
    id: String(ev.id || ''),
    leagueId,
    leagueName,
    name: String(ev.name || `${homeTeam.name} vs ${awayTeam.name}`),
    shortName: String(ev.shortName || `${homeTeam.abbreviation} v ${awayTeam.abbreviation}`),
    format: inferFormat(leagueName, String(ev.name || ''), ev.class?.generalClassCard || ev.class?.eventType),
    status,
    statusText: String(
      fullStatus.type?.shortDetail ||
        fullStatus.summary ||
        fullStatus.type?.description ||
        (status === 'in' ? 'Live' : status === 'post' ? 'Completed' : 'Scheduled')
    ),
    statusSummary: String(
      fullStatus.longSummary || fullStatus.summary || ev.note || 'Match coverage synced'
    ),
    session: fullStatus.session ? String(fullStatus.session) : undefined,
    dayNumber: typeof fullStatus.dayNumber === 'number' && fullStatus.dayNumber > 0 ? fullStatus.dayNumber : undefined,
    presentLocalTime: fullStatus.presentLocalTime ? String(fullStatus.presentLocalTime) : undefined,
    venue,
    startTime: String(ev.date || new Date().toISOString()),
    homeTeam,
    awayTeam,
    lastUpdatedAt: new Date().toISOString()
  };
}

async function fetchUpcomingScheduleMatches(forceRefresh = false): Promise<LiveCricketMatch[]> {
  const now = Date.now();
  if (!forceRefresh && upcomingCache && upcomingCache.matches.length > 0 && now < upcomingCache.expiresAt) {
    return upcomingCache.matches;
  }

  if (upcomingInFlight) {
    return upcomingInFlight;
  }

  upcomingInFlight = (async () => {
    try {
      const dayUrls: string[] = [];
      for (let offset = 0; offset <= UPCOMING_DAYS_AHEAD; offset++) {
        const dt = new Date(Date.now() + offset * 86400000);
        dayUrls.push(`${ESPN_SCOREBOARD_URL}&dates=${formatEspnDateParam(dt)}`);
      }

      // Fetch in two gentle batches so ESPN doesn't rate-limit concurrent requests
      const mid = Math.ceil(dayUrls.length / 2);
      const batch1 = await Promise.allSettled(dayUrls.slice(0, mid).map(url => fetchJsonWithTimeout(url, 8500)));
      const batch2 = await Promise.allSettled(dayUrls.slice(mid).map(url => fetchJsonWithTimeout(url, 8500)));
      const results = [...batch1, ...batch2];

      const collected: LiveCricketMatch[] = [];
      const seen = new Set<string>();
      let anySucceeded = false;

      for (const res of results) {
        if (res.status !== 'fulfilled') continue;
        anySucceeded = true;
        const payload = res.value as { sports?: Array<{ leagues?: RawEspnLeague[] }> };
        const leagues = payload?.sports?.[0]?.leagues || [];
        for (const league of leagues) {
          for (const ev of league.events || []) {
            const id = String(ev.id || '');
            if (!id || seen.has(id)) continue;
            const normalized = normalizeScoreboardEvent(ev, league);
            if (normalized.status === 'post') continue;
            seen.add(id);
            collected.push(normalized);
          }
        }
      }

      if (anySucceeded && (collected.length > 0 || !upcomingCache || upcomingCache.matches.length === 0)) {
        upcomingCache = {
          matches: collected,
          expiresAt: Date.now() + UPCOMING_CACHE_TTL_MS
        };
      }

      return upcomingCache?.matches || collected;
    } finally {
      upcomingInFlight = null;
    }
  })();

  return upcomingInFlight;
}

export async function fetchLiveCricketMatches(
  forceRefresh = false,
  forceUpcomingRefresh = false
): Promise<{
  matches: LiveCricketMatch[];
  fetchedAt: string;
}> {
  const now = Date.now();
  if (!forceRefresh && matchesCache && now < matchesCache.expiresAt) {
    return { matches: matchesCache.matches, fetchedAt: matchesCache.fetchedAt };
  }

  const shouldForceUpcoming =
    forceUpcomingRefresh &&
    (!upcomingCache || upcomingCache.matches.length === 0 || now >= upcomingCache.expiresAt - (UPCOMING_CACHE_TTL_MS - 15000));

  const [todayData, upcomingSchedule] = await Promise.all([
    fetchJsonWithTimeout(ESPN_SCOREBOARD_URL) as Promise<{
      sports?: Array<{ leagues?: RawEspnLeague[] }>;
    }>,
    fetchUpcomingScheduleMatches(shouldForceUpcoming).catch(() => upcomingCache?.matches || [])
  ]);

  const leagues = todayData?.sports?.[0]?.leagues || [];
  const allMatches: LiveCricketMatch[] = [];
  const seenIds = new Set<string>();

  for (const league of leagues) {
    for (const ev of league.events || []) {
      const id = String(ev.id || '');
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);
      allMatches.push(normalizeScoreboardEvent(ev, league));
    }
  }

  for (const m of upcomingSchedule) {
    if (!m.id || seenIds.has(m.id)) continue;
    seenIds.add(m.id);
    allMatches.push(m);
  }

  const rank: Record<LiveCricketStatus, number> = { in: 0, pre: 1, post: 2 };
  allMatches.sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    // Prefer matches that have active scores when both are 'in'
    if (a.status === 'in') {
      const aHasScore = Boolean(a.homeTeam.score || a.awayTeam.score);
      const bHasScore = Boolean(b.homeTeam.score || b.awayTeam.score);
      if (aHasScore !== bHasScore) return aHasScore ? -1 : 1;
    }
    const ta = new Date(a.startTime).getTime() || 0;
    const tb = new Date(b.startTime).getTime() || 0;
    return a.status === 'pre' ? ta - tb : tb - ta;
  });

  const fetchedAt = new Date().toISOString();
  matchesCache = {
    matches: allMatches,
    fetchedAt,
    expiresAt: now + LIVE_CACHE_TTL_MS
  };

  return { matches: allMatches, fetchedAt };
}

export async function fetchLiveCricketMatchDetail(
  leagueId: string,
  eventId: string,
  forceRefresh = false
): Promise<LiveCricketDetail> {
  const safeLeague = leagueId.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeEvent = eventId.replace(/[^a-zA-Z0-9_-]/g, '');
  const cacheKey = `${safeLeague}:${safeEvent}`;
  const now = Date.now();

  if (!forceRefresh) {
    const cached = detailCache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      return cached.detail;
    }
  }

  const url = `https://site.web.api.espn.com/apis/site/v2/sports/cricket/${safeLeague}/summary?event=${safeEvent}`;
  const sd = (await fetchJsonWithTimeout(url)) as {
    gameInfo?: {
      venue?: {
        fullName?: string;
        shortName?: string;
        address?: { city?: string; country?: string };
      };
    };
    notes?: Array<{ text?: string }>;
    header?: {
      league?: { id?: string | number; name?: string; shortName?: string };
      competitions?: Array<{
        id?: string | number;
        description?: string;
        date?: string;
        class?: { generalClassCard?: string; eventType?: string };
        status?: RawEspnEvent['fullStatus'] & {
          featuredAthletes?: Array<{
            name?: string;
            displayName?: string;
            athlete?: { displayName?: string };
          }>;
        };
        competitors?: RawEspnCompetitor[];
        notes?: Array<{ text?: string }>;
      }>;
    };
    matchcards?: Array<{
      headline?: string;
      total?: string;
      playerDetails?: Array<Record<string, unknown>>;
    }>;
  };

  const comp = sd.header?.competitions?.[0];
  const leagueInfo = sd.header?.league;

  // Locate baseline match from scoreboard cache or construct from summary header
  let baseMatch = matchesCache?.matches.find(m => m.id === safeEvent);
  if (!baseMatch) {
    const compStatus = comp?.status;
    const battingId = compStatus?.battingTeamId ? String(compStatus.battingTeamId) : '';
    const comps = comp?.competitors || [];
    const homeComp = comps.find(c => c.homeAway === 'home') || comps[0];
    const awayComp = comps.find(c => c.homeAway === 'away' && c !== homeComp) || comps[1] || comps[0];
    const homeTeam = normalizeTeam(homeComp, battingId);
    const awayTeam = normalizeTeam(awayComp, battingId);
    const lName = String(leagueInfo?.name || leagueInfo?.shortName || 'Cricket Match');

    baseMatch = {
      id: safeEvent,
      leagueId: safeLeague,
      leagueName: lName,
      name: `${homeTeam.name} vs ${awayTeam.name}`,
      shortName: `${homeTeam.abbreviation} v ${awayTeam.abbreviation}`,
      format: inferFormat(lName, comp?.description || '', comp?.class?.generalClassCard),
      status: normalizeStatus(undefined, compStatus?.type?.state),
      statusText: String(compStatus?.type?.shortDetail || compStatus?.summary || 'Live'),
      statusSummary: String(compStatus?.longSummary || compStatus?.summary || ''),
      session: compStatus?.session ? String(compStatus.session) : undefined,
      dayNumber: typeof compStatus?.dayNumber === 'number' ? compStatus.dayNumber : undefined,
      presentLocalTime: compStatus?.presentLocalTime ? String(compStatus.presentLocalTime) : undefined,
      venue: sd.gameInfo?.venue?.fullName || sd.gameInfo?.venue?.shortName || 'Cricket Ground',
      startTime: String(comp?.date || new Date().toISOString()),
      homeTeam,
      awayTeam,
      lastUpdatedAt: new Date().toISOString()
    };
  } else if (comp?.status) {
    // Freshen score/status from summary if available
    const compStatus = comp.status;
    const battingId = compStatus.battingTeamId ? String(compStatus.battingTeamId) : '';
    const comps = comp.competitors || [];
    const homeComp = comps.find(c => c.homeAway === 'home') || comps[0];
    const awayComp = comps.find(c => c.homeAway === 'away' && c !== homeComp) || comps[1] || comps[0];
    baseMatch = {
      ...baseMatch,
      status: normalizeStatus(baseMatch.status, compStatus.type?.state),
      statusText: String(compStatus.type?.shortDetail || compStatus.summary || baseMatch.statusText),
      statusSummary: String(compStatus.longSummary || compStatus.summary || baseMatch.statusSummary),
      session: compStatus.session ? String(compStatus.session) : baseMatch.session,
      presentLocalTime: compStatus.presentLocalTime ? String(compStatus.presentLocalTime) : baseMatch.presentLocalTime,
      venue: sd.gameInfo?.venue?.fullName || baseMatch.venue,
      homeTeam: homeComp ? normalizeTeam(homeComp, battingId) : baseMatch.homeTeam,
      awayTeam: awayComp ? normalizeTeam(awayComp, battingId) : baseMatch.awayTeam,
      lastUpdatedAt: new Date().toISOString()
    };
  }

  const matchcards: CricketInningsCard[] = [];
  for (const card of sd.matchcards || []) {
    const headline = String(card.headline || '').trim();
    const total = String(card.total || '').trim();
    const details = Array.isArray(card.playerDetails) ? card.playerDetails : [];

    if (headline.toLowerCase().includes('bat')) {
      const batters: CricketBatterCard[] = details.map(p => {
        const runsNum = Number(p.runs || 0);
        const ballsNum = Number(p.ballsFaced || 0);
        const sr = ballsNum > 0 ? ((runsNum / ballsNum) * 100).toFixed(1) : '0.0';
        return {
          playerId: String(p.playerID || p.playerName || Math.random()),
          name: String(p.playerName || 'Batter'),
          dismissal: String(p.dismissal || 'not out'),
          runs: String(p.runs ?? '0'),
          balls: String(p.ballsFaced ?? '0'),
          fours: String(p.fours ?? '0'),
          sixes: String(p.sixes ?? '0'),
          strikeRate: sr
        };
      });
      matchcards.push({ headline, total, batters });
    } else if (headline.toLowerCase().includes('bowl')) {
      const bowlers: CricketBowlerCard[] = details.map(p => ({
        playerId: String(p.playerID || p.playerName || Math.random()),
        name: String(p.playerName || 'Bowler'),
        overs: String(p.overs ?? '0'),
        maidens: String(p.maidens ?? '0'),
        runs: String(p.conceded ?? '0'),
        wickets: String(p.wickets ?? '0'),
        economy: String(p.economyRate ?? '0.00')
      }));
      matchcards.push({ headline, total, bowlers });
    }
  }

  const potm = comp?.status?.featuredAthletes?.find(a => a.name === 'playerOfTheMatch')?.athlete?.displayName;
  const tossNote = comp?.notes?.[0]?.text || sd.notes?.[0]?.text;

  const detail: LiveCricketDetail = {
    match: baseMatch,
    venueCity: sd.gameInfo?.venue?.address?.city,
    venueCountry: sd.gameInfo?.venue?.address?.country,
    tossNote: tossNote ? String(tossNote) : undefined,
    playerOfTheMatch: potm ? String(potm) : undefined,
    matchcards,
    fetchedAt: new Date().toISOString()
  };

  detailCache.set(cacheKey, {
    detail,
    expiresAt: now + LIVE_CACHE_TTL_MS
  });

  return detail;
}
