'use client';

import type { Brand, CreateCampaignRequest } from '@media-content/shared';
import { useCallback, useEffect, useState } from 'react';

import { useStudioStore } from '@/stores/studio';

import { createCampaign, fetchBrand, refineAsset } from './api';

export function useBrand() {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBrand()
      .then(b => !cancelled && setBrand(b))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return { brand, setBrand, error, isLoading: !brand && !error };
}

export function useGenerateCampaign() {
  const { beginGeneration, upsertAsset, finishGeneration, failGeneration } = useStudioStore();

  return useCallback(
    async (request: CreateCampaignRequest) => {
      try {
        await createCampaign(request, event => {
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
        });
      } catch (e) {
        failGeneration(e instanceof Error ? e.message : 'Generation failed');
      }
    },
    [beginGeneration, upsertAsset, finishGeneration, failGeneration]
  );
}

export function useRefineAsset() {
  const upsertAsset = useStudioStore(s => s.upsertAsset);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refine = useCallback(
    async (assetId: string, prompt: string) => {
      setIsRefining(true);
      setError(null);
      try {
        upsertAsset(await refineAsset(assetId, prompt));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Refinement failed');
      } finally {
        setIsRefining(false);
      }
    },
    [upsertAsset]
  );

  return { refine, isRefining, error };
}
