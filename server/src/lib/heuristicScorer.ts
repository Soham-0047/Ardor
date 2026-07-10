import type { PassionScore, RawEvent, Sentiment } from '../types';

/**
 * Deterministic, dependency-free passion scorer.
 *
 * This is the offline fallback for the Gemini structured-extraction call. It
 * exists so FanForge's core loop — ingest → score → store → search → surface —
 * works end-to-end with zero API keys, which matters for a reliable demo (and
 * for the July 12–13 live-match gap noted in the brief). When GEMINI_API_KEY is
 * present the real model runs; otherwise this keeps the signal flowing.
 *
 * It is intentionally simple and explainable: a per-type base, nudged by a
 * small emotional lexicon, clamped to 0–100.
 */

const TYPE_BASE: Record<string, number> = {
  full_time: 82,
  penalty_goal: 86,
  penalty_miss: 80,
  own_goal: 74,
  goal: 84,
  red_card: 78,
  great_save: 76,
  var_review: 66,
  injury: 58,
  yellow_card: 46,
  substitution: 34,
  shot_off_target: 40,
  halftime: 30,
  kickoff: 28,
  // user-driven domains
  rivalry_update: 55,
  journal: 50,
  vote: 44,
  milestone: 70,
};

const POSITIVE = [
  'winner', 'wins', 'won', 'stunning', 'last-minute', 'last minute', 'injury-time',
  'hat-trick', 'hat trick', 'wonder', 'screamer', 'equaliser', 'equalizer',
  'comeback', 'upset', 'clinical', 'brilliant', 'incredible', 'unstoppable',
  'record', 'breakthrough', 'shipped', 'launched', 'milestone', 'streak',
  'clutch', 'saves', 'save', 'dramatic', 'roars', 'erupts', 'sensational',
];

const NEGATIVE = [
  'defeat', 'lost', 'loss', 'out', 'eliminated', 'knocked out', 'disallowed',
  'heartbreak', 'heartbroken', 'blunder', 'own goal', 'sent off', 'missed',
  'disaster', 'collapse', 'crushed', 'devastating', 'tears', 'crisis', 'burnout',
];

const HIGH_STAKES = [
  'final', 'quarterfinal', 'quarter-final', 'semifinal', 'semi-final',
  'knockout', 'shootout', 'stoppage', 'extra time', 'title', 'championship',
];

/** Small stable string hash so recaps/ties are deterministic, not random. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function countHits(haystack: string, needles: string[]): number {
  let n = 0;
  for (const needle of needles) if (haystack.includes(needle)) n++;
  return n;
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function deriveSentiment(score: number, pos: number, neg: number): Sentiment {
  if (neg > pos) {
    if (score >= 70) return 'heartbroken';
    return neg >= 2 ? 'negative' : 'tense';
  }
  if (score >= 85) return 'ecstatic';
  if (score >= 62) return 'positive';
  if (score >= 45) return 'neutral';
  return 'tense';
}

function buildRecap(event: RawEvent, sentiment: Sentiment): string {
  const who = event.teams.length ? event.teams.join(' vs ') : event.players[0] || 'The moment';
  const trimmed = event.rawText.trim().replace(/\s+/g, ' ');
  if (trimmed.length > 0 && trimmed.length <= 120) return trimmed;
  const base = trimmed.length > 120 ? trimmed.slice(0, 117).trimEnd() + '…' : event.title;
  const flavor: Record<Sentiment, string> = {
    ecstatic: 'Scenes of pure delirium',
    positive: 'A moment the fans will replay',
    neutral: 'Part of the ebb and flow',
    tense: 'Nerves stretched thin',
    negative: 'A blow that stings',
    heartbroken: 'Silence, then heartbreak',
  };
  return `${who}: ${base} — ${flavor[sentiment]}.`;
}

export function heuristicScore(event: RawEvent): PassionScore {
  const text = `${event.title} ${event.rawText}`.toLowerCase();

  let score = TYPE_BASE[event.type] ?? 48;

  const pos = countHits(text, POSITIVE);
  const neg = countHits(text, NEGATIVE);
  const stakes = countHits(text, HIGH_STAKES) + countHits((event.competition ?? '').toLowerCase(), HIGH_STAKES);

  score += pos * 4;
  score -= neg * 3;
  score += stakes * 3;

  // Late-game drama bump from metadata minute, if present.
  const minute = Number((event.metadata as Record<string, unknown> | undefined)?.minute);
  if (Number.isFinite(minute) && minute >= 80) score += 6;

  // Tiny deterministic jitter so identical types don't all tie exactly.
  score += (hash(event.externalId) % 5) - 2;

  score = clamp(score);
  const sentiment = deriveSentiment(score, pos, neg);

  return {
    passion_score: score,
    sentiment,
    key_moment: score >= 75,
    one_line_recap: buildRecap(event, sentiment),
    model: 'heuristic-v1',
  };
}
