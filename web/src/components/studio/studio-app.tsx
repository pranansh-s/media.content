'use client';

import Link from 'next/link';
import { useState } from 'react';

import { AuthControls } from '@/components/auth-controls';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useProject } from '@/services/hooks';
import { useStudioStore } from '@/stores/studio';

import { AssetDetail } from './asset-detail';
import { AssetGrid } from './asset-grid';
import { Composer } from './composer';
import { ProjectSettings } from './project-settings';

export function StudioApp() {
  const { project, setProject, error, isLoading } = useProject();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const storeError = useStudioStore(s => s.error);
  const clearError = useStudioStore(s => s.clearError);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-baseline gap-1 font-mono text-sm font-medium text-foreground">
            media<span className="text-accent">.</span>content
          </Link>
          <span className="font-mono text-xs text-faint">/ studio</span>
          {project && (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="ml-auto min-w-0 truncate rounded-md px-2 py-1 font-mono text-xs text-muted transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
            >
              project: {project.brand.name} <span className="hidden text-faint sm:inline">· edit brand</span>
            </button>
          )}
          <ThemeToggle className={project ? '' : 'ml-auto'} />
          <AuthControls />
        </div>
      </header>

      {storeError && (
        <div role="alert" className="border-b border-danger/40 bg-danger/10">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2 text-sm text-danger sm:px-6">
            {storeError}
            <button type="button" onClick={clearError} className="ml-auto font-mono text-xs underline">
              dismiss
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(320px,400px)_1fr]">
        <div className="lg:sticky lg:top-8 lg:self-start">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {error && (
            <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
              Can&rsquo;t reach the wire. Start the server, then reload. ({error})
            </div>
          )}
          {project && <Composer project={project} />}
        </div>
        <AssetGrid />
      </main>

      <AssetDetail />
      {project && (
        <ProjectSettings
          project={project}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSaved={setProject}
        />
      )}
    </div>
  );
}
