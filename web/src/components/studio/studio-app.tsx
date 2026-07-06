'use client';

import Link from 'next/link';
import { useState } from 'react';
import tw from 'tailwind-styled-components';

import { AuthControls } from '@/components/auth-controls';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useBrands } from '@/services/hooks';
import { useStudioStore } from '@/stores/studio';

import { AssetDetail } from './asset-detail';
import { AssetGrid } from './asset-grid';
import { BrandSettings, type BrandSettingsMode } from './brand-settings';
import { BrandSwitcher } from './brand-switcher';
import { CampaignHistory } from './campaign-history';
import { Composer } from './composer';

export function StudioApp() {
  const { brands, activeBrand, error, isLoading } = useBrands();
  const [settings, setSettings] = useState<{ open: boolean; mode: BrandSettingsMode }>({ open: false, mode: 'edit' });
  const storeError = useStudioStore(s => s.error);
  const clearError = useStudioStore(s => s.clearError);

  return (
    <Shell>
      <Header>
        <HeaderInner>
          <Wordmark href="/">
            media<span className="text-accent">.</span>content
          </Wordmark>
          <HeaderCrumb>/ studio</HeaderCrumb>
          <BrandSwitcher
            brands={brands}
            activeBrand={activeBrand}
            onEdit={() => setSettings({ open: true, mode: 'edit' })}
            onCreate={() => setSettings({ open: true, mode: 'create' })}
          />
          <ThemeToggle className={activeBrand ? '' : 'ml-auto'} />
          <AuthControls />
        </HeaderInner>
      </Header>

      {storeError && (
        <ErrorBanner role="alert">
          <ErrorBannerInner>
            {storeError}
            <DismissButton type="button" onClick={clearError}>
              dismiss
            </DismissButton>
          </ErrorBannerInner>
        </ErrorBanner>
      )}

      <Main>
        <ComposerColumn>
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {error && (
            <LoadError role="alert">Can&rsquo;t reach the wire. Start the server, then reload. ({error})</LoadError>
          )}
          {activeBrand && (
            <>
              <Composer brand={activeBrand} />
              <CampaignHistory />
            </>
          )}
        </ComposerColumn>
        <AssetGrid />
      </Main>

      <AssetDetail />
      <BrandSettings
        brand={activeBrand}
        mode={settings.mode}
        open={settings.open}
        onClose={() => setSettings(current => ({ ...current, open: false }))}
      />
    </Shell>
  );
}

const Shell = tw.div`
  flex min-h-screen flex-col
`;

const Header = tw.header`
  border-b border-border
`;

const HeaderInner = tw.div`
  mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:px-6
`;

const Wordmark = tw(Link)`
  flex shrink-0 items-baseline gap-1 font-mono text-sm font-medium text-foreground
`;

const HeaderCrumb = tw.span`
  shrink-0 font-mono text-xs text-faint
`;

const ErrorBanner = tw.div`
  border-b border-danger/40 bg-danger/10
`;

const ErrorBannerInner = tw.div`
  mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2 text-sm text-danger sm:px-6
`;

const DismissButton = tw.button`
  ml-auto shrink-0 font-mono text-xs underline
`;

const Main = tw.main`
  mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-6
  lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]
`;

const ComposerColumn = tw.div`
  lg:sticky lg:top-8 lg:self-start
`;

const LoadError = tw.div`
  rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-danger
`;
