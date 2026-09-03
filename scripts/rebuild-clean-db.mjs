import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

try {
  process.loadEnvFile();
} catch {}

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "4kvm.db");
console.log(`Connecting to SQLite database at: ${dbPath}`);

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = NORMAL;");

console.log("Dropping existing tables and rebuilding clean schema...");
db.exec(`
  DROP TABLE IF EXISTS vods_fts;
  DROP TABLE IF EXISTS vods;

  CREATE TABLE vods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type_id INTEGER DEFAULT 1,
    type_name TEXT NOT NULL,
    sub_type TEXT DEFAULT '',
    pic TEXT DEFAULT '',
    banner TEXT DEFAULT '',
    lang TEXT DEFAULT '',
    area TEXT DEFAULT '',
    year TEXT DEFAULT '',
    remarks TEXT DEFAULT '',
    actor TEXT DEFAULT '',
    director TEXT DEFAULT '',
    rating REAL DEFAULT 0.0,
    hits INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]',
    content TEXT DEFAULT '',
    sources TEXT DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_vods_type_name ON vods(type_name);
  CREATE INDEX IF NOT EXISTS idx_vods_sub_type ON vods(sub_type);
  CREATE INDEX IF NOT EXISTS idx_vods_area ON vods(area);
  CREATE INDEX IF NOT EXISTS idx_vods_lang ON vods(lang);
  CREATE INDEX IF NOT EXISTS idx_vods_year ON vods(year);
  CREATE INDEX IF NOT EXISTS idx_vods_rating ON vods(rating);
  CREATE INDEX IF NOT EXISTS idx_vods_hits ON vods(hits);
  CREATE INDEX IF NOT EXISTS idx_vods_updated_at ON vods(updated_at);

  CREATE VIRTUAL TABLE vods_fts USING fts5(
    id UNINDEXED,
    name,
    actor,
    director,
    tags,
    tokenize = 'trigram'
  );
`);

console.log("✅ Fresh SQLite database and FTS5 index ready!");

// Top Verified Overseas & Global Fast Sources
const SOURCES = [
  {
    prefix: "ikun",
    name: "⚡ iKun 国际专线 (1080P原画秒播)",
    apiUrl: process.env.IKUN_API_BASE || "https://ikunzyapi.com/api.php/provide/vod/from/ikm3u8/at/json/",
    maxPages: 35
  },
  {
    prefix: "gs",
    name: "🚀 光速专线 (1080P蓝光4Mbps)",
    apiUrl: "https://api.guangsuapi.com/api.php/provide/vod/from/gsm3u8/at/json/",
    maxPages: 35
  },
  {
    prefix: "lz",
    name: "🌐 量子专线 (亚太/欧美边缘节点)",
    apiUrl: "https://cj.lziapi.com/api.php/provide/vod/at/json/",
    maxPages: 35
  },
  {
    prefix: "bf",
    name: "🌪️ 暴风专线 (全球高速CDN)",
    apiUrl: "https://bfzyapi.com/api.php/provide/vod/at/json/",
    maxPages: 35
  }
];

function mapTypeName(typeName = "", subTypeName = "") {
  const combined = (typeName + " " + subTypeName).toLowerCase();
  if (combined.includes("动漫") || combined.includes("动画")) return "动漫";
  if (combined.includes("综艺")) return "综艺";
  if (
    combined.includes("电影") ||
    combined.includes("片") ||
    combined.includes("动作") ||
    combined.includes("科幻") ||
    combined.includes("喜剧") ||
    combined.includes("爱情") ||
    combined.includes("恐怖") ||
    combined.includes("战争") ||
    combined.includes("剧情")
  ) {
    return "电影";
  }
  return "电视剧";
}

