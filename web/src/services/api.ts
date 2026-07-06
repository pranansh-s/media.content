import {
  campaignEventSchema,
  getBrandResponseSchema,
  refineAssetResponseSchema,
  type Asset,
  type Brand,
  type CampaignEvent,
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

export async function fetchBrand(): Promise<Brand> {
  const res = await ensureOk(await fetch('/api/brand'));
  return getBrandResponseSchema.parse(await res.json()).brand;
}

export async function updateBrand(brand: UpdateBrandRequest): Promise<Brand> {
  const res = await ensureOk(
    await fetch('/api/brand', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(brand),
    })
  );
  return getBrandResponseSchema.parse(await res.json()).brand;
}

export async function createCampaign(
  request: CreateCampaignRequest,
  onEvent: (event: CampaignEvent) => void
): Promise<void> {
  const res = await ensureOk(
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
  );

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('Streaming is not supported in this browser');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      if (frame.startsWith('data: ')) {
        onEvent(campaignEventSchema.parse(JSON.parse(frame.slice('data: '.length))));
      }
    }
  }
}

export async function refineAsset(assetId: string, prompt: string): Promise<Asset> {
  const res = await ensureOk(
    await fetch(`/api/assets/${assetId}/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
  );
  return refineAssetResponseSchema.parse(await res.json()).asset;
}
