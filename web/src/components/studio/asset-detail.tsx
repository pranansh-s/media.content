'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

import tw from 'tailwind-styled-components';

import { REFINE_PROMPT_MAX_LENGTH } from '@media-content/shared';

import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { FieldLabel } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tag } from '@/components/ui/tag';

import { useRefineAsset, useRegenerateAsset, useRestoreRevision, useSaveRevision } from '@/services/hooks';
import { useStudioStore } from '@/stores/studio';

import { CHANNEL_LABELS, CHANNEL_TAGS } from '@/constants/channels';

const TextEditor = dynamic(() => import('./editor').then(m => m.TextEditor), {
  ssr: false,
  loading: () => <Skeleton className="h-48 w-full" />,
});

const SOURCE_LABELS = { generated: null, refined: 'refined', manual: 'manual' } as const;

export function AssetDetail() {
  const asset = useStudioStore(s => s.campaign?.assets.find(a => a.id === s.selectedAssetId) ?? null);
  const selectAsset = useStudioStore(s => s.selectAsset);
  const { refine, isRefining } = useRefineAsset();
  const { regenerate, isRegenerating } = useRegenerateAsset();
  const { save, isSaving } = useSaveRevision();
  const { restore, isRestoring } = useRestoreRevision();
  const [revisionIndex, setRevisionIndex] = useState<number | null>(null);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [draft, setDraft] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setActionError(null);
  }, [asset?.id]);

  const revisions = asset?.revisions ?? [];
  const activeIndex = revisionIndex !== null && revisionIndex < revisions.length ? revisionIndex : revisions.length - 1;
  const revision = revisions[activeIndex];
  const isBusy = isRefining || isRegenerating || isSaving || isRestoring;

  const copyToClipboard = async () => {
    if (!revision || !('body' in revision)) return;
    await navigator.clipboard.writeText(revision.body);
  };

  const restoreCurrentRevision = async () => {
    if (!asset || !revision || activeIndex === revisions.length - 1) return;
    setActionError(null);
    const failure = await restore(asset.id, revision.id);
    setActionError(failure);
    if (!failure) setRevisionIndex(null);
  };
  const isDirty =
    asset?.kind === 'text' && revision && 'body' in revision && draft.trim().length > 0 && draft !== revision.body;

  const close = () => {
    selectAsset(null);
    setRevisionIndex(null);
    setRefinePrompt('');
    setDraft('');
    setActionError(null);
  };

  const sendRefinement = async () => {
    if (!asset || refinePrompt.trim().length === 0) return;
    setActionError(null);
    const failure = await refine(asset.id, refinePrompt.trim());
    setActionError(failure);
    if (!failure) {
      setRefinePrompt('');
      setRevisionIndex(null);
    }
  };

  const sendRegenerate = async () => {
    if (!asset) return;
    setActionError(null);
    const failure = await regenerate(asset.id);
    setActionError(failure);
    if (!failure) setRevisionIndex(null);
  };

  const saveDraft = async () => {
    if (!asset || !isDirty) return;
    setActionError(null);
    const failure = await save(asset.id, draft);
    setActionError(failure);
    if (!failure) setRevisionIndex(null);
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
                  <img src={revision.url} alt={revision.alt} className="border-border w-full rounded-lg border" />
                  <Caption>{revision.alt}</Caption>
                </figure>
              )
            )}
            {revision.prompt && <RefinedWith>refined with: &ldquo;{revision.prompt}&rdquo;</RefinedWith>}
            <DraftRow>
              {asset.kind === 'text' ? (
                <>
                  <SaveButton type="button" onClick={copyToClipboard} disabled={!revision || !('body' in revision)}>
                    copy
                  </SaveButton>
                  <SaveButton type="button" onClick={saveDraft} disabled={!isDirty || isBusy}>
                    {isSaving ? 'saving edit…' : isDirty ? 'save edit as new rev' : 'edits save as a new rev'}
                  </SaveButton>
                </>
              ) : (
                'url' in revision && (
                  <SaveButton as="a" href={revision.url} download aria-label="Download image">
                    download
                  </SaveButton>
                )
              )}
              {activeIndex !== revisions.length - 1 && (
                <SaveButton type="button" onClick={restoreCurrentRevision} disabled={isBusy}>
                  {isRestoring ? 'restoring…' : 'restore this rev'}
                </SaveButton>
              )}
            </DraftRow>
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
  flex
  items-center
  gap-2
`;

const Title = tw.h2`
  font-display
  text-lg
  font-bold
`;

const RevisionRow = tw.div`
  mt-4
  flex
  flex-wrap
  gap-1.5
`;

const RevisionPill = tw.button<{ $active: boolean }>`
  focus-visible:outline-accent
  rounded
  border
  px-2
  py-0.5
  font-mono
  text-[11px]
  transition-colors
  focus-visible:outline-2
  ${p => (p.$active ? 'border-accent bg-accent-soft text-foreground' : 'border-border text-muted hover:text-foreground')} `;

const SourceHint = tw.span`
  text-faint
`;

const Body = tw.div`
  mt-4
  flex-1
`;

const Caption = tw.figcaption`
  text-faint
  mt-2
  font-mono
  text-xs
  break-words
`;

const RefinedWith = tw.p`
  text-faint
  mt-3
  font-mono
  text-xs
  break-words
`;

const DraftRow = tw.div`
  mt-2
  flex
  justify-end
`;

const SaveButton = tw.button`
  text-accent
  hover:text-accent-strong
  disabled:text-faint
  focus-visible:outline-accent
  font-mono
  text-[11px]
  transition-colors
  focus-visible:outline-2
  disabled:cursor-default
`;

const RefineSection = tw.div`
  border-border
  mt-6
  border-t
  pt-4
`;

const RefineRow = tw.div`
  mt-2
  flex
  gap-2
`;

const RegenerateRow = tw.div`
  mt-3
`;

const RegenerateButton = tw.button`
  text-muted
  hover:text-foreground
  disabled:text-faint
  focus-visible:outline-accent
  font-mono
  text-xs
  underline
  decoration-dotted
  underline-offset-4
  transition-colors
  focus-visible:outline-2
  disabled:cursor-default
`;

const ErrorText = tw.p`
  text-danger
  mt-2
  text-sm
`;
