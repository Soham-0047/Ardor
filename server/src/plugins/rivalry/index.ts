import type { FanPlugin } from '../types';
import type { RawEvent } from '../../types';

/**
 * Rivalry plugin — proves the engine isn't a single-sport toy. Scores the heat
 * of any two-sided rivalry (frameworks, editors, GOAT debates, chess players).
 * Mostly user-driven via normalizeUserAction; ships a few sample flashpoints so
 * "ingest all" populates the domain for the demo.
 */

const SAMPLES: RawEvent[] = [
  {
    pluginId: 'rivalry',
    domain: 'rivalry',
    externalId: 'rivalry-sample-vim-emacs-1',
    type: 'rivalry_update',
    title: 'Vim vs Emacs: the modal editor lands a haymaker',
    rawText:
      'A viral benchmark shows Vim users editing 30% faster in a live coding duel. Emacs die-hards fire back with org-mode. The thread erupts to 4,000 comments overnight.',
    teams: ['Vim', 'Emacs'],
    players: [],
    competition: 'Editor Wars',
    matchId: 'rivalry-vim-emacs',
    occurredAt: '2026-07-09T14:00:00Z',
    metadata: { heat: 'high' },
  },
  {
    pluginId: 'rivalry',
    domain: 'rivalry',
    externalId: 'rivalry-sample-react-vue-1',
    type: 'rivalry_update',
    title: 'React vs Vue: a framework shots-fired keynote',
    rawText:
      'A conference keynote calls Vue "the developer-happiness king." React core team responds with a compiler demo that quietly steals the show. Both camps claim victory.',
    teams: ['React', 'Vue'],
    players: [],
    competition: 'Framework Wars',
    matchId: 'rivalry-react-vue',
    occurredAt: '2026-07-10T09:30:00Z',
    metadata: { heat: 'medium' },
  },
  {
    pluginId: 'rivalry',
    domain: 'rivalry',
    externalId: 'rivalry-sample-goat-1',
    type: 'rivalry_update',
    title: 'The GOAT debate reignites after a World Cup wonder-goal',
    rawText:
      'A jaw-dropping solo goal sends the eternal GOAT argument into overdrive across every timeline. Neutral fans just want to enjoy the highlight.',
    teams: ['Messi camp', 'Ronaldo camp'],
    players: [],
    competition: 'GOAT Debate',
    matchId: 'rivalry-goat',
    occurredAt: '2026-07-10T21:15:00Z',
    metadata: { heat: 'very high' },
  },
];

export const rivalryPlugin: FanPlugin = {
  id: 'rivalry',
  domain: 'rivalry',
  displayName: 'Rivalries',
  description: 'Scores the heat of any two-sided rivalry — frameworks, editors, GOAT debates.',
  emoji: '⚔️',
  voicePersona: 'a dramatic pay-per-view boxing announcer',
  scoringPrompt:
    'This is a rivalry flashpoint between two sides. Weight decisive blows, ' +
    'viral moments, and community uproar highest. Score how much the fanbases ' +
    'are fired up, not who is objectively correct.',
  async fetchEvents(): Promise<RawEvent[]> {
    return SAMPLES;
  },
  normalizeUserAction(input: Record<string, unknown>): RawEvent {
    const sideA = String(input.sideA ?? 'Side A');
    const sideB = String(input.sideB ?? 'Side B');
    const headline = String(input.headline ?? `${sideA} vs ${sideB}`);
    const detail = String(input.detail ?? headline);
    const slug = `${sideA}-${sideB}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return {
      pluginId: 'rivalry',
      domain: 'rivalry',
      externalId: `rivalry-user-${slug}-${Date.now()}`,
      type: 'rivalry_update',
      title: headline,
      rawText: detail,
      teams: [sideA, sideB],
      players: [],
      competition: String(input.competition ?? 'Fan Rivalry'),
      matchId: `rivalry-${slug}`,
      occurredAt: new Date().toISOString(),
      metadata: { userSubmitted: true },
    };
  },
};
