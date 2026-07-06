'use client';

import type { Asset } from '@media-content/shared';
import { motion } from 'framer-motion';
import tw from 'tailwind-styled-components';

import { CHANNEL_LABELS, CHANNEL_TAGS } from '@/constants/channels';
import { Skeleton } from '@/components/ui/skeleton';
import { Tag } from '@/components/ui/tag';
import { Wire } from '@/components/ui/wire';
import { arriveOnWire } from '@/lib/motion';
import { useStudioStore } from '@/stores/studio';

function PendingLines() {
  return (
    <div className="w-full space-y-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-3/5" />
    </div>
  );
}

function AssetPreview({ asset }: { asset: Asset }) {
  if (asset.status === 'failed') {
    return <p className="text-sm text-danger">Generation failed. Put the brief on the wire again.</p>;
  }
  const revision = asset.revisions.at(-1);
  if (!revision) return <PendingLines />;
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
  const done = asset.status === 'complete';

  return (
    <Card
      type="button"
      variants={arriveOnWire}
      initial="hidden"
      animate="visible"
      onClick={() => done && selectAsset(asset.id)}
      disabled={!done}
      $selected={selected}
      $done={done}
    >
      <CardHeader>
        <Tag>{CHANNEL_TAGS[asset.channel]}</Tag>
        <ChannelName>{CHANNEL_LABELS[asset.channel]}</ChannelName>
        <CardStatus>{asset.status === 'complete' ? `rev ${asset.revisions.length}` : asset.status}</CardStatus>
      </CardHeader>
      {!done && asset.status !== 'failed' && <Wire />}
      <AssetPreview asset={asset} />
      {done && <OpenHint>open to edit →</OpenHint>}
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

const Card = tw(motion.button)<{ $selected: boolean; $done: boolean }>`
  flex w-full min-w-0 flex-col gap-3 rounded-lg border bg-surface p-4 text-left transition-colors
  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
  ${p => (p.$selected ? 'border-accent' : 'border-border')}
  ${p => (p.$done ? 'cursor-pointer hover:border-border-strong' : 'cursor-default')}
`;

const CardHeader = tw.div`
  flex w-full items-center gap-2
`;

const ChannelName = tw.span`
  min-w-0 truncate font-mono text-xs text-muted
`;

const CardStatus = tw.span`
  ml-auto shrink-0 font-mono text-[10px] text-faint
`;

const PreviewText = tw.p`
  line-clamp-3 w-full whitespace-pre-line break-words text-sm text-muted
`;

const OpenHint = tw.span`
  font-mono text-[10px] text-faint
`;

const EmptyState = tw.div`
  flex h-full min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center
`;

const EmptyTitle = tw.p`
  font-mono text-xs uppercase tracking-widest text-faint
`;

const EmptyBody = tw.p`
  mt-2 max-w-sm text-sm text-muted
`;

const StatusRow = tw.p`
  pb-4 text-right font-mono text-[10px] uppercase text-faint
`;

const Grid = tw.div`
  grid gap-4 sm:grid-cols-2
`;
