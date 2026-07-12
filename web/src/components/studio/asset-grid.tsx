'use client';

import { motion } from 'framer-motion';
import tw from 'tailwind-styled-components';

import { Skeleton } from '@/components/ui/skeleton';
import { Tag } from '@/components/ui/tag';
import { Wire } from '@/components/ui/wire';

import { arriveOnWire } from '@/lib/motion';
import { useRegenerateAsset } from '@/services/hooks';
import { useStudioStore } from '@/stores/studio';

import { CHANNEL_LABELS, CHANNEL_TAGS } from '@/constants/channels';
import type { Asset } from '@media-content/shared';

function PendingLines() {
  return (
    <div className="w-full space-y-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-3/5" />
    </div>
  );
}

function AssetPreview({ asset, isRetrying }: { asset: Asset; isRetrying: boolean }) {
  const assetError = useStudioStore(s => s.assetErrors[asset.id] ?? null);
  if (asset.status === 'failed' && !isRetrying) {
    return (
      <div className="w-full">
        <p className="text-danger text-sm">Generation failed. Run this channel again.</p>
        {assetError && <p className="text-faint mt-1 font-mono text-xs break-words">{assetError}</p>}
      </div>
    );
  }
  const revision = asset.revisions.at(-1);
  if (!revision || isRetrying) return <PendingLines />;
  if (asset.kind === 'image' && 'url' in revision) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={revision.url} alt={revision.alt} className="h-24 w-full rounded object-cover" />
    );
  }
  return <PreviewText>{'body' in revision ? revision.body : ''}</PreviewText>;
}

function AssetCard({ asset }: { asset: Asset }) {
  const selectAsset = useStudioStore(s => s.selectAsset);
  const selected = useStudioStore(s => s.selectedAssetId === asset.id);
  const { regenerate, isRegenerating } = useRegenerateAsset();
  const done = asset.status === 'complete';
  const failed = asset.status === 'failed';

  const onClick = () => {
    if (done) selectAsset(asset.id);
    else if (failed && !isRegenerating) void regenerate(asset.id);
  };

  return (
    <Card
      type="button"
      variants={arriveOnWire}
      initial="hidden"
      animate="visible"
      onClick={onClick}
      disabled={!done && !failed}
      $selected={selected}
      $clickable={done || failed}
    >
      <CardHeader>
        <Tag>{CHANNEL_TAGS[asset.channel]}</Tag>
        <ChannelName>{CHANNEL_LABELS[asset.channel]}</ChannelName>
        <CardStatus $failed={failed && !isRegenerating}>
          {done ? `rev ${asset.revisions.length}` : isRegenerating ? 'retrying' : asset.status}
        </CardStatus>
      </CardHeader>
      {(isRegenerating || (!done && !failed)) && <Wire />}
      <AssetPreview asset={asset} isRetrying={isRegenerating} />
      {done && <OpenHint>open to edit →</OpenHint>}
      {failed && !isRegenerating && <RetryHint>run it again →</RetryHint>}
    </Card>
  );
}

export function AssetGrid() {
  const campaign = useStudioStore(s => s.campaign);

  if (!campaign) {
    return (
      <EmptyState>
        <EmptyTitle>The wire is quiet</EmptyTitle>
        <EmptyBody>File a brief and pick your channels. Drafts arrive here as they come off the wire.</EmptyBody>
      </EmptyState>
    );
  }

  return (
    <div className="min-w-0">
      <StatusRow>{campaign.status === 'generating' ? 'transmitting' : campaign.status}</StatusRow>
      <Grid>
        {campaign.assets.map(asset => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </Grid>
    </div>
  );
}

const Card = tw(motion.button)<{ $selected: boolean; $clickable: boolean }>`
  bg-surface
  focus-visible:outline-accent
  flex
  w-full
  min-w-0
  flex-col
  gap-3
  rounded-lg
  border
  p-4
  text-left
  transition-colors
  focus-visible:outline-2
  focus-visible:outline-offset-2
  ${p => (p.$selected ? 'border-accent' : 'border-border')}
  ${p => (p.$clickable ? 'cursor-pointer hover:border-border-strong' : 'cursor-default')} `;

const CardHeader = tw.div`
  flex
  w-full
  items-center
  gap-2
`;

const ChannelName = tw.span`
  text-muted
  min-w-0
  truncate
  font-mono
  text-xs
`;

const CardStatus = tw.span<{ $failed: boolean }>`
  ml-auto
  shrink-0
  font-mono
  text-[10px]
  ${p => (p.$failed ? 'text-danger' : 'text-faint')} `;

const PreviewText = tw.p`
  text-muted
  line-clamp-3
  w-full
  text-sm
  break-words
  whitespace-pre-line
`;

const OpenHint = tw.span`
  text-faint
  font-mono
  text-[10px]
`;

const RetryHint = tw.span`
  text-danger
  font-mono
  text-[10px]
`;

const EmptyState = tw.div`
  border-border
  flex
  h-full
  min-h-64
  flex-col
  items-center
  justify-center
  rounded-lg
  border
  border-dashed
  p-8
  text-center
`;

const EmptyTitle = tw.p`
  text-faint
  font-mono
  text-xs
  tracking-widest
  uppercase
`;

const EmptyBody = tw.p`
  text-muted
  mt-2
  max-w-sm
  text-sm
`;

const StatusRow = tw.p`
  text-faint
  pb-4
  text-right
  font-mono
  text-[10px]
  uppercase
`;

const Grid = tw.div`
  grid
  gap-4
  sm:grid-cols-2
`;
