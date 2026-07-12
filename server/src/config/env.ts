import 'dotenv/config';
import type { FeatureFlags } from '../types';

/**
 * Centralized, typed environment config. Nothing here throws on a missing
 * key — absent integrations degrade to deterministic offline fallbacks, and
 * `flags` reports what's actually live so the UI can be honest about it.
 */

function bool(v: string | undefined, fallback = false): boolean {
  if (v === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v.trim().toLowerCase());
}

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  port: num(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  // Mongo
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fanforge',
  useMemoryDb: bool(process.env.USE_MEMORY_DB, false),

  // admin-service (central vault + smart LLM router — see /admin.md).
  // Replaces a hardcoded Gemini key: we ask it for the healthiest free LLM.
  adminUrl: process.env.ADMIN_URL || 'https://admin-w1i8.onrender.com',
  serviceToken: process.env.SERVICE_TOKEN || '',

  // football-data.org
  footballDataApiKey: process.env.FOOTBALL_DATA_API_KEY || '',

  // ElevenLabs (flagged)
  featureElevenLabs: bool(process.env.FEATURE_ELEVENLABS, true),
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || '',

  // Solana (flagged)
  featureSolana: bool(process.env.FEATURE_SOLANA, true),
  solanaRpc: process.env.SOLANA_RPC || 'https://api.devnet.solana.com',
  solanaMintSecret: process.env.SOLANA_MINT_SECRET || '',

  // Ingestion loop
  ingestIntervalMs: num(process.env.INGEST_INTERVAL_MS, 0),
} as const;

/**
 * Whether each optional integration is actually usable right now. A feature is
 * "live" only if its flag is on AND its credentials exist.
 */
export const flags: FeatureFlags = {
  ai: Boolean(env.serviceToken),
  elevenlabs: env.featureElevenLabs && Boolean(env.elevenLabsApiKey),
  solana: env.featureSolana && Boolean(env.solanaMintSecret),
  footballData: Boolean(env.footballDataApiKey),
  // Set at runtime once the DB layer decides which backend it used.
  memoryDb: false,
};
