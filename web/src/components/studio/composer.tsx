'use client';

import {
  CUSTOM_STYLE_MAX_LENGTH,
  GENERATABLE_CHANNELS,
  VIDEO_CHANNELS,
  type GeneratableChannel,
  type Project,
} from '@media-content/shared';
import { useState } from 'react';

import { CHANNEL_LABELS } from '@/constants/channels';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Textarea } from '@/components/ui/input';
import { useGenerateCampaign } from '@/services/hooks';
import { useStudioStore } from '@/stores/studio';

export function Composer({ project }: { project: Project }) {
  const [prompt, setPrompt] = useState('');
  const [channels, setChannels] = useState<GeneratableChannel[]>(['tweet', 'linkedin']);
  const [styleId, setStyleId] = useState('');
  const [customStyle, setCustomStyle] = useState('');
  const isGenerating = useStudioStore(s => s.isGenerating);
  const generate = useGenerateCampaign();

  const toggleChannel = (channel: GeneratableChannel) => {
    setChannels(current => (current.includes(channel) ? current.filter(c => c !== channel) : [...current, channel]));
  };

  const isCustomStyle = styleId === 'custom';
  const canGenerate =
    prompt.trim().length > 0 &&
    channels.length > 0 &&
    !isGenerating &&
    (!isCustomStyle || customStyle.trim().length > 0);

  const styleRequest = isCustomStyle
    ? { customStyle: customStyle.trim() }
    : styleId
      ? { writingStyleId: styleId }
      : {};

  return (
    <section aria-label="Brief composer" className="flex flex-col gap-5">
      <div>
        <label htmlFor="brief" className="font-mono text-xs uppercase tracking-widest text-accent">
          The brief
        </label>
        <Textarea
          id="brief"
          rows={5}
          value={prompt}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
          placeholder="What happened? A launch, a release, a raise, a hire — say it plainly."
          className="mt-2"
        />
      </div>

      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted">Channels</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {GENERATABLE_CHANNELS.map(channel => (
            <Chip key={channel} selected={channels.includes(channel)} onClick={() => toggleChannel(channel)}>
              {CHANNEL_LABELS[channel]}
            </Chip>
          ))}
          {VIDEO_CHANNELS.map(channel => (
            <Chip key={channel} disabled title="On the roadmap">
              {CHANNEL_LABELS[channel]} · soon
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="style" className="font-mono text-xs uppercase tracking-widest text-muted">
          Writing style
        </label>
        <select
          id="style"
          value={styleId}
          onChange={e => setStyleId(e.target.value)}
          className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          <option value="">Project default</option>
          {project.writingStyles.map(style => (
            <option key={style.id} value={style.id}>
              {style.name} — {style.description}
            </option>
          ))}
          <option value="custom">Describe your own…</option>
        </select>
        {isCustomStyle && (
          <Textarea
            aria-label="Describe your writing style"
            rows={3}
            maxLength={CUSTOM_STYLE_MAX_LENGTH}
            value={customStyle}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomStyle(e.target.value)}
            placeholder='Describe the voice — "dry humor, short sentences, no emoji, like a tired sysadmin". It travels with the brief into generation.'
            className="mt-2"
          />
        )}
      </div>

      <Button
        size="lg"
        disabled={!canGenerate}
        onClick={() => generate({ prompt: prompt.trim(), channels, ...styleRequest })}
      >
        {isGenerating ? 'On the wire…' : 'Put it on the wire'}
      </Button>
    </section>
  );
}
