import { describe, expect, it } from 'vitest';

import { chunkText } from './chunker';

describe('chunkText', () => {
  it('returns nothing for empty input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\n  ')).toEqual([]);
  });

  it('keeps a short text as a single chunk', () => {
    expect(chunkText('We ship fast.')).toEqual(['We ship fast.']);
  });

  it('merges small paragraphs up to the target length', () => {
    const chunks = chunkText('First paragraph.\n\nSecond paragraph.\n\nThird paragraph.', { targetLength: 60 });
    expect(chunks.length).toBeLessThan(3);
    expect(chunks.join(' ')).toContain('First paragraph.');
    expect(chunks.join(' ')).toContain('Third paragraph.');
  });

  it('splits an oversized paragraph', () => {
    const long = Array.from({ length: 30 }, (_, index) => `Sentence number ${index} about the product.`).join(' ');
    const chunks = chunkText(long, { targetLength: 200 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(400);
    }
  });

  it('caps the number of chunks', () => {
    const many = Array.from({ length: 50 }, (_, index) => `Paragraph ${index} `.repeat(30)).join('\n\n');
    expect(chunkText(many, { targetLength: 100, maxChunks: 10 })).toHaveLength(10);
  });
});
