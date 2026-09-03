import { VodItem } from "./types";
import { getDatabase, rowToVodItem } from "./db";
import { queryMatchingIds } from "./search-engine";
import { GATED_CONFIG } from "@/config/gated-sections";

export interface FilterParams {
  type?: string;     // 一级大类: 全部 | 电影 | 电视剧 | 动漫 | 综艺 | 体育
  typeId?: number | string; // 具体分类 ID: 45, 51 等
  subType?: string;  // 二级子类: 剧情片 | 动作片 | 爽文短剧 | 国产剧 | 日本动漫 | NBA 等
  area?: string;     // 地区
  lang?: string;     // 语言
  year?: string;     // 年份: 2026, 2025, 2024, 2010年代 等
  quality?: string;  // 画质
  status?: string;   // 状态: 全集/完结 | 连载中
  sort?: string;     // 排序: "hot" (最高人气) | "latest" (最新上线) | "rating" (最高评分)
  page?: number;
  limit?: number;
  query?: string;
  excludeGated?: boolean; // 是否排除受限专区（未解锁时彻底无痕隐形）
}

export async function fetchLiveVods(params: FilterParams): Promise<{
  list: VodItem[];
  total: number;
  page: number;
  pagecount: number;
}> {
  const {
    type = "全部",
    typeId,
    subType = "全部",
    area = "全部",
    lang = "全部",
    year = "全部",
    quality = "全部",
    status = "全部",
    sort = "hot",
    page = 1,
    limit = 20,
    query = "",
    excludeGated = false,
  } = params;

  const db = getDatabase();
  const conditions: string[] = [];
  const queryParams: any[] = [];

  // 0. 具体分类 ID 过滤 (type_id)
  if (typeId !== undefined && typeId !== null && typeId !== "全部" && typeId !== "") {
    conditions.push("type_id = ?");
    queryParams.push(Number(typeId));
  }

  // 1. 一级大类过滤 (type: 电影 | 电视剧 | 动漫 | 综艺 | 体育)
  if (type && type !== "全部") {
    if (type === "短剧") {
      // 兼容旧版直达入口
      conditions.push("(sub_type LIKE '%短剧%' OR tags LIKE '%短剧%')");
    } else if (type === "纪录片") {
      conditions.push("(sub_type LIKE '%纪录%' OR tags LIKE '%纪录%')");
    } else {
      conditions.push("type_name = ?");
      queryParams.push(type);
    }
  }

  // 2. 二级子类过滤 (subType: 动作片 | 爽文短剧 | 国产剧 | 日本动漫 | NBA 等)
  if (subType && subType !== "全部") {
    // 剥离可能的 emoji (如 "🔥 爽文短剧" -> "爽文短剧")
    const cleanSub = subType.replace(/^[^\w\u4e00-\u9fa5]+/, "").trim();
    conditions.push("(sub_type LIKE ? OR tags LIKE ?)");
    queryParams.push(`%${cleanSub}%`, `%${cleanSub}%`);
  }

  // 3. 地区过滤
  if (area && area !== "全部") {
    if (area === "大陆" || area === "中国大陆") {
      conditions.push("(area LIKE '%大陆%' OR area LIKE '%内地%')");
    } else if (area === "香港" || area === "中国香港") {
      conditions.push("area LIKE '%香港%'");
    } else if (area === "台湾" || area === "中国台湾") {
      conditions.push("area LIKE '%台湾%'");
    } else if (area === "欧美" || area === "欧美/好莱坞" || area === "好莱坞") {
      conditions.push("(area LIKE '%欧美%' OR area LIKE '%美国%' OR area LIKE '%英国%' OR area LIKE '%法国%' OR area LIKE '%德国%' OR area LIKE '%意大利%' OR area LIKE '%加拿大%' OR area LIKE '%西班牙%')");
    } else if (area === "其它") {
      conditions.push("(area NOT LIKE '%大陆%' AND area NOT LIKE '%香港%' AND area NOT LIKE '%台湾%' AND area NOT LIKE '%美国%' AND area NOT LIKE '%英国%' AND area NOT LIKE '%日本%' AND area NOT LIKE '%韩国%' AND area NOT LIKE '%泰国%')");
    } else {
      conditions.push("area LIKE ?");
      queryParams.push(`%${area}%`);
    }
  }

  // 4. 语言过滤
  if (lang && lang !== "全部") {
    if (lang === "国语" || lang === "普通话" || lang === "国语/普通话") {
      conditions.push("(lang LIKE '%国语%' OR lang LIKE '%普通话%' OR lang LIKE '%汉语%')");
    } else if (lang === "其它") {
      conditions.push("(lang NOT LIKE '%国语%' AND lang NOT LIKE '%普通话%' AND lang NOT LIKE '%汉语%' AND lang NOT LIKE '%粤语%' AND lang NOT LIKE '%英语%' AND lang NOT LIKE '%韩语%' AND lang NOT LIKE '%日语%' AND lang NOT LIKE '%泰语%')");
    } else {
      conditions.push("lang LIKE ?");
      queryParams.push(`%${lang}%`);
    }
  }

  // 5. 年份过滤 (精准 4 位纯数字年份 / 2010年代 / 2000年代 / 更早)
  if (year && year !== "全部") {
    if (/^\d{4}$/.test(year)) {
      conditions.push("year = ?");
      queryParams.push(year);
    } else if (year === "2010年代" || year === "10年代") {
      conditions.push("(year >= '2010' AND year <= '2019')");
    } else if (year === "2000年代" || year === "00年代") {
      conditions.push("(year >= '2000' AND year <= '2009')");
    } else if (year === "更早") {
      conditions.push("(year < '2000' AND year != '')");
    } else {
      conditions.push("year = ?");
      queryParams.push(year);
    }
  }

  // 6. 画质过滤
  if (quality && quality !== "全部") {
    conditions.push("(remarks LIKE ? OR tags LIKE ?)");
    queryParams.push(`%${quality}%`, `%${quality}%`);
  }

  // 7. 状态过滤
  if (status && status !== "全部") {
    if (status === "全集" || status === "完结") {
      conditions.push("(type_name = '电影' OR remarks LIKE '%全%' OR remarks LIKE '%完结%' OR remarks LIKE '%HD%' OR remarks LIKE '%BD%')");
    } else if (status === "连载中" || status === "更新中") {
      conditions.push("(remarks LIKE '%更新%' OR remarks LIKE '%第%' OR remarks LIKE '%连载%')");
    }
  }

  // 8. 关键词搜索 (融合内存拼音倒排索引、FTS5 和 LIKE 模糊匹配)
  if (query && query.trim()) {
    const q = query.trim();
    const matchedIds = queryMatchingIds(q, 300, excludeGated);
    if (matchedIds.length > 0) {
      const placeholders = matchedIds.map(() => "?").join(",");
      conditions.push(
        `(id IN (${placeholders}) OR id IN (SELECT id FROM vods_fts WHERE vods_fts MATCH ?) OR name LIKE ? OR actor LIKE ? OR director LIKE ? OR tags LIKE ?)`
      );
      queryParams.push(...matchedIds, `"${q}"*`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    } else {
      conditions.push(
        "(id IN (SELECT id FROM vods_fts WHERE vods_fts MATCH ?) OR name LIKE ? OR actor LIKE ? OR director LIKE ? OR tags LIKE ?)"
      );
      const ftsQuery = `"${q}"*`;
      queryParams.push(ftsQuery, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
  }

  // 9. 专区防护：未解锁时，强制排除受控的一级大类和具体 type_id (彻底无痕隐形)
  if (excludeGated) {
    if (GATED_CONFIG.lockedTypes.length > 0) {
      const typePlaceholders = GATED_CONFIG.lockedTypes.map(() => "?").join(",");
      conditions.push(`type_name NOT IN (${typePlaceholders})`);
      queryParams.push(...GATED_CONFIG.lockedTypes);
    }
    if (GATED_CONFIG.lockedTypeIds.length > 0) {
      const idPlaceholders = GATED_CONFIG.lockedTypeIds.map(() => "?").join(",");
      conditions.push(`type_id NOT IN (${idPlaceholders})`);
      queryParams.push(...GATED_CONFIG.lockedTypeIds);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // 1. Query Total Count
  const countSql = `SELECT COUNT(*) as total FROM vods ${whereClause}`;
  const countStmt = db.prepare(countSql);
  const countResult = (countStmt.get(...queryParams) as any) || { total: 0 };
  const total = Number(countResult.total || 0);

  // 2. Query Paginated List with dynamic Sort
  const pagecount = Math.max(1, Math.ceil(total / limit));
  const validPage = Math.min(Math.max(1, page), pagecount);
  const offset = (validPage - 1) * limit;

  let orderBy = "ORDER BY hits DESC, rating DESC";
  if (sort === "latest") {
    orderBy = "ORDER BY year DESC, updated_at DESC, hits DESC";
  } else if (sort === "rating") {
    orderBy = "ORDER BY rating DESC, hits DESC";
  } else if (sort === "hot") {
    orderBy = "ORDER BY hits DESC, rating DESC";
  }

  const listSql = `SELECT * FROM vods ${whereClause} ${orderBy} LIMIT ? OFFSET ?`;
  const listStmt = db.prepare(listSql);
  const rows = listStmt.all(...queryParams, limit, offset) as any[];

  const list = rows.map(rowToVodItem);

  return {
    list,
    total,
    page: validPage,
    pagecount,
  };
}

export async function fetchLiveVodDetail(id: string): Promise<VodItem | null> {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM vods WHERE id = ? LIMIT 1");
  const row = stmt.get(id);
  if (row) {
    return rowToVodItem(row);
  }
  // Fallback to first item if not found
  const fallbackStmt = db.prepare("SELECT * FROM vods ORDER BY hits DESC LIMIT 1");
  const fallbackRow = fallbackStmt.get();
  return fallbackRow ? rowToVodItem(fallbackRow) : null;
}
