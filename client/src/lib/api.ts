import type {
  AppConfig,
  Badge,
  IngestReport,
  LeaderboardRow,
  ScoredEvent,
  SearchResult,
  Tournament,
  Trends,
  User,
  Domain,
  Matchup,
} from './types';

const BASE = '/api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export interface EventQuery {
  domain?: Domain;
  type?: string;
  matchId?: string;
  minScore?: number;
  keyMoment?: boolean;
  sort?: 'recent' | 'score';
  limit?: number;
}

function qs(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  config: () => req<AppConfig>('/config'),

  events: (q: EventQuery = {}) =>
    req<{ events: ScoredEvent[]; count: number }>(`/events${qs({ ...q } as Record<string, unknown>)}`),

  event: (id: string) => req<{ event: ScoredEvent }>(`/events/${id}`),

  search: (query: string, opts: { domain?: Domain; limit?: number } = {}) =>
    req<{ results: SearchResult[]; count: number; query: string }>(
      `/search${qs({ q: query, ...opts })}`,
    ),

  trends: (domain?: Domain) => req<Trends>(`/trends${qs({ domain })}`),

  ingest: (pluginId?: string) =>
    req<{ reports: IngestReport[] }>('/ingest', {
      method: 'POST',
      body: JSON.stringify({ pluginId }),
    }),

  submitAction: (pluginId: string, body: Record<string, unknown>) =>
    req<{ event: ScoredEvent }>(`/plugins/${pluginId}/actions`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  narrate: (eventId: string) =>
    req<{ audioUrl: string | null; enabled: boolean }>(`/events/${eventId}/narrate`, {
      method: 'POST',
    }),

  createUser: (displayName: string, walletAddress?: string) =>
    req<{ user: User }>('/users', {
      method: 'POST',
      body: JSON.stringify({ displayName, walletAddress }),
    }),

  leaderboard: () => req<{ leaderboard: LeaderboardRow[] }>('/leaderboard'),

  tournament: () => req<{ tournament: Tournament }>('/tournament'),

  vote: (userId: string, matchupId: string, choice: 'a' | 'b') =>
    req<{ matchup: Matchup; user: User; newBadge: Badge | null }>('/tournament/vote', {
      method: 'POST',
      body: JSON.stringify({ userId, matchupId, choice }),
    }),

  mintBadge: (userId: string, label?: string, reason?: string) =>
    req<{ badge: Badge; user: User }>('/badges/mint', {
      method: 'POST',
      body: JSON.stringify({ userId, label, reason }),
    }),
};
