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
import { useRefineAsset, useRegenerateAsset, useSaveRevision } from '@/services/hooks';
import { useStudioStore } from '@/stores/studio';

const TextEditor = dynamic(() => import('./editor').then(m => m.TextEditor), {
  ssr: false,
  loading: () => <Skeleton className="h-48 w-full" />,
});

const SOURCE_LABELS = { generated: null, refined: 'refined', manual: 'manual' } as const;

export function AssetDetail() {
  const asset = useStudioStore(s => s.campaign?.assets.find(a => a.id === s.selectedAssetId) ?? null);
  const selectAsset = useStudioStore(s => s.selectAsset);
  const { refine, isRefining, error } = useRefineAsset();
  const { regenerate, isRegenerating, error: regenerateError } = useRegenerateAsset();
  const { save, isSaving, error: saveError } = useSaveRevision();
  const [revisionIndex, setRevisionIndex] = useState<number | null>(null);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [draft, setDraft] = useState('');

  const revisions = asset?.revisions ?? [];
  const activeIndex = revisionIndex !== null && revisionIndex < revisions.length ? revisionIndex : revisions.length - 1;
  const revision = revisions[activeIndex];
  const isBusy = isRefining || isRegenerating || isSaving;
  const isDirty =
    asset?.kind === 'text' && revision && 'body' in revision && draft.trim().length > 0 && draft !== revision.body;

  const close = () => {
    selectAsset(null);
    setRevisionIndex(null);
    setRefinePrompt('');
    setDraft('');
  };

  const sendRefinement = async () => {
    if (!asset || refinePrompt.trim().length === 0) return;
    await refine(asset.id, refinePrompt.trim());
    setRefinePrompt('');
    setRevisionIndex(null);
  };

  const sendRegenerate = async () => {
    if (!asset) return;
    await regenerate(asset.id);
    setRevisionIndex(null);
  };

  const saveDraft = async () => {
    if (!asset || !isDirty) return;
    if (await save(asset.id, draft)) setRevisionIndex(null);
  };

  const open = Boolean(asset && revision);
  const actionError = error ?? regenerateError ?? saveError;

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
                {SOURCE_LABELS[rev.source] && <SourceHint> · {SOURCE_LABELS[rev.source]}</SourceHint>}
              </RevisionPill>
            ))}
          </RevisionRow>

          <Body>
            {asset.kind === 'text' ? (
              <TextEditor
                revisionId={revision.id}
                body={'body' in revision ? revision.body : ''}
                onTextChange={setDraft}
              />
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
            {asset.kind === 'text' && (
              <DraftRow>
                <SaveButton type="button" onClick={saveDraft} disabled={!isDirty || isBusy}>
                  {isSaving ? 'saving edit…' : isDirty ? 'save edit as new rev' : 'edits save as a new rev'}
                </SaveButton>
              </DraftRow>
            )}
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
                disabled={isBusy}
              />
              <Button onClick={sendRefinement} disabled={isBusy || refinePrompt.trim().length === 0}>
                {isRefining ? 'Rewriting…' : 'Rewrite'}
              </Button>
            </RefineRow>
            <RegenerateRow>
              <RegenerateButton type="button" onClick={sendRegenerate} disabled={isBusy}>
                {isRegenerating ? 'back on the wire…' : 'regenerate from the brief'}
              </RegenerateButton>
            </RegenerateRow>
            {actionError && <ErrorText>{actionError}</ErrorText>}
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

const SourceHint = tw.span`
  text-faint
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

const DraftRow = tw.div`
  mt-2 flex justify-end
`;

const SaveButton = tw.button`
  font-mono text-[11px] text-accent transition-colors
  hover:text-accent-strong
  disabled:cursor-default disabled:text-faint
  focus-visible:outline-2 focus-visible:outline-accent
`;

const RefineSection = tw.div`
  mt-6 border-t border-border pt-4
`;

const RefineRow = tw.div`
  mt-2 flex gap-2
`;

const RegenerateRow = tw.div`
  mt-3
`;

const RegenerateButton = tw.button`
  font-mono text-xs text-muted underline decoration-dotted underline-offset-4 transition-colors
  hover:text-foreground
  disabled:cursor-default disabled:text-faint
  focus-visible:outline-2 focus-visible:outline-accent
`;

const ErrorText = tw.p`
  mt-2 text-sm text-danger
`;
