import { VodItem } from "./types";
import { VOD_DATABASE } from "./data";

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

  let filtered = [...VOD_DATABASE];

  // 1. 板块 / 类型过滤
  if (type && type !== "全部") {
    filtered = filtered.filter(
      (v) =>
        v.type_name === type ||
        v.sub_type === type ||
        (v.tags && v.tags.some((t) => t.includes(type)))
    );
  }

  // 2. 地区过滤
  if (area && area !== "全部") {
    if (area === "大陆") {
      filtered = filtered.filter((v) => v.area.includes("大陆") || v.area.includes("内地") || v.area.includes("中国"));
    } else if (area === "欧美") {
      filtered = filtered.filter((v) => v.area.includes("欧美") || v.area.includes("美国") || v.area.includes("英国") || v.area.includes("加拿大") || v.area.includes("法国") || v.area.includes("德国"));
    } else if (area === "其它") {
      const mainAreas = ["大陆", "内地", "香港", "台湾", "日本", "韩国", "美国", "英国", "欧美", "泰国"];
      filtered = filtered.filter((v) => !mainAreas.some((ma) => v.area.includes(ma)));
    } else {
      filtered = filtered.filter((v) => v.area.includes(area));
    }
  }

  // 3. 语言过滤
  if (lang && lang !== "全部") {
    if (lang === "国语") {
      filtered = filtered.filter((v) => v.lang.includes("国语") || v.lang.includes("普通话") || v.lang.includes("汉语"));
    } else if (lang === "其它") {
      const mainLangs = ["国语", "普通话", "汉语", "粤语", "英语", "韩语", "日语", "泰语"];
      filtered = filtered.filter((v) => !mainLangs.some((ml) => v.lang.includes(ml)));
    } else {
      filtered = filtered.filter((v) => v.lang.includes(lang));
    }
  }

  // 4. 年份过滤
  if (year && year !== "全部") {
    if (year === "今年") {
      filtered = filtered.filter((v) => v.year === "2026");
    } else if (year === "去年") {
      filtered = filtered.filter((v) => v.year === "2025");
    } else if (year === "10年代" || year === "2010年代") {
      filtered = filtered.filter((v) => v.year >= "2010" && v.year <= "2019");
    } else if (year === "00年代" || year === "2000年代") {
      filtered = filtered.filter((v) => v.year >= "2000" && v.year <= "2009");
    } else if (year === "90年代") {
      filtered = filtered.filter((v) => v.year >= "1990" && v.year <= "1999");
    } else if (year === "80年代") {
      filtered = filtered.filter((v) => v.year >= "1980" && v.year <= "1989");
    } else if (year === "更早" || year === "怀旧") {
      filtered = filtered.filter((v) => v.year < "1980");
    } else {
      filtered = filtered.filter((v) => v.year.includes(year));
    }
  }

  // 5. 画质过滤
  if (quality && quality !== "全部") {
    const qLower = quality.toLowerCase();
    filtered = filtered.filter(
      (v) =>
        v.remarks.toLowerCase().includes(qLower) ||
        (v.tags && v.tags.some((t) => t.toLowerCase().includes(qLower)))
    );
  }

  // 6. 状态过滤
  if (status && status !== "全部") {
    if (status === "全集" || status === "完结") {
      filtered = filtered.filter(
        (v) =>
          v.type_name === "电影" ||
          v.remarks.includes("全") ||
          v.remarks.includes("完结") ||
          v.remarks.includes("HD") ||
          v.remarks.includes("BD")
      );
    } else if (status === "连载中" || status === "更新中") {
      filtered = filtered.filter(
        (v) =>
          v.remarks.includes("更新") ||
          v.remarks.includes("第") ||
          v.remarks.includes("连载")
      );
    }
  }

  // 7. 关键词搜索
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    filtered = filtered.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.actor.toLowerCase().includes(q) ||
        v.director.toLowerCase().includes(q) ||
        (v.tags && v.tags.some((t) => t.toLowerCase().includes(q))) ||
        v.content.toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const pagecount = Math.max(1, Math.ceil(total / limit));
  const validPage = Math.min(Math.max(1, page), pagecount);
  const start = (validPage - 1) * limit;
  const list = filtered.slice(start, start + limit);

  return {
    list,
    total,
    page: validPage,
    pagecount,
  };
}

export async function fetchLiveVodDetail(id: string): Promise<VodItem | null> {
  const item = VOD_DATABASE.find((v) => v.id === id);
  if (item) return item;
  return VOD_DATABASE[0] || null;
}