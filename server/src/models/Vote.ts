import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/** A single fan vote in the hype-off tournament (fan-vs-fan). */
const VoteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    matchupId: { type: String, required: true },
    choice: { type: String, required: true }, // "a" | "b"
  },
  { timestamps: true },
);

// One vote per user per matchup.
VoteSchema.index({ userId: 1, matchupId: 1 }, { unique: true });

export type VoteDoc = HydratedDocument<InferSchemaType<typeof VoteSchema>>;
export const VoteModel = model('Vote', VoteSchema);
