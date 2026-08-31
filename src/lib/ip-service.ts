const ipCache = new Map<string, string>();

const COUNTRY_MAP: Record<string, string> = {
  AE: "阿联酋",
  CN: "中国",
  US: "美国",
  GB: "英国",
  JP: "日本",
  KR: "韩国",
  SG: "新加坡",
  DE: "德国",
  FR: "法国",
  HK: "中国香港",
  TW: "中国台湾",
  MO: "中国澳门",
  RU: "俄罗斯",
  CA: "加拿大",
  AU: "澳大利亚",
  MY: "马来西亚",
  TH: "泰国",
  IN: "印度",
  VN: "越南",
  PH: "菲律宾",
  ID: "印度尼西亚",
  NL: "荷兰",
  IT: "意大利",
  ES: "西班牙",
};

const CITY_MAP: Record<string, string> = {
  "Abu Dhabi": "阿布扎比",
  "Dubai": "迪拜",
  "Sharjah": "沙迦",
  "Ajman": "阿治曼",
  "Beijing": "北京",
  "Shanghai": "上海",
  "Guangzhou": "广州",
  "Shenzhen": "深圳",
  "Hangzhou": "杭州",
  "Chengdu": "成都",
  "Wuhan": "武汉",
  "Nanjing": "南京",
  "Chongqing": "重庆",
  "Tianjin": "天津",
  "Xi'an": "西安",
  "Changsha": "长沙",
  "Zhengzhou": "郑州",
  "Suzhou": "苏州",
  "Dongguan": "东莞",
  "Foshan": "佛山",
  "Xiamen": "厦门",
  "Fuzhou": "福州",
  "Qingdao": "青岛",
  "Jinan": "济南",
  "Hefei": "合肥",
  "Kunming": "昆明",
  "Dalian": "大连",
  "Shenyang": "沈阳",
  "Harbin": "哈尔滨",
  "Changchun": "长春",
  "Nanning": "南宁",
  "Guiyang": "贵阳",
  "Haikou": "海口",
  "Sanya": "三亚",
  "Urumqi": "乌鲁木齐",
  "Lanzhou": "兰州",
  "Yinchuan": "银川",
  "Xining": "西宁",
  "Lhasa": "拉萨",
  "Hohhot": "呼和浩特",
  "Taiyuan": "太原",
  "Shijiazhuang": "石家庄",
  "Nanchang": "南昌",
  "Wuxi": "无锡",
  "Ningbo": "宁波",
  "Wenzhou": "温州",
  "Hong Kong": "香港",
  "Macao": "澳门",
  "Macau": "澳门",
  "Taipei": "台北",
  "Tokyo": "东京",
  "Osaka": "大阪",
  "Seoul": "首尔",
  "Singapore": "新加坡",
  "London": "伦敦",
  "New York": "纽约",
  "Los Angeles": "洛杉矶",
  "San Francisco": "旧金山",
  "Seattle": "西雅图",
  "Chicago": "芝加哥",
  "Frankfurt": "法兰克福",
  "Paris": "巴黎",
  "Sydney": "悉尼",
  "Melbourne": "墨尔本",
  "Toronto": "多伦多",
  "Vancouver": "温哥华",
};

export function getClientIp(request: Request): string {
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map((i) => i.trim()).filter(Boolean);
    for (const ip of ips) {
      if (
        !ip.startsWith("127.") &&
        !ip.startsWith("192.168.") &&
        !ip.startsWith("10.") &&
        !ip.startsWith("172.16.") &&
        !ip.startsWith("172.17.") &&
        !ip.startsWith("172.18.") &&
        !ip.startsWith("172.19.") &&
        !ip.startsWith("172.20.") &&
        !ip.startsWith("172.21.") &&
        !ip.startsWith("172.22.") &&
        !ip.startsWith("172.23.") &&
        !ip.startsWith("172.24.") &&
        !ip.startsWith("172.25.") &&
        !ip.startsWith("172.26.") &&
        !ip.startsWith("172.27.") &&
        !ip.startsWith("172.28.") &&
        !ip.startsWith("172.29.") &&
        !ip.startsWith("172.30.") &&
        !ip.startsWith("172.31.") &&
        ip !== "::1"
      ) {
        return ip;
      }
    }
    return ips[0];
  }

  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();

  return "127.0.0.1";
}

export function maskIp(ip: string): string {
  if (!ip || ip === "127.0.0.1" || ip === "::1") return "127.0.0.*";

  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:****:****::*`;
    }
    return `${ip.slice(0, 8)}::*`;
  }

  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }

  return ip;
}

export function formatTwoTierLocation(country: string, region: string, city: string): string {
  country = (country || "中国")
    .replace("阿拉伯联合酋长国", "阿联酋")
    .replace("中华人民共和国", "中国")
    .replace("United Arab Emirates", "阿联酋")
    .replace("China", "中国")
    .replace(/^📍\s*/, "")
    .trim();

  let secondTier = "";

  if (city && region) {
    let cleanCity = city.replace(/市|自治州|地区|特别行政区/g, "").trim();
    let cleanRegion = region.replace(/省|自治区|特别行政区|酋長國|酋长国/g, "").trim();

    cleanCity = CITY_MAP[cleanCity] || cleanCity;
    cleanRegion = CITY_MAP[cleanRegion] || cleanRegion;

    if (cleanCity === cleanRegion || cleanCity.includes(cleanRegion) || cleanRegion.includes(cleanCity)) {
      secondTier = cleanCity;
    } else {
      secondTier = `${cleanRegion} ${cleanCity}`.trim();
    }
  } else if (city) {
    let cleanCity = city.replace(/市|自治州|地区|特别行政区/g, "").trim();
    secondTier = CITY_MAP[cleanCity] || cleanCity;
  } else if (region) {
    let cleanRegion = region.replace(/省|自治区|特别行政区|酋長國|酋长国/g, "").trim();
    secondTier = CITY_MAP[cleanRegion] || cleanRegion;
  }

  if (!secondTier || secondTier === country) {
    if (country === "中国") return "中国 · 核心节点";
    return `${country} · 本地`;
  }

  return `${country} · ${secondTier}`;
}

export async function resolveIpLocation(ip: string, headers?: Headers): Promise<string> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.16.")) {
    return "本地局域网";
  }

  if (ipCache.has(ip)) {
    return ipCache.get(ip)!;
  }

  // 1. Check Cloudflare Geo Headers
  if (headers) {
    const countryCode = (headers.get("cf-ipcountry") || "").toUpperCase();
    const city = headers.get("cf-ipcity") || "";
    const countryName = COUNTRY_MAP[countryCode] || countryCode;
    if (countryName && city) {
      const loc = formatTwoTierLocation(countryName, "", city);
      ipCache.set(ip, loc);
      return loc;
    }
  }

  // 2. Query HTTPS ipwho.is
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`https://ipwho.is/${ip}?lang=zh-CN`, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        let country = data.country || "";
        const city = data.city || "";
        const region = data.region || "";

        const loc = formatTwoTierLocation(country, region, city);
        ipCache.set(ip, loc);
        return loc;
      }
    }
  } catch (e) {}

  // 3. Fallback: Query HTTPS freeipapi.com
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`https://freeipapi.com/api/json/${ip}`, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const countryCode = (data.countryCode || "").toUpperCase();
      const country = COUNTRY_MAP[countryCode] || data.countryName || "";
      const city = data.cityName || "";
      const region = data.regionName || "";

      const loc = formatTwoTierLocation(country, region, city);
      ipCache.set(ip, loc);
      return loc;
    }
  } catch (e) {}

  return "中国 · 综合节点";
}
