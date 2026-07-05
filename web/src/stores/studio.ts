import type { Asset, Campaign } from '@media-content/shared';
import { create } from 'zustand';

interface StudioState {
  campaign: Campaign | null;
  isGenerating: boolean;
  selectedAssetId: string | null;
  error: string | null;
  beginGeneration: (campaign: Campaign) => void;
  upsertAsset: (asset: Asset) => void;
  finishGeneration: () => void;
  failGeneration: (message: string) => void;
  selectAsset: (assetId: string | null) => void;
  clearError: () => void;
}

export const useStudioStore = create<StudioState>()(set => ({
  campaign: null,
  isGenerating: false,
  selectedAssetId: null,
  error: null,
  beginGeneration: campaign => set({ campaign, isGenerating: true, selectedAssetId: null, error: null }),
  upsertAsset: asset =>
    set(state =>
      state.campaign
        ? { campaign: { ...state.campaign, assets: state.campaign.assets.map(a => (a.id === asset.id ? asset : a)) } }
        : {}
    ),
  finishGeneration: () =>
    set(state => ({
      isGenerating: false,
      campaign: state.campaign ? { ...state.campaign, status: 'complete' } : null,
    })),
  failGeneration: message => set({ isGenerating: false, error: message }),
  selectAsset: assetId => set({ selectedAssetId: assetId }),
  clearError: () => set({ error: null }),
}));
