export function createLimiter(max: number): <T>(task: () => Promise<T>) => Promise<T> {
  let active = 0;
  const queue: (() => void)[] = [];

  const release = () => {
    active -= 1;
    queue.shift()?.();
  };

  return async task => {
    if (active >= max) {
      await new Promise<void>(resolve => queue.push(resolve));
    }
    active += 1;
    try {
      return await task();
    } finally {
      release();
    }
  };
}

interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

function defaultShouldRetry(error: unknown): boolean {
  const candidate = error as { statusCode?: number; isRetryable?: boolean };
  return candidate?.statusCode === 429 || candidate?.isRetryable === true;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 2, baseDelayMs = 2000, shouldRetry = defaultShouldRetry } = options;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error)) throw error;
      const delay = baseDelayMs * 2 ** attempt * (0.5 + Math.random());
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
