import { afterEach, describe, expect, it, vi } from 'vitest';

import { extractUrls, fetchUrlText, htmlToText } from './fetcher';

describe('extractUrls', () => {
  it('finds http and https urls in free text', () => {
    const urls = extractUrls('See https://acme.dev and http://blog.acme.dev/post, plus plain text.');
    expect(urls).toEqual(['https://acme.dev', 'http://blog.acme.dev/post']);
  });

  it('deduplicates urls', () => {
    expect(extractUrls('https://acme.dev https://acme.dev')).toEqual(['https://acme.dev']);
  });

  it('returns nothing for url-free text', () => {
    expect(extractUrls('just words')).toEqual([]);
  });
});

describe('htmlToText', () => {
  it('strips tags, scripts, and styles', () => {
    const text = htmlToText(
      '<html><head><style>body{color:red}</style><script>alert(1)</script></head><body><h1>Acme</h1><p>We ship fast &amp; safe.</p></body></html>',
    );
    expect(text).toContain('Acme');
    expect(text).toContain('We ship fast & safe.');
    expect(text).not.toContain('alert');
    expect(text).not.toContain('color:red');
    expect(text).not.toContain('<');
  });
});

describe('fetchUrlText', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches and converts html to text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<p>Acme docs</p>', { headers: { 'content-type': 'text/html' } })),
    );
    await expect(fetchUrlText('https://acme.dev')).resolves.toContain('Acme docs');
  });

  it('returns null on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(fetchUrlText('https://acme.dev')).resolves.toBeNull();
  });

  it('returns null on non-2xx responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 404 })));
    await expect(fetchUrlText('https://acme.dev')).resolves.toBeNull();
  });

  it('truncates oversized bodies', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(`<p>${'x'.repeat(50000)}</p>`, { headers: { 'content-type': 'text/html' } })),
    );
    const text = await fetchUrlText('https://acme.dev', { maxLength: 1000 });
    expect(text?.length).toBeLessThanOrEqual(1000);
  });
});
