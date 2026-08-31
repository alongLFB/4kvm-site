import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "4kvm.db");
console.log(`Checking SQLite database at: ${dbPath}`);

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = NORMAL;");

// Initialize tables if not existing
db.exec(`
CREATE TABLE IF NOT EXISTS vods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type_id INTEGER,
  type_name TEXT,
  sub_type TEXT,
  pic TEXT,
  banner TEXT,
  lang TEXT,
  area TEXT,
  year TEXT,
  remarks TEXT,
  actor TEXT,
  director TEXT,
  rating REAL DEFAULT 0,
  hits INTEGER DEFAULT 0,
  tags TEXT,
  content TEXT,
  sources TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_vods_type ON vods(type_name);
CREATE INDEX IF NOT EXISTS idx_vods_sub_type ON vods(sub_type);
CREATE INDEX IF NOT EXISTS idx_vods_area ON vods(area);
CREATE INDEX IF NOT EXISTS idx_vods_lang ON vods(lang);
CREATE INDEX IF NOT EXISTS idx_vods_year ON vods(year);
CREATE INDEX IF NOT EXISTS idx_vods_rating ON vods(rating DESC);
CREATE INDEX IF NOT EXISTS idx_vods_hits ON vods(hits DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS vods_fts USING fts5(
  id UNINDEXED,
  name,
  actor,
  director,
  tags,
  tokenize = 'unicode61'
);
`);

const total = db.prepare("SELECT COUNT(*) as count FROM vods").get()?.count || 0;
console.log(`Database is ready. Total records: ${total}`);
