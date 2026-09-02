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
const SOURCE_NAME = "⚡ iKun 国际专线 (1080P原画秒播)";
const API_URL = "https://ikunzyapi.com/api.php/provide/vod/from/ikm3u8/at/json/";

const EXCLUDE_TYPE_IDS = new Set([5, 56]);

const CATEGORY_MAP = {
  1: { parent: "电影", sub: "电影" },
  6: { parent: "电影", sub: "动作片" },
  7: { parent: "电影", sub: "喜剧片" },
  8: { parent: "电影", sub: "爱情片" },
  9: { parent: "电影", sub: "科幻片" },
  10: { parent: "电影", sub: "恐怖片" },
  11: { parent: "电影", sub: "剧情片" },
  12: { parent: "电影", sub: "战争片" },
  13: { parent: "电影", sub: "惊悚片" },
  14: { parent: "电影", sub: "家庭片" },
  15: { parent: "电影", sub: "古装片" },
  16: { parent: "电影", sub: "历史片" },
  17: { parent: "电影", sub: "悬疑片" },
  18: { parent: "电影", sub: "犯罪片" },
  19: { parent: "电影", sub: "灾难片" },
  20: { parent: "电影", sub: "纪录片" },
  21: { parent: "电影", sub: "短片" },
  22: { parent: "电影", sub: "动画片" },
  2: { parent: "电视剧", sub: "电视剧" },
  23: { parent: "电视剧", sub: "国产剧" },
  24: { parent: "电视剧", sub: "香港剧" },
  25: { parent: "电视剧", sub: "韩国剧" },
  26: { parent: "电视剧", sub: "欧美剧" },
  27: { parent: "电视剧", sub: "台湾剧" },
  28: { parent: "电视剧", sub: "日本剧" },
  29: { parent: "电视剧", sub: "海外剧" },
  30: { parent: "电视剧", sub: "泰国剧" },
  45: { parent: "电视剧", sub: "爽文短剧" },
  3: { parent: "综艺", sub: "综艺" },
  31: { parent: "综艺", sub: "大陆综艺" },
  32: { parent: "综艺", sub: "港台综艺" },
  33: { parent: "综艺", sub: "日韩综艺" },
  34: { parent: "综艺", sub: "欧美综艺" },
  4: { parent: "动漫", sub: "动漫" },
  35: { parent: "动漫", sub: "国产动漫" },
  36: { parent: "动漫", sub: "欧美动漫" },
  37: { parent: "动漫", sub: "日本动漫" },
};

function cleanText(str) {
  if (!str) return "";
  return String(str)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .trim();
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

async function fetchIncrementalList(h = "24", page = 1) {
  const url = `${API_URL}?ac=detail&h=${h}&pg=${page}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`Fetch warning page ${page}:`, err.message);
    return null;
  }
}

async function runSync() {
  console.log(`Starting iKun upstream incremental sync for the last ${hours} hours...`);

  const stmtUpsertVod = db.prepare(`
    INSERT INTO vods (
      id, raw_id, name, sub_name, type_id, type_name, sub_type, pic, banner,
      lang, area, year, remarks, actor, director, rating, hits, tags,
      content, sources, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      sub_name = excluded.sub_name,
      type_id = excluded.type_id,
      type_name = excluded.type_name,
      sub_type = excluded.sub_type,
      pic = excluded.pic,
      banner = excluded.banner,
      lang = excluded.lang,
      area = excluded.area,
      year = excluded.year,
      remarks = excluded.remarks,
      actor = excluded.actor,
      director = excluded.director,
      rating = excluded.rating,
      hits = excluded.hits,
      tags = excluded.tags,
      content = excluded.content,
      sources = excluded.sources,
      updated_at = excluded.updated_at
  `);

  const stmtDeleteFts = db.prepare("DELETE FROM vods_fts WHERE id = ?");
  const stmtInsertFts = db.prepare(`
    INSERT INTO vods_fts (id, name, actor, director, sub_type, tags)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let totalUpserted = 0;
  const now = Date.now();
  let page = 1;
  let pageCount = 1;

  while (page <= pageCount && page <= 20) {
    const data = await fetchIncrementalList(hours, page);
    if (!data || !Array.isArray(data.list)) break;

    pageCount = data.pagecount || 1;
    console.log(`  Processing page ${page}/${pageCount} (${data.list.length} items)...`);

    db.exec("BEGIN TRANSACTION;");
    for (const item of data.list) {
      const typeId = Number(item.type_id || 0);
      if (EXCLUDE_TYPE_IDS.has(typeId)) continue;

      const mapping = CATEGORY_MAP[typeId] || {
        parent: item.type_id_1 === 1 ? "电影" : item.type_id_1 === 2 ? "电视剧" : item.type_id_1 === 3 ? "综艺" : item.type_id_1 === 4 ? "动漫" : "电视剧",
        sub: item.type_name || "其他",
      };

      const rawId = Number(item.vod_id);
      const id = `ikun_${rawId}`;
      const name = String(item.vod_name || "").trim();
      const subName = String(item.vod_sub || "").trim();
      const parentType = mapping.parent;
      const subType = mapping.sub;
      const pic = String(item.vod_pic || "").trim();
      const banner = pic;
      const lang = String(item.vod_lang || "").trim() || "国语";
      const area = String(item.vod_area || "").trim() || "大陆";
      const year = String(item.vod_year || "2026").match(/\d{4}/)?.[0] || "2026";
      const remarks = String(item.vod_remarks || "").trim();
      const actor = cleanText(item.vod_actor);
      const director = cleanText(item.vod_director);
      const rating = Number(item.vod_score || item.vod_douban_score || 8.5);
      const hits = Number(item.vod_hits || 100);
      const content = cleanText(item.vod_content || item.vod_blurb);

      const episodes = parseEpisodes(item.vod_play_url);
      if (episodes.length === 0) continue;

      const sources = JSON.stringify([{ sourceName: SOURCE_NAME, episodes }]);
      const tags = JSON.stringify([parentType, subType, year, area]);

      stmtUpsertVod.run(
        id, rawId, name, subName, typeId, parentType, subType, pic, banner,
        lang, area, year, remarks, actor, director, rating, hits, tags,
        content, sources, now, now
      );

      stmtDeleteFts.run(id);
      stmtInsertFts.run(id, name, actor, director, subType, tags);
      totalUpserted++;
    }
    db.exec("COMMIT;");
    page++;
    await new Promise((r) => setTimeout(r, 350));
  }

  const finalTotal = db.prepare("SELECT COUNT(*) as count FROM vods").get()?.count || 0;
  console.log(`✅ iKun sync finished! Upserted ${totalUpserted} items. Total library count: ${finalTotal}`);
}

runSync().catch(console.error);
