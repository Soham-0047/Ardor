import type { PassionScore, RawEvent, Sentiment } from '../types';

/**
 * Deterministic, dependency-free passion scorer (v2).
 *
 * This is the offline fallback for the Gemini structured-extraction call, so
 * FanForge's core loop works end-to-end with zero API keys. v2 upgrades v1's
 * flat keyword counter into a small feature model — still fully deterministic
 * and explainable:
 *
 *   score = type base
 *         + weighted emotional lexicon (tanh-damped, so stacking words
 *           has diminishing returns)
 *         + stakes bonus (final > semi > quarter > R16, shootouts, titles)
 *         + late-drama curve (76' ramps up, stoppage time peaks)
 *         + close-game context (level/one-goal games amplify, blowouts mute)
 *         + intensity cues (exclamations, ALL-CAPS)
 *         + domain bonuses (personal streaks, rivalry heat)
 *         + tiny id-hash jitter (breaks ties, stays reproducible)
 *
 * Every input comes from the event itself, so identical input → identical
 * score (asserted by the smoke test).
 */

const TYPE_BASE: Record<string, number> = {
  penalty_goal: 86,
  goal: 84,
  penalty_miss: 80,
  full_time: 78,
  red_card: 78,
  great_save: 76,
  own_goal: 74,
  var_review: 64,
  injury: 56,
  yellow_card: 45,
  shot_off_target: 38,
  substitution: 32,
  halftime: 28,
  kickoff: 26,
  // user-driven domains
  milestone: 68,
  rivalry_update: 55,
  journal: 48,
  vote: 42,
};

/** Weighted emotional lexicon. Phrases outweigh single words. */
const POSITIVE: [string, number][] = [
  ['last-gasp', 5], ['last minute', 5], ['last-minute', 5], ['stoppage time', 4],
  ['injury-time', 4], ['comeback', 5], ['wonder', 4], ['screamer', 4],
  ['hat-trick', 5], ['hat trick', 5], ['upset', 4], ['winner', 4],
  ['equaliser', 3], ['equalizer', 3], ['stunning', 3], ['sensational', 3],
  ['incredible', 3], ['unstoppable', 3], ['brilliant', 2], ['clinical', 2],
  ['clutch', 3], ['dramatic', 3], ['erupts', 3], ['roars', 3], ['delirium', 4],
  ['record', 2], ['breakthrough', 4], ['shipped', 3], ['launched', 3],
  ['milestone', 2], ['streak', 2], ['saves', 2], ['save', 2], ['wins', 2],
  ['won', 2], ['victory', 2], ['pure relief', 3], ['second wind', 2],
];

const NEGATIVE: [string, number][] = [
  ['heartbreak', 5], ['heartbroken', 5], ['devastating', 4], ['collapse', 4],
  ['crushed', 3], ['tears', 3], ['eliminated', 4], ['knocked out', 4],
  ['sent off', 3], ['own goal', 3], ['blunder', 3], ['disaster', 3],
  ['disallowed', 2], ['missed', 2], ['defeat', 2], ['lost', 2], ['loss', 2],
  ['crisis', 3], ['burnout', 3], ['gave up', 2], ['stuck', 1],
];

const STAKES: [string, number][] = [
  ['shootout', 6], ['penalties', 4], ['extra time', 4], ['stoppage', 3],
  ['knockout', 3], ['title', 3], ['championship', 3], ['world cup', 2],
  ['decider', 3], ['winner-takes-all', 4],
];

/** Stage bonus, from metadata.stage or any text (most specific match wins). */
function stageBonus(texts: string): number {
  if (/semi[- ]?final/.test(texts)) return 9;
  if (/quarter[- ]?final/.test(texts)) return 7;
  if (/round of 16|r16|last 16/.test(texts)) return 4;
  if (/\bfinal\b/.test(texts)) return 12;
  return 0;
}

/** Sum of matched term weights within a text. */
function lexiconWeight(text: string, lexicon: [string, number][]): number {
  let w = 0;
  for (const [term, weight] of lexicon) if (text.includes(term)) w += weight;
  return w;
}

/** Damped contribution: stacking many hype words has diminishing returns. */
function damp(weight: number, scale: number, max: number): number {
  return Math.round(max * Math.tanh(weight / scale));
}

