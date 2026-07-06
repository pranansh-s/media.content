'use client';

import type { Brand } from '@media-content/shared';
import { useEffect, useRef, useState } from 'react';
import tw from 'tailwind-styled-components';

import { useStudioStore } from '@/stores/studio';

interface BrandSwitcherProps {
  brands: Brand[];
  activeBrand: Brand | null;
  onEdit: () => void;
  onCreate: () => void;
}

export function BrandSwitcher({ brands, activeBrand, onEdit, onCreate }: BrandSwitcherProps) {
  const setActiveBrand = useStudioStore(s => s.setActiveBrand);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!activeBrand) return null;

  return (
    <Root ref={rootRef}>
      <Trigger type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(current => !current)}>
        <TriggerName>{activeBrand.name}</TriggerName>
        <Caret aria-hidden $open={open}>
          ▾
        </Caret>
      </Trigger>
      {open && (
        <Menu role="menu" aria-label="Brands">
          <MenuHeading>brands</MenuHeading>
          {brands.map(brand => (
            <MenuItem
              key={brand.id}
              type="button"
              role="menuitemradio"
              aria-checked={brand.id === activeBrand.id}
              $active={brand.id === activeBrand.id}
              onClick={() => {
                if (brand.id !== activeBrand.id) setActiveBrand(brand.id);
                setOpen(false);
              }}
            >
              <ItemName>{brand.name}</ItemName>
              {brand.tagline && <ItemTagline>{brand.tagline}</ItemTagline>}
            </MenuItem>
          ))}
          <Divider aria-hidden />
          <MenuItem
            type="button"
            role="menuitem"
            $active={false}
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <ItemAction>edit {activeBrand.name}</ItemAction>
          </MenuItem>
          <MenuItem
            type="button"
            role="menuitem"
            $active={false}
            onClick={() => {
              setOpen(false);
              onCreate();
            }}
          >
            <ItemAction>+ new brand</ItemAction>
          </MenuItem>
        </Menu>
      )}
    </Root>
  );
}

const Root = tw.div`
  relative ml-auto min-w-0
`;

const Trigger = tw.button`
  flex max-w-56 items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs text-muted transition-colors
  hover:bg-surface-raised hover:text-foreground
  focus-visible:outline-2 focus-visible:outline-accent
`;

const TriggerName = tw.span`
  min-w-0 truncate
`;

const Caret = tw.span<{ $open: boolean }>`
  shrink-0 text-[10px] text-faint transition-transform
  ${p => (p.$open ? 'rotate-180' : '')}
`;

const Menu = tw.div`
  absolute right-0 z-30 mt-1 flex w-64 flex-col rounded-md border border-border bg-surface p-1 shadow-lg
`;

const MenuHeading = tw.p`
  px-2 pb-1 pt-1.5 font-mono text-[10px] uppercase tracking-widest text-faint
`;

const MenuItem = tw.button<{ $active: boolean }>`
  w-full rounded px-2 py-1.5 text-left transition-colors
  hover:bg-surface-raised
  focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent
  ${p => (p.$active ? 'bg-surface-raised' : '')}
`;

const ItemName = tw.span`
  block truncate text-sm text-foreground
`;

const ItemTagline = tw.span`
  block truncate text-xs text-faint
`;

const ItemAction = tw.span`
  block font-mono text-xs text-accent
`;

const Divider = tw.div`
  my-1 border-t border-border
`;
