import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { env, flags } from './config/env';
import { PUBLIC_DIR, AUDIO_DIR } from './config/paths';
import { connectDb } from './config/db';
import api from './routes';
import { EventModel } from './models';
import { ingestAll } from './services/ingestion';
import { createLogger } from './lib/logger';

const log = createLogger('server');

async function bootstrap() {
  const db = await connectDb();

  // Ensure the audio cache dir exists so express.static has something to serve.
  fs.mkdirSync(AUDIO_DIR, { recursive: true });

  const app = express();
  app.use(cors({ origin: [env.clientOrigin, /localhost:\d+$/], credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  // Cached ElevenLabs clips.
  app.use('/audio', express.static(AUDIO_DIR));

  app.use('/api', api);

  // Serve the built client in production, if present (single-command deploy).
  const clientDist = path.resolve(process.cwd(), '..', 'client', 'dist');
  if (fs.existsSync(path.join(clientDist, 'index.html'))) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
    log.info('serving built client from client/dist');
  }

  // 404 for unmatched API routes.
  app.use('/api', (_req, res) => res.status(404).json({ error: 'not found' }));

  // Central error handler.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'internal error';
    log.error('request failed', message);
    res.status(500).json({ error: message });
  });

  // First run: auto-ingest the seeded/live data so the dashboard has content.
  const count = await EventModel.countDocuments();
  if (count === 0) {
    log.info('empty database — running initial ingest from all plugins');
    const reports = await ingestAll();
    const created = reports.reduce((n, r) => n + r.created, 0);
    log.info(`initial ingest complete: ${created} events`);
  } else {
    log.info(`database has ${count} events`);
  }

  // Optional background ingest loop (0 = disabled).
  if (env.ingestIntervalMs > 0) {
    setInterval(() => {
      ingestAll().catch((e) => log.warn('scheduled ingest failed', (e as Error).message));
    }, env.ingestIntervalMs);
    log.info(`scheduled ingest every ${env.ingestIntervalMs}ms`);
  }

  app.listen(env.port, () => {
    log.info(`FanForge API listening on http://localhost:${env.port}`);
    log.info(
      `integrations — gemini:${flags.gemini} algolia:${flags.algolia} ` +
        `elevenlabs:${flags.elevenlabs} solana:${flags.solana} ` +
        `footballData:${flags.footballData} memoryDb:${db.memory}`,
    );
    void PUBLIC_DIR;
  });
}

bootstrap().catch((err) => {
  log.error('failed to start', (err as Error).message);
  process.exit(1);
});
