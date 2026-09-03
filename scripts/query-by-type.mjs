import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const typeIdArg = process.argv[2];
if (!typeIdArg) {
  console.log("👉 使用方法: node scripts/query-by-type.mjs <type_id> [limit]");
  console.log("   例如: node scripts/query-by-type.mjs 45");
  console.log("   例如: node scripts/query-by-type.mjs 51 50");
  process.exit(0);
}

const typeId = parseInt(typeIdArg, 10);
const limit = parseInt(process.argv[3] || "20", 10);

const dbPath = path.join(process.cwd(), "data", "4kvm.db");
const db = new DatabaseSync(dbPath);

const totalResult = db.prepare("SELECT COUNT(*) as count FROM vods WHERE type_id = ?").get(typeId);
const total = Number(totalResult?.count || 0);

console.log(`\n==================================================`);
console.log(`🔍 正在查询 type_id = ${typeId} 的数据`);
console.log(`📊 匹配总记录数: ${total} 部`);
console.log(`📋 当前展示前 ${Math.min(limit, total)} 条 (按更新时间倒序):`);
console.log(`==================================================\n`);

if (total > 0) {
  const rows = db.prepare(`
    SELECT id, name, type_name, sub_type, year, remarks
    FROM vods 
    WHERE type_id = ? 
    ORDER BY updated_at DESC 
    LIMIT ?
  `).all(typeId, limit);

  console.table(rows);
} else {
  console.log("⚠️ 未在数据库中找到 type_id 为 " + typeId + " 的数据。");
}
