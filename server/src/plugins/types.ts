import type { Domain, RawEvent } from '../types';

/**
 * A FanForge plugin. This is the extensibility contract that keeps FanForge
 * a *platform* rather than a single-sport app. World Cup is the flagship;
 * rivalry and personal-passion plugins prove the same engine generalizes.
 */
export interface FanPlugin {
  /** Unique id, e.g. "worldcup". Used in routing and event tagging. */
  id: string;
  /** Passion domain this plugin feeds. */
  domain: Domain;
  /** Display name for the UI. */
  displayName: string;
  /** One-line description of what this plugin scores. */
  description: string;
  /** Emoji/badge used in the UI. */
  emoji: string;
  /**
   * Voice persona hint for ElevenLabs narration, e.g.
   * "breathless stadium commentator". Free text.
   */
  voicePersona: string;
  /**
   * Domain-specific guidance appended to the base scoring prompt so the AI
   * (and the heuristic) understand what "passion" means for this domain.
   */
  scoringPrompt: string;
  /**
   * Pull the latest events from this plugin's source. World Cup hits
   * football-data.org (with a seeded fallback); user-driven plugins return
   * [] here and rely on normalizeUserAction instead.
   */
  fetchEvents(): Promise<RawEvent[]>;
  /**
   * Turn a user-submitted action (journal entry, rivalry update, vote) into a
   * normalized RawEvent. Optional — only user-driven plugins implement it.
   */
  normalizeUserAction?(input: Record<string, unknown>): RawEvent;
}

/** Public, serializable summary of a plugin for GET /api/plugins. */
export interface PluginInfo {
  id: string;
  domain: Domain;
  displayName: string;
  description: string;
  emoji: string;
  acceptsUserActions: boolean;
}
