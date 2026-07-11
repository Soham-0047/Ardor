import fs from 'node:fs/promises';
import path from 'node:path';
import { env, flags } from '../config/env';
import { AUDIO_DIR } from '../config/paths';
import type { ScoredEvent } from '../types';
import type { FanPlugin } from '../plugins/types';
import { createLogger } from '../lib/logger';

const log = createLogger('audio');

/**
 * ElevenLabs hype narration (BONUS, feature-flagged).
 *
 * Generates a short spoken recap for a high-scoring moment and caches it to
 * disk (never regenerated per view — the brief calls this out explicitly).
 * Returns null when the flag is off or the key is missing, so the rest of the
 * demo is unaffected by a broken/absent integration.
 */

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Public URL for a given event's cached clip. */
export function clipUrlFor(eventId: string): string {
  return `/audio/${eventId}.mp3`;
}

export async function getOrCreateClip(
  event: ScoredEvent,
  plugin?: FanPlugin,
): Promise<string | null> {
  if (!flags.elevenlabs) return null;

  const filePath = path.join(AUDIO_DIR, `${event.id}.mp3`);
  const url = clipUrlFor(event.id);

  if (await fileExists(filePath)) return url; // cached

  const persona = plugin?.voicePersona ?? 'an electric stadium commentator';
  const scriptText = `${event.score.one_line_recap} Passion reading: ${event.score.passion_score} out of one hundred.`;

  try {
    await fs.mkdir(AUDIO_DIR, { recursive: true });
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${env.elevenLabsVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': env.elevenLabsApiKey,
          'Content-Type': 'application/json',
          accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: `In the voice of ${persona}: ${scriptText}`,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.6 },
        }),
      },
    );
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(filePath, buf);
    log.info(`cached narration clip for "${event.title}"`);
    return url;
  } catch (err) {
    log.warn(`narration failed for "${event.title}" (non-fatal)`, (err as Error).message);
    return null;
  }
}
