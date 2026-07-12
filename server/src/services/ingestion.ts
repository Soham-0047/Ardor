import type { RawEvent, ScoredEvent } from '../types';
import type { FanPlugin } from '../plugins/types';
import { EventModel, toScoredEvent } from '../models';
import { allPlugins, getPlugin } from '../plugins/registry';
import { scoreEvent } from './scoring';
import { createLogger } from '../lib/logger';

const log = createLogger('ingestion');

export interface IngestReport {
  pluginId: string;
  fetched: number;
  created: number;
  skipped: number;
}

/**
 * Score one raw event and persist it. Existing events (matched by externalId)
 * are returned untouched, so re-ingesting is idempotent and never re-spends
 * AI calls. Newly-seen events are scored and inserted.
 */
export async function scoreAndStore(
  raw: RawEvent,
  plugin?: FanPlugin,
): Promise<{ event: ScoredEvent; created: boolean }> {
  const existing = await EventModel.findOne({ externalId: raw.externalId });
  if (existing) {
    return { event: toScoredEvent(existing), created: false };
  }
  const score = await scoreEvent(raw, plugin);
  const doc = await EventModel.create({
    pluginId: raw.pluginId,
    domain: raw.domain,
    externalId: raw.externalId,
    type: raw.type,
    title: raw.title,
    rawText: raw.rawText,
    teams: raw.teams,
    players: raw.players,
    competition: raw.competition,
    matchId: raw.matchId,
    occurredAt: new Date(raw.occurredAt),
    metadata: raw.metadata,
    score,
    audioUrl: null,
  });
  return { event: toScoredEvent(doc), created: true };
}

/** Run one plugin's full ingest: fetch → score → store. */
export async function ingestPlugin(plugin: FanPlugin): Promise<IngestReport> {
  const raws = await plugin.fetchEvents();
  let created = 0;
  for (const raw of raws) {
    const { created: isNew } = await scoreAndStore(raw, plugin);
    if (isNew) created++;
  }
  const report: IngestReport = {
    pluginId: plugin.id,
    fetched: raws.length,
    created,
    skipped: raws.length - created,
  };
  log.info(`ingested ${plugin.id}: ${created} new / ${raws.length} fetched`);
  return report;
}

export async function ingestOne(pluginId: string): Promise<IngestReport> {
  const plugin = getPlugin(pluginId);
  if (!plugin) throw new Error(`unknown plugin: ${pluginId}`);
  return ingestPlugin(plugin);
}

export async function ingestAll(): Promise<IngestReport[]> {
  const reports: IngestReport[] = [];
  for (const plugin of allPlugins()) {
    reports.push(await ingestPlugin(plugin));
  }
  return reports;
}
