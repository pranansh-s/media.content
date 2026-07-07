import { create } from 'zustand';

import type { Asset, Brand, Campaign, CampaignSummary } from '@media-content/shared';

interface StudioState {
  brands: Brand[];
  activeBrandId: string | null;
  campaignSummaries: CampaignSummary[];
  campaign: Campaign | null;
  selectedAssetId: string | null;
  isGenerating: boolean;
  error: string | null;
  setBrands: (brands: Brand[]) => void;
  setActiveBrand: (brandId: string) => void;
  upsertBrand: (brand: Brand) => void;
  removeBrand: (brandId: string) => void;
  setCampaignSummaries: (campaigns: CampaignSummary[]) => void;
  loadCampaign: (campaign: Campaign) => void;
  upsertAsset: (asset: Asset) => void;
  selectAsset: (assetId: string | null) => void;
  beginGeneration: (campaign: Campaign) => void;
  finishGeneration: () => void;
  failGeneration: (message: string) => void;
  clearError: () => void;
}

export const useStudioStore = create<StudioState>()(set => ({
  brands: [],
  activeBrandId: null,
  campaignSummaries: [],
  campaign: null,
  isGenerating: false,
  selectedAssetId: null,
  error: null,
  setBrands: brands =>
    set(state => ({
      brands,
      activeBrandId:
        state.activeBrandId && brands.some(brand => brand.id === state.activeBrandId)
          ? state.activeBrandId
          : (brands[0]?.id ?? null),
    })),
  setActiveBrand: brandId =>
    set({ activeBrandId: brandId, campaign: null, campaignSummaries: [], selectedAssetId: null, error: null }),
  upsertBrand: brand =>
    set(state => {
      const exists = state.brands.some(existing => existing.id === brand.id);
      return {
        brands: exists
          ? state.brands.map(existing => (existing.id === brand.id ? brand : existing))
          : [...state.brands, brand],
        activeBrandId: exists ? state.activeBrandId : brand.id,
        ...(exists ? {} : { campaign: null, campaignSummaries: [], selectedAssetId: null }),
      };
    }),
  removeBrand: brandId =>
    set(state => {
      const brands = state.brands.filter(brand => brand.id !== brandId);
      if (state.activeBrandId !== brandId) return { brands };
      return {
        brands,
        activeBrandId: brands[0]?.id ?? null,
        campaign: null,
        campaignSummaries: [],
        selectedAssetId: null,
      };
    }),
  setCampaignSummaries: campaignSummaries => set({ campaignSummaries }),
  loadCampaign: campaign => set({ campaign, isGenerating: false, selectedAssetId: null, error: null }),
  beginGeneration: campaign => set({ campaign, isGenerating: true, selectedAssetId: null, error: null }),
  upsertAsset: asset =>
    set(state => {
      if (!state.campaign) return {};
      const rank = { pending: 0, generating: 1, failed: 2, complete: 3 } as const;
      return {
        campaign: {
          ...state.campaign,
          assets: state.campaign.assets.map(a =>
            a.id === asset.id && rank[a.status] > rank[asset.status] ? a : a.id === asset.id ? asset : a
          ),
        },
      };
    }),
  finishGeneration: () =>
    set(state => ({
      isGenerating: false,
      campaign: state.campaign ? { ...state.campaign, status: 'complete' } : null,
    })),
  failGeneration: message => set({ isGenerating: false, error: message }),
  selectAsset: assetId => set({ selectedAssetId: assetId }),
  clearError: () => set({ error: null }),
}));
