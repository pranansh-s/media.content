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
  assetErrors: Record<string, string>;
  setBrands: (brands: Brand[]) => void;
  setActiveBrand: (brandId: string) => void;
  upsertBrand: (brand: Brand) => void;
  removeBrand: (brandId: string) => void;
  setCampaignSummaries: (campaigns: CampaignSummary[]) => void;
  loadCampaign: (campaign: Campaign) => void;
  upsertAsset: (asset: Asset) => void;
  selectAsset: (assetId: string | null) => void;
  startGeneration: () => void;
  receiveCampaign: (campaign: Campaign) => void;
  finishGeneration: () => void;
  failGeneration: (message: string) => void;
  setAssetError: (assetId: string, message: string) => void;
  clearActiveCampaign: (campaignId: string) => void;
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
  assetErrors: {},
  setBrands: brands =>
    set(state => ({
      brands,
      activeBrandId:
        state.activeBrandId && brands.some(brand => brand.id === state.activeBrandId)
          ? state.activeBrandId
          : (brands[0]?.id ?? null),
    })),
  setActiveBrand: brandId =>
    set({
      activeBrandId: brandId,
      campaign: null,
      campaignSummaries: [],
      selectedAssetId: null,
      error: null,
      assetErrors: {},
    }),
  upsertBrand: brand =>
    set(state => {
      const exists = state.brands.some(existing => existing.id === brand.id);
      return {
        brands: exists
          ? state.brands.map(existing => (existing.id === brand.id ? brand : existing))
          : [...state.brands, brand],
        activeBrandId: exists ? state.activeBrandId : brand.id,
        ...(exists ? {} : { campaign: null, campaignSummaries: [], selectedAssetId: null, assetErrors: {} }),
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
        assetErrors: {},
      };
    }),
  setCampaignSummaries: campaignSummaries => set({ campaignSummaries }),
  loadCampaign: campaign => set({ campaign, isGenerating: false, selectedAssetId: null, error: null, assetErrors: {} }),
  startGeneration: () => set({ isGenerating: true, error: null }),
  receiveCampaign: campaign =>
    set(state =>
      state.campaign?.id === campaign.id
        ? { campaign }
        : { campaign, selectedAssetId: null, error: null, assetErrors: {} }
    ),
  upsertAsset: asset =>
    set(state => {
      if (!state.campaign) return {};
      return {
        campaign: {
          ...state.campaign,
          assets: state.campaign.assets.map(existing => (existing.id === asset.id ? asset : existing)),
        },
      };
    }),
  finishGeneration: () => set({ isGenerating: false }),
  failGeneration: message =>
    set(state => ({
      isGenerating: false,
      error: message,
      campaign: state.campaign
        ? {
            ...state.campaign,
            status: 'failed',
            assets: state.campaign.assets.map(asset =>
              asset.status === 'pending' || asset.status === 'generating' ? { ...asset, status: 'failed' } : asset
            ),
          }
        : null,
    })),
  setAssetError: (assetId, message) => set(state => ({ assetErrors: { ...state.assetErrors, [assetId]: message } })),
  clearActiveCampaign: campaignId =>
    set(state => (state.campaign?.id === campaignId ? { campaign: null, selectedAssetId: null, assetErrors: {} } : {})),
  selectAsset: assetId => set({ selectedAssetId: assetId }),
  clearError: () => set({ error: null }),
}));
