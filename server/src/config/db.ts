import mongoose from 'mongoose';
import { env, flags } from './env';
import { createLogger } from '../lib/logger';

const log = createLogger('db');

// Keep a handle so we can stop the in-memory server on shutdown.
let memoryServer: { stop: () => Promise<unknown> } | null = null;

async function startMemoryServer(): Promise<string> {
  // Imported lazily so a real-Mongo deployment never loads the binary manager.
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  memoryServer = mongod;
  return mongod.getUri('fanforge');
}

/**
 * Connect to MongoDB. Prefers the configured MONGODB_URI; if that's unreachable
 * (or USE_MEMORY_DB=true), transparently falls back to an in-memory mongod so
 * the demo never depends on a local install. Sets flags.memoryDb accordingly.
 */
export async function connectDb(): Promise<{ uri: string; memory: boolean }> {
  mongoose.set('strictQuery', true);

  if (!env.useMemoryDb) {
    try {
      await mongoose.connect(env.mongoUri, {
        serverSelectionTimeoutMS: 1500,
      });
      log.info(`connected to MongoDB at ${redact(env.mongoUri)}`);
      flags.memoryDb = false;
      return { uri: env.mongoUri, memory: false };
    } catch (err) {
      log.warn(
        `could not reach ${redact(env.mongoUri)} — falling back to in-memory MongoDB`,
        (err as Error).message,
      );
    }
  }

  const uri = await startMemoryServer();
  await mongoose.connect(uri);
  log.info('connected to in-memory MongoDB (mongodb-memory-server)');
  flags.memoryDb = true;
  return { uri, memory: true };
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

function redact(uri: string): string {
  return uri.replace(/\/\/([^@]+)@/, '//***@');
}
