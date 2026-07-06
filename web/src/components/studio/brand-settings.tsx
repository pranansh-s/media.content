'use client';

import {
  BRAND_NAME_MAX_LENGTH,
  REFERENCES_MAX_LENGTH,
  TAGLINE_MAX_LENGTH,
  WRITING_STYLE_MAX_LENGTH,
  type Brand,
} from '@media-content/shared';
import { useState } from 'react';
import tw from 'tailwind-styled-components';

import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose } from '@/components/ui/drawer';
import { Input, Textarea } from '@/components/ui/input';
import { FieldLabel } from '@/components/ui/label';
import { createBrand, deleteBrand, updateBrand } from '@/services/api';
import { useStudioStore } from '@/stores/studio';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel $as="span">{label}</FieldLabel>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export type BrandSettingsMode = 'edit' | 'create';

interface BrandSettingsProps {
  brand: Brand | null;
  mode: BrandSettingsMode;
  open: boolean;
  onClose: () => void;
}

export function BrandSettings({ brand, mode, open, onClose }: BrandSettingsProps) {
  return (
    <Drawer
      open={open}
      label={mode === 'create' ? 'New brand' : 'Branding settings'}
      onClose={onClose}
      className="gap-5"
    >
      <BrandForm key={`${mode}-${brand?.id ?? 'new'}-${open}`} brand={brand} mode={mode} onClose={onClose} />
    </Drawer>
  );
}

function BrandForm({ brand, mode, onClose }: Omit<BrandSettingsProps, 'open'>) {
  const isCreate = mode === 'create';
  const upsertBrand = useStudioStore(s => s.upsertBrand);
  const removeBrand = useStudioStore(s => s.removeBrand);
  const brandCount = useStudioStore(s => s.brands.length);
  const [name, setName] = useState(isCreate ? '' : (brand?.name ?? ''));
  const [tagline, setTagline] = useState(isCreate ? '' : (brand?.tagline ?? ''));
  const [writingStyle, setWritingStyle] = useState(isCreate ? '' : (brand?.writingStyle ?? ''));
  const [references, setReferences] = useState(isCreate ? '' : (brand?.references ?? ''));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setIsSaving(true);
    setError(null);
    const payload = {
      name: name.trim(),
      tagline: tagline.trim() || null,
      writingStyle: writingStyle.trim() || null,
      references: references.trim() || null,
    };
    try {
      const saved = isCreate ? await createBrand(payload) : await updateBrand(brand!.id, payload);
      upsertBrand(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const destroy = async () => {
    if (!brand) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsDeleting(true);
    setError(null);
    try {
      await deleteBrand(brand.id);
      removeBrand(brand.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <TitleRow>
        <Title>{isCreate ? 'New brand' : 'Branding'}</Title>
        <Subtitle>{isCreate ? 'a fresh voice on the wire' : 'applies to every brief'}</Subtitle>
        <DrawerClose onClose={onClose} label="Close settings" />
      </TitleRow>

      <Field label="Brand name">
        <Input
          value={name}
          maxLength={BRAND_NAME_MAX_LENGTH}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder={isCreate ? 'Nimbus Labs' : undefined}
        />
      </Field>

      <Field label="Tagline">
        <Input
          value={tagline}
          maxLength={TAGLINE_MAX_LENGTH}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagline(e.target.value)}
          placeholder="Ship faster with confidence"
        />
      </Field>

      <Field label="Writing style">
        <Textarea
          rows={3}
          value={writingStyle}
          maxLength={WRITING_STYLE_MAX_LENGTH}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setWritingStyle(e.target.value)}
          placeholder="Confident and technical. No hype words, no exclamation marks."
        />
      </Field>

      <Field label="References & examples">
        <Textarea
          rows={8}
          value={references}
          maxLength={REFERENCES_MAX_LENGTH}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReferences(e.target.value)}
          placeholder={
            'Anything that shows the brand you want — your site, repos, posts that sound right, other brands you admire, image links.\n\nhttps://acme.dev\nhttps://x.com/acme/status/123\nWe shipped v2 today. It pages you before your customers do.'
          }
        />
      </Field>
      {!isCreate && <HelpText>Links in references are read and indexed — generations quote your real material.</HelpText>}

      <SaveSection>
        <Button onClick={save} disabled={isSaving || isDeleting || name.trim().length === 0} className="w-full">
          {isSaving ? 'Saving…' : isCreate ? 'Create brand' : 'Save brand'}
        </Button>
        {!isCreate && brand && (
          <DeleteButton type="button" onClick={destroy} disabled={isDeleting || isSaving || brandCount <= 1}>
            {brandCount <= 1
              ? 'the last brand stays on the wire'
              : isDeleting
                ? 'deleting…'
                : confirmDelete
                  ? 'click again to delete everything for this brand'
                  : `delete ${brand.name}`}
          </DeleteButton>
        )}
        {error && <ErrorText>{error}</ErrorText>}
      </SaveSection>
    </>
  );
}

const TitleRow = tw.div`
  flex items-center gap-2
`;

const Title = tw.h2`
  font-display text-lg font-bold
`;

const Subtitle = tw.span`
  font-mono text-xs text-faint
`;

const HelpText = tw.p`
  font-mono text-[11px] leading-relaxed text-faint
`;

const SaveSection = tw.div`
  mt-auto border-t border-border pt-4
`;

const DeleteButton = tw.button`
  mt-3 w-full text-center font-mono text-xs text-danger/80 transition-colors
  hover:text-danger
  disabled:cursor-default disabled:text-faint
  focus-visible:outline-2 focus-visible:outline-danger
`;

const ErrorText = tw.p`
  mt-2 text-sm text-danger
`;
