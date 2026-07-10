import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/**
 * A "hype-off" bracket: fans back competing takes/moments and vote them
 * through rounds. Each matchup can optionally carry an ElevenLabs voice clip
 * per side (the "voice-argument competition" in the brief).
 */

const MatchupSchema = new Schema(
  {
    id: { type: String, required: true },
    aLabel: { type: String, required: true },
    aClipUrl: { type: String, default: null },
    aVotes: { type: Number, default: 0 },
    bLabel: { type: String, required: true },
    bClipUrl: { type: String, default: null },
    bVotes: { type: Number, default: 0 },
    winner: { type: String, default: null }, // "a" | "b" | null
  },
  { _id: false },
);

const RoundSchema = new Schema(
  {
    name: { type: String, required: true },
    matchups: { type: [MatchupSchema], default: [] },
  },
  { _id: false },
);

const TournamentSchema = new Schema(
  {
    name: { type: String, required: true },
    domain: {
      type: String,
      enum: ['worldcup', 'rivalry', 'personal'],
      default: 'worldcup',
    },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    rounds: { type: [RoundSchema], default: [] },
  },
  { timestamps: true },
);

export type TournamentDoc = HydratedDocument<InferSchemaType<typeof TournamentSchema>>;
export const TournamentModel = model('Tournament', TournamentSchema);
