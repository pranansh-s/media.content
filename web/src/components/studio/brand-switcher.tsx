'use client';

import { useEffect, useRef, useState } from 'react';

import tw from 'tailwind-styled-components';

import { useStudioStore } from '@/stores/studio';

import type { Brand } from '@media-content/shared';

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
  relative
  ml-auto
  min-w-0
`;

const Trigger = tw.button`
  text-muted
  hover:bg-surface-raised
  hover:text-foreground
  focus-visible:outline-accent
  flex
  max-w-56
  items-center
  gap-1.5
  rounded-md
  px-2
  py-1
  font-mono
  text-xs
  transition-colors
  focus-visible:outline-2
`;

const TriggerName = tw.span`
  min-w-0
  truncate
`;

const Caret = tw.span<{ $open: boolean }>`
  text-faint
  shrink-0
  text-[10px]
  transition-transform
  ${p => (p.$open ? 'rotate-180' : '')} `;

const Menu = tw.div`
  border-border
  bg-surface
  absolute
  right-0
  z-30
  mt-1
  flex
  w-64
  flex-col
  rounded-md
  border
  p-1
  shadow-lg
`;

const MenuHeading = tw.p`
  text-faint
  px-2
  pt-1.5
  pb-1
  font-mono
  text-[10px]
  tracking-widest
  uppercase
`;

const MenuItem = tw.button<{ $active: boolean }>`
  hover:bg-surface-raised
  focus-visible:outline-accent
  w-full
  rounded
  px-2
  py-1.5
  text-left
  transition-colors
  focus-visible:outline-2
  focus-visible:-outline-offset-2
  ${p => (p.$active ? 'bg-surface-raised' : '')} `;

const ItemName = tw.span`
  text-foreground
  block
  truncate
  text-sm
`;

const ItemTagline = tw.span`
  text-faint
  block
  truncate
  text-xs
`;

const ItemAction = tw.span`
  text-accent
  block
  font-mono
  text-xs
`;

const Divider = tw.div`
  border-border
  my-1
  border-t
`;
