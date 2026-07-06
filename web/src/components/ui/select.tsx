'use client';

import { useEffect, useId, useRef, useState } from 'react';
import tw from 'tailwind-styled-components';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectProps {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

export function Select({ id, value, options, onChange }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selected = options.find(option => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const openList = () => {
    const selectedIndex = options.findIndex(option => option.value === value);
    setActiveIndex(Math.max(0, selectedIndex));
    setOpen(true);
  };

  const commit = (index: number) => {
    onChange(options[index].value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'Tab') setOpen(false);
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      commit(activeIndex);
    }
  };

  return (
    <Root ref={rootRef}>
      <Trigger
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? `${listboxId}-${activeIndex}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <TriggerText>
          {selected?.label ?? '—'}
          {selected?.description && <OptionDescription>{selected.description}</OptionDescription>}
        </TriggerText>
        <Caret aria-hidden $open={open}>
          ▾
        </Caret>
      </Trigger>
      {open && (
        <Listbox id={listboxId} role="listbox" aria-label="Options">
          {options.map((option, index) => (
            <Option
              key={option.value}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              $active={index === activeIndex}
              onPointerEnter={() => setActiveIndex(index)}
              onClick={() => commit(index)}
            >
              <OptionLabel $selected={option.value === value}>{option.label}</OptionLabel>
              {option.description && <OptionDescription>{option.description}</OptionDescription>}
            </Option>
          ))}
        </Listbox>
      )}
    </Root>
  );
}

const Root = tw.div`
  relative
`;

const Trigger = tw.button`
  flex min-h-10 w-full items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-left text-sm text-foreground
  focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent
`;

const TriggerText = tw.span`
  min-w-0 flex-1 break-words
`;

const Caret = tw.span<{ $open: boolean }>`
  shrink-0 text-xs text-faint transition-transform
  ${p => (p.$open ? 'rotate-180' : '')}
`;

const Listbox = tw.ul`
  absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-surface p-1 shadow-lg
`;

const Option = tw.li<{ $active: boolean }>`
  cursor-pointer rounded px-2 py-1.5
  ${p => (p.$active ? 'bg-surface-raised' : '')}
`;

const OptionLabel = tw.span<{ $selected: boolean }>`
  block break-words text-sm
  ${p => (p.$selected ? 'text-accent' : 'text-foreground')}
`;

const OptionDescription = tw.span`
  mt-0.5 block break-words text-xs leading-snug text-muted
`;
