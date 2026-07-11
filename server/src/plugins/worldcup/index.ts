import type { FanPlugin } from '../types';
import type { RawEvent } from '../../types';
import { env, flags } from '../../config/env';
import { worldcupSeed } from '../../data/worldcup-seed';
import { createLogger } from '../../lib/logger';

const log = createLogger('plugin:worldcup');

/**
 * Flagship plugin. Pulls 2026 FIFA World Cup events from football-data.org when
 * a key is present, and always falls back to the seeded dataset — which matters
 * for the July 12–13 live-match gap in the brief. The seed is the reliable
 * demo path; the live fetch is a best-effort enrichment.
 */

const FOOTBALL_DATA_URL = 'https://api.football-data.org/v4/competitions/WC/matches';

async function fetchLive(): Promise<RawEvent[]> {
  const res = await fetch(FOOTBALL_DATA_URL, {
    headers: { 'X-Auth-Token': env.footballDataApiKey },
  });
  if (!res.ok) throw new Error(`football-data.org ${res.status}`);
  const data = (await res.json()) as { matches?: any[] };
  const matches = data.matches ?? [];
  const events: RawEvent[] = [];

  for (const m of matches) {
    const home = m.homeTeam?.name ?? 'Home';
    const away = m.awayTeam?.name ?? 'Away';
    const teams = [home, away];
    const matchId = `wc-live-${m.id}`;
    const stage = m.stage ?? 'Group Stage';

    if (m.status === 'FINISHED' && m.score?.fullTime) {
      const { home: hg, away: ag } = m.score.fullTime;
      const winner =
        hg > ag ? home : ag > hg ? away : null;
      events.push({
        pluginId: 'worldcup',
        domain: 'worldcup',
        externalId: `${matchId}-ft`,
        type: 'full_time',
        title: `${home} ${hg}–${ag} ${away}`,
        rawText: winner
          ? `Full time at the World Cup: ${winner} win it ${hg}–${ag}. ${stage.toLowerCase()} drama settled.`
          : `Full time: ${home} and ${away} share the spoils ${hg}–${ag} in a tense ${stage}.`,
        teams,
        players: [],
        competition: 'FIFA World Cup 2026',
        matchId,
        occurredAt: m.utcDate ?? new Date().toISOString(),
        metadata: { stage, scoreAfter: `${hg}-${ag}`, source: 'football-data.org' },
      });
    } else if (m.status === 'IN_PLAY' || m.status === 'PAUSED') {
      events.push({
        pluginId: 'worldcup',
        domain: 'worldcup',
        externalId: `${matchId}-live`,
        type: 'kickoff',
        title: `${home} vs ${away} — live`,
        rawText: `${home} and ${away} are underway in the ${stage}. The tension is building.`,
        teams,
        players: [],
        competition: 'FIFA World Cup 2026',
        matchId,
        occurredAt: m.utcDate ?? new Date().toISOString(),
        metadata: { stage, source: 'football-data.org' },
      });
    }
  }
  return events;
}

export const worldCupPlugin: FanPlugin = {
  id: 'worldcup',
  domain: 'worldcup',
  displayName: 'FIFA World Cup 2026',
  description: 'Live match moments scored for raw fan passion and drama.',
  emoji: '⚽',
  voicePersona: 'a breathless, roaring stadium commentator',
  scoringPrompt:
    'This is a World Cup match moment. Weight goals, late winners, red cards, ' +
    'penalty drama, comebacks, and knockout stakes highest. Routine passes, ' +
    'throw-ins, and early substitutions are low passion.',
  async fetchEvents(): Promise<RawEvent[]> {
    if (flags.footballData) {
      try {
        const live = await fetchLive();
        if (live.length > 0) {
          log.info(`fetched ${live.length} live events from football-data.org`);
          return live;
        }
        log.info('no live matches right now — using seeded dataset');
      } catch (err) {
        log.warn('live fetch failed — using seeded dataset', (err as Error).message);
      }
    }
    return worldcupSeed;
  },
};