/** Late-game drama: flat until 75', ramps to +8 at 90', +10 in stoppage. */
function lateDrama(minute: number): number {
  if (!Number.isFinite(minute) || minute < 76) return 0;
  if (minute > 90) return 10;
  return Math.round(((minute - 75) / 15) * 8);
}

/** Close games amplify passion; blowouts mute it. */
function closeGameContext(scoreAfter: unknown): number {
  const m = /(\d+)\s*[-–]\s*(\d+)/.exec(String(scoreAfter ?? ''));
  if (!m) return 0;
  const diff = Math.abs(Number(m[1]) - Number(m[2]));
  if (diff === 0) return 5;
  if (diff === 1) return 4;
  if (diff >= 3) return -4;
  return 0;
}

/** Exclamations and ALL-CAPS read as volume. */
function intensity(text: string): number {
  const bangs = Math.min((text.match(/!/g) ?? []).length * 2, 4);
  const caps = /\b[A-Z]{4,}\b/.test(text) ? 2 : 0;
  return bangs + caps;
}

/** Domain-specific signals: personal streaks and rivalry heat. */
function domainBonus(event: RawEvent, meta: Record<string, unknown>): number {
  if (event.domain === 'personal') {
    const streak = Number(meta.streak);
    return Number.isFinite(streak) ? Math.min(Math.max(streak, 0), 10) : 0;
  }
  if (event.domain === 'rivalry') {
    const heat = String(meta.heat ?? '').toLowerCase();
    if (heat === 'very high') return 8;
    if (heat === 'high') return 5;
    if (heat === 'medium') return 2;
  }
  return 0;
}

/** Small stable string hash so ties break deterministically, not randomly. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function deriveSentiment(score: number, posW: number, negW: number): Sentiment {
  if (negW > posW) {
    if (score >= 72) return 'heartbroken';
    return negW >= 5 ? 'negative' : 'tense';
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
  const rawTitleAndText = `${event.title} ${event.rawText}`;
  const text = rawTitleAndText.toLowerCase();
  const allContext = `${text} ${String(event.competition ?? '').toLowerCase()} ${String(
    (event.metadata as Record<string, unknown> | undefined)?.stage ?? '',
  ).toLowerCase()}`;
  const meta = (event.metadata ?? {}) as Record<string, unknown>;

  const posW = lexiconWeight(text, POSITIVE);
  const negW = lexiconWeight(text, NEGATIVE);
  const stakesW = lexiconWeight(allContext, STAKES);

  const base = TYPE_BASE[event.type] ?? 48;

  // Context (stakes, stage, late drama, close game) amplifies moments that
  // are already exciting — it must not lift routine events (a kickoff at the
  // final is still a kickoff). Gate context by the base excitement.
  const contextGate = base >= 70 ? 1 : base >= 50 ? 0.6 : 0.25;
  const context =
    damp(stakesW, 6, 8) + // shootouts/titles, max +8
    stageBonus(allContext) + // knockout rounds, max +12
    lateDrama(Number(meta.minute)) + // max +10
    closeGameContext(meta.scoreAfter); // −4 … +5

  let score = base;
  score += damp(posW, 8, 12); // emotional lift, max +12
  score -= damp(negW, 8, 10); // emotional drag, max −10
  score += Math.round(context * contextGate);
  score += intensity(rawTitleAndText); // max +6
  score += domainBonus(event, meta); // max +10
  score += (hash(event.externalId) % 5) - 2; // deterministic tie-break

  // Soft knee above 72: raw sums can exceed 100 for stacked-drama moments, and
  // hard clamping would flatten every big moment to ~100. Compressing the top
  // keeps ordering: an ordinary goal lands low-80s, a big one low-90s, and
  // only genuinely stacked drama (late winner in a knockout) reaches ~100.
  if (score > 72) {
    score = 72 + 28 * Math.tanh((score - 72) / 30);
  }

  score = clamp(score);
  const sentiment = deriveSentiment(score, posW, negW);

  return {
    passion_score: score,
    sentiment,
    key_moment: score >= 75,
    one_line_recap: buildRecap(event, sentiment),
    model: 'heuristic-v2',
  };
}
