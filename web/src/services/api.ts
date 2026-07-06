import {
  assetResponseSchema,
  campaignEventSchema,
  getBrandResponseSchema,
  getCampaignResponseSchema,
  listBrandsResponseSchema,
  listCampaignsResponseSchema,
  type Asset,
  type Brand,
  type Campaign,
  type CampaignEvent,
  type CampaignSummary,
  type CreateBrandRequest,
  type CreateCampaignRequest,
  type UpdateBrandRequest,
} from '@media-content/shared';

async function ensureOk(res: Response): Promise<Response> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(typeof body?.error === 'string' ? body.error : `Request failed (${res.status})`);
  }
  return res;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function fetchBrands(): Promise<Brand[]> {
  const res = await ensureOk(await fetch('/api/brands'));
  return listBrandsResponseSchema.parse(await res.json()).brands;
}

export async function createBrand(brand: CreateBrandRequest): Promise<Brand> {
  const res = await ensureOk(await fetch('/api/brands', jsonInit('POST', brand)));
  return getBrandResponseSchema.parse(await res.json()).brand;
}

export async function updateBrand(brandId: string, brand: UpdateBrandRequest): Promise<Brand> {
  const res = await ensureOk(await fetch(`/api/brands/${brandId}`, jsonInit('PUT', brand)));
  return getBrandResponseSchema.parse(await res.json()).brand;
}

export async function deleteBrand(brandId: string): Promise<void> {
  await ensureOk(await fetch(`/api/brands/${brandId}`, { method: 'DELETE' }));
}

export async function fetchCampaigns(brandId: string, query?: string): Promise<CampaignSummary[]> {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
  const res = await ensureOk(await fetch(`/api/brands/${brandId}/campaigns${suffix}`));
  return listCampaignsResponseSchema.parse(await res.json()).campaigns;
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  await ensureOk(await fetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' }));
}

export interface CampaignExport {
  campaignId: string;
  prompt: string;
  createdAt: string;
  assets: Array<{ channel: string; kind: 'text'; body: string } | { channel: string; kind: 'image'; url: string; alt: string }>;
}

export async function exportCampaign(campaignId: string): Promise<CampaignExport> {
  const res = await ensureOk(await fetch(`/api/campaigns/${campaignId}/export`));
  return (await res.json()) as CampaignExport;
}

export function restoreRevision(assetId: string, revisionId: string): Promise<Asset> {
  return assetRequest(`/api/assets/${assetId}/revisions/${revisionId}/restore`);
}

export async function fetchCampaign(campaignId: string): Promise<Campaign> {
  const res = await ensureOk(await fetch(`/api/campaigns/${campaignId}`));
  return getCampaignResponseSchema.parse(await res.json()).campaign;
}

export async function createCampaign(
  brandId: string,
  request: CreateCampaignRequest,
  onEvent: (event: CampaignEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await ensureOk(await fetch(`/api/brands/${brandId}/campaigns`, { ...jsonInit('POST', request), signal }));

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('Streaming is not supported in this browser');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  const dispatch = (frame: string) => {
    if (!frame.startsWith('data: ')) return;
    const raw = frame.slice('data: '.length);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (cause) {
      throw new Error(`Malformed SSE frame: ${(cause as Error).message}`);
    }
    onEvent(campaignEventSchema.parse(parsed));
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? '';
    for (const frame of frames) dispatch(frame);
  }
  if (buffer.trim()) dispatch(buffer);
}

async function assetRequest(url: string, init?: RequestInit): Promise<Asset> {
  const res = await ensureOk(await fetch(url, init ?? { method: 'POST' }));
  return assetResponseSchema.parse(await res.json()).asset;
}

export function refineAsset(assetId: string, prompt: string): Promise<Asset> {
  return assetRequest(`/api/assets/${assetId}/refine`, jsonInit('POST', { prompt }));
}

export function regenerateAsset(assetId: string): Promise<Asset> {
  return assetRequest(`/api/assets/${assetId}/regenerate`);
}

export function saveRevision(assetId: string, body: string): Promise<Asset> {
  return assetRequest(`/api/assets/${assetId}/revisions`, jsonInit('POST', { body }));
}
