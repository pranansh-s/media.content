'use client';

import type { Project } from '@media-content/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { updateBrand } from '@/services/api';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="font-mono text-xs uppercase tracking-widest text-muted">{label}</span>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function ProjectSettings({
  project,
  open,
  onClose,
  onSaved,
}: {
  project: Project;
  open: boolean;
  onClose: () => void;
  onSaved: (project: Project) => void;
}) {
  const [name, setName] = useState(project.brand.name);
  const [tagline, setTagline] = useState(project.brand.tagline ?? '');
  const [links, setLinks] = useState(project.brand.links.join('\n'));
  const [voiceNotes, setVoiceNotes] = useState(project.brand.voiceNotes ?? '');
  const [examples, setExamples] = useState(project.brand.examples.join('\n\n'));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateBrand(project.id, {
        ...project.brand,
        name: name.trim(),
        tagline: tagline.trim() || null,
        links: links
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean),
        voiceNotes: voiceNotes.trim() || null,
        examples: examples
          .split(/\n\s*\n/)
          .map(x => x.trim())
          .filter(Boolean),
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
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm"
          />
          <motion.aside
            role="dialog"
            aria-label="Project brand settings"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col gap-5 overflow-y-auto border-l border-border bg-background p-6"
          >
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold">Project brand</h2>
              <span className="font-mono text-xs text-faint">applies to every brief</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close settings"
                className="ml-auto rounded-md px-2 py-1 font-mono text-xs text-muted hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
              >
                esc ✕
              </button>
            </div>

            <Field label="Brand name">
              <Input value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
            </Field>

            <Field label="Tagline">
              <Input
                value={tagline}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagline(e.target.value)}
                placeholder="Ship faster with confidence"
              />
            </Field>

            <Field label="Links — one per line">
              <Textarea
                rows={3}
                value={links}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLinks(e.target.value)}
                placeholder={'https://acme.dev\nhttps://github.com/acme'}
              />
            </Field>

            <Field label="Voice notes">
              <Textarea
                rows={3}
                value={voiceNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVoiceNotes(e.target.value)}
                placeholder="Confident and technical. No hype words."
              />
            </Field>

            <Field label="Example posts — separate with a blank line">
              <Textarea
                rows={6}
                value={examples}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExamples(e.target.value)}
                placeholder={
                  'Paste writing that sounds like you — up to 10 samples.\n\nWe shipped v2 today. It pages you before your customers do.'
                }
              />
            </Field>

            <div className="mt-auto border-t border-border pt-4">
              <Button onClick={save} disabled={isSaving || name.trim().length === 0} className="w-full">
                {isSaving ? 'Saving…' : 'Save brand'}
              </Button>
              {error && <p className="mt-2 text-sm text-danger">{error}</p>}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
