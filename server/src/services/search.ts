import type { Domain, ScoredEvent } from '../types';
import { EventModel, toScoredEvent } from '../models';

/**
 * Instant search over scored moments, backed by MongoDB full-text search
 * (with a loose-regex last resort so partial words still hit in a demo).
 * Results are passion-ranked: text relevance first, then passion score.
 */

export interface SearchResult {
  id: string;
  domain: Domain;
  type: string;
  title: string;
  teams: string[];
  players: string[];
  occurredAt: string;
  passion_score: number;
  sentiment: string;
  one_line_recap: string;
  audioUrl?: string | null;
}

function eventToResult(e: ScoredEvent): SearchResult {
  return {
    id: e.id,
    domain: e.domain,
    type: e.type,
    title: e.title,
    teams: e.teams,
    players: e.players,
    occurredAt: e.occurredAt,
    passion_score: e.score.passion_score,
    sentiment: e.score.sentiment,
    one_line_recap: e.score.one_line_recap,
    audioUrl: e.audioUrl ?? null,
  };
}

export interface SearchOptions {
  domain?: Domain;
  limit?: number;
}

export async function searchMoments(query: string, opts: SearchOptions = {}): Promise<SearchResult[]> {
  const limit = opts.limit ?? 20;
  const q = query.trim();
  const baseFilter = opts.domain ? { domain: opts.domain } : {};

  if (q.length === 0) {
    const docs = await EventModel.find(baseFilter).sort({ occurredAt: -1 }).limit(limit);
    return docs.map((d) => eventToResult(toScoredEvent(d)));
  }

  const textDocs = await EventModel.find({ ...baseFilter, $text: { $search: q } })
    .sort({ 'score.passion_score': -1, occurredAt: -1 })
    .limit(limit);

  if (textDocs.length > 0) return textDocs.map((d) => eventToResult(toScoredEvent(d)));

  // Last resort: loose regex so partial words still match in the demo.
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const regexDocs = await EventModel.find({
    ...baseFilter,
    $or: [{ title: rx }, { rawText: rx }, { 'score.one_line_recap': rx }, { teams: rx }, { players: rx }],
  })
    .sort({ occurredAt: -1 })
    .limit(limit);
  return regexDocs.map((d) => eventToResult(toScoredEvent(d)));
}
