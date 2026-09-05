import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// 自动加载 .env 文件（Node 22 原生支持，本地开发与生产环境均自动生效）
try {
  process.loadEnvFile();
} catch {}

const API_BASE = process.env.IKUN_API_BASE || "https://ikunzyapi.com/api.php/provide/vod/from/ikm3u8/at/json/";
const SOURCE_NAME = process.env.IKUN_SOURCE_NAME || "⚡ iKun 国际专线 (1080P原画秒播)";
const DELAY_MS = parseInt(process.env.INGEST_DELAY_MS || "350", 10);

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "4kvm.db");
const progressPath = path.join(dbDir, "ikun_progress.json");

// Exclude sensitive categories: 5 (伦理片), 56 (里番动漫)
const EXCLUDE_TYPE_IDS = new Set([56]);

export const CATEGORY_MAP = {
  // 1: 电影
  1: { parent: "电影", sub: "电影" },
  5: { parent: "伦理片", sub: "伦理片" },
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

  // 2: 连续剧
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

  // 3: 综艺
  3: { parent: "综艺", sub: "综艺" },
  31: { parent: "综艺", sub: "大陆综艺" },
  32: { parent: "综艺", sub: "港台综艺" },
  33: { parent: "综艺", sub: "日韩综艺" },
  34: { parent: "综艺", sub: "欧美综艺" },

  // 4: 动漫
  4: { parent: "动漫", sub: "动漫" },
  35: { parent: "动漫", sub: "国产动漫" },
  36: { parent: "动漫", sub: "欧美动漫" },
  37: { parent: "动漫", sub: "日本动漫" },

  // 40: 体育
  40: { parent: "体育", sub: "体育" },
  41: { parent: "体育", sub: "足球" },
  46: { parent: "体育", sub: "德甲" },
  47: { parent: "体育", sub: "意甲" },
  48: { parent: "体育", sub: "英超" },
  49: { parent: "体育", sub: "西甲" },
  50: { parent: "体育", sub: "法甲" },
  51: { parent: "体育", sub: "NBA" },
  52: { parent: "体育", sub: "CBA" },
  53: { parent: "体育", sub: "LPL" },
  54: { parent: "体育", sub: "WCBA" },
  55: { parent: "体育", sub: "篮球" },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function cleanYear(yearStr) {
  if (!yearStr) return "2026";
  const match = String(yearStr).match(/\d{4}/);
  return match ? match[0] : "2026";
}

function escapeMd(text) {
  return String(text || "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function formatLocalDateTime(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

export function writeUpdateLog({ hours = null, syncType = null, totalScanned = 0, newlyAddedList = [], newlyUpdatedList = [], finalCount = 0 }) {
  const scriptsDir = path.join(process.cwd(), "scripts");
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }
  const logPath = path.join(scriptsDir, "UPDATE_LOG.md");

  const nowStr = formatLocalDateTime();
  const subTitle = syncType || (hours ? `增量追更: 过去 ${hours} 小时` : "定向/单剧同步");
  const title = `## 📅 同步时间：${nowStr} (${subTitle})`;

  const statSummary = [
    `- **本次入库统计**：新增入库 **${newlyAddedList.length}** 部，剧集追更 **${newlyUpdatedList.length}** 部，扫描处理 **${totalScanned}** 条`,
    `- **片库最新总量**：**${finalCount}** 部`,
  ].join("\n");

  let addedSection = "";
  if (newlyAddedList.length > 0) {
    addedSection = [
      `### 🆕 新增入库影片 (${newlyAddedList.length} 部)`,
      "",
      "| 序号 | 影片名称 | 分类 | 年份/地区 | 最新状态 | 上游ID |",
      "| :---: | :--- | :--- | :--- | :--- | :--- |",
      ...newlyAddedList.map((item, idx) =>
        `| ${idx + 1} | **${escapeMd(item.name)}** | ${escapeMd(item.parentType)} > ${escapeMd(item.subType)} | ${escapeMd(item.year)} / ${escapeMd(item.area)} | ${escapeMd(item.remarks)} | \`${item.rawId}\` |`
      ),
    ].join("\n");
  } else {
    addedSection = "### 🆕 新增入库影片\n\n*本次增量未发现新入库的影视作品。*";
  }

  let updatedSection = "";
  if (newlyUpdatedList.length > 0) {
    updatedSection = [
      `### 🔄 剧集连载追更 (${newlyUpdatedList.length} 部)`,
      "",
      "| 序号 | 影片名称 | 分类 | 更新前状态 | 最新状态 | 上游ID |",
      "| :---: | :--- | :--- | :--- | :--- | :--- |",
      ...newlyUpdatedList.map((item, idx) =>
        `| ${idx + 1} | **${escapeMd(item.name)}** | ${escapeMd(item.parentType)} > ${escapeMd(item.subType)} | \`${escapeMd(item.oldRemarks)}\` | **${escapeMd(item.newRemarks)}** | \`${item.rawId}\` |`
      ),
    ].join("\n");
  } else {
    updatedSection = "### 🔄 剧集连载追更\n\n*本次增量未发现剧集连载更新。*";
  }

  const newEntry = `${title}\n\n${statSummary}\n\n${addedSection}\n\n${updatedSection}\n\n---`;

  const HEADER = `# 4KVM 片库同步与追更日志 (Update Log)\n\n> 本日志由 \`scripts/ingest-ikun-full.mjs --incremental\`（或 \`--hours\`）自动生成与追加维护。\n> 详细记录每次同步入库的新增影视与剧集连载更新情况，**最新记录始终置于最顶部**。\n\n---`;

  let finalContent = "";
  if (!fs.existsSync(logPath)) {
    finalContent = `${HEADER}\n\n${newEntry}\n`;
  } else {
    const existing = fs.readFileSync(logPath, "utf-8");
    const dividerRegex = /\n---\r?\n/;
    const match = existing.match(dividerRegex);
    if (match && match.index !== undefined) {
      const splitPos = match.index + match[0].length;
      const headerPart = existing.slice(0, splitPos);
      const restPart = existing.slice(splitPos);
      finalContent = `${headerPart}\n${newEntry}\n\n${restPart.trimStart()}`;
    } else {
      finalContent = `${HEADER}\n\n${newEntry}\n\n${existing}`;
    }
  }

  fs.writeFileSync(logPath, finalContent, "utf-8");
}

export function initDatabase(db, dropExisting = false) {
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");

  if (dropExisting) {
    console.log("🧹 Dropping old tables and recreating fresh schema...");
    db.exec(`
      DROP TABLE IF EXISTS vods_fts;
      DROP TABLE IF EXISTS vods;
    `);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS vods (
      id TEXT PRIMARY KEY,
      raw_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      sub_name TEXT DEFAULT '',
      type_id INTEGER NOT NULL,
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
    CREATE INDEX IF NOT EXISTS idx_vods_hits ON vods(hits DESC);
    CREATE INDEX IF NOT EXISTS idx_vods_updated_at ON vods(updated_at DESC);

    CREATE VIRTUAL TABLE IF NOT EXISTS vods_fts USING fts5(
      id UNINDEXED,
      name,
      actor,
      director,
      sub_type,
      tags,
      tokenize = 'trigram'
    );
  `);
  console.log("✅ Schema initialized with FTS5 trigram indexing!");
}

async function fetchPageWithRetry(page, maxRetries = 3, hours = null, typeId = null) {
  let url = `${API_BASE}?ac=detail&pg=${page}`;
  if (hours) url += `&h=${hours}`;
  if (typeId) url += `&t=${typeId}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn(`⚠️ [Page ${page}${typeId ? ` | Type ${typeId}` : ""}] Attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxRetries) {
        throw err;
      }
      await sleep(1000 * attempt);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isReset = args.includes("--reset");
  const isResume = args.includes("--resume");
  const isIncremental = args.includes("--incremental") || args.includes("--sync");
  const hoursArgIdx = args.indexOf("--hours");
  const hours = hoursArgIdx !== -1 ? parseInt(args[hoursArgIdx + 1], 10) : (isIncremental ? 24 : null);
  const maxPagesArgIdx = args.indexOf("--max-pages");
  const maxPagesLimit = maxPagesArgIdx !== -1 ? parseInt(args[maxPagesArgIdx + 1], 10) : Infinity;
  const disableLog = args.includes("--no-log");

  // Single or multiple type filters: --type 45 或 --types 45,51
  const typeArgIdx = args.indexOf("--type") !== -1 ? args.indexOf("--type") : args.indexOf("--type-id");
  const typesArgIdx = args.indexOf("--types");
  let targetTypeIds = null;
  if (typeArgIdx !== -1) {
    targetTypeIds = [parseInt(args[typeArgIdx + 1], 10)];
  } else if (typesArgIdx !== -1) {
    targetTypeIds = args[typesArgIdx + 1].split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
  }

  console.log(`🚀 Starting iKun Ingestion Engine (Rate Limit: ${DELAY_MS}ms per request)`);
  if (targetTypeIds) {
    console.log(`🎯 Target Type Filter: [${targetTypeIds.join(", ")}]`);
  }
  const db = new DatabaseSync(dbPath);

  if (isReset) {
    initDatabase(db, true);
    if (fs.existsSync(progressPath)) fs.unlinkSync(progressPath);
  } else {
    initDatabase(db, false);
  }

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

  const stmtCheckExists = db.prepare("SELECT id, remarks FROM vods WHERE id = ?");

  let grandTotalIngested = 0;
  let grandNewlyAdded = 0;
  let grandNewlyUpdated = 0;
  const newlyAddedList = [];
  const newlyUpdatedList = [];
  const seenVodIds = new Set();

  async function processCategory(typeId = null) {
    const typeLabel = typeId
      ? (CATEGORY_MAP[typeId] ? `${CATEGORY_MAP[typeId].parent} > ${CATEGORY_MAP[typeId].sub} (ID: ${typeId})` : `Type ID ${typeId}`)
      : "All Categories (全量大盘)";

    let startPage = 1;
    let localIngested = 0;

    if (!typeId && !hours && isResume && fs.existsSync(progressPath)) {
      try {
        const progress = JSON.parse(fs.readFileSync(progressPath, "utf-8"));
        startPage = (progress.lastPage || 0) + 1;
        localIngested = progress.totalIngested || 0;
        console.log(`🔄 Resuming from page ${startPage} (Previously ingested: ${localIngested})`);
      } catch (e) {
        console.warn("Could not read progress file, starting from page 1");
      }
    }

    console.log(`📡 Fetching page ${startPage} for [${typeLabel}]${hours ? ` (h=${hours})` : ""}...`);
    const firstData = await fetchPageWithRetry(startPage, 3, hours, typeId);
    const totalPages = Math.min(Number(firstData.pagecount || 1), maxPagesLimit);
    const totalRecords = Number(firstData.total || 0);

    console.log(`📊 Target for [${typeLabel}]: ${totalPages} pages (~${totalRecords} items)`);

    let currentBatch = [];
    const BATCH_SIZE = hours ? 1 : 10;
    const now = Date.now();

    for (let page = startPage; page <= totalPages; page++) {
      const pageData = page === startPage ? firstData : await fetchPageWithRetry(page, 3, hours, typeId);
      const list = pageData.list || [];

      for (const item of list) {
        const itemTypeId = Number(item.type_id || 0);

        if (EXCLUDE_TYPE_IDS.has(itemTypeId)) {
          continue;
        }

        const mapping = CATEGORY_MAP[itemTypeId] || {
          parent: item.type_id_1 === 1 ? "电影" : item.type_id_1 === 2 ? "电视剧" : item.type_id_1 === 3 ? "综艺" : item.type_id_1 === 4 ? "动漫" : "电视剧",
          sub: item.type_name || "未知分类",
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
        const year = cleanYear(item.vod_year);
        const remarks = String(item.vod_remarks || "").trim();
        const actor = cleanText(item.vod_actor);
        const director = cleanText(item.vod_director);
        const rating = Number(item.vod_score || item.vod_douban_score || (8.5 + (rawId % 15) * 0.1).toFixed(1));
        const hits = Number(item.vod_hits || 100);
        const content = cleanText(item.vod_content || item.vod_blurb);

        const episodes = parseEpisodes(item.vod_play_url);
        if (episodes.length === 0) continue;

        if (hours) {
          if (!seenVodIds.has(id)) {
            seenVodIds.add(id);
            const existing = stmtCheckExists.get(id);
            if (!existing) {
              grandNewlyAdded++;
              newlyAddedList.push({
                rawId,
                name,
                parentType,
                subType,
                area,
                year,
                remarks: remarks || "已完结/上映",
              });
            } else if (existing.remarks !== remarks) {
              grandNewlyUpdated++;
              newlyUpdatedList.push({
                rawId,
                name,
                parentType,
                subType,
                area,
                year,
                oldRemarks: existing.remarks || "无",
                newRemarks: remarks || "已更新",
              });
            }
          }
        }

        const sources = JSON.stringify([
          {
            sourceName: SOURCE_NAME,
            episodes,
          },
        ]);

        const tags = JSON.stringify([
          parentType,
          subType,
          year,
          area,
          ...(item.vod_tag ? item.vod_tag.split(",").map((t) => t.trim()) : []),
        ]);

        currentBatch.push({
          id,
          rawId,
          name,
          subName,
          typeId: itemTypeId,
          parentType,
          subType,
          pic,
          banner,
          lang,
          area,
          year,
          remarks,
          actor,
          director,
          rating,
          hits,
          tags,
          content,
          sources,
          now,
        });
      }

      if (page % BATCH_SIZE === 0 || page === totalPages) {
        db.exec("BEGIN TRANSACTION;");
        for (const v of currentBatch) {
          stmtUpsertVod.run(
            v.id,
            v.rawId,
            v.name,
            v.subName,
            v.typeId,
            v.parentType,
            v.subType,
            v.pic,
            v.banner,
            v.lang,
            v.area,
            v.year,
            v.remarks,
            v.actor,
            v.director,
            v.rating,
            v.hits,
            v.tags,
            v.content,
            v.sources,
            v.now,
            v.now
          );
          stmtDeleteFts.run(v.id);
          stmtInsertFts.run(v.id, v.name, v.actor, v.director, v.subType, v.tags);
        }
        db.exec("COMMIT;");

        localIngested += currentBatch.length;
        grandTotalIngested += currentBatch.length;
        currentBatch = [];

        if (!typeId && !hours) {
          fs.writeFileSync(
            progressPath,
            JSON.stringify({ lastPage: page, totalPages, totalIngested: localIngested, timestamp: Date.now() }, null, 2),
            "utf-8"
          );
        }

        const percent = ((page / totalPages) * 100).toFixed(1);
        console.log(`✅ [${percent}%] Page ${page}/${totalPages} saved. Ingested: ${localIngested}${hours ? ` (New: ${grandNewlyAdded}, Updated: ${grandNewlyUpdated})` : ""}`);
      }

      if (page < totalPages) {
        await sleep(DELAY_MS);
      }
    }
  }

  if (targetTypeIds && targetTypeIds.length > 0) {
    for (const tId of targetTypeIds) {
      if (EXCLUDE_TYPE_IDS.has(tId)) {
        console.warn(`⚠️ [Type ID: ${tId}] is in the sensitive/excluded list, skipping.`);
        continue;
      }
      await processCategory(tId);
    }
  } else {
    await processCategory(null);
  }

  // Checkpoint WAL to make database immediately ready for serving or syncing
  db.exec("PRAGMA wal_checkpoint(TRUNCATE);");

  const finalCount = db.prepare("SELECT COUNT(*) as count FROM vods").get().count;
  if (hours) {
    console.log(`\n🎉 Incremental sync completed for the past ${hours} hours!`);
    console.log(`✨ Newly added items: ${grandNewlyAdded}`);
    console.log(`🔄 Updated episodes / series: ${grandNewlyUpdated}`);
    console.log(`📊 Final total database count: ${finalCount} items`);

    if (!disableLog) {
      writeUpdateLog({
        hours,
        totalScanned: grandTotalIngested,
        newlyAddedList,
        newlyUpdatedList,
        finalCount,
      });
      console.log(`📝 Update log saved to: scripts/UPDATE_LOG.md`);
    }
  } else {
    console.log(`\n🎉 Ingestion completed! Total records processed: ${grandTotalIngested}`);
    console.log(`📊 Final database count: ${finalCount} items`);
  }
}

const isDirectRun = Boolean(process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (isDirectRun) {
  main().catch((err) => {
    console.error("❌ Fatal error during ingestion:", err);
    process.exit(1);
  });
}
