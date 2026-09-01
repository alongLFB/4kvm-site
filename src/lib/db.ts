import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { VodItem } from "./types";

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dbDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, "4kvm.db");
  const db = new DatabaseSync(dbPath);

  // WAL Mode for high performance concurrent reads
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");

  dbInstance = db;
  return db;
}

export function rowToVodItem(row: any): VodItem {
  if (!row) return null as any;
  let tags: string[] = [];
  let sources: any[] = [];

  try {
    tags = typeof row.tags === "string" ? JSON.parse(row.tags) : row.tags || [];
  } catch (e) {
    tags = [];
  }

  try {
    sources = typeof row.sources === "string" ? JSON.parse(row.sources) : row.sources || [];
  } catch (e) {
    sources = [];
  }

  // Strip any raw HTML tags (e.g. <p>, </p>, <br>) and unescape entities from upstream data
  const rawContent = String(row.content || "");
  const cleanContent = rawContent
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .trim();

  return {
    id: String(row.id || ""),
    name: String(row.name || ""),
    type_id: Number(row.type_id || 0),
    type_name: String(row.type_name || ""),
    sub_type: String(row.sub_type || ""),
    pic: String(row.pic || ""),
    banner: String(row.banner || ""),
    lang: String(row.lang || ""),
    area: String(row.area || ""),
    year: String(row.year || ""),
    remarks: String(row.remarks || ""),
    actor: String(row.actor || ""),
    director: String(row.director || ""),
    rating: Number(row.rating || 0),
    hits: Number(row.hits || 0),
    tags,
    content: cleanContent,
    sources,
  };
}
