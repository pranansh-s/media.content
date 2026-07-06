import type { Brand } from '@media-content/shared';
import { describe, expect, it } from 'vitest';

import { buildImagePrompt, buildPlanPrompt, buildTextPrompt } from './prompts';

const brand: Brand = {
  id: '0b295d18-4b0e-4c58-9f3a-2f6a4b1c8d01',
  name: 'Acme',
  tagline: 'Ship faster with confidence',
  writingStyle: 'Confident and technical.',
  references: 'https://acme.dev\nWe page you before your customers do.',
};

const plan = {
  audience: 'platform engineers',
  keyMessages: ['v2 is 3x faster'],
  tone: 'calm confidence',
  hooks: ['Your dashboard should page you first'],
};

describe('buildTextPrompt', () => {
  it('embeds the brand identity in the system prompt', () => {
    const { system } = buildTextPrompt({ channel: 'tweet', prompt: 'launch v2', brand, style: null });
    expect(system).toContain('Acme');
    expect(system).toContain('Ship faster with confidence');
    expect(system).toContain('Confident and technical.');
    expect(system).toContain('We page you before your customers do.');
  });

  it('enforces tweet constraints', () => {
    const { system } = buildTextPrompt({ channel: 'tweet', prompt: 'launch v2', brand, style: null });
    expect(system).toContain('280');
    expect(system.toLowerCase()).toContain('no markdown');
  });

  it('enforces reddit title-first structure', () => {
    const { system } = buildTextPrompt({ channel: 'reddit', prompt: 'launch v2', brand, style: null });
    expect(system.toLowerCase()).toContain('title');
  });

  it('enforces github release structure', () => {
    const { system } = buildTextPrompt({ channel: 'github-release', prompt: 'launch v2', brand, style: null });
    expect(system).toContain("## What's new");
  });

  it('injects the resolved style as the voice override', () => {
    const { system } = buildTextPrompt({ channel: 'linkedin', prompt: 'launch v2', brand, style: 'dry sysadmin humor' });
    expect(system).toContain('dry sysadmin humor');
  });

  it('includes the campaign plan when present', () => {
    const { system } = buildTextPrompt({ channel: 'linkedin', prompt: 'launch v2', brand, style: null, plan });
    expect(system).toContain('platform engineers');
    expect(system).toContain('v2 is 3x faster');
    expect(system).toContain('Your dashboard should page you first');
  });

  it('includes retrieved evidence when present', () => {
    const { system } = buildTextPrompt({
      channel: 'linkedin',
      prompt: 'launch v2',
      brand,
      style: null,
      evidence: ['Acme reduced MTTR by 40% for Initech'],
    });
    expect(system).toContain('Acme reduced MTTR by 40% for Initech');
  });

  it('uses the brief as the user prompt', () => {
    const { prompt } = buildTextPrompt({ channel: 'tweet', prompt: 'launch v2 of the API monitor', brand, style: null });
    expect(prompt).toContain('launch v2 of the API monitor');
  });

  it('builds a refinement prompt with the previous draft and instruction', () => {
    const { prompt } = buildTextPrompt({
      channel: 'tweet',
      prompt: 'launch v2',
      brand,
      style: null,
      previousBody: 'Acme v2 is out.',
      refinementPrompt: 'make it punchier',
    });
    expect(prompt).toContain('Acme v2 is out.');
    expect(prompt).toContain('make it punchier');
  });

  it('demands raw output with no preamble', () => {
    const { system } = buildTextPrompt({ channel: 'tweet', prompt: 'launch v2', brand, style: null });
    expect(system.toLowerCase()).toContain('only the');
  });
});

describe('buildImagePrompt', () => {
  it('maps banner to a wide aspect ratio', () => {
    const { aspectRatio } = buildImagePrompt({ channel: 'banner', prompt: 'launch v2', brand });
    expect(aspectRatio).toBe('21:9');
  });

  it('maps social-image to a link-preview ratio', () => {
    const { aspectRatio } = buildImagePrompt({ channel: 'social-image', prompt: 'launch v2', brand });
    expect(aspectRatio).toBe('16:9');
  });

  it('describes the brand and forbids heavy text', () => {
    const { prompt } = buildImagePrompt({ channel: 'banner', prompt: 'launch v2', brand });
    expect(prompt).toContain('Acme');
    expect(prompt).toContain('launch v2');
    expect(prompt.toLowerCase()).toContain('text');
  });

  it('appends refinement instructions', () => {
    const { prompt } = buildImagePrompt({ channel: 'banner', prompt: 'launch v2', brand, refinementPrompt: 'darker background' });
    expect(prompt).toContain('darker background');
  });
});

describe('buildPlanPrompt', () => {
  it('includes brief, brand, and channels', () => {
    const { system, prompt } = buildPlanPrompt({
      prompt: 'launch v2',
      brand,
      style: 'calm',
      channels: ['tweet', 'banner'],
    });
    expect(system).toContain('Acme');
    expect(prompt).toContain('launch v2');
    expect(prompt).toContain('tweet');
    expect(prompt).toContain('banner');
  });
});
