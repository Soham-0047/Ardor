import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/**
 * A fan. Identified by a wallet address when the Solana stretch feature is on,
 * otherwise by a generated handle. Tracks the engagement signals that gate
 * "Passion Points" badges: streak, votes cast, tournament wins.
 */

const BadgeSchema = new Schema(
  {
    label: { type: String, required: true },
    reason: { type: String, required: true },
    mint: { type: String, required: true },
    txSignature: { type: String, default: null },
    explorerUrl: { type: String, default: null },
    simulated: { type: Boolean, default: true },
    awardedAt: { type: Date, required: true },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    displayName: { type: String, required: true },
    walletAddress: { type: String, default: null, index: true },
    passionPoints: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    votesCast: { type: Number, default: 0 },
    bracketWins: { type: Number, default: 0 },
    badges: { type: [BadgeSchema], default: [] },
  },
  { timestamps: true },
);

UserSchema.index({ passionPoints: -1 });

export type UserDoc = HydratedDocument<InferSchemaType<typeof UserSchema>>;
export const UserModel = model('User', UserSchema);
