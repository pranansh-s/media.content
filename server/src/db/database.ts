import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import Database from 'better-sqlite3';

export const DEFAULT_DB_PATH = join(process.cwd(), 'data', 'media-content.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT,
  writing_style TEXT,
  references_text TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  style_id TEXT,
  style_text TEXT,
  plan_json TEXT,
  channels TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS revisions (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  prompt TEXT,
  source TEXT NOT NULL,
  body TEXT,
  url TEXT,
  alt TEXT,
  position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS brand_chunks (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  ref TEXT,
  text TEXT NOT NULL,
  embedding BLOB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_campaigns_brand ON campaigns(brand_id, created_at);
CREATE INDEX IF NOT EXISTS idx_assets_campaign ON assets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_revisions_asset ON revisions(asset_id, position);
CREATE INDEX IF NOT EXISTS idx_brand_chunks_brand ON brand_chunks(brand_id);
`;

export function openDatabase(path: string = DEFAULT_DB_PATH): Database.Database {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  if (path !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}
