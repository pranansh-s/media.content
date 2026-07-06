'use client';

import {
  CUSTOM_STYLE_MAX_LENGTH,
  GENERATABLE_CHANNELS,
  PRESET_STYLES,
  PROMPT_MAX_LENGTH,
  VIDEO_CHANNELS,
  type Brand,
  type GeneratableChannel,
  type StyleId,
} from '@media-content/shared';
import { useState } from 'react';
import tw from 'tailwind-styled-components';

import { CHANNEL_LABELS } from '@/constants/channels';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Textarea } from '@/components/ui/input';
import { FieldLabel } from '@/components/ui/label';
import { Select, type SelectOption } from '@/components/ui/select';
import { useGenerateCampaign } from '@/services/hooks';
import { useStudioStore } from '@/stores/studio';

export function Composer({ brand }: { brand: Brand }) {
  const [prompt, setPrompt] = useState('');
  const [channels, setChannels] = useState<GeneratableChannel[]>(['tweet', 'linkedin']);
  const [styleId, setStyleId] = useState<'' | 'custom' | StyleId>('');
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

  const styleRequest = isCustomStyle ? { customStyle: customStyle.trim() } : styleId ? { styleId } : {};

  const styleOptions: SelectOption[] = [
    { value: '', label: 'No preference' },
    ...(brand.writingStyle ? [{ value: 'brand', label: `${brand.name} voice` }] : []),
    ...PRESET_STYLES.map(style => ({ value: style.id, label: style.name, description: style.description })),
    { value: 'custom', label: 'Describe your own…' },
  ];

  return (
    <Section aria-label="Brief composer">
      <div>
        <BriefLabel htmlFor="brief">The brief</BriefLabel>
        <Textarea
          id="brief"
          rows={5}
          maxLength={PROMPT_MAX_LENGTH}
          value={prompt}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
          placeholder="What happened? A launch, a release, a raise, a hire — say it plainly."
          className="mt-2"
        />
      </div>

      <div>
        <FieldLabel $as="p">Channels</FieldLabel>
        <ChipRow>
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
        </ChipRow>
      </div>

      <div>
        <FieldLabel htmlFor="style">Writing style</FieldLabel>
        <div className="mt-2">
          <Select
            id="style"
            value={styleId}
            options={styleOptions}
            onChange={value => setStyleId(value as '' | 'custom' | StyleId)}
          />
        </div>
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
    </Section>
  );
}

const Section = tw.section`
  flex flex-col gap-5
`;

const BriefLabel = tw(FieldLabel)`
  text-accent
`;

const ChipRow = tw.div`
  mt-2 flex flex-wrap gap-2
`;
