import path from "node:path";
import fs from "node:fs";
import { getDatabase } from "./db";
import { pinyin } from "pinyin-pro";
import { isItemGated } from "@/config/gated-sections";

export interface SearchIndexItem {
  id: string;
  name: string;
  type_id: number;
  type_name: string;
  year: string;
  pic: string;
  actor: string;
  remarks: string;
  hits: number;
  nameLower: string;
  pinyin: string;
  initials: string;
}

let searchCache: SearchIndexItem[] | null = null;
let lastDbMtime = 0;
let isBuilding = false;

export function getSearchIndex(): SearchIndexItem[] {
  const dbDir = path.join(process.cwd(), "data");
  const dbPath = path.join(dbDir, "4kvm.db");

  // 自动检测数据库文件 mtime 更新（如外部增量脚本入库后自动刷新内存缓存）
  try {
    if (fs.existsSync(dbPath)) {
      const mtime = fs.statSync(dbPath).mtimeMs;
      if (lastDbMtime > 0 && mtime !== lastDbMtime) {
        searchCache = null;
      }
      lastDbMtime = mtime;
    }
  } catch (e) {
    // 忽略文件读取异常
  }

  if (searchCache) return searchCache;
  if (isBuilding) return [];

  isBuilding = true;
  try {
    const db = getDatabase();
    // 优先按热度降序构建，保证常用/高频影视在排序中权重更高
    const rows = db.prepare(
      "SELECT id, name, type_id, type_name, year, pic, actor, remarks, hits FROM vods ORDER BY hits DESC"
    ).all() as any[];

    searchCache = rows.map((r) => {
      const name = r.name || "";
      const nameLower = name.toLowerCase();
      const fullPinyin = pinyin(name, {
        toneType: "none",
        separator: "",
        v: true,
      }).toLowerCase();
      const initials = pinyin(name, {
        pattern: "first",
        toneType: "none",
        separator: "",
      }).toLowerCase();

      return {
        id: r.id,
        name: r.name,
        type_id: Number(r.type_id || 0),
        type_name: r.type_name,
        year: r.year,
        pic: r.pic,
        actor: r.actor || "",
        remarks: r.remarks || "",
        hits: Number(r.hits || 0),
        nameLower,
        pinyin: fullPinyin,
        initials,
      };
    });
  } catch (err) {
    console.error("Failed to build search cache:", err);
  } finally {
    isBuilding = false;
  }

  return searchCache || [];
}

/**
 * 刷新缓存（在增量入库后调用）
 */
export function invalidateSearchIndex() {
  searchCache = null;
}

/**
 * 智能联想搜索（返回 Top N 结果，支持汉字、全拼、拼音首字母、英文，支持无痕过滤受限专区）
 */
export function querySuggestions(query: string, limit = 6, excludeGated = false): SearchIndexItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const index = getSearchIndex();
  const scoredItems: { item: SearchIndexItem; score: number }[] = [];

  for (let i = 0; i < index.length; i++) {
    const item = index[i];
    if (excludeGated && isItemGated(item)) {
      continue;
    }

    let score = 0;
    if (item.nameLower === q) {
      score = 2000;
    } else if (item.nameLower.startsWith(q)) {
      score = 1000;
    } else if (item.nameLower.includes(q)) {
      score = 500;
    } else if (item.initials.startsWith(q)) {
      score = 300;
    } else if (item.pinyin.startsWith(q)) {
      score = 250;
    } else if (item.initials.includes(q)) {
      score = 150;
    } else if (item.pinyin.includes(q)) {
      score = 100;
    }

    if (score > 0) {
      scoredItems.push({
        item,
        score: score + Math.min(item.hits, 999) * 0.1,
      });
    }
  }

  // 按得分由高到低排序
  scoredItems.sort((a, b) => b.score - a.score);
  const results: SearchIndexItem[] = scoredItems.slice(0, limit).map((s) => s.item);

  // 兜底保障：若结果数量不足，直接查一次数据库补全（针对刚增量入库且内存可能尚未加载的冷门或最新影视）
  if (results.length < limit) {
    try {
      const db = getDatabase();
      const existingIds = new Set(results.map((r) => r.id));
      const dbRows = db.prepare(
        "SELECT id, name, type_id, type_name, year, pic, actor, remarks, hits FROM vods WHERE name LIKE ? ORDER BY hits DESC LIMIT ?"
      ).all(`%${q}%`, limit * 2) as any[];

      for (const row of dbRows) {
        if (existingIds.has(row.id)) continue;
        const dbItem: SearchIndexItem = {
          id: row.id,
          name: row.name,
          type_id: Number(row.type_id || 0),
          type_name: row.type_name,
          year: row.year,
          pic: row.pic,
          actor: row.actor || "",
          remarks: row.remarks || "",
          hits: Number(row.hits || 0),
          nameLower: (row.name || "").toLowerCase(),
          pinyin: "",
          initials: "",
        };
        if (excludeGated && isItemGated(dbItem)) continue;
        results.push(dbItem);
        if (results.length >= limit) break;
      }
    } catch (e) {
      // 容错处理
    }
  }

  return results;
}

/**
 * 匹配拼音命中的影视 ID 列表（用于 /api/vod 或 /search 聚合检索，支持无痕过滤受限专区）
 */
export function queryMatchingIds(query: string, max = 200, excludeGated = false): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const index = getSearchIndex();
  const ids: string[] = [];

  for (let i = 0; i < index.length; i++) {
    const item = index[i];
    if (excludeGated && isItemGated(item)) {
      continue;
    }
    if (
      item.nameLower.includes(q) ||
      item.pinyin.includes(q) ||
      item.initials.includes(q)
    ) {
      ids.push(item.id);
      if (ids.length >= max) break;
    }
  }

  return ids;
}
