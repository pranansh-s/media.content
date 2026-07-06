'use client';

import { REFINE_PROMPT_MAX_LENGTH } from '@media-content/shared';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import tw from 'tailwind-styled-components';

import { CHANNEL_LABELS, CHANNEL_TAGS } from '@/constants/channels';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { FieldLabel } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tag } from '@/components/ui/tag';
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

  const sendRefinement = async () => {
    if (!asset || refinePrompt.trim().length === 0) return;
    await refine(asset.id, refinePrompt.trim());
    setRefinePrompt('');
    setRevisionIndex(null);
  };

  const open = Boolean(asset && revision);

  return (
    <Drawer open={open} label={asset ? `Edit ${CHANNEL_LABELS[asset.channel]} draft` : 'Edit draft'} onClose={close}>
      {asset && revision && (
        <>
          <TitleRow>
            <Tag>{CHANNEL_TAGS[asset.channel]}</Tag>
            <Title>{CHANNEL_LABELS[asset.channel]}</Title>
            <DrawerClose onClose={close} label="Close editor" />
          </TitleRow>

          <RevisionRow>
            {revisions.map((rev, index) => (
              <RevisionPill
                key={rev.id}
                type="button"
                onClick={() => setRevisionIndex(index)}
                $active={index === activeIndex}
              >
                rev {index + 1}
              </RevisionPill>
            ))}
          </RevisionRow>

          <Body>
            {asset.kind === 'text' ? (
              <TextEditor revisionId={revision.id} body={'body' in revision ? revision.body : ''} />
            ) : (
              'url' in revision && (
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={revision.url} alt={revision.alt} className="w-full rounded-lg border border-border" />
                  <Caption>{revision.alt}</Caption>
                </figure>
              )
            )}
            {revision.prompt && <RefinedWith>refined with: &ldquo;{revision.prompt}&rdquo;</RefinedWith>}
          </Body>

          <RefineSection>
            <FieldLabel htmlFor="refine">Tell it what to change</FieldLabel>
            <RefineRow>
              <Input
                id="refine"
                maxLength={REFINE_PROMPT_MAX_LENGTH}
                value={refinePrompt}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRefinePrompt(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && sendRefinement()}
                placeholder={
                  asset.kind === 'text' ? '"shorter", "more technical", "add the link"' : '"warmer colors", "less busy"'
                }
                disabled={isRefining}
              />
              <Button onClick={sendRefinement} disabled={isRefining || refinePrompt.trim().length === 0}>
                {isRefining ? 'Rewriting…' : 'Rewrite'}
              </Button>
            </RefineRow>
            {error && <ErrorText>{error}</ErrorText>}
          </RefineSection>
        </>
      )}
    </Drawer>
  );
}

const TitleRow = tw.div`
  flex items-center gap-2
`;

const Title = tw.h2`
  font-display text-lg font-bold
`;

const RevisionRow = tw.div`
  mt-4 flex flex-wrap gap-1.5
`;

const RevisionPill = tw.button<{ $active: boolean }>`
  rounded border px-2 py-0.5 font-mono text-[11px] transition-colors
  focus-visible:outline-2 focus-visible:outline-accent
  ${p => (p.$active ? 'border-accent bg-accent-soft text-foreground' : 'border-border text-muted hover:text-foreground')}
`;

const Body = tw.div`
  mt-4 flex-1
`;

const Caption = tw.figcaption`
  mt-2 break-words font-mono text-xs text-faint
`;

const RefinedWith = tw.p`
  mt-3 break-words font-mono text-xs text-faint
`;

const RefineSection = tw.div`
  mt-6 border-t border-border pt-4
`;

const RefineRow = tw.div`
  mt-2 flex gap-2
`;

const ErrorText = tw.p`
  mt-2 text-sm text-danger
`;
