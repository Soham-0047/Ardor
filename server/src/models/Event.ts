import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import type { ScoredEvent } from '../types';

/**
 * The primary FanForge collection. Each document is a normalized event with an
 * embedded passion score. The dashboard feed, trend aggregations, and the Mongo
 * search fallback all read from here.
 */

const ScoreSchema = new Schema(
  {
    passion_score: { type: Number, required: true, min: 0, max: 100 },
    sentiment: {
      type: String,
      required: true,
      enum: ['ecstatic', 'positive', 'neutral', 'tense', 'negative', 'heartbroken'],
    },
    key_moment: { type: Boolean, required: true, default: false },
    one_line_recap: { type: String, required: true },
    model: { type: String, required: true },
  },
  { _id: false },
);

const EventSchema = new Schema(
  {
    pluginId: { type: String, required: true, index: true },
    domain: {
      type: String,
      required: true,
      enum: ['worldcup', 'rivalry', 'personal'],
      index: true,
    },
    externalId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    rawText: { type: String, required: true, default: '' },
    teams: { type: [String], default: [] },
    players: { type: [String], default: [] },
    competition: { type: String },
    matchId: { type: String, index: true },
    occurredAt: { type: Date, required: true, index: true },
    metadata: { type: Schema.Types.Mixed },
    score: { type: ScoreSchema, required: true },
    audioUrl: { type: String, default: null },
  },
  { timestamps: true },
);

// Full-text index powers the Mongo search fallback when Algolia is absent.
EventSchema.index({ title: 'text', rawText: 'text', 'score.one_line_recap': 'text' });
// Common feed/trend access patterns.
EventSchema.index({ domain: 1, occurredAt: -1 });
EventSchema.index({ 'score.passion_score': -1 });

export type EventDoc = HydratedDocument<InferSchemaType<typeof EventSchema>>;

export const EventModel = model('Event', EventSchema);

/** Serialize a Mongo document into the API-facing ScoredEvent shape. */
export function toScoredEvent(input: EventDoc): ScoredEvent {
  // `timestamps: true` adds these at runtime; assert them for the type layer.
  const doc = input as EventDoc & { createdAt: Date; updatedAt: Date };
  return {
    id: String(doc._id),
    pluginId: doc.pluginId,
    domain: doc.domain as ScoredEvent['domain'],
    externalId: doc.externalId,
    type: doc.type,
    title: doc.title,
    rawText: doc.rawText,
    teams: doc.teams ?? [],
    players: doc.players ?? [],
    competition: doc.competition ?? undefined,
    matchId: doc.matchId ?? undefined,
    occurredAt: (doc.occurredAt as Date).toISOString(),
    metadata: (doc.metadata as Record<string, unknown>) ?? undefined,
    score: {
      passion_score: doc.score.passion_score,
      sentiment: doc.score.sentiment as ScoredEvent['score']['sentiment'],
      key_moment: doc.score.key_moment,
      one_line_recap: doc.score.one_line_recap,
      model: doc.score.model,
    },
    audioUrl: doc.audioUrl ?? null,
    createdAt: (doc.createdAt as Date).toISOString(),
    updatedAt: (doc.updatedAt as Date).toISOString(),
  };
}
