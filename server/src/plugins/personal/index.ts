import type { FanPlugin } from '../types';
import type { RawEvent } from '../../types';

/**
 * Personal passion tracker — the "off-season" mode. Scores the emotional arc of
 * any long-running personal project or obsession (a build streak, training for
 * a marathon, learning an instrument). User-driven via journal entries, with a
 * seeded arc so the domain isn't empty in the demo.
 */

const SAMPLES: RawEvent[] = [
  {
    pluginId: 'personal',
    domain: 'personal',
    externalId: 'personal-sample-1',
    type: 'journal',
    title: 'Day 1: started the passion project',
    rawText:
      'Kicked off a solo build for the weekend challenge. Nervous but excited — a blank repo and a big idea.',
    teams: [],
    players: ['You'],
    competition: 'Passion Project Streak',
    matchId: 'personal-streak',
    occurredAt: '2026-07-08T08:00:00Z',
    metadata: { day: 1, streak: 1 },
  },
  {
    pluginId: 'personal',
    domain: 'personal',
    externalId: 'personal-sample-2',
    type: 'milestone',
    title: 'Day 2: first end-to-end demo working',
    rawText:
      'The whole pipeline runs end to end for the first time. Ran a lap around the room. This is why I build.',
    teams: [],
    players: ['You'],
    competition: 'Passion Project Streak',
    matchId: 'personal-streak',
    occurredAt: '2026-07-09T22:30:00Z',
    metadata: { day: 2, streak: 2 },
  },
  {
    pluginId: 'personal',
    domain: 'personal',
    externalId: 'personal-sample-3',
    type: 'journal',
    title: 'Day 3: hit a wall, then broke through',
    rawText:
      'Spent hours stuck on a nasty bug and nearly gave up. Found it at 1am — pure relief and a second wind.',
    teams: [],
    players: ['You'],
    competition: 'Passion Project Streak',
    matchId: 'personal-streak',
    occurredAt: '2026-07-10T01:10:00Z',
    metadata: { day: 3, streak: 3 },
  },
];

export const personalPlugin: FanPlugin = {
  id: 'personal',
  domain: 'personal',
  displayName: 'Personal Passion',
  description: 'Off-season mode: tracks the emotional arc of any long-running personal project.',
  emoji: '🔥',
  voicePersona: 'a warm, encouraging documentary narrator',
  scoringPrompt:
    'This is a personal passion-project journal entry or milestone. Weight ' +
    'breakthroughs, streaks, shipping moments, and hard-won relief highest. ' +
    'Score the personal emotional intensity, not external importance.',
  async fetchEvents(): Promise<RawEvent[]> {
    return SAMPLES;
  },
  normalizeUserAction(input: Record<string, unknown>): RawEvent {
    const kind = String(input.type ?? 'journal');
    const title = String(input.title ?? 'Passion log');
    const detail = String(input.detail ?? input.text ?? title);
    const project = String(input.project ?? 'Passion Project');
    const slug = project.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return {
      pluginId: 'personal',
      domain: 'personal',
      externalId: `personal-user-${slug}-${Date.now()}`,
      type: kind === 'milestone' ? 'milestone' : 'journal',
      title,
      rawText: detail,
      teams: [],
      players: [String(input.author ?? 'You')],
      competition: project,
      matchId: `personal-${slug}`,
      occurredAt: new Date().toISOString(),
      metadata: { userSubmitted: true },
    };
  },
};
