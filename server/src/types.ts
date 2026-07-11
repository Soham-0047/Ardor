/**
 * FanForge shared domain types.
 *
 * These are the contracts every layer agrees on:
 *   RawEvent      — a normalized fan/match event, pre-scoring
 *   PassionScore  — the structured signal Gemini (or the heuristic) returns
 *   ScoredEvent   — RawEvent + PassionScore, persisted and surfaced
 *
 * Keep this file dependency-free; both the plugin layer and the API
 * serialization layer import from it.
 */

/** The passion domains FanForge understands. New plugins add new domains. */
export type Domain = 'worldcup' | 'rivalry' | 'personal';

export const DOMAINS: Domain[] = ['worldcup', 'rivalry', 'personal'];

/** Emotional register of a moment. Mirrors the Gemini response enum. */
export type Sentiment =
  | 'ecstatic'
  | 'positive'
  | 'neutral'
  | 'tense'
  | 'negative'
  | 'heartbroken';

export const SENTIMENTS: Sentiment[] = [
  'ecstatic',
  'positive',
  'neutral',
  'tense',
  'negative',
  'heartbroken',
];

/**
 * A normalized event before scoring. Plugins produce these from their own
 * raw sources (match feeds, journal entries, rivalry updates, votes).
 */
export interface RawEvent {
  /** Owning plugin id, e.g. "worldcup". */
  pluginId: string;
  /** Passion domain this event belongs to. */
  domain: Domain;
  /** Stable id from the source, used to dedupe on re-ingest. */
  externalId: string;
  /** Event kind, e.g. "goal" | "red_card" | "journal" | "rivalry_update". */
  type: string;
  /** Human-readable headline. */
  title: string;
  /** The text handed to the scorer. Should carry the emotional content. */
  rawText: string;
  /** Teams / sides involved (may be empty). */
  teams: string[];
  /** People involved (players, devs, contenders). */
  players: string[];
  /** Optional competition / context label. */
  competition?: string;
  /** Optional grouping id (a match, a rivalry thread, a project). */
  matchId?: string;
  /** ISO timestamp of when the moment happened. */
  occurredAt: string;
  /** Free-form extra source data. */
  metadata?: Record<string, unknown>;
}

/**
 * The structured passion signal. This is what the scoring layer returns and
 * what makes fan noise comparable and queryable — the core AI value.
 */
export interface PassionScore {
  /** 0–100. Higher = more passion / bigger moment. */
  passion_score: number;
  /** Emotional register. */
  sentiment: Sentiment;
  /** Whether this is a headline-worthy key moment. */
  key_moment: boolean;
  /** One-sentence recap suitable for a feed or narration. */
  one_line_recap: string;
  /** Which scorer produced this: "gemini:<model>" or "heuristic-v1". */
  model: string;
}

/** A persisted, scored event as surfaced by the API. */
export interface ScoredEvent extends RawEvent {
  id: string;
  score: PassionScore;
  /** Optional cached ElevenLabs narration clip URL. */
  audioUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Runtime feature flags exposed to the client via GET /api/config. */
export interface FeatureFlags {
  gemini: boolean;
  snowflake: boolean;
  elevenlabs: boolean;
  solana: boolean;
  footballData: boolean;
  memoryDb: boolean;
}
