import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { env } from '../config/env';
import type { PassionScore, RawEvent } from '../types';
import type { FanPlugin } from '../plugins/types';
import { createLogger } from '../lib/logger';

const log = createLogger('gemini');

/**
 * Gemini structured passion extraction. This is the core AI value: turning
 * unstructured fan noise into a comparable, queryable signal via a
 * schema-constrained call (NOT a chat response).
 *
 * Only invoked when GEMINI_API_KEY is set; scoring.ts wraps this in a
 * try/catch and falls back to the deterministic heuristic on any failure.
 */

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: env.geminiApiKey });
  return client;
}

const SENTIMENTS = ['ecstatic', 'positive', 'neutral', 'tense', 'negative', 'heartbroken'];

// JSON schema handed to Gemini so it returns structured output, not prose.
const responseSchema = {
  type: 'OBJECT',
  properties: {
    passion_score: { type: 'INTEGER', description: '0-100, how much fan passion this moment carries' },
    sentiment: { type: 'STRING', enum: SENTIMENTS },
    key_moment: { type: 'BOOLEAN', description: 'true if headline-worthy' },
    one_line_recap: { type: 'STRING', description: 'one punchy sentence, <= 140 chars' },
  },
  required: ['passion_score', 'sentiment', 'key_moment', 'one_line_recap'],
};

const ResultSchema = z.object({
  passion_score: z.number(),
  sentiment: z.enum(['ecstatic', 'positive', 'neutral', 'tense', 'negative', 'heartbroken']),
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
    'Respond ONLY with the JSON object matching the schema.',
  ].join('\n');
}

export async function geminiScore(event: RawEvent, plugin?: FanPlugin): Promise<PassionScore> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: env.geminiModel,
    contents: buildPrompt(event, plugin),
    config: {
      responseMimeType: 'application/json',
      // Cast: the SDK's Schema type uses a Type enum; the string form is
      // accepted at runtime and we keep the import surface minimal.
      responseSchema: responseSchema as unknown as Record<string, unknown>,
      temperature: 0.35,
    },
  });

  const text = response.text ?? '';
  const parsed = ResultSchema.parse(JSON.parse(text));
  const score = Math.max(0, Math.min(100, Math.round(parsed.passion_score)));

  log.debug(`scored "${event.title}" -> ${score}`);
  return {
    passion_score: score,
    sentiment: parsed.sentiment,
    key_moment: parsed.key_moment,
    one_line_recap: parsed.one_line_recap.slice(0, 200),
    model: `gemini:${env.geminiModel}`,
  };
}
