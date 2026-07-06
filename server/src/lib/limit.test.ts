import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLimiter, withRetry } from './limit';

describe('createLimiter', () => {
  it('caps concurrent tasks', async () => {
    const limit = createLimiter(2);
    let active = 0;
    let peak = 0;
    const resolvers: (() => void)[] = [];
    const flush = async () => {
      for (let i = 0; i < 20; i += 1) await Promise.resolve();
    };
    const task = () =>
      limit(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise<void>(resolve => resolvers.push(resolve));
        active -= 1;
      });
    const all = Promise.all([task(), task(), task(), task()]);
    await flush();
    expect(peak).toBe(2);
    while (resolvers.length > 0) {
      resolvers.shift()!();
      await flush();
    }
    await all;
    expect(peak).toBe(2);
  });

  it('propagates task results and failures', async () => {
    const limit = createLimiter(1);
    await expect(limit(async () => 'ok')).resolves.toBe('ok');
    await expect(limit(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(limit(async () => 'still works')).resolves.toBe('still works');
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries retryable failures with backoff', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('rate limited'), { statusCode: 429 }))
      .mockResolvedValueOnce('recovered');
    const result = withRetry(fn, { retries: 2, baseDelayMs: 100 });
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('gives up after the retry budget', async () => {
    const fn = vi.fn().mockRejectedValue(Object.assign(new Error('rate limited'), { statusCode: 429 }));
    const result = withRetry(fn, { retries: 2, baseDelayMs: 10 });
    const assertion = expect(result).rejects.toThrow('rate limited');
    await vi.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-retryable failures', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('bad request'));
    const assertion = expect(withRetry(fn, { retries: 3, baseDelayMs: 10 })).rejects.toThrow('bad request');
    await vi.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('honors isRetryable errors', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('overloaded'), { isRetryable: true }))
      .mockResolvedValueOnce('done');
    const result = withRetry(fn, { retries: 1, baseDelayMs: 10 });
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBe('done');
  });
});
