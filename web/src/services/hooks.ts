'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useStudioStore } from '@/stores/studio';

import type { Asset, CreateCampaignRequest } from '@media-content/shared';

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
  const clearActiveCampaign = useStudioStore(s => s.clearActiveCampaign);
  const isGenerating = useStudioStore(s => s.isGenerating);
  const [isOpening, setIsOpening] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const listAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const refresh = useCallback(async () => {
    if (!activeBrandId) return;
    listAbortRef.current?.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;
    try {
      setCampaignSummaries(await fetchCampaigns(activeBrandId, debouncedQuery || undefined, controller.signal));
    } catch {
      if (!controller.signal.aborted) setCampaignSummaries([]);
    }
  }, [activeBrandId, debouncedQuery, setCampaignSummaries]);

  useEffect(() => {
    void refresh();
    return () => listAbortRef.current?.abort();
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
      clearActiveCampaign(campaignId);
      await refresh();
    },
    [refresh, clearActiveCampaign]
  );

  return { campaignSummaries, openCampaign, isOpening, refresh, query, setQuery, removeCampaign };
}

export function useGenerateCampaign() {
  const activeBrandId = useStudioStore(s => s.activeBrandId);
  const startGeneration = useStudioStore(s => s.startGeneration);
  const receiveCampaign = useStudioStore(s => s.receiveCampaign);
  const upsertAsset = useStudioStore(s => s.upsertAsset);
  const setAssetError = useStudioStore(s => s.setAssetError);
  const finishGeneration = useStudioStore(s => s.finishGeneration);
  const failGeneration = useStudioStore(s => s.failGeneration);
  const controllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return useCallback(
    async (request: CreateCampaignRequest) => {
      if (!activeBrandId || inFlightRef.current) return;
      inFlightRef.current = true;
      startGeneration();
      const controller = new AbortController();
      controllerRef.current = controller;
      try {
        await createCampaign(
          activeBrandId,
          request,
          crypto.randomUUID(),
          event => {
            switch (event.type) {
              case 'campaign':
                receiveCampaign(event.campaign);
                break;
              case 'asset':
                upsertAsset(event.asset);
                if (event.message) setAssetError(event.asset.id, event.message);
                break;
              case 'done':
                finishGeneration();
                break;
              case 'error':
                failGeneration(event.message);
                break;
            }
          },
          controller.signal
        );
      } catch (e) {
        if (!controller.signal.aborted) failGeneration(e instanceof Error ? e.message : 'Generation failed');
      } finally {
        inFlightRef.current = false;
        if (!controller.signal.aborted) finishGeneration();
      }
    },
    [activeBrandId, startGeneration, receiveCampaign, upsertAsset, setAssetError, finishGeneration, failGeneration]
  );
}

function useAssetAction(action: (assetId: string, input: string) => Promise<Asset>) {
  const upsertAsset = useStudioStore(s => s.upsertAsset);
  const [isPending, setIsPending] = useState(false);

  const run = useCallback(
    async (assetId: string, input: string): Promise<string | null> => {
      setIsPending(true);
      try {
        upsertAsset(await action(assetId, input));
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Request failed';
      } finally {
        setIsPending(false);
      }
    },
    [action, upsertAsset]
  );

  return { run, isPending };
}

export function useRefineAsset() {
  const { run, isPending } = useAssetAction(refineAsset);
  return { refine: run, isRefining: isPending };
}

export function useRegenerateAsset() {
  const { run, isPending } = useAssetAction(useCallback((assetId: string) => regenerateAsset(assetId), []));
  return { regenerate: useCallback((assetId: string) => run(assetId, ''), [run]), isRegenerating: isPending };
}

export function useSaveRevision() {
  const { run, isPending } = useAssetAction(saveRevision);
  return { save: run, isSaving: isPending };
}

export function useRestoreRevision() {
  const { run, isPending } = useAssetAction(
    useCallback((assetId: string, revisionId: string) => restoreRevision(assetId, revisionId), [])
  );
  return { restore: run, isRestoring: isPending };
}
