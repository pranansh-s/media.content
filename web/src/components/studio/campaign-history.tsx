'use client';

import { useState } from 'react';

import tw from 'tailwind-styled-components';

import { Input } from '@/components/ui/input';
import { Tag } from '@/components/ui/tag';

import { useCampaignHistory } from '@/services/hooks';
import { useStudioStore } from '@/stores/studio';

import { CHANNEL_TAGS } from '@/constants/channels';
import type { CampaignSummary } from '@media-content/shared';

function timestamp(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })} ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}

function HistoryItem({
  summary,
  active,
  disabled,
  onOpen,
  onDelete,
}: {
  summary: CampaignSummary;
  active: boolean;
  disabled: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="relative">
      <Item type="button" disabled={disabled} $active={active} onClick={() => !active && onOpen()}>
        <ItemTop>
          <Timestamp>{timestamp(summary.createdAt)}</Timestamp>
          <Status $failed={summary.status === 'failed'}>{summary.status}</Status>
        </ItemTop>
        <Prompt>{summary.prompt}</Prompt>
        <TagRow>
          {summary.channels.map(channel => (
            <Tag key={channel}>{CHANNEL_TAGS[channel]}</Tag>
          ))}
        </TagRow>
      </Item>
      <DeleteButton
        type="button"
        disabled={disabled}
        aria-label={`${confirming ? 'Confirm delete' : 'Delete'} campaign ${summary.prompt}`}
        onClick={() => {
          if (confirming) onDelete();
          else setConfirming(true);
        }}
        onBlur={() => setConfirming(false)}
      >
        {confirming ? 'sure?' : 'delete'}
      </DeleteButton>
    </li>
  );
}

export function CampaignHistory() {
  const { campaignSummaries, openCampaign, isOpening, query, setQuery, removeCampaign } = useCampaignHistory();
  const activeCampaignId = useStudioStore(s => s.campaign?.id ?? null);
  const isGenerating = useStudioStore(s => s.isGenerating);

  if (campaignSummaries.length === 0 && !query) return null;

  return (
    <Section aria-label="Campaign history">
      <Heading>off the wire</Heading>
      <SearchRow>
        <Input
          type="search"
          placeholder="search past campaigns"
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          aria-label="Search campaign history"
        />
      </SearchRow>
      <List>
        {campaignSummaries.map(summary => (
          <HistoryItem
            key={summary.id}
            summary={summary}
            active={summary.id === activeCampaignId}
            disabled={isOpening || isGenerating}
            onOpen={() => void openCampaign(summary.id)}
            onDelete={() => void removeCampaign(summary.id)}
          />
        ))}
      </List>
    </Section>
  );
}

const Section = tw.section`
  border-border
  mt-8
  border-t
  pt-5
`;

const Heading = tw.p`
  text-faint
  font-mono
  text-[10px]
  tracking-widest
  uppercase
`;

const SearchRow = tw.div`
  mt-2
`;

const List = tw.ul`
  mt-3
  flex
  max-h-80
  flex-col
  gap-2
  overflow-y-auto
  pr-1
`;

const Item = tw.button<{ $active: boolean }>`
  focus-visible:outline-accent
  flex
  w-full
  flex-col
  gap-1.5
  rounded-lg
  border
  p-3
  text-left
  transition-colors
  focus-visible:outline-2
  disabled:cursor-default
  disabled:opacity-60
  ${p => (p.$active ? 'border-accent bg-accent-soft/40' : 'border-border hover:border-border-strong')} `;

const ItemTop = tw.div`
  flex
  w-full
  items-center
  gap-2
  pr-12
`;

const Timestamp = tw.span`
  text-faint
  font-mono
  text-[10px]
`;

const Status = tw.span<{ $failed: boolean }>`
  font-mono
  text-[10px]
  uppercase
  ${p => (p.$failed ? 'text-danger' : 'text-faint')} `;

const DeleteButton = tw.button`
  text-muted
  hover:text-danger
  focus-visible:outline-accent
  disabled:text-faint
  absolute
  top-3
  right-3
  cursor-pointer
  font-mono
  text-[10px]
  underline
  decoration-dotted
  underline-offset-2
  focus-visible:outline-2
  disabled:cursor-default
`;

const Prompt = tw.span`
  text-muted
  line-clamp-2
  w-full
  text-sm
  break-words
`;

const TagRow = tw.div`
  flex
  flex-wrap
  gap-1
`;
