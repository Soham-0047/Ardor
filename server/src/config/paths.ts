import path from 'node:path';

/**
 * Static asset locations. Resolved from cwd, which npm sets to the server
 * workspace dir when running `npm run dev` / `npm start`.
 */
export const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
export const AUDIO_DIR = path.resolve(PUBLIC_DIR, 'audio');
