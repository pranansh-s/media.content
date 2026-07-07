'use client';

import { useEffect } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import tw from 'tailwind-styled-components';

interface DrawerProps {
  open: boolean;
  label: string;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}

export function Drawer({ open, label, onClose, className, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <Panel
            role="dialog"
            aria-label={label}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className={className}
          >
            {children}
          </Panel>
        </>
      )}
    </AnimatePresence>
  );
}

export function DrawerClose({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <CloseButton type="button" onClick={onClose} aria-label={label}>
      esc ✕
    </CloseButton>
  );
}

const Overlay = tw(motion.div)`
  bg-background/60
  fixed
  inset-0
  z-30
  backdrop-blur-sm
`;

const Panel = tw(motion.aside)`
  border-border
  bg-background
  fixed
  inset-y-0
  right-0
  z-40
  flex
  w-full
  max-w-xl
  flex-col
  overflow-y-auto
  border-l
  p-6
`;

const CloseButton = tw.button`
  text-muted
  hover:bg-surface-raised
  hover:text-foreground
  focus-visible:outline-accent
  ml-auto
  rounded-md
  px-2
  py-1
  font-mono
  text-xs
  focus-visible:outline-2
`;
