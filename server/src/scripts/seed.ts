import { connectDb, disconnectDb } from '../config/db';
import { EventModel } from '../models';
import { ingestAll } from '../services/ingestion';
import { createLogger } from '../lib/logger';

const log = createLogger('seed');

/**
 * Reseed the database from all plugins. Clears the events collection, then
 * runs the full ingest pipeline (fetch → score → store → index). Safe to run
 * repeatedly. Note: with the in-memory DB fallback, data lives only for the
 * process, so the server auto-ingests on first boot anyway — this script is
 * mainly for a persistent MongoDB.
 */
async function main() {
  await connectDb();
  const removed = await EventModel.deleteMany({});
  log.info(`cleared ${removed.deletedCount ?? 0} existing events`);

  const reports = await ingestAll();
  for (const r of reports) {
    log.info(`  ${r.pluginId}: ${r.created} created / ${r.fetched} fetched`);
  }
  const total = await EventModel.countDocuments();
  log.info(`seed complete — ${total} events in the database`);

  await disconnectDb();
  process.exit(0);
}

main().catch((err) => {
  log.error('seed failed', (err as Error).message);
  process.exit(1);
});
