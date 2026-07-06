'use client';

import type { Asset, CreateCampaignRequest } from '@media-content/shared';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useStudioStore } from '@/stores/studio';

import {
  createCampaign,
  deleteCampaign,
  fetchBrands,
  fetchCampaign,
  fetchCampaigns,
  refineAsset,
  regenerateAsset,
  restoreRevision,
  saveRevision,
} from './api';

export function useBrands() {
  const brands = useStudioStore(s => s.brands);
  const activeBrandId = useStudioStore(s => s.activeBrandId);
  const setBrands = useStudioStore(s => s.setBrands);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await fetchBrands();
        if (!cancelled) setBrands(loaded);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load brands');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setBrands]);

  const activeBrand = brands.find(brand => brand.id === activeBrandId) ?? null;
  return { brands, activeBrand, error, isLoading };
}

export function useCampaignHistory() {
  const activeBrandId = useStudioStore(s => s.activeBrandId);
  const campaignSummaries = useStudioStore(s => s.campaignSummaries);
  const setCampaignSummaries = useStudioStore(s => s.setCampaignSummaries);
  const loadCampaign = useStudioStore(s => s.loadCampaign);
  const isGenerating = useStudioStore(s => s.isGenerating);
  const [isOpening, setIsOpening] = useState(false);
  const [query, setQuery] = useState('');

  const refresh = useCallback(async () => {
    if (!activeBrandId) return;
    try {
      setCampaignSummaries(await fetchCampaigns(activeBrandId, query || undefined));
    } catch {
      setCampaignSummaries([]);
    }
  }, [activeBrandId, query, setCampaignSummaries]);

  useEffect(() => {
    void refresh();
  }, [refresh, isGenerating]);

  const openCampaign = useCallback(
    async (campaignId: string) => {
      setIsOpening(true);
      try {
        loadCampaign(await fetchCampaign(campaignId));
      } finally {
        setIsOpening(false);
      }
    },
    [loadCampaign]
  );

  const removeCampaign = useCallback(
    async (campaignId: string) => {
      await deleteCampaign(campaignId);
      await refresh();
    },
    [refresh]
  );

  return { campaignSummaries, openCampaign, isOpening, refresh, query, setQuery, removeCampaign };
}

export function useGenerateCampaign() {
  const { beginGeneration, upsertAsset, finishGeneration, failGeneration } = useStudioStore();
  const activeBrandId = useStudioStore(s => s.activeBrandId);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return useCallback(
    async (request: CreateCampaignRequest) => {
      if (!activeBrandId) return;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      try {
        await createCampaign(
          activeBrandId,
          request,
          event => {
            switch (event.type) {
              case 'campaign':
                beginGeneration(event.campaign);
                break;
              case 'asset':
                upsertAsset(event.asset);
                break;
              case 'done':
                finishGeneration();
                break;
              case 'error':
                failGeneration(event.message);
                break;
            }
          },
          controller.signal,
        );
      } catch (e) {
        if (controller.signal.aborted) return;
        failGeneration(e instanceof Error ? e.message : 'Generation failed');
      }
    },
    [activeBrandId, beginGeneration, upsertAsset, finishGeneration, failGeneration]
  );
}

function useAssetAction(action: (assetId: string, input: string) => Promise<Asset>) {
  const upsertAsset = useStudioStore(s => s.upsertAsset);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (assetId: string, input: string) => {
      setIsPending(true);
      setError(null);
      try {
        upsertAsset(await action(assetId, input));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Request failed');
        return false;
      } finally {
        setIsPending(false);
      }
    },
    [action, upsertAsset]
  );

  return { run, isPending, error };
}

export function useRefineAsset() {
  const { run, isPending, error } = useAssetAction(refineAsset);
  return { refine: run, isRefining: isPending, error };
}

export function useRegenerateAsset() {
  const { run, isPending, error } = useAssetAction(useCallback((assetId: string) => regenerateAsset(assetId), []));
  return { regenerate: useCallback((assetId: string) => run(assetId, ''), [run]), isRegenerating: isPending, error };
}

export function useSaveRevision() {
  const { run, isPending, error } = useAssetAction(saveRevision);
  return { save: run, isSaving: isPending, error };
}

export function useRestoreRevision() {
  const upsertAsset = useStudioStore(s => s.upsertAsset);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restore = useCallback(
    async (assetId: string, revisionId: string) => {
      setIsRestoring(true);
      setError(null);
      try {
        upsertAsset(await restoreRevision(assetId, revisionId));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Restore failed');
        return false;
      } finally {
        setIsRestoring(false);
      }
    },
    [upsertAsset]
  );
  return { restore, isRestoring, error };
}
