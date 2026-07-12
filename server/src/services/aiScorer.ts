import { z } from 'zod';
import type { PassionScore, RawEvent } from '../types';
import type { FanPlugin } from '../plugins/types';
import { createLogger } from '../lib/logger';
import { generate } from './admin';

const log = createLogger('ai-scorer');

/**
 * Structured passion extraction via admin-service (see /admin.md). This is the
 * core AI value: turning unstructured fan noise into a comparable, queryable
 * signal via a JSON-constrained call (NOT a chat response). admin-service hands
 * us the healthiest free LLM and we ask it for strict JSON.
 *
 * Only invoked when admin-service is configured; scoring.ts wraps this in a
 * try/catch and falls back to the deterministic heuristic on any failure.
 */

const SENTIMENTS = ['ecstatic', 'positive', 'neutral', 'tense', 'negative', 'heartbroken'] as const;

const ResultSchema = z.object({
  passion_score: z.number(),
  sentiment: z.enum(SENTIMENTS),
  key_moment: z.boolean(),
  one_line_recap: z.string().min(1),
});

function buildPrompt(event: RawEvent, plugin?: FanPlugin): string {
  const domainGuidance =
    plugin?.scoringPrompt ??
    'Score how much raw fan passion, drama, and emotional stakes this moment carries.';
  return [
    'You are FanForge, a passion-intelligence engine. Given one event, return a',
    'structured passion reading. passion_score is 0-100 where 100 is a',
    'once-in-a-tournament, delirium-inducing moment and 0 is routine.',
    '',
    `Domain guidance: ${domainGuidance}`,
    '',
    'EVENT:',
    `- type: ${event.type}`,
    `- title: ${event.title}`,
    `- competition: ${event.competition ?? 'n/a'}`,
    `- teams: ${event.teams.join(', ') || 'n/a'}`,
    `- players: ${event.players.join(', ') || 'n/a'}`,
    `- description: ${event.rawText}`,
    '',
    'Respond ONLY with a JSON object of this exact shape (no markdown, no prose):',
    '{',
    '  "passion_score": <integer 0-100>,',
    `  "sentiment": <one of ${SENTIMENTS.join(' | ')}>,`,
    '  "key_moment": <boolean, true if headline-worthy>,',
    '  "one_line_recap": <one punchy sentence, <= 140 chars>',
    '}',
  ].join('\n');
}

/** Pull the JSON object out of a model reply that may be fenced or padded. */
function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error('no JSON object in model response');
  }
}

export async function aiScore(event: RawEvent, plugin?: FanPlugin): Promise<PassionScore> {
  const { text, model } = await generate(buildPrompt(event, plugin));
  const parsed = ResultSchema.parse(extractJson(text));
  const score = Math.max(0, Math.min(100, Math.round(parsed.passion_score)));

  log.debug(`scored "${event.title}" -> ${score} via ${model}`);
  return {
    passion_score: score,
    sentiment: parsed.sentiment,
    key_moment: parsed.key_moment,
    one_line_recap: parsed.one_line_recap.slice(0, 200),
    model,
  };
}
