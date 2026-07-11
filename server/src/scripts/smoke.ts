import { connectDb, disconnectDb } from '../config/db';
import { EventModel, UserModel, VoteModel, TournamentModel } from '../models';
import { ingestAll } from '../services/ingestion';
import { scoreAndStore } from '../services/ingestion';
import { searchMoments } from '../services/search';
import { mintBadge } from '../services/badge';
import { getOrCreateClip } from '../services/audio';
import { heuristicScore } from '../lib/heuristicScorer';
import type { RawEvent } from '../types';
import { createLogger } from '../lib/logger';

const log = createLogger('smoke');

/**
 * End-to-end smoke test of the FanForge pipeline against an in-memory
 * MongoDB (run with USE_MEMORY_DB=true — the npm script does this).
 *
 *   npm run smoke
 *
 * Exercises: ingest → score → store (idempotent) → search → aggregate →
 * badge (simulated) → vote-uniqueness invariant. Exits 0 on PASS, 1 on FAIL.
 * No API keys required — this is the offline-fallback path, which is exactly
 * what the demo depends on.
 */

let failures = 0;
function check(cond: boolean, label: string) {
  if (cond) {
    log.info(`  ✓ ${label}`);
  } else {
    failures++;
    log.error(`  ✗ ${label}`);
  }
}

async function main() {
  await connectDb();
  // Ensure all indexes (text search, unique vote) exist before we rely on them.
  await Promise.all([
    EventModel.init(),
    UserModel.init(),
    VoteModel.init(),
    TournamentModel.init(),
  ]);

  log.info('1. ingest all plugins');
  const first = await ingestAll();
  const firstCreated = first.reduce((n, r) => n + r.created, 0);
  check(firstCreated >= 66, `initial ingest creates the seeded corpus (got ${firstCreated})`);

  log.info('2. re-ingest is idempotent');
  const second = await ingestAll();
  const secondCreated = second.reduce((n, r) => n + r.created, 0);
  check(secondCreated === 0, `re-ingest creates 0 new events (got ${secondCreated})`);

  log.info('3. score + store a synthetic user event');
  const synthetic: RawEvent = {
    pluginId: 'personal',
    domain: 'personal',
    externalId: `smoke-${Date.now()}`,
    type: 'milestone',
    title: 'Smoke test shipped a stunning breakthrough',
    rawText: 'An incredible last-minute breakthrough — the whole pipeline passes end to end!',
    teams: [],
    players: ['Smoke'],
    competition: 'Smoke Suite',
    matchId: 'smoke',
    occurredAt: new Date().toISOString(),
  };
  const { event, created } = await scoreAndStore(synthetic);
  check(created, 'synthetic event is newly created');
  check(
    event.score.passion_score >= 0 && event.score.passion_score <= 100,
    `passion score in range (${event.score.passion_score})`,
  );
  check(event.score.one_line_recap.length > 0, 'recap is non-empty');
  const again = await scoreAndStore(synthetic);
  check(!again.created, 'same externalId is deduped, not re-scored');

  log.info('4. heuristic scorer is deterministic');
  const h1 = heuristicScore(synthetic);
  const h2 = heuristicScore(synthetic);
  check(
    h1.passion_score === h2.passion_score && h1.sentiment === h2.sentiment,
    'identical input → identical score',
  );

  log.info('5. search (Mongo fallback path)');
  const hits = await searchMoments('comeback');
  check(hits.length > 0, `"comeback" finds moments (got ${hits.length})`);
  const domainHits = await searchMoments('', { domain: 'rivalry', limit: 5 });
  check(
    domainHits.length > 0 && domainHits.every((h) => h.domain === 'rivalry'),
    'empty query + domain filter returns only that domain',
  );

  log.info('6. trend aggregation');
  const [agg] = await EventModel.aggregate<{ avg: number; n: number }>([
    { $group: { _id: null, avg: { $avg: '$score.passion_score' }, n: { $sum: 1 } } },
  ]);
  check(agg.n >= 67, `aggregate sees all events (${agg.n})`);
  check(agg.avg > 20 && agg.avg < 95, `average passion is sane (${Math.round(agg.avg)})`);

  log.info('7. badge minting falls back to simulation');
  const badge = await mintBadge({ label: 'Smoke Badge', reason: 'smoke test' });
  check(badge.simulated, 'badge is simulated without Solana flag');
  check(badge.mint.length > 20, 'simulated mint id looks like an address');

  log.info('8. narration is a no-op when flagged off');
  const clip = await getOrCreateClip(event);
  check(clip === null, 'no clip without the ElevenLabs flag');

  log.info('9. vote uniqueness invariant');
  const user = await UserModel.create({ displayName: 'SmokeFan' });
  const tournament = await TournamentModel.create({
    name: 'Smoke Cup',
    rounds: [{ name: 'Final', matchups: [{ id: 'f1', aLabel: 'A', bLabel: 'B' }] }],
  });
  await VoteModel.create({
    userId: user._id,
    tournamentId: tournament._id,
    matchupId: 'f1',
    choice: 'a',
  });
  let dupCode: number | undefined;
  try {
    await VoteModel.create({
      userId: user._id,
      tournamentId: tournament._id,
      matchupId: 'f1',
      choice: 'b',
    });
  } catch (err) {
    dupCode = (err as { code?: number }).code;
  }
  check(dupCode === 11000, 'duplicate vote rejected by unique index');

  await disconnectDb();

  if (failures > 0) {
    log.error(`SMOKE FAILED — ${failures} check(s) failed`);
    process.exit(1);
  }
  log.info('SMOKE PASSED — full pipeline works offline');
  process.exit(0);
}

main().catch(async (err) => {
  log.error('smoke crashed', (err as Error).message);
  await disconnectDb().catch(() => {});
  process.exit(1);
});
