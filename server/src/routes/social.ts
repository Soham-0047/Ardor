import { Router } from 'express';
import { z } from 'zod';
import { UserModel, VoteModel, TournamentModel, type TournamentDoc } from '../models';
import { asyncHandler } from '../lib/asyncHandler';
import { mintBadge } from '../services/badge';

const router = Router();

/** Seed a default "hype-off" bracket the first time it's requested. */
async function getOrCreateTournament(): Promise<TournamentDoc> {
  const existing = await TournamentModel.findOne({ status: 'open' }).sort({ createdAt: -1 });
  if (existing) return existing;
  return TournamentModel.create({
    name: 'World Cup 2026 Hype-Off',
    domain: 'worldcup',
    status: 'open',
    rounds: [
      {
        name: 'Semifinals',
        matchups: [
          {
            id: 'sf1',
            aLabel: "Brazil's 2-0 comeback vs France",
            bLabel: "Netherlands' stoppage-time winner vs Portugal",
          },
          {
            id: 'sf2',
            aLabel: "Spain's shootout-winning save vs Germany",
            bLabel: "Argentina's red-card swing vs England",
          },
        ],
      },
      {
        name: 'Final',
        matchups: [{ id: 'final', aLabel: 'Winner of SF1', bLabel: 'Winner of SF2' }],
      },
    ],
  });
}

/** POST /api/users — create or fetch a fan by handle (and optional wallet). */
router.post(
  '/users',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        displayName: z.string().min(1).max(40),
        walletAddress: z.string().min(1).max(64).optional(),
      })
      .parse(req.body ?? {});

    let user = await UserModel.findOne({ displayName: body.displayName });
    if (!user) {
      user = await UserModel.create({
        displayName: body.displayName,
        walletAddress: body.walletAddress ?? null,
      });
    } else if (body.walletAddress && !user.walletAddress) {
      user.set('walletAddress', body.walletAddress);
      await user.save();
    }
    res.json({ user });
  }),
);

router.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.params.id).catch(() => null);
    if (!user) return res.status(404).json({ error: 'not found' });
    res.json({ user });
  }),
);

/** GET /api/leaderboard — most passionate fans. */
router.get(
  '/leaderboard',
  asyncHandler(async (_req, res) => {
    const users = await UserModel.find()
      .sort({ passionPoints: -1, votesCast: -1 })
      .limit(10)
      .select('displayName passionPoints streak votesCast bracketWins badges walletAddress');
    res.json({
      leaderboard: users.map((u, i) => ({
        rank: i + 1,
        id: String(u._id),
        displayName: u.displayName,
        passionPoints: u.passionPoints,
        streak: u.streak,
        votesCast: u.votesCast,
        badges: (u.badges ?? []).length,
        wallet: u.walletAddress ?? null,
      })),
    });
  }),
);

/** GET /api/tournament — the current hype-off bracket. */
router.get(
  '/tournament',
  asyncHandler(async (_req, res) => {
    const tournament = await getOrCreateTournament();
    res.json({ tournament });
  }),
);

/** POST /api/tournament/vote — cast a fan vote; may award a badge. */
router.post(
  '/tournament/vote',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        userId: z.string().min(1),
        matchupId: z.string().min(1),
        choice: z.enum(['a', 'b']),
      })
      .parse(req.body ?? {});

    const user = await UserModel.findById(body.userId).catch(() => null);
    if (!user) return res.status(404).json({ error: 'unknown user' });

    const tournament = await getOrCreateTournament();
    const round = tournament.rounds.find((r) => r.matchups.some((m) => m.id === body.matchupId));
    const matchup = round?.matchups.find((m) => m.id === body.matchupId);
    if (!matchup) return res.status(404).json({ error: 'unknown matchup' });

    // One vote per user per matchup (unique index guards double-counting).
    try {
      await VoteModel.create({
        userId: user._id,
        tournamentId: tournament._id,
        matchupId: body.matchupId,
        choice: body.choice,
      });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        return res.status(409).json({ error: 'already voted on this matchup' });
      }
      throw err;
    }

    // Atomic tally: concurrent votes must not lose updates, so increment the
    // matchup counter server-side instead of read-modify-writing the document.
    const tallyField =
      body.choice === 'a' ? 'rounds.$[].matchups.$[m].aVotes' : 'rounds.$[].matchups.$[m].bVotes';
    const updatedTournament = await TournamentModel.findOneAndUpdate(
      { _id: tournament._id },
      { $inc: { [tallyField]: 1 } },
      { arrayFilters: [{ 'm.id': body.matchupId }], new: true },
    );
    const updatedMatchup =
      updatedTournament?.rounds
        .flatMap((r) => r.matchups)
        .find((m) => m.id === body.matchupId) ?? matchup;

    user.votesCast += 1;
    user.passionPoints += 10;
    user.streak += 1;

    // Engagement threshold → mint a Passion Points badge.
    let newBadge = null;
    if (user.votesCast === 3) {
      const badge = await mintBadge({
        label: 'Superfan',
        reason: 'Cast 3 hype-off votes',
        recipientWallet: user.walletAddress ?? null,
      });
      user.badges.push(badge);
      user.passionPoints += 25;
      newBadge = badge;
    }
    await user.save();

    res.json({ matchup: updatedMatchup, user, newBadge });
  }),
);

/** POST /api/badges/mint — award a Passion Points badge on demand. */
router.post(
  '/badges/mint',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        userId: z.string().min(1),
        label: z.string().default('Passion Points'),
        reason: z.string().default('Engaged fan'),
      })
      .parse(req.body ?? {});

    const user = await UserModel.findById(body.userId).catch(() => null);
    if (!user) return res.status(404).json({ error: 'unknown user' });

    const badge = await mintBadge({
      label: body.label,
      reason: body.reason,
      recipientWallet: user.walletAddress ?? null,
    });
    user.badges.push(badge);
    user.passionPoints += 25;
    await user.save();

    res.json({ badge, user });
  }),
);

export default router;
