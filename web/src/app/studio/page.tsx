import { StudioApp } from '@/components/studio/studio-app';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Studio — media.content',
};

export default function StudioPage() {
  return <StudioApp />;
}
