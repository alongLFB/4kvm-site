import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { cleanText, decodeHtmlEntities, fetchDoubanIntro, isContentTruncated } from "./ingest-ikun-full.mjs";

const dbPath = path.join(process.cwd(), "data", "4kvm.db");
console.log(`🔧 Connecting to SQLite database: ${dbPath}`);
const db = new DatabaseSync(dbPath);

async function repair() {
  console.log("🔍 Scanning for records with HTML entities (&amp;, &#, &quot;, etc.)...");

  // 1. 只查询含有实体的记录，极速修复
  const entityRecords = db.prepare(`
    SELECT id, raw_id, name, sub_name, remarks, actor, director, content
    FROM vods
    WHERE name LIKE '%&%'
       OR sub_name LIKE '%&%'
       OR remarks LIKE '%&%'
       OR actor LIKE '%&%'
       OR director LIKE '%&%'
       OR content LIKE '%&%'
  `).all();

  console.log(`📊 Found ${entityRecords.length} records possibly containing HTML entities.`);

  const stmtUpdateVod = db.prepare(`
    UPDATE vods SET
      name = ?,
      sub_name = ?,
      remarks = ?,
      actor = ?,
      director = ?,
      content = ?,
      updated_at = ?
    WHERE id = ?
  `);

  const stmtDeleteFts = db.prepare("DELETE FROM vods_fts WHERE id = ?");
  const stmtInsertFts = db.prepare(`
    INSERT INTO vods_fts (id, name, actor, director, sub_type, tags)
    SELECT id, name, actor, director, sub_type, tags FROM vods WHERE id = ?
  `);

  db.exec("BEGIN TRANSACTION;");

  let fixedEntities = 0;
  for (const item of entityRecords) {
    const rawName = item.name || "";
    const cleanName = cleanText(rawName);
    const cleanSubName = cleanText(item.sub_name || "");
    const cleanRemarks = cleanText(item.remarks || "");
    const cleanActor = cleanText(item.actor || "");
    const cleanDirector = cleanText(item.director || "");
    const cleanContent = cleanText(item.content || "");

    if (
      cleanName !== rawName ||
      cleanSubName !== (item.sub_name || "") ||
      cleanRemarks !== (item.remarks || "") ||
      cleanActor !== (item.actor || "") ||
      cleanDirector !== (item.director || "") ||
      cleanContent !== (item.content || "")
    ) {
      fixedEntities++;
      if (rawName.includes("&amp;") || rawName.includes("&#") || rawName.includes("&quot;")) {
        console.log(`  ✨ [Entity Clean] ${item.id}: "${rawName}" ➔ "${cleanName}"`);
      }

      stmtUpdateVod.run(
        cleanName,
        cleanSubName,
        cleanRemarks,
        cleanActor,
        cleanDirector,
        cleanContent,
        Date.now(),
        item.id
      );

      stmtDeleteFts.run(item.id);
      stmtInsertFts.run(item.id);
    }
  }

  db.exec("COMMIT;");
  console.log(`✅ Cleaned entities for ${fixedEntities} records.`);

  // 2. 方案 B 验证与补全：针对 ikun_69945 触发豆瓣自动剧情补全
  console.log("\n🎬 Testing Scheme B Douban enrichment for ikun_69945...");
  const targetItem = db.prepare("SELECT id, raw_id, name, content FROM vods WHERE id = 'ikun_69945'").get();
  if (targetItem) {
    console.log(`   当前片名: "${targetItem.name}"`);
    console.log(`   当前剧情字数: ${targetItem.content.length} 字 (以 "${targetItem.content.slice(-10)}" 结尾)`);
    console.log(`   是否属于残缺梗概 (isContentTruncated): ${isContentTruncated(targetItem.content)}`);

    // 从上游取得 douban_id
    const apiUrl = `https://ikunzyapi.com/api.php/provide/vod/from/ikm3u8/at/json/?ac=detail&ids=${targetItem.raw_id}`;
    const res = await fetch(apiUrl);
    const data = await res.json();
    const doubanId = Number(data.list?.[0]?.vod_douban_id || 0);
    console.log(`   获取到上游豆瓣 ID: ${doubanId}`);

    if (doubanId > 0 && isContentTruncated(targetItem.content)) {
      console.log(`   🌐 正在从豆瓣自动拉取完整剧情简介...`);
      const doubanIntro = await fetchDoubanIntro(doubanId);
      if (doubanIntro && doubanIntro.length > targetItem.content.length) {
        db.exec("BEGIN TRANSACTION;");
        db.prepare("UPDATE vods SET content = ?, updated_at = ? WHERE id = 'ikun_69945'").run(
          doubanIntro,
          Date.now()
        );
        db.exec("COMMIT;");
        console.log(`   🎉 成功将剧情简介增强为豆瓣完整版 (${doubanIntro.length} 字)！`);
      }
    }
  }

  const finalTarget = db.prepare("SELECT id, name, content FROM vods WHERE id = 'ikun_69945'").get();
  console.log("\n========================================");
  console.log("🎯 最终数据确认 (ikun_69945):");
  console.log("   - 片名:", finalTarget?.name);
  console.log("   - 剧情梗概完整预览:\n", finalTarget?.content);
  console.log("========================================\n");
}

repair().catch((err) => {
  console.error("❌ 修复失败:", err);
  try {
    db.exec("ROLLBACK;");
  } catch {}
});
