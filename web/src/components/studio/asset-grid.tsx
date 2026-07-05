'use client';

import type { Asset } from '@media-content/shared';
import { motion } from 'framer-motion';

import { CHANNEL_LABELS, CHANNEL_TAGS } from '@/constants/channels';
import { Skeleton } from '@/components/ui/skeleton';
import { Wire } from '@/components/ui/wire';
import { cn } from '@/lib/cn';
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
  if (asset.kind === 'image') {
    const revision = asset.revisions.at(-1);
    if (!revision) return <PendingLines />;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={revision.url} alt={revision.alt} className="h-24 w-full rounded object-cover" />
    );
  }
  const revision = asset.revisions.at(-1);
  if (!revision) return <PendingLines />;
  return <p className="line-clamp-3 whitespace-pre-line text-sm text-muted">{revision.body}</p>;
}

function AssetCard({ asset }: { asset: Asset }) {
  const selectAsset = useStudioStore(s => s.selectAsset);
  const selected = useStudioStore(s => s.selectedAssetId === asset.id);
  const done = asset.status === 'complete';

  return (
    <motion.button
      type="button"
      variants={arriveOnWire}
      initial="hidden"
      animate="visible"
      onClick={() => done && selectAsset(asset.id)}
      disabled={!done}
      className={cn(
        'flex w-full flex-col gap-3 rounded-lg border bg-surface p-4 text-left transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        selected ? 'border-accent' : 'border-border',
        done ? 'cursor-pointer hover:border-border-strong' : 'cursor-default'
      )}
    >
      <div className="flex w-full items-center gap-2">
        <span className="inline-flex rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-accent">
          {CHANNEL_TAGS[asset.channel]}
        </span>
        <span className="font-mono text-xs text-muted">{CHANNEL_LABELS[asset.channel]}</span>
        <span className="ml-auto font-mono text-[10px] text-faint">
          {asset.status === 'complete' ? `rev ${asset.revisions.length}` : asset.status}
        </span>
      </div>
      {!done && asset.status !== 'failed' && <Wire />}
      <AssetPreview asset={asset} />
      {done && <span className="font-mono text-[10px] text-faint">open to edit →</span>}
    </motion.button>
  );
}

export function AssetGrid() {
  const campaign = useStudioStore(s => s.campaign);

  if (!campaign) {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-faint">The wire is quiet</p>
        <p className="mt-2 max-w-sm text-sm text-muted">
          File a brief and pick your channels. Drafts arrive here as they come off the wire.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 pb-4">
        <p className="min-w-0 truncate font-mono text-xs text-muted">brief: &ldquo;{campaign.prompt}&rdquo;</p>
        <span className="ml-auto shrink-0 font-mono text-[10px] uppercase text-faint">
          {campaign.status === 'generating' ? 'transmitting' : campaign.status}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {campaign.assets.map(asset => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>
    </div>
  );
}
