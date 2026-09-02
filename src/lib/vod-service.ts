import { VodItem } from "./types";
import { getDatabase, rowToVodItem } from "./db";

export interface FilterParams {
  type?: string;
  area?: string;
  lang?: string;
  year?: string;
  quality?: string;
  status?: string;
  page?: number;
  limit?: number;
  query?: string;
}

export async function fetchLiveVods(params: FilterParams): Promise<{
  list: VodItem[];
  total: number;
  page: number;
  pagecount: number;
}> {
  const {
    type = "全部",
    area = "全部",
    lang = "全部",
    year = "全部",
    quality = "全部",
    status = "全部",
    page = 1,
    limit = 20,
    query = "",
  } = params;

  const db = getDatabase();
  const conditions: string[] = [];
  const queryParams: any[] = [];

  // 1. 板块 / 类型过滤
  if (type && type !== "全部") {
    if (type === "短剧") {
      conditions.push("(sub_type LIKE '%短剧%' OR tags LIKE '%短剧%')");
    } else if (type === "纪录片") {
      conditions.push("(sub_type LIKE '%纪录%' OR sub_type LIKE '%记录%' OR tags LIKE '%纪录%' OR tags LIKE '%记录%')");
    } else {
      conditions.push("(type_name = ? OR sub_type = ? OR tags LIKE ?)");
      queryParams.push(type, type, `%${type}%`);
    }
  }

  // 2. 地区过滤
  if (area && area !== "全部") {
    if (area === "大陆") {
      conditions.push("(area LIKE '%大陆%' OR area LIKE '%内地%' OR area LIKE '%中国%')");
    } else if (area === "欧美") {
      conditions.push("(area LIKE '%欧美%' OR area LIKE '%美国%' OR area LIKE '%英国%' OR area LIKE '%加拿大%' OR area LIKE '%法国%' OR area LIKE '%德国%')");
    } else if (area === "其它") {
      conditions.push("(area NOT LIKE '%大陆%' AND area NOT LIKE '%内地%' AND area NOT LIKE '%香港%' AND area NOT LIKE '%台湾%' AND area NOT LIKE '%日本%' AND area NOT LIKE '%韩国%' AND area NOT LIKE '%美国%' AND area NOT LIKE '%英国%' AND area NOT LIKE '%欧美%' AND area NOT LIKE '%泰国%')");
    } else {
      conditions.push("area LIKE ?");
      queryParams.push(`%${area}%`);
    }
  }

  // 3. 语言过滤
  if (lang && lang !== "全部") {
    if (lang === "国语") {
      conditions.push("(lang LIKE '%国语%' OR lang LIKE '%普通话%' OR lang LIKE '%汉语%')");
    } else if (lang === "其它") {
      conditions.push("(lang NOT LIKE '%国语%' AND lang NOT LIKE '%普通话%' AND lang NOT LIKE '%汉语%' AND lang NOT LIKE '%粤语%' AND lang NOT LIKE '%英语%' AND lang NOT LIKE '%韩语%' AND lang NOT LIKE '%日语%' AND lang NOT LIKE '%泰语%')");
    } else {
      conditions.push("lang LIKE ?");
      queryParams.push(`%${lang}%`);
    }
  }

  // 4. 年份过滤
  if (year && year !== "全部") {
    if (year === "今年") {
      conditions.push("year = '2026'");
    } else if (year === "去年") {
      conditions.push("year = '2025'");
    } else if (year === "10年代" || year === "2010年代") {
      conditions.push("(year >= '2010' AND year <= '2019')");
    } else if (year === "00年代" || year === "2000年代") {
      conditions.push("(year >= '2000' AND year <= '2009')");
    } else if (year === "90年代") {
      conditions.push("(year >= '1990' AND year <= '1999')");
    } else if (year === "80年代") {
      conditions.push("(year >= '1980' AND year <= '1989')");
    } else if (year === "更早" || year === "怀旧") {
      conditions.push("year < '1980'");
    } else {
      conditions.push("year LIKE ?");
      queryParams.push(`%${year}%`);
    }
  }

  // 5. 画质过滤
  if (quality && quality !== "全部") {
    conditions.push("(remarks LIKE ? OR tags LIKE ?)");
    queryParams.push(`%${quality}%`, `%${quality}%`);
  }

  // 6. 状态过滤
  if (status && status !== "全部") {
    if (status === "全集" || status === "完结") {
      conditions.push("(type_name = '电影' OR remarks LIKE '%全%' OR remarks LIKE '%完结%' OR remarks LIKE '%HD%' OR remarks LIKE '%BD%')");
    } else if (status === "连载中" || status === "更新中") {
      conditions.push("(remarks LIKE '%更新%' OR remarks LIKE '%第%' OR remarks LIKE '%连载%')");
    }
  }

  // 7. 关键词搜索 (同时利用 FTS5 和 LIKE 模糊匹配)
  if (query && query.trim()) {
    const q = query.trim();
    conditions.push("(id IN (SELECT id FROM vods_fts WHERE vods_fts MATCH ?) OR name LIKE ? OR actor LIKE ? OR director LIKE ? OR tags LIKE ?)");
    // Format query for FTS5 prefix match
    const ftsQuery = `"${q}"*`;
    queryParams.push(ftsQuery, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // 1. Query Total Count
  const countSql = `SELECT COUNT(*) as total FROM vods ${whereClause}`;
  const countStmt = db.prepare(countSql);
  const countResult = (countStmt.get(...queryParams) as any) || { total: 0 };
  const total = Number(countResult.total || 0);

  // 2. Query Paginated List
  const pagecount = Math.max(1, Math.ceil(total / limit));
  const validPage = Math.min(Math.max(1, page), pagecount);
  const offset = (validPage - 1) * limit;

  const listSql = `SELECT * FROM vods ${whereClause} ORDER BY hits DESC, rating DESC LIMIT ? OFFSET ?`;
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