function parseEpisodes(playUrlStr) {
  if (!playUrlStr) return [];
  const episodes = [];
  const items = playUrlStr.split("#");
  for (const item of items) {
    const parts = item.split("$");
    if (parts.length >= 2) {
      const epName = parts[0].trim();
      const epUrl = parts[1].trim();
      if (epUrl.startsWith("http")) {
        episodes.push({ name: epName, url: epUrl });
      }
    } else if (parts.length === 1 && parts[0].includes("http")) {
      episodes.push({
        name: `第${String(episodes.length + 1).padStart(2, '0')}集`,
        url: parts[0].trim(),
      });
    }
  }
  return episodes;
}

async function fetchPage(apiUrl, page = 1) {
  const url = `${apiUrl}?ac=videolist&pg=${page}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn(`Fetch timeout on page ${page}:`, e.message);
    return null;
  }
}

async function main() {
  console.log("Starting full clean rebuild from top overseas streaming providers...\n");

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO vods (
      id, name, type_id, type_name, sub_type, pic, banner, lang, area, year,
      remarks, actor, director, rating, hits, tags, content, sources, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertFtsStmt = db.prepare(`
    INSERT INTO vods_fts (id, name, actor, director, tags)
    VALUES (?, ?, ?, ?, ?)
  `);

  let totalImported = 0;
  const now = Date.now();

  for (const src of SOURCES) {
    console.log(`\n==============================================`);
    console.log(`==> Ingesting from ${src.name}...`);
    let page = 1;
    let pageCount = src.maxPages;

    while (page <= pageCount) {
      const data = await fetchPage(src.apiUrl, page);
      if (!data || !Array.isArray(data.list) || data.list.length === 0) {
        console.log(`  Finished or no data at page ${page}. Moving to next source.`);
        break;
      }

      if (data.pagecount && data.pagecount < pageCount) {
        pageCount = data.pagecount;
      }

      console.log(`  [${src.prefix}] Page ${page}/${pageCount} - parsing ${data.list.length} items...`);

      db.exec("BEGIN TRANSACTION;");
      for (const item of data.list) {
        const rawName = String(item.vod_name || "").trim();
        if (!rawName) continue;

        const episodes = parseEpisodes(item.vod_play_url || "");
        if (episodes.length === 0) continue;

        const id = `${src.prefix}_${item.vod_id}`;
        const typeName = mapTypeName(item.type_name || "", item.vod_sub || "");
        const subType = String(item.type_name || "热门");
        const pic = String(item.vod_pic || "");
        const banner = pic;
        const lang = String(item.vod_lang || "国语");
        const area = String(item.vod_area || "华语");
        const year = String(item.vod_year || "2026");
        const remarks = String(item.vod_remarks || "1080P原画");
        const actor = String(item.vod_actor || "优秀演员阵容");
        const director = String(item.vod_director || "知名导演");
        const rating = parseFloat(item.vod_score || "9.0") || 9.0;
        const hits = parseInt(item.vod_hits || "1200", 10) || 1200;
        const content = String(item.vod_content || "剧情精彩，敬请观看。");
        const tags = [typeName, subType, year, "1080P超清", area].filter(Boolean);

        const sources = [
          {
            sourceName: src.name,
            episodes,
          },
        ];

        insertStmt.run(
          id, rawName, Number(item.type_id || 1), typeName, subType, pic, banner,
          lang, area, year, remarks, actor, director, rating, hits,
          JSON.stringify(tags), content, JSON.stringify(sources), now, now
        );

        insertFtsStmt.run(id, rawName, actor, director, tags.join(" "));
        totalImported++;
      }
      db.exec("COMMIT;");

      page++;
    }
  }

  const stats = db.prepare(`
    SELECT type_name, COUNT(*) as count 
    FROM vods 
    GROUP BY type_name
  `).all();

  console.log(`\n==============================================`);
  console.log(`🎉 Ingestion Complete! Total fresh videos imported: ${totalImported}`);
  console.log("Category breakdown:");
  for (const row of stats) {
    console.log(`  - ${row.type_name}: ${row.count} items`);
  }
}

main().catch(console.error);
