import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { writeUpdateLog } from "./ingest-ikun-full.mjs";

// 自动加载 .env
try {
  process.loadEnvFile();
} catch {}

const API_BASE = process.env.IKUN_API_BASE || "https://ikunzyapi.com/api.php/provide/vod/from/ikm3u8/at/json/";
const SOURCE_NAME = process.env.IKUN_SOURCE_NAME || "⚡ iKun 国际专线 (1080P原画秒播)";

const dbPath = path.join(process.cwd(), "data", "4kvm.db");

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

async function fetchUpstreamDetailById(rawId) {
  const url = `${API_BASE}?ac=detail&ids=${rawId}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  const list = data.list || [];
  return list.length > 0 ? list[0] : null;
}

async function fetchUpstreamDetailByName(name) {
  const url = `${API_BASE}?ac=detail&wd=${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  const list = data.list || [];
  return list.length > 0 ? list[0] : null;
}

async function main() {
  const args = process.argv.slice(2);
  const isForce = args.includes("--force");
  const shouldSync = args.includes("--sync") || isForce;
  const queryArg = args.find((a) => !a.startsWith("--"));

  if (!queryArg) {
    console.log(`
👉 使用方法:
   node scripts/check-update.mjs <raw_id 或 片名> [--sync]

📌 示例:
   node scripts/check-update.mjs 15952                  # 按 Raw ID 查询斗破苍穹年番
   node scripts/check-update.mjs 斗破苍穹年番           # 按片名直接查询
   node scripts/check-update.mjs 15952 --sync           # 查到更新后直接同步入库
`);
    process.exit(0);
  }

  if (!fs.existsSync(dbPath)) {
    console.error(`❌ 本地数据库文件不存在: ${dbPath}`);
    process.exit(1);
  }

  const db = new DatabaseSync(dbPath);

  const isNumeric = /^\d+$/.test(queryArg);
  let localItem = null;

  if (isNumeric) {
    const rawId = parseInt(queryArg, 10);
    localItem = db.prepare("SELECT * FROM vods WHERE raw_id = ?").get(rawId);
  } else {
    localItem = db.prepare("SELECT * FROM vods WHERE name = ? OR name LIKE ? LIMIT 1").get(queryArg, `%${queryArg}%`);
  }

  console.log(`\n======================================================`);
  console.log(`🔍 正在查询影视剧集更新状态: [${queryArg}]`);
  console.log(`======================================================\n`);

  // 1. 显示本地数据库状态
  let localEpCount = 0;
  let localLastEpName = "无";
  if (localItem) {
    let sources = [];
    try {
      sources = JSON.parse(localItem.sources || "[]");
    } catch {}
    const episodes = sources[0]?.episodes || [];
    localEpCount = episodes.length;
    localLastEpName = episodes[episodes.length - 1]?.name || "无";

    const updateTimeStr = localItem.updated_at ? new Date(localItem.updated_at).toLocaleString() : "未知";

    console.log(`📦【本地数据库状态】`);
    console.log(`   - 影片名称: ${localItem.name}`);
    console.log(`   - 视频 Raw ID: ${localItem.raw_id} (系统 ID: ${localItem.id})`);
    console.log(`   - 状态说明: ${localItem.remarks || "无"}`);
    console.log(`   - 播放列表: 共 ${localEpCount} 个分集 (包含正片至 ${localLastEpName}，及特别篇/预告)`);
    console.log(`   - 分类归属: ${localItem.type_name} > ${localItem.sub_type}`);
    console.log(`   - 入库时间: ${updateTimeStr}\n`);
  } else {
    console.log(`⚠️【本地数据库状态】: 未找到匹配记录 (本地片库暂未收录)\n`);
  }

  // 2. 实时查询上游 iKun API 状态
  const targetRawId = localItem ? localItem.raw_id : (isNumeric ? parseInt(queryArg, 10) : null);
  console.log(`📡 正在连接上游 iKun 资源站获取实时数据...`);

  let upstreamItem = null;
  try {
    if (targetRawId) {
      upstreamItem = await fetchUpstreamDetailById(targetRawId);
    }
    if (!upstreamItem && !isNumeric) {
      upstreamItem = await fetchUpstreamDetailByName(queryArg);
    }
  } catch (err) {
    console.error(`❌ 上游接口请求失败: ${err.message}`);
    process.exit(1);
  }

  if (!upstreamItem) {
    console.log(`⚠️【上游资源站】: 未找到对应的影片数据 (ID: ${queryArg})`);
    return;
  }

  const upstreamEpisodes = parseEpisodes(upstreamItem.vod_play_url);
  const upstreamEpCount = upstreamEpisodes.length;
  const upstreamLastEpName = upstreamEpisodes[upstreamEpCount - 1]?.name || "无";
  const upstreamRemarks = String(upstreamItem.vod_remarks || "").trim();
  const upstreamTime = upstreamItem.vod_time || "未知";

  console.log(`🌐【上游 iKun 实时状态】`);
  console.log(`   - 影片名称: ${upstreamItem.vod_name}`);
  console.log(`   - 视频 Raw ID: ${upstreamItem.vod_id}`);
  console.log(`   - 状态说明: ${upstreamRemarks}`);
  console.log(`   - 播放列表: 共 ${upstreamEpCount} 个分集 (包含正片至 ${upstreamLastEpName}，及特别篇/预告)`);
  console.log(`   - 上游更新时间: ${upstreamTime}\n`);

  // 3. 对比分析
  console.log(`------------------------------------------------------`);
  console.log(`📊【对比结论】:`);

  const hasNewEpisodes = upstreamEpCount > localEpCount;
  const remarksChanged = localItem && localItem.remarks !== upstreamRemarks;
  const hasUpdate = !localItem || hasNewEpisodes || remarksChanged || isForce;

  if (!localItem) {
    console.log(`   ✨ 发现新片可入库！本地暂未收录，上游已有 ${upstreamEpCount} 个分集。`);
  } else if (hasNewEpisodes || remarksChanged) {
    console.log(`   🚀 发现新更新！`);
    if (remarksChanged) {
      console.log(`      状态变化: [${localItem.remarks}] ➔ [${upstreamRemarks}]`);
    }
    if (hasNewEpisodes) {
      console.log(`      集数变化: 本地 ${localEpCount} 集 ➔ 上游 ${upstreamEpCount} 集 (新增 ${upstreamEpCount - localEpCount} 集)`);
      console.log(`      最新集名: ${upstreamLastEpName}`);
    }
  } else {
    console.log(`   ✅ 暂无新更新，本地片库已与上游完全一致！`);
    console.log(`      - 本地：状态【${localItem.remarks}】，分集共 ${localEpCount} 个 (最新: ${localLastEpName})`);
    console.log(`      - 上游：状态【${upstreamRemarks}】，分集共 ${upstreamEpCount} 个 (最新: ${upstreamLastEpName})`);
  }
  console.log(`------------------------------------------------------\n`);

  // 4. 同步入库处理
  if (hasUpdate && shouldSync) {
    console.log(`⚡ 正在执行单片同步入库...`);
    const id = `ikun_${upstreamItem.vod_id}`;
    const rawId = Number(upstreamItem.vod_id);
    const name = String(upstreamItem.vod_name || "").trim();
    const subName = String(upstreamItem.vod_sub || "").trim();
    const parentType = upstreamItem.type_id_1 === 1 ? "电影" : upstreamItem.type_id_1 === 4 ? "动漫" : upstreamItem.type_id_1 === 3 ? "综艺" : "电视剧";
    const subType = upstreamItem.type_name || "未知分类";
    const pic = String(upstreamItem.vod_pic || "").trim();
    const banner = pic;
    const lang = String(upstreamItem.vod_lang || "").trim() || "国语";
    const area = String(upstreamItem.vod_area || "").trim() || "大陆";
    const year = cleanYear(upstreamItem.vod_year);
    const remarks = upstreamRemarks;
    const actor = cleanText(upstreamItem.vod_actor);
    const director = cleanText(upstreamItem.vod_director);
    const rating = Number(upstreamItem.vod_score || upstreamItem.vod_douban_score || 8.8);
    const hits = Number(upstreamItem.vod_hits || 100);
    const content = cleanText(upstreamItem.vod_content || upstreamItem.vod_blurb);
    const now = Date.now();

    const sources = JSON.stringify([
      {
        sourceName: SOURCE_NAME,
        episodes: upstreamEpisodes,
      },
    ]);

    const tags = JSON.stringify([
      parentType,
      subType,
      year,
      area,
      ...(upstreamItem.vod_tag ? upstreamItem.vod_tag.split(",").map((t) => t.trim()) : []),
    ]);

    db.exec("BEGIN TRANSACTION;");
    const stmtUpsertVod = db.prepare(`
      INSERT INTO vods (
        id, raw_id, name, sub_name, type_id, type_name, sub_type, pic, banner,
        lang, area, year, remarks, actor, director, rating, hits, tags,
        content, sources, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

    stmtUpsertVod.run(
      id,
      rawId,
      name,
      subName,
      Number(upstreamItem.type_id || 0),
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
      now
    );

    db.prepare("DELETE FROM vods_fts WHERE id = ?").run(id);
    db.prepare("INSERT INTO vods_fts (id, name, actor, director, sub_type, tags) VALUES (?, ?, ?, ?, ?, ?)").run(
      id,
      name,
      actor,
      director,
      subType,
      tags
    );

    db.exec("COMMIT;");
    db.exec("PRAGMA wal_checkpoint(TRUNCATE);");

    const finalCount = db.prepare("SELECT COUNT(*) as count FROM vods").get().count;
    writeUpdateLog({
      syncType: `单剧同步: ${name}`,
      totalScanned: 1,
      newlyAddedList: !localItem
        ? [
            {
              rawId,
              name,
              parentType,
              subType,
              area,
              year,
              remarks: upstreamRemarks,
            },
          ]
        : [],
      newlyUpdatedList: localItem
        ? [
            {
              rawId,
              name,
              parentType,
              subType,
              oldRemarks: localItem.remarks || "无",
              newRemarks: upstreamRemarks,
            },
          ]
        : [],
      finalCount,
    });

    console.log(`🎉 影片 [${name}] 同步入库成功！已更新至最新 ${upstreamRemarks}（共 ${upstreamEpCount} 集）。`);
    console.log(`📝 更新日志已追加保存至: scripts/UPDATE_LOG.md\n`);
  } else if (hasUpdate && !shouldSync) {
    console.log(`💡 提示: 您可以添加 --sync 参数直接将本片同步至本地数据库:`);
    console.log(`   node scripts/check-update.mjs ${queryArg} --sync\n`);
  }
}

main().catch((err) => {
  console.error("❌ 查询出错:", err);
  process.exit(1);
});
