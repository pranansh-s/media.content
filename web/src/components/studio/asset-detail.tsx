'use client';

import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { CHANNEL_LABELS, CHANNEL_TAGS } from '@/constants/channels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { useRefineAsset } from '@/services/hooks';
import { useStudioStore } from '@/stores/studio';

const TextEditor = dynamic(() => import('./editor').then(m => m.TextEditor), {
  ssr: false,
  loading: () => <Skeleton className="h-48 w-full" />,
});

export function AssetDetail() {
  const asset = useStudioStore(s => s.campaign?.assets.find(a => a.id === s.selectedAssetId) ?? null);
  const selectAsset = useStudioStore(s => s.selectAsset);
  const { refine, isRefining, error } = useRefineAsset();
  const [revisionIndex, setRevisionIndex] = useState<number | null>(null);
  const [refinePrompt, setRefinePrompt] = useState('');

  const revisions = asset?.revisions ?? [];
  const activeIndex = revisionIndex !== null && revisionIndex < revisions.length ? revisionIndex : revisions.length - 1;
  const revision = revisions[activeIndex];

  const close = () => {
    selectAsset(null);
    setRevisionIndex(null);
    setRefinePrompt('');
  };

  useEffect(() => {
    if (!asset) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') selectAsset(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [asset, selectAsset]);

  const sendRefinement = async () => {
    if (!asset || refinePrompt.trim().length === 0) return;
    await refine(asset.id, refinePrompt.trim());
    setRefinePrompt('');
    setRevisionIndex(null);
  };

  return (
    <AnimatePresence>
      {asset && revision && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm"
          />
          <motion.aside
            role="dialog"
            aria-label={`Edit ${CHANNEL_LABELS[asset.channel]} draft`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-background p-6"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-accent">
                {CHANNEL_TAGS[asset.channel]}
              </span>
              <h2 className="font-display text-lg font-bold">{CHANNEL_LABELS[asset.channel]}</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close editor"
                className="ml-auto rounded-md px-2 py-1 font-mono text-xs text-muted hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
              >
                esc ✕
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {revisions.map((rev, index) => (
                <button
                  key={rev.id}
                  type="button"
                  onClick={() => setRevisionIndex(index)}
                  className={cn(
                    'rounded border px-2 py-0.5 font-mono text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-accent',
                    index === activeIndex
                      ? 'border-accent bg-accent-soft text-foreground'
                      : 'border-border text-muted hover:text-foreground'
                  )}
                >
                  rev {index + 1}
                </button>
              ))}
            </div>

            <div className="mt-4 flex-1">
              {asset.kind === 'text' ? (
                <TextEditor revisionId={revision.id} body={'body' in revision ? revision.body : ''} />
              ) : (
                'url' in revision && (
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={revision.url} alt={revision.alt} className="w-full rounded-lg border border-border" />
                    <figcaption className="mt-2 font-mono text-xs text-faint">{revision.alt}</figcaption>
                  </figure>
                )
              )}
              {revision.prompt && (
                <p className="mt-3 font-mono text-xs text-faint">refined with: &ldquo;{revision.prompt}&rdquo;</p>
              )}
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <label htmlFor="refine" className="font-mono text-xs uppercase tracking-widest text-muted">
                Tell it what to change
              </label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="refine"
                  value={refinePrompt}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRefinePrompt(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && sendRefinement()}
                  placeholder={
                    asset.kind === 'text'
                      ? '"shorter", "more technical", "add the link"'
                      : '"warmer colors", "less busy"'
                  }
                  disabled={isRefining}
                />
                <Button onClick={sendRefinement} disabled={isRefining || refinePrompt.trim().length === 0}>
                  {isRefining ? 'Rewriting…' : 'Rewrite'}
                </Button>
              </div>
              {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
