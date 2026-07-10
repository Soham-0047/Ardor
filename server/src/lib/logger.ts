/* Tiny leveled logger — timestamped, no dependency. */

type Level = 'info' | 'warn' | 'error' | 'debug';

function emit(level: Level, scope: string, msg: string, extra?: unknown) {
  const tag = `[${level.toUpperCase()}] (${scope})`;
  const line = `${tag} ${msg}`;
  const fn =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (extra !== undefined) fn(line, extra);
  else fn(line);
}

export function createLogger(scope: string) {
  return {
    info: (msg: string, extra?: unknown) => emit('info', scope, msg, extra),
    warn: (msg: string, extra?: unknown) => emit('warn', scope, msg, extra),
    error: (msg: string, extra?: unknown) => emit('error', scope, msg, extra),
    debug: (msg: string, extra?: unknown) => {
      if (process.env.DEBUG) emit('debug', scope, msg, extra);
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
