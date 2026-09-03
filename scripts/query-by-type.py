import sys
import os
import sqlite3

# Fix Windows console UTF-8 output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

if len(sys.argv) < 2:
    print("👉 使用方法: python scripts/query-by-type.py <type_id> [limit]")
    print("   例如: python scripts/query-by-type.py 45 10  (查询爽文短剧前10条)")
    print("   例如: python scripts/query-by-type.py 51 10  (查询NBA前10条)")
    sys.exit(0)

type_id = int(sys.argv[1])
limit = int(sys.argv[2]) if len(sys.argv) > 2 else 20

db_path = os.path.join(os.getcwd(), "data", "4kvm.db")
if not os.path.exists(db_path):
    print(f"❌ 找不到数据库文件: {db_path}")
    sys.exit(1)

con = sqlite3.connect(db_path)
cur = con.cursor()

cur.execute("SELECT COUNT(*) FROM vods WHERE type_id = ?", (type_id,))
total = cur.fetchone()[0]

print(f"\n==================================================")
print(f"🔍 正在查询 type_id = {type_id} 的数据")
print(f"📊 匹配总记录数: {total} 部")
print(f"📋 当前展示前 {min(limit, total)} 条 (按更新时间倒序):")
print(f"==================================================\n")

if total > 0:
    cur.execute("""
        SELECT id, name, type_name, sub_type, year, remarks
        FROM vods 
        WHERE type_id = ? 
        ORDER BY updated_at DESC 
        LIMIT ?
    """, (type_id, limit))

    rows = cur.fetchall()
    header = f"{'序号':<4} | {'ID':<12} | {'片名':<30} | {'大类':<6} | {'子类':<10} | {'年份':<6} | {'状态':<8}"
    print(header)
    print("-" * 85)
    for idx, r in enumerate(rows, 1):
        name = r[1][:26] + ".." if len(r[1]) > 26 else r[1]
        print(f"{idx:<4} | {r[0]:<12} | {name:<30} | {r[2]:<6} | {r[3]:<10} | {r[4]:<6} | {r[5]:<8}")
else:
    print(f"⚠️ 未在数据库中找到 type_id 为 {type_id} 的数据。")
