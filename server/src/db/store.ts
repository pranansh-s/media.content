import type {
  Asset,
  AssetStatus,
  Brand,
  Campaign,
  CampaignPlan,
  CampaignStatus,
  CampaignSummary,
  CreateBrandRequest,
  GeneratableChannel,
  ImageChannel,
  ImageRevision,
  StyleId,
  TextChannel,
  TextRevision,
  UpdateBrandRequest,
} from '@media-content/shared';
import type { Database } from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

import { DEFAULT_BRAND } from '../fixtures/brand';

export type ChunkSource = 'references' | 'url' | 'revision';

export interface BrandChunk {
  id: string;
  source: ChunkSource;
  ref: string | null;
  text: string;
  embedding: Float32Array;
}

export interface AssetContext {
  asset: Asset;
  campaign: {
    id: string;
    prompt: string;
    styleId: StyleId | null;
    styleText: string | null;
    plan: CampaignPlan | null;
  };
  brand: Brand;
}

export type Store = ReturnType<typeof createStore>;

interface BrandRow {
  id: string;
  name: string;
  tagline: string | null;
  writing_style: string | null;
  references_text: string | null;
}

interface AssetRow {
  id: string;
  campaign_id: string;
  kind: 'text' | 'image';
  channel: GeneratableChannel;
  status: AssetStatus;
}

interface RevisionRow {
  id: string;
  created_at: string;
  prompt: string | null;
  source: 'generated' | 'refined' | 'manual';
  body: string | null;
  url: string | null;
  alt: string | null;
}

interface CampaignRow {
  id: string;
  brand_id: string;
  prompt: string;
  style_id: StyleId | null;
  style_text: string | null;
  plan_json: string | null;
  channels: string;
  status: CampaignStatus;
  created_at: string;
}

function toBrand(row: BrandRow): Brand {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    writingStyle: row.writing_style,
    references: row.references_text,
  };
}

function toRevision(row: RevisionRow, kind: 'text' | 'image'): TextRevision | ImageRevision {
  const base = { id: row.id, createdAt: row.created_at, prompt: row.prompt, source: row.source };
  return kind === 'text' ? { ...base, body: row.body ?? '' } : { ...base, url: row.url ?? '', alt: row.alt ?? '' };
}

function toEmbedding(blob: Buffer): Float32Array {
  return new Float32Array(blob.buffer.slice(blob.byteOffset, blob.byteOffset + blob.byteLength));
}

