export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface LogContext {
  [key: string]: unknown;
  err?: unknown;
}

export interface Logger {
  debug(context: LogContext, msg: string): void;
  info(context: LogContext, msg: string): void;
  warn(context: LogContext, msg: string): void;
  error(context: LogContext, msg: string): void;
}

function serialiseErr(err: unknown): unknown {
  if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack };
  return err;
}

export function createLogger(options: { level?: LogLevel } = {}): Logger {
  const resolveMin = () =>
    RANK[options.level ?? (process.env.LOG_LEVEL as LogLevel) ?? (process.env.NODE_ENV === 'test' ? 'error' : 'info')];
  const write = (level: LogLevel, context: LogContext, msg: string) => {
    if (RANK[level] < resolveMin()) return;
    const entry: Record<string, unknown> = { level, time: Date.now(), msg };
    for (const [k, v] of Object.entries(context)) entry[k] = k === 'err' ? serialiseErr(v) : v;
    process.stdout.write(`${JSON.stringify(entry)}\n`);
  };
  return {
    debug: (c, m) => write('debug', c, m),
    info: (c, m) => write('info', c, m),
    warn: (c, m) => write('warn', c, m),
    error: (c, m) => write('error', c, m),
  };
}

export const log = createLogger();
