import { getDatabase } from "./db";
import { pinyin } from "pinyin-pro";

export interface SearchIndexItem {
  id: string;
  name: string;
  type_name: string;
  year: string;
  pic: string;
  actor: string;
  remarks: string;
  nameLower: string;
  pinyin: string;
  initials: string;
}

let searchCache: SearchIndexItem[] | null = null;
let isBuilding = false;

export function getSearchIndex(): SearchIndexItem[] {
  if (searchCache) return searchCache;
  if (isBuilding) return [];

  isBuilding = true;
  try {
    const db = getDatabase();
    const rows = db.prepare(
      "SELECT id, name, type_name, year, pic, actor, remarks FROM vods"
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
        type_name: r.type_name,
        year: r.year,
        pic: r.pic,
        actor: r.actor || "",
        remarks: r.remarks || "",
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
 * 智能联想搜索（返回 Top N 结果，支持汉字、全拼、拼音首字母、英文）
 */
export function querySuggestions(query: string, limit = 6): SearchIndexItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const index = getSearchIndex();
  const results: SearchIndexItem[] = [];

  for (let i = 0; i < index.length; i++) {
    const item = index[i];
    if (
      item.nameLower.includes(q) ||
      item.pinyin.includes(q) ||
      item.initials.includes(q)
    ) {
      results.push(item);
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * 匹配拼音命中的影视 ID 列表（用于 /api/vod 或 /search 聚合检索）
 */
export function queryMatchingIds(query: string, max = 200): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const index = getSearchIndex();
  const ids: string[] = [];

  for (let i = 0; i < index.length; i++) {
    const item = index[i];
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