export function createStore(db: Database) {
  const insertBrandStmt = db.prepare(
    'INSERT INTO brands (id, name, tagline, writing_style, references_text, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const getBrandStmt = db.prepare('SELECT * FROM brands WHERE id = ?');
  const listBrandsStmt = db.prepare('SELECT * FROM brands ORDER BY created_at');
  const updateBrandStmt = db.prepare(
    'UPDATE brands SET name = ?, tagline = ?, writing_style = ?, references_text = ? WHERE id = ?',
  );
  const deleteBrandStmt = db.prepare('DELETE FROM brands WHERE id = ?');
  const countBrandsStmt = db.prepare('SELECT COUNT(*) AS count FROM brands');

  const insertCampaignStmt = db.prepare(
    'INSERT INTO campaigns (id, brand_id, prompt, style_id, style_text, plan_json, channels, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const getCampaignStmt = db.prepare('SELECT * FROM campaigns WHERE id = ?');
  const listCampaignsStmt = db.prepare('SELECT * FROM campaigns WHERE brand_id = ? ORDER BY created_at DESC');
  const setCampaignStatusStmt = db.prepare('UPDATE campaigns SET status = ? WHERE id = ?');
  const setCampaignPlanStmt = db.prepare('UPDATE campaigns SET plan_json = ? WHERE id = ?');

  const insertAssetStmt = db.prepare(
    'INSERT INTO assets (id, campaign_id, kind, channel, status) VALUES (?, ?, ?, ?, ?)',
  );
  const getAssetStmt = db.prepare('SELECT * FROM assets WHERE id = ?');
  const listAssetsStmt = db.prepare('SELECT * FROM assets WHERE campaign_id = ? ORDER BY rowid');
  const updateAssetStatusStmt = db.prepare('UPDATE assets SET status = ? WHERE id = ?');

  const insertRevisionStmt = db.prepare(
    'INSERT INTO revisions (id, asset_id, created_at, prompt, source, body, url, alt, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const listRevisionsStmt = db.prepare('SELECT * FROM revisions WHERE asset_id = ? ORDER BY position');
  const nextPositionStmt = db.prepare(
    'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM revisions WHERE asset_id = ?',
  );

  const insertChunkStmt = db.prepare(
    'INSERT INTO brand_chunks (id, brand_id, source, ref, text, embedding) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const deleteChunksBySourceStmt = db.prepare('DELETE FROM brand_chunks WHERE brand_id = ? AND source = ?');
  const listChunksStmt = db.prepare('SELECT * FROM brand_chunks WHERE brand_id = ?');
  const countChunksStmt = db.prepare('SELECT COUNT(*) AS count FROM brand_chunks WHERE brand_id = ?');
  const countChunksBySourceStmt = db.prepare(
    'SELECT COUNT(*) AS count FROM brand_chunks WHERE brand_id = ? AND source = ?',
  );

  function hydrateAsset(row: AssetRow): Asset {
    const revisionRows = listRevisionsStmt.all(row.id) as RevisionRow[];
    const base = { id: row.id, campaignId: row.campaign_id, status: row.status };
    return row.kind === 'text'
      ? {
          ...base,
          kind: 'text',
          channel: row.channel as TextChannel,
          revisions: revisionRows.map(revision => toRevision(revision, 'text') as TextRevision),
        }
      : {
          ...base,
          kind: 'image',
          channel: row.channel as ImageChannel,
          revisions: revisionRows.map(revision => toRevision(revision, 'image') as ImageRevision),
        };
  }

  function hydrateCampaign(row: CampaignRow): Campaign {
    const assetRows = listAssetsStmt.all(row.id) as AssetRow[];
    return {
      id: row.id,
      brandId: row.brand_id,
      prompt: row.prompt,
      styleId: row.style_id,
      plan: row.plan_json ? (JSON.parse(row.plan_json) as CampaignPlan) : null,
      channels: JSON.parse(row.channels) as GeneratableChannel[],
      status: row.status,
      assets: assetRows.map(hydrateAsset),
      createdAt: row.created_at,
    };
  }

  const insertCampaignTx = db.transaction((campaign: Campaign, styleText: string | null) => {
    insertCampaignStmt.run(
      campaign.id,
      campaign.brandId,
      campaign.prompt,
      campaign.styleId,
      styleText,
      campaign.plan ? JSON.stringify(campaign.plan) : null,
      JSON.stringify(campaign.channels),
      campaign.status,
      campaign.createdAt,
    );
    for (const asset of campaign.assets) {
      insertAssetStmt.run(asset.id, campaign.id, asset.kind, asset.channel, asset.status);
    }
  });

  const replaceChunksTx = db.transaction(
    (brandId: string, source: ChunkSource, chunks: { ref: string | null; text: string; embedding: Float32Array }[]) => {
      deleteChunksBySourceStmt.run(brandId, source);
      for (const chunk of chunks) {
        insertChunkStmt.run(randomUUID(), brandId, source, chunk.ref, chunk.text, Buffer.from(chunk.embedding.buffer));
      }
    },
  );

  return {
    seedDefaultBrand(): Brand {
      const { count } = countBrandsStmt.get() as { count: number };
      if (count === 0) {
        insertBrandStmt.run(
          DEFAULT_BRAND.id,
          DEFAULT_BRAND.name,
          DEFAULT_BRAND.tagline,
          DEFAULT_BRAND.writingStyle,
          DEFAULT_BRAND.references,
          new Date().toISOString(),
        );
      }
      return this.listBrands()[0]!;
    },

    listBrands(): Brand[] {
      return (listBrandsStmt.all() as BrandRow[]).map(toBrand);
    },

    getBrand(id: string): Brand | null {
      const row = getBrandStmt.get(id) as BrandRow | undefined;
      return row ? toBrand(row) : null;
    },

    createBrand(input: CreateBrandRequest): Brand {
      const brand: Brand = { id: randomUUID(), ...input };
      insertBrandStmt.run(
        brand.id,
        brand.name,
        brand.tagline,
        brand.writingStyle,
        brand.references,
        new Date().toISOString(),
      );
      return brand;
    },

    updateBrand(id: string, input: UpdateBrandRequest): Brand | null {
      const result = updateBrandStmt.run(input.name, input.tagline, input.writingStyle, input.references, id);
      return result.changes > 0 ? { id, ...input } : null;
    },

    deleteBrand(id: string): 'deleted' | 'not_found' | 'last_brand' {
      if (!getBrandStmt.get(id)) return 'not_found';
      const { count } = countBrandsStmt.get() as { count: number };
      if (count <= 1) return 'last_brand';
      deleteBrandStmt.run(id);
      return 'deleted';
    },

    insertCampaign(campaign: Campaign, styleText: string | null) {
      insertCampaignTx(campaign, styleText);
    },

    setCampaignStatus(id: string, status: CampaignStatus) {
      setCampaignStatusStmt.run(status, id);
    },

    setCampaignPlan(id: string, plan: CampaignPlan) {
      setCampaignPlanStmt.run(JSON.stringify(plan), id);
    },

    updateAssetStatus(id: string, status: AssetStatus) {
      updateAssetStatusStmt.run(status, id);
    },

    appendRevision(assetId: string, revision: TextRevision | ImageRevision): Asset {
      const { next } = nextPositionStmt.get(assetId) as { next: number };
      insertRevisionStmt.run(
        revision.id,
        assetId,
        revision.createdAt,
        revision.prompt,
        revision.source,
        'body' in revision ? revision.body : null,
        'url' in revision ? revision.url : null,
        'alt' in revision ? revision.alt : null,
        next,
      );
      return hydrateAsset(getAssetStmt.get(assetId) as AssetRow);
    },

    listCampaigns(brandId: string): CampaignSummary[] {
      return (listCampaignsStmt.all(brandId) as CampaignRow[]).map(row => {
        const { assets: _assets, ...summary } = hydrateCampaign(row);
        return summary;
      });
    },

    getCampaign(id: string): Campaign | null {
      const row = getCampaignStmt.get(id) as CampaignRow | undefined;
      return row ? hydrateCampaign(row) : null;
    },

    getAssetContext(assetId: string): AssetContext | null {
      const assetRow = getAssetStmt.get(assetId) as AssetRow | undefined;
      if (!assetRow) return null;
      const campaignRow = getCampaignStmt.get(assetRow.campaign_id) as CampaignRow;
      const brandRow = getBrandStmt.get(campaignRow.brand_id) as BrandRow;
      return {
        asset: hydrateAsset(assetRow),
        campaign: {
          id: campaignRow.id,
          prompt: campaignRow.prompt,
          styleId: campaignRow.style_id,
          styleText: campaignRow.style_text,
          plan: campaignRow.plan_json ? (JSON.parse(campaignRow.plan_json) as CampaignPlan) : null,
        },
        brand: toBrand(brandRow),
      };
    },

    replaceChunks(
      brandId: string,
      source: ChunkSource,
      chunks: { ref: string | null; text: string; embedding: Float32Array }[],
    ) {
      replaceChunksTx(brandId, source, chunks);
    },

    appendChunk(brandId: string, source: ChunkSource, ref: string | null, text: string, embedding: Float32Array) {
      insertChunkStmt.run(randomUUID(), brandId, source, ref, text, Buffer.from(embedding.buffer));
    },

    listChunks(brandId: string): BrandChunk[] {
      return (
        listChunksStmt.all(brandId) as { id: string; source: ChunkSource; ref: string | null; text: string; embedding: Buffer }[]
      ).map(row => ({ ...row, embedding: toEmbedding(row.embedding) }));
    },

    countChunks(brandId: string, source?: ChunkSource): number {
      const row = source
        ? (countChunksBySourceStmt.get(brandId, source) as { count: number })
        : (countChunksStmt.get(brandId) as { count: number });
      return row.count;
    },
  };
}
