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

export function cleanField(str: any): string {
  if (!str) return "";
  return String(str)
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => {
      const num = parseInt(code, 10);
      return !isNaN(num) ? String.fromCharCode(num) : _;
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => {
      const num = parseInt(code, 16);
      return !isNaN(num) ? String.fromCharCode(num) : _;
    })
    .replace(/&amp;/g, "&") // 兜底双重实体转义 (如 &amp;amp;)
    .trim();
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

  return {
    id: String(row.id || ""),
    name: cleanField(row.name),
    type_id: Number(row.type_id || 0),
    type_name: cleanField(row.type_name) as any,
    sub_type: cleanField(row.sub_type),
    pic: String(row.pic || "").trim(),
    banner: String(row.banner || "").trim(),
    lang: cleanField(row.lang),
    area: cleanField(row.area),
    year: cleanField(row.year),
    remarks: cleanField(row.remarks),
    actor: cleanField(row.actor),
    director: cleanField(row.director),
    rating: Number(row.rating || 0),
    hits: Number(row.hits || 0),
    tags: Array.isArray(tags) ? tags.map(cleanField).filter(Boolean) : [],
    content: cleanField(row.content),
    sources,
  };
}

