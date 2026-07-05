import type { Metadata } from 'next';

import { StudioApp } from '@/components/studio/studio-app';

export const metadata: Metadata = {
  title: 'Studio — media.content',
};

export default function StudioPage() {
  return <StudioApp />;
}
