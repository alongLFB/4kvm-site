import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "4kvm.db");
console.log(`Connecting to SQLite database: ${dbPath}`);

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = NORMAL;");

const hours = process.env.SYNC_HOURS || "24";

// Upstream MacCMS Standard JSON API Sources
const UPSTREAM_SOURCES = [
  {
    name: "👑 非凡资源专线 (1080P极速)",
    apiUrl: "https://api.ffzyapi.com/api.php/provide/vod/at/json/",
  },
  {
    name: "⚡ 量子资源专线 (1080P秒播)",
    apiUrl: "https://cj.lziapi.com/api.php/provide/vod/at/json/",
  },
];

function mapTypeName(typeName, subTypeName = "") {
  const combined = (typeName + " " + subTypeName).toLowerCase();
  if (combined.includes("动漫") || combined.includes("动画")) return "动漫";
  if (combined.includes("综艺")) return "综艺";
  if (combined.includes("电影") || combined.includes("片") || combined.includes("动作") || combined.includes("科幻") || combined.includes("喜剧") || combined.includes("爱情") || combined.includes("恐怖") || combined.includes("战争")) return "电影";
  return "电视剧";
}

function parseEpisodes(playUrlStr) {
  if (!playUrlStr) return [];
  const episodes = [];
  const items = playUrlStr.split("#");
  for (const item of items) {
    const parts = item.split("$");
    if (parts.length >= 2) {
      episodes.push({
        name: parts[0].trim(),
        url: parts[1].trim(),
      });
    } else if (parts.length === 1 && parts[0].includes("http")) {
      episodes.push({
        name: `第${episodes.length + 1}集`,
        url: parts[0].trim(),
      });
    }
  }
  return episodes;
}

async function fetchUpstreamList(source, h = "24", page = 1) {
  const url = `${source.apiUrl}?ac=videolist&h=${h}&pg=${page}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`Fetch warning from ${source.name} page ${page}:`, err.message);
    return null;
  }
}

async function runSync() {
  console.log(`Starting upstream sync for the last ${hours} hours...`);

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

  let totalUpserted = 0;
  const now = Date.now();

  for (const source of UPSTREAM_SOURCES) {
    console.log(`==> Ingesting from ${source.name}...`);
    let page = 1;
    let pageCount = 1;

    while (page <= pageCount && page <= 5) { // Sync top 5 pages of latest updates
      const data = await fetchUpstreamList(source, hours, page);
      if (!data || !Array.isArray(data.list)) break;

      pageCount = data.pagecount || 1;
      console.log(`  Processing page ${page}/${pageCount} (${data.list.length} items)...`);

      db.exec("BEGIN TRANSACTION;");
      for (const item of data.list) {
        const id = String(item.vod_id || "");
        const name = String(item.vod_name || "");
        const typeName = mapTypeName(item.type_name || "", item.vod_sub || "");
        const subType = String(item.type_name || "");
        const pic = String(item.vod_pic || "");
        const banner = pic;
        const lang = String(item.vod_lang || "国语");
        const area = String(item.vod_area || "大陆");
        const year = String(item.vod_year || "2026");
        const remarks = String(item.vod_remarks || "HD");
        const actor = String(item.vod_actor || "未知演职人员");
        const director = String(item.vod_director || "未知导演");
        const rating = parseFloat(item.vod_score || "0.0") || 0.0;
        const hits = parseInt(item.vod_hits || "1000", 10) || 1000;
        const content = String(item.vod_content || "暂无简介");
        const tags = [typeName, subType, year, "1080P超清"].filter(Boolean);

        // Parse episodes
        const episodes = parseEpisodes(item.vod_play_url || "");
        const sources = [
          {
            sourceName: source.name,
            episodes,
          },
        ];

        insertStmt.run(
          id, name, Number(item.type_id || 1), typeName, subType, pic, banner,
          lang, area, year, remarks, actor, director, rating, hits,
          JSON.stringify(tags), content, JSON.stringify(sources), now, now
        );

        insertFtsStmt.run(id, name, actor, director, tags.join(" "));
        totalUpserted++;
      }
      db.exec("COMMIT;");
      page++;
    }
  }

  const finalTotal = db.prepare("SELECT COUNT(*) as count FROM vods").get()?.count || 0;
  console.log(`✅ Upstream sync finished! Upserted ${totalUpserted} items. Total library count: ${finalTotal}`);
}

runSync().catch(console.error);
