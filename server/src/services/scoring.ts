import { flags } from '../config/env';
import type { PassionScore, RawEvent } from '../types';
import type { FanPlugin } from '../plugins/types';
import { heuristicScore } from '../lib/heuristicScorer';
import { aiScore } from './aiScorer';
import { createLogger } from '../lib/logger';

const log = createLogger('scoring');

/** A hung upstream call must not stall the pipeline — fall back instead. */
const AI_TIMEOUT_MS = 30_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Score an event. Uses admin-service structured extraction when configured,
 * and always falls back to the deterministic heuristic on any error or timeout
 * so the pipeline never stalls. The rest of the app only ever calls scoreEvent.
 */
export async function scoreEvent(event: RawEvent, plugin?: FanPlugin): Promise<PassionScore> {
  if (flags.ai) {
    try {
      return await withTimeout(aiScore(event, plugin), AI_TIMEOUT_MS);
    } catch (err) {
      log.warn(`AI scoring failed for "${event.title}", using heuristic`, (err as Error).message);
    }
  }
  return heuristicScore(event);
}
