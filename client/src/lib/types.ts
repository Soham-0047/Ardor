// Client-side mirror of the server's API shapes. Kept in sync with
// server/src/types.ts and the route responses.

export type Domain = 'worldcup' | 'rivalry' | 'personal';

export type Sentiment =
  | 'ecstatic'
  | 'positive'
  | 'neutral'
  | 'tense'
  | 'negative'
  | 'heartbroken';

export interface PassionScore {
  passion_score: number;
  sentiment: Sentiment;
  key_moment: boolean;
  one_line_recap: string;
  model: string;
}

export interface ScoredEvent {
  id: string;
  pluginId: string;
  domain: Domain;
  externalId: string;
  type: string;
  title: string;
  rawText: string;
  teams: string[];
  players: string[];
  competition?: string;
  matchId?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
  score: PassionScore;
  audioUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlags {
  gemini: boolean;
  snowflake: boolean;
  elevenlabs: boolean;
  solana: boolean;
  footballData: boolean;
  memoryDb: boolean;
}

export interface PluginInfo {
  id: string;
  domain: Domain;
  displayName: string;
  description: string;
  emoji: string;
  acceptsUserActions: boolean;
}

export interface AppConfig {
  flags: FeatureFlags;
  plugins: PluginInfo[];
}

export interface SearchResult {
  id: string;
  domain: Domain;
  type: string;
  title: string;
  teams: string[];
  players: string[];
  occurredAt: string;
  passion_score: number;
  sentiment: Sentiment;
  one_line_recap: string;
  audioUrl?: string | null;
}

export interface Trends {
  totals: { count: number; avgScore: number; keyMoments: number };
  byDomain: { domain: Domain; count: number; avgScore: number }[];
  timeline: { bucket: string; avgScore: number; maxScore: number; count: number }[];
  topTeams: { team: string; count: number; avgScore: number; totalPassion: number }[];
  sentiment: { sentiment: Sentiment; count: number }[];
  topMoments: ScoredEvent[];
}

export interface LeaderboardRow {
  rank: number;
  id: string;
  displayName: string;
  passionPoints: number;
  streak: number;
  votesCast: number;
  badges: number;
  wallet: string | null;
}

export interface Matchup {
  id: string;
  aLabel: string;
  aClipUrl?: string | null;
  aVotes: number;
  bLabel: string;
  bClipUrl?: string | null;
  bVotes: number;
  winner?: string | null;
}

export interface Round {
  name: string;
  matchups: Matchup[];
}

export interface Tournament {
  _id?: string;
  name: string;
  domain: Domain;
  status: 'open' | 'closed';
  rounds: Round[];
}

export interface Badge {
  label: string;
  reason: string;
  mint: string;
  txSignature: string | null;
  explorerUrl: string | null;
  simulated: boolean;
  awardedAt: string;
}

export interface User {
  _id: string;
  displayName: string;
  walletAddress?: string | null;
  passionPoints: number;
  streak: number;
  votesCast: number;
  bracketWins: number;
  badges: Badge[];
}

export interface IngestReport {
  pluginId: string;
  fetched: number;
  created: number;
  skipped: number;
}
