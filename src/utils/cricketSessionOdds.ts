import { LiveCricketDetail, LiveCricketMatch } from '../types';

export interface CricketMarketSuggestion {
  id: string;
  kind: 'Match Winner' | 'Session Runs' | 'Innings Total' | 'Wicket Session';
  label: string;
  title: string;
  subtitle: string;
  yesOdds: number;
  noOdds: number;
  yesProbPct: number;
  closingMinutesFromNow: number;
  description: string;
  liveContext: string;
}

export interface ParsedTeamInnings {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  maxOvers: number | null;
  target: number | null;
  hasScore: boolean;
}

export interface LiveMatchOddsAnalysis {
  formatMaxOvers: number;
  battingSide: 'home' | 'away' | null;
  battingTeamName: string;
  bowlingTeamName: string;
  currentRuns: number;
  currentWickets: number;
  currentOvers: number;
  currentRunRate: number | null;
  requiredRunRate: number | null;
  targetRuns: number | null;
  projectedTotal: number | null;
  suggestions: CricketMarketSuggestion[];
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function oversToBalls(overs: number): number {
  const whole = Math.floor(overs);
  const part = Math.round((overs - whole) * 10);
  return whole * 6 + clamp(part, 0, 5);
}

function ballsToOversFloat(balls: number): number {
  return balls / 6;
}

/**
 * Convert a fair YES probability [0.05..0.95] into realistic decimal YES/NO odds
 * with ~5.5% sportsbook/session margin, clamped to [1.05, 18.00].
 */
function probToYesNoOdds(yesProb: number, margin = 0.055): {
  yesOdds: number;
  noOdds: number;
  yesProbPct: number;
} {
  const p = clamp(yesProb, 0.06, 0.94);
  const overround = 1 + margin;
  const rawYes = 1 / clamp(p * overround, 0.055, 0.95);
  const rawNo = 1 / clamp((1 - p) * overround, 0.055, 0.95);
  return {
    yesOdds: Number(clamp(rawYes, 1.05, 18).toFixed(2)),
    noOdds: Number(clamp(rawNo, 1.05, 18).toFixed(2)),
    yesProbPct: Math.round(p * 100)
  };
}

export function parseCricketScore(scoreStr: string): ParsedTeamInnings {
  const clean = (scoreStr || '').trim();
  if (!clean) {
    return {
      runs: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      maxOvers: null,
      target: null,
      hasScore: false
    };
  }

  // Handle multi-innings strings like "245/8 & 112/2 (31.0 ov)" -> inspect latest innings
  const segments = clean.split('&');
  const latest = segments[segments.length - 1].trim();

  // Extract runs/wickets e.g. "142/3" or "210"
  const rwMatch = latest.match(/(\d+)\s*(?:\/\s*(\d+))?/);
  const runs = rwMatch ? Number(rwMatch[1]) : 0;
  const wickets = rwMatch && rwMatch[2] !== undefined ? clamp(Number(rwMatch[2]), 0, 10) : 0;

  // Extract overs e.g. "(16.2/20 ov)" or "(31.0 ov)"
  const ovMatch = latest.match(/\((\d+(?:\.\d+)?)(?:\s*\/\s*(\d+(?:\.\d+)?))?\s*ov/i);
  const overs = ovMatch ? Number(ovMatch[1]) : 0;
  const maxOvers = ovMatch && ovMatch[2] ? Number(ovMatch[2]) : null;
  const balls = oversToBalls(overs);

  // Extract target e.g. "T:174" or "target 174"
  const targetMatch = clean.match(/(?:T:|target\s*)(\d+)/i);
  const target = targetMatch ? Number(targetMatch[1]) : null;

  return {
    runs,
    wickets,
    overs,
    balls,
    maxOvers,
    target,
    hasScore: Boolean(rwMatch)
  };
}

function getFormatDefaultOvers(format: string): number {
  const f = (format || '').toLowerCase();
  if (f.includes('t10')) return 10;
  if (f.includes('hundred')) return 16.4;
  if (f.includes('odi') || f.includes('one day') || f.includes('list a') || f.includes('50')) return 50;
  if (f.includes('test') || f.includes('4-day') || f.includes('first-class') || f.includes('shield')) return 90;
  return 20;
}

function getFormatParScore(formatOvers: number): number {
  if (formatOvers <= 10) return 108;
  if (formatOvers <= 17) return 148;
  if (formatOvers <= 20) return 168;
  if (formatOvers <= 50) return 275;
  return 325;
}

export function buildLiveCricketSessionAnalysis(
  match: LiveCricketMatch,
  detail?: LiveCricketDetail | null
): LiveMatchOddsAnalysis {
  const homeParsed = parseCricketScore(match.homeTeam.score);
  const awayParsed = parseCricketScore(match.awayTeam.score);

  const inferredMaxOvers =
    homeParsed.maxOvers ||
    awayParsed.maxOvers ||
    getFormatDefaultOvers(match.format);

  let battingSide: 'home' | 'away' | null = null;
  if (match.homeTeam.isBatting) battingSide = 'home';
  else if (match.awayTeam.isBatting) battingSide = 'away';
  else if (homeParsed.hasScore && !awayParsed.hasScore) battingSide = 'home';
  else if (awayParsed.hasScore && !homeParsed.hasScore) battingSide = 'away';
  else if (homeParsed.hasScore && awayParsed.hasScore) {
    // Whichever team has target or fewer overs (chasing) is batting
    if (awayParsed.target || awayParsed.balls < homeParsed.balls) battingSide = 'away';
    else battingSide = 'home';
  }

  const battingTeam =
    battingSide === 'away' ? match.awayTeam : match.homeTeam;
  const bowlingTeam =
    battingSide === 'away' ? match.homeTeam : match.awayTeam;
  const activeParsed = battingSide === 'away' ? awayParsed : homeParsed;
  const otherParsed = battingSide === 'away' ? homeParsed : awayParsed;

  const battingTeamName = battingTeam.shortName || battingTeam.name || 'Batting Team';
  const bowlingTeamName = bowlingTeam.shortName || bowlingTeam.name || 'Bowling Team';
  const homeLabel = match.homeTeam.shortName || match.homeTeam.abbreviation || match.homeTeam.name;
  const awayLabel = match.awayTeam.shortName || match.awayTeam.abbreviation || match.awayTeam.name;

  const maxBalls = oversToBalls(inferredMaxOvers);
  const currentBalls = activeParsed.balls;
  const oversFloat = ballsToOversFloat(currentBalls);
  const currentRunRate =
    oversFloat > 0 ? Number((activeParsed.runs / oversFloat).toFixed(2)) : null;

  const isSecondInningsChase =
    activeParsed.hasScore &&
    (activeParsed.target !== null ||
      (otherParsed.hasScore && !match.format.toLowerCase().includes('test')));
  const targetRuns =
    activeParsed.target ?? (isSecondInningsChase && otherParsed.hasScore ? otherParsed.runs + 1 : null);

  const ballsRemaining = Math.max(0, maxBalls - currentBalls);
  const oversRemaining = ballsToOversFloat(ballsRemaining);
  const requiredRunRate =
    targetRuns !== null && oversRemaining > 0
      ? Number((Math.max(0, targetRuns - activeParsed.runs) / oversRemaining).toFixed(2))
      : null;

  // Project final innings score using current pace + wicket resource adjustment
  const parScore = getFormatParScore(inferredMaxOvers);
  const baseRate = parScore / inferredMaxOvers;
  const wicketsLost = activeParsed.wickets;
  const wicketFactor = clamp(1 - wicketsLost * 0.045, 0.52, 1.05);
  const deathBoost =
    inferredMaxOvers <= 50 && oversFloat > inferredMaxOvers * 0.55 && wicketsLost <= 5
      ? 1.12
      : 1.0;

  let projectedTotal: number | null = null;
  if (activeParsed.hasScore && inferredMaxOvers <= 50) {
    const observedRate = currentRunRate ?? baseRate;
    const blendedFutureRate = (observedRate * 0.65 + baseRate * 0.35) * wicketFactor * deathBoost;
    projectedTotal = Math.round(activeParsed.runs + blendedFutureRate * oversRemaining);
  }

  // Estimate Home Win probability
  let homeWinProb = 0.52;
  if (match.status === 'in' && activeParsed.hasScore) {
    if (targetRuns !== null && requiredRunRate !== null) {
      const crr = currentRunRate ?? baseRate;
      const rateDiff = crr - requiredRunRate;
      const wicketsInHand = 10 - wicketsLost;
      const battingWinProb = clamp(
        0.5 + rateDiff * 0.09 + (wicketsInHand - 5) * 0.035,
        0.08,
        0.92
      );
      homeWinProb = battingSide === 'home' ? battingWinProb : 1 - battingWinProb;
    } else if (projectedTotal !== null) {
      const deltaVsPar = (projectedTotal - parScore) / Math.max(25, parScore * 0.25);
      const battingWinProb = clamp(0.5 + deltaVsPar * 0.16, 0.14, 0.86);
      homeWinProb = battingSide === 'home' ? battingWinProb : 1 - battingWinProb;
    }
  } else if (match.status === 'post') {
    if (match.homeTeam.winner) homeWinProb = 0.94;
    else if (match.awayTeam.winner) homeWinProb = 0.06;
  }

  const suggestions: CricketMarketSuggestion[] = [];
  const subtitleBase = `${match.shortName} · ${match.format} · ${match.leagueName}`;

  const startMs = new Date(match.startTime).getTime();
  const preClosingMinutes =
    Number.isFinite(startMs) && startMs > Date.now() + 10 * 60 * 1000
      ? Math.round((startMs - Date.now()) / 60000)
      : 360;

  // 1. Match Winner Suggestion
  const mwOdds = probToYesNoOdds(homeWinProb);
  const matchContext =
    match.status === 'in'
      ? `${homeLabel} ${match.homeTeam.score || '0/0'} vs ${awayLabel} ${match.awayTeam.score || 'Yet to bat'}`
      : `${match.statusText} · ${match.venue}`;

  suggestions.push({
    id: `${match.id}_match_winner`,
    kind: 'Match Winner',
    label: `${homeLabel} Win`,
    title: `Will ${match.homeTeam.name} win against ${match.awayTeam.name}?`,
    subtitle: subtitleBase,
    yesOdds: mwOdds.yesOdds,
    noOdds: mwOdds.noOdds,
    yesProbPct: mwOdds.yesProbPct,
    closingMinutesFromNow: match.status === 'in' ? 120 : preClosingMinutes,
    description: `Official match result for ${match.name} (${match.leagueName}). Ties/no-result void unless super over decides winner.`,
    liveContext: matchContext
  });

  // 2. Live Over-Block Session Runs & Innings Total Sessions
  if (match.status === 'in' && inferredMaxOvers <= 50) {
    const completedOversInt = Math.floor(activeParsed.overs);
    const step = inferredMaxOvers <= 10 ? 3 : inferredMaxOvers <= 20 ? 5 : 10;
    const nextMilestone = clamp(
      Math.ceil((completedOversInt + 1.2) / step) * step,
      step,
      Math.floor(inferredMaxOvers)
    );

    const oversToMilestone = Math.max(0.5, nextMilestone - oversFloat);
    const livePace = currentRunRate ?? baseRate;
    const expectedMilestoneRuns =
      activeParsed.runs +
      livePace * oversToMilestone * clamp(1 - wicketsLost * 0.03, 0.68, 1.05);
    const sessionLine = Math.max(activeParsed.runs + 4, Math.round(expectedMilestoneRuns)) - 0.5;
    // Slight momentum probability adjustment around the .5 line
    const sessionYesProb = clamp(
      0.5 + (expectedMilestoneRuns - sessionLine) * 0.025 - (wicketsLost >= 4 ? 0.04 : 0),
      0.32,
      0.68
    );
    const sessionOdds = probToYesNoOdds(sessionYesProb, 0.05);

    suggestions.push({
      id: `${match.id}_session_${nextMilestone}ov`,
      kind: 'Session Runs',
      label: `${nextMilestone} Over Session`,
      title: `${nextMilestone} Over Session: Will ${battingTeamName} score ${sessionLine}+ runs in ${nextMilestone} overs?`,
      subtitle: `${match.shortName} · ${nextMilestone} Ov Session`,
      yesOdds: sessionOdds.yesOdds,
      noOdds: sessionOdds.noOdds,
      yesProbPct: sessionOdds.yesProbPct,
      closingMinutesFromNow: Math.max(10, Math.round(oversToMilestone * 4.5)),
      description: `Resolves YES if ${battingTeamName} reaches ${Math.ceil(sessionLine)} or more runs by the end of over ${nextMilestone}. Current score: ${battingTeam.score || '0/0'}.`,
      liveContext: `At ${activeParsed.overs} ov · CRR ${livePace.toFixed(2)} · Line ${sessionLine}`
    });

    // Next 3-Over Mini Session
    if (oversRemaining >= 3) {
      const miniRate = clamp(livePace * clamp(1 - wicketsLost * 0.025, 0.72, 1.08), 4.5, 13.5);
      const miniTarget = Math.max(12, Math.round(miniRate * 3)) - 0.5;
      const miniOdds = probToYesNoOdds(0.51, 0.05);
      const endOv = Math.min(Math.floor(inferredMaxOvers), completedOversInt + 3);
      suggestions.push({
        id: `${match.id}_mini_3ov`,
        kind: 'Session Runs',
        label: `Next 3 Overs (${completedOversInt}–${endOv})`,
        title: `Session: Will ${battingTeamName} add ${miniTarget}+ runs by over ${endOv} (total ${Math.ceil(activeParsed.runs + miniTarget)}+)?`,
        subtitle: `${match.shortName} · Mini Session`,
        yesOdds: miniOdds.yesOdds,
        noOdds: miniOdds.noOdds,
        yesProbPct: miniOdds.yesProbPct,
        closingMinutesFromNow: 15,
        description: `Mini 3-over session based on live run rate ${livePace.toFixed(2)}.`,
        liveContext: `Pace ~${miniRate.toFixed(1)} RPO · ${Math.ceil(miniTarget)} runs in ~3 ov`
      });
    }

    // Full Innings Total (Lambi) Session
    if (projectedTotal !== null && oversRemaining >= 2) {
      const lambiLine = projectedTotal - 0.5;
      const lambiProb = clamp(
        0.5 + (wicketsLost <= 3 ? 0.03 : -0.03),
        0.38,
        0.62
      );
      const lambiOdds = probToYesNoOdds(lambiProb, 0.05);
      suggestions.push({
        id: `${match.id}_innings_total`,
        kind: 'Innings Total',
        label: `Innings Lambi (${lambiLine})`,
        title: `Will ${battingTeamName} finish with ${lambiLine}+ total runs in this innings?`,
        subtitle: `${match.shortName} · Innings Total Session`,
        yesOdds: lambiOdds.yesOdds,
        noOdds: lambiOdds.noOdds,
        yesProbPct: lambiOdds.yesProbPct,
        closingMinutesFromNow: Math.max(15, Math.round(oversRemaining * 4.5)),
        description: `Full ${inferredMaxOvers}-over innings total session for ${battingTeamName}. Projected score: ${projectedTotal}.`,
        liveContext: `Projected ${projectedTotal} · ${10 - wicketsLost} wkts left`
      });
    }

    // Fall of Next Wicket / Bowler Wicket Session
    const wicketProb = clamp(0.46 + wicketsLost * 0.02 + (livePace > 8.5 ? 0.05 : 0), 0.35, 0.68);
    const wicketOdds = probToYesNoOdds(wicketProb, 0.05);
    suggestions.push({
      id: `${match.id}_wicket_session`,
      kind: 'Wicket Session',
      label: `Next 3 Ov Wicket`,
      title: `Will ${bowlingTeamName} take at least 1 wicket in the next 3 overs?`,
      subtitle: `${match.shortName} · Wicket Session`,
      yesOdds: wicketOdds.yesOdds,
      noOdds: wicketOdds.noOdds,
      yesProbPct: wicketOdds.yesProbPct,
      closingMinutesFromNow: 15,
      description: `Resolves YES if any batter is dismissed within the next 3 completed overs of ${battingTeamName}'s innings.`,
      liveContext: `${wicketsLost} wkts down · ${detail?.matchcards?.length ? 'Scorecard synced' : 'Live feed'}`
    });
  } else if (match.status === 'in' && inferredMaxOvers > 50) {
    // Test / Multi-day Session
    const sessionLabel = match.session || 'Current Session';
    const sessionLine = Math.max(65, Math.round(88 - activeParsed.wickets * 2)) - 0.5;
    const sessOdds = probToYesNoOdds(0.5, 0.05);
    suggestions.push({
      id: `${match.id}_test_session`,
      kind: 'Session Runs',
      label: `${sessionLabel} Runs`,
      title: `${sessionLabel}: Will ${battingTeamName} add ${sessionLine}+ runs before session close?`,
      subtitle: `${match.shortName} · Test ${sessionLabel}`,
      yesOdds: sessOdds.yesOdds,
      noOdds: sessOdds.noOdds,
      yesProbPct: sessOdds.yesProbPct,
      closingMinutesFromNow: 90,
      description: `Test match ${sessionLabel} run session for ${match.name}.`,
      liveContext: `${match.statusText}${match.dayNumber ? ` · Day ${match.dayNumber}` : ''}`
    });
  } else {
    // Pre-match or upcoming session lines
    const ppLine = inferredMaxOvers <= 10 ? 34.5 : inferredMaxOvers <= 20 ? 46.5 : 52.5;
    const ppOdds = probToYesNoOdds(0.51, 0.05);
    suggestions.push({
      id: `${match.id}_pre_pp_session`,
      kind: 'Session Runs',
      label: `Powerplay ${ppLine}+`,
      title: `1st Innings Powerplay: Will the batting side score ${ppLine}+ runs in the first 6 overs?`,
      subtitle: `${match.shortName} · Powerplay Session`,
      yesOdds: ppOdds.yesOdds,
      noOdds: ppOdds.noOdds,
      yesProbPct: ppOdds.yesProbPct,
      closingMinutesFromNow: preClosingMinutes,
      description: `Powerplay session line for ${match.name} (${match.format}).`,
      liveContext: `Pre-match line · ${match.format}`
    });

    const totalLine = parScore - 0.5;
    const totalOdds = probToYesNoOdds(0.5, 0.05);
    suggestions.push({
      id: `${match.id}_pre_innings_total`,
      kind: 'Innings Total',
      label: `1st Inn ${totalLine}+`,
      title: `1st Innings Session: Will the 1st innings total exceed ${totalLine} runs?`,
      subtitle: `${match.shortName} · 1st Innings Lambi`,
      yesOdds: totalOdds.yesOdds,
      noOdds: totalOdds.noOdds,
      yesProbPct: totalOdds.yesProbPct,
      closingMinutesFromNow: preClosingMinutes,
      description: `1st innings run total over/under for ${match.name}.`,
      liveContext: `Par ${parScore} · ${match.venue}`
    });

    const preWktOdds = probToYesNoOdds(0.55, 0.05);
    suggestions.push({
      id: `${match.id}_pre_pp_wicket`,
      kind: 'Wicket Session',
      label: `Powerplay 2+ Wkts`,
      title: `Will 2 or more wickets fall during the 1st innings Powerplay?`,
      subtitle: `${match.shortName} · Powerplay Wicket Session`,
      yesOdds: preWktOdds.yesOdds,
      noOdds: preWktOdds.noOdds,
      yesProbPct: preWktOdds.yesProbPct,
      closingMinutesFromNow: preClosingMinutes,
      description: `Resolves YES if the bowling team takes at least 2 wickets inside the 1st innings Powerplay overs of ${match.name}.`,
      liveContext: `Pre-match wicket line · ${match.format}`
    });
  }

  return {
    formatMaxOvers: inferredMaxOvers,
    battingSide,
    battingTeamName,
    bowlingTeamName,
    currentRuns: activeParsed.runs,
    currentWickets: activeParsed.wickets,
    currentOvers: activeParsed.overs,
    currentRunRate,
    requiredRunRate,
    targetRuns,
    projectedTotal,
    suggestions
  };
}
