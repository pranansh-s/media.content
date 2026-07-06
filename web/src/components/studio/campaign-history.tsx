'use client';

import tw from 'tailwind-styled-components';

import { CHANNEL_TAGS } from '@/constants/channels';
import { Input } from '@/components/ui/input';
import { Tag } from '@/components/ui/tag';
import { useCampaignHistory } from '@/services/hooks';
import { useStudioStore } from '@/stores/studio';

function timestamp(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })} ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}`;
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
          <li key={summary.id}>
            <Item
              type="button"
              disabled={isOpening || isGenerating}
              $active={summary.id === activeCampaignId}
              onClick={() => summary.id !== activeCampaignId && openCampaign(summary.id)}
            >
              <ItemTop>
                <Timestamp>{timestamp(summary.createdAt)}</Timestamp>
                <Status $failed={summary.status === 'failed'}>{summary.status}</Status>
                <DeleteButton
                  role="button"
                  tabIndex={0}
                  aria-label={`Delete campaign ${summary.prompt}`}
                  onClick={(event: React.MouseEvent<HTMLSpanElement>) => {
                    event.stopPropagation();
                    void removeCampaign(summary.id);
                  }}
                  onKeyDown={(event: React.KeyboardEvent<HTMLSpanElement>) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      void removeCampaign(summary.id);
                    }
                  }}
                >
                  delete
                </DeleteButton>
              </ItemTop>
              <Prompt>{summary.prompt}</Prompt>
              <TagRow>
                {summary.channels.map(channel => (
                  <Tag key={channel}>{CHANNEL_TAGS[channel]}</Tag>
                ))}
              </TagRow>
            </Item>
          </li>
        ))}
      </List>
    </Section>
  );
}

const Section = tw.section`
  mt-8 border-t border-border pt-5
`;

const Heading = tw.p`
  font-mono text-[10px] uppercase tracking-widest text-faint
`;

const SearchRow = tw.div`
  mt-2
`;

const List = tw.ul`
  mt-3 flex max-h-80 flex-col gap-2 overflow-y-auto pr-1
`;

const Item = tw.button<{ $active: boolean }>`
  flex w-full flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors
  focus-visible:outline-2 focus-visible:outline-accent
  disabled:cursor-default disabled:opacity-60
  ${p => (p.$active ? 'border-accent bg-accent-soft/40' : 'border-border hover:border-border-strong')}
`;

const ItemTop = tw.div`
  flex w-full items-center gap-2
`;

const Timestamp = tw.span`
  font-mono text-[10px] text-faint
`;

const Status = tw.span<{ $failed: boolean }>`
  ml-auto font-mono text-[10px] uppercase
  ${p => (p.$failed ? 'text-danger' : 'text-faint')}
`;

const DeleteButton = tw.span`
  cursor-pointer font-mono text-[10px] text-muted underline decoration-dotted underline-offset-2
  hover:text-danger
`;

const Prompt = tw.span`
  line-clamp-2 w-full break-words text-sm text-muted
`;

const TagRow = tw.div`
  flex flex-wrap gap-1
`;
