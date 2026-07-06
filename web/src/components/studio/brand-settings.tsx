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
import { updateBrand } from '@/services/api';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel $as="span">{label}</FieldLabel>
      <div className="mt-2">{children}</div>
    </div>
  );
}

interface BrandSettingsProps {
  brand: Brand;
  open: boolean;
  onClose: () => void;
  onSaved: (brand: Brand) => void;
}

export function BrandSettings({ brand, open, onClose, onSaved }: BrandSettingsProps) {
  return (
    <Drawer open={open} label="Branding settings" onClose={onClose} className="gap-5">
      <BrandForm brand={brand} onClose={onClose} onSaved={onSaved} />
    </Drawer>
  );
}

function BrandForm({ brand, onClose, onSaved }: Omit<BrandSettingsProps, 'open'>) {
  const [name, setName] = useState(brand.name);
  const [tagline, setTagline] = useState(brand.tagline ?? '');
  const [writingStyle, setWritingStyle] = useState(brand.writingStyle ?? '');
  const [references, setReferences] = useState(brand.references ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateBrand({
        name: name.trim(),
        tagline: tagline.trim() || null,
        writingStyle: writingStyle.trim() || null,
        references: references.trim() || null,
      });
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <TitleRow>
        <Title>Branding</Title>
        <Subtitle>applies to every brief</Subtitle>
        <DrawerClose onClose={onClose} label="Close settings" />
      </TitleRow>

      <Field label="Brand name">
        <Input
          value={name}
          maxLength={BRAND_NAME_MAX_LENGTH}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
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

      <SaveSection>
        <Button onClick={save} disabled={isSaving || name.trim().length === 0} className="w-full">
          {isSaving ? 'Saving…' : 'Save brand'}
        </Button>
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

const SaveSection = tw.div`
  mt-auto border-t border-border pt-4
`;

const ErrorText = tw.p`
  mt-2 text-sm text-danger
`;
