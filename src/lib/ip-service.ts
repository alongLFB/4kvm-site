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
  BR: "巴西",
  SA: "沙特阿拉伯",
  TR: "土耳其",
  ZA: "南非",
  NZ: "新西兰",
  CH: "瑞士",
  SE: "瑞典",
  NO: "挪威",
  FI: "芬兰",
  DK: "丹麦",
  IE: "爱尔兰",
  BE: "比利时",
  AT: "奥地利",
  PL: "波兰",
  MX: "墨西哥",
  AR: "阿根廷",
  CL: "智利",
  EG: "埃及",
  QA: "卡塔尔",
  KW: "科威特",
  OM: "阿曼",
  BH: "巴林",

  // English & Alias Country Mappings
  "United Arab Emirates": "阿联酋",
  "阿拉伯联合酋长国": "阿联酋",
  "United States": "美国",
  "United States of America": "美国",
  "USA": "美国",
  "China": "中国",
  "People's Republic of China": "中国",
  "中华人民共和国": "中国",
  "South Korea": "韩国",
  "Republic of Korea": "韩国",
  "Korea": "韩国",
  "Japan": "日本",
  "United Kingdom": "英国",
  "Great Britain": "英国",
  "UK": "英国",
  "Germany": "德国",
  "Deutschland": "德国",
  "France": "法国",
  "Canada": "加拿大",
  "Australia": "澳大利亚",
  "Singapore": "新加坡",
  "Hong Kong": "中国香港",
  "Macau": "中国澳门",
  "Macao": "中国澳门",
  "Taiwan": "中国台湾",
  "Oman": "阿曼",
  "Saudi Arabia": "沙特阿拉伯",
  "Russia": "俄罗斯",
  "Russian Federation": "俄罗斯",
  "Netherlands": "荷兰",
  "Italy": "意大利",
  "Spain": "西班牙",
  "Brazil": "巴西",
  "India": "印度",
  "Thailand": "泰国",
  "Malaysia": "马来西亚",
  "Vietnam": "越南",
  "Indonesia": "印度尼西亚",
  "Philippines": "菲律宾",
};

const PROVINCE_MAP: Record<string, string> = {
  // China Provinces & Municipalities
  "Beijing": "北京",
  "Shanghai": "上海",
  "Tianjin": "天津",
  "Chongqing": "重庆",
  "Guangdong": "广东",
  "Zhejiang": "浙江",
  "Jiangsu": "江苏",
  "Shandong": "山东",
  "Sichuan": "四川",
  "Hubei": "湖北",
  "Hunan": "湖南",
  "Henan": "河南",
  "Hebei": "河北",
  "Fujian": "福建",
  "Anhui": "安徽",
  "Shaanxi": "陕西",
  "Liaoning": "辽宁",
  "Jilin": "吉林",
  "Heilongjiang": "黑龙江",
  "Jiangxi": "江西",
  "Guangxi": "广西",
  "Guizhou": "贵州",
  "Yunnan": "云南",
  "Hainan": "海南",
  "Shanxi": "山西",
  "Inner Mongolia": "内蒙古",
  "Nei Mongol": "内蒙古",
  "Gansu": "甘肃",
  "Qinghai": "青海",
  "Ningxia": "宁夏",
  "Xinjiang": "新疆",
  "Tibet": "西藏",
  "Xizang": "西藏",
  "Hong Kong": "香港",
  "Macau": "澳门",
  "Macao": "澳门",
  "Taiwan": "台湾",

  // UAE Emirates & ISO-3166-2 Codes
  "Dubai": "迪拜",
  "Abu Dhabi": "阿布扎比",
  "Sharjah": "沙迦",
  "Ajman": "阿治曼",
  "Ras Al Khaimah": "拉斯海马",
  "Fujairah": "富查伊拉",
  "Umm Al Quwain": "乌姆盖万",
  "AZ": "阿布扎比",
  "DU": "迪拜",
  "SH": "沙迦",
  "AJ": "阿治曼",
  "RK": "拉斯海马",
  "FU": "富查伊拉",
  "UQ": "乌姆盖万",
  "阿布達比": "阿布扎比",
  "阿布達比酋長國": "阿布扎比",
  "杜拜": "迪拜",
  "沙迦酋長國": "沙迦",

  // US States & ISO Codes
  "California": "加利福尼亚",
  "CA": "加利福尼亚",
  "New York": "纽约",
  "NY": "纽约",
  "Texas": "德克萨斯",
  "TX": "德克萨斯",
  "Washington": "华盛顿",
  "WA": "华盛顿",
  "Illinois": "伊利诺伊",
  "IL": "伊利诺伊",
  "Florida": "佛罗里达",
  "FL": "佛罗里达",
  "Virginia": "弗吉尼亚",
  "VA": "弗吉尼亚",
  "Massachusetts": "马萨诸塞",
  "MA": "马萨诸塞",
  "New Jersey": "新泽西",
  "NJ": "新泽西",
  "Ohio": "俄亥俄",
  "OH": "俄亥俄",
  "Georgia": "佐治亚",
  "GA": "佐治亚",
  "North Carolina": "北卡罗来纳",
  "NC": "北卡罗来纳",
  "Michigan": "密歇根",
  "MI": "密歇根",
  "Colorado": "科罗拉多",
  "CO": "科罗拉多",
  "Arizona": "亚利桑那",
  "Oregon": "俄勒冈",
  "OR": "俄勒冈",

  // Japan & Others
  "Tokyo": "东京",
  "東京都": "东京",
  "Osaka": "大阪",
  "大阪府": "大阪",
  "Kanagawa": "神奈川",
  "Aichi": "爱知",
  "Kyoto": "京都",
  "京都府": "京都",
  "Seoul": "首尔",
  "首爾": "首尔",
  "Gyeonggi-do": "京畿道",
  "Busan": "釜山",
  "Singapore": "新加坡",
  "London": "伦敦",
  "England": "英格兰",
  "Ontario": "安大略",
  "British Columbia": "不列颠哥伦比亚",
  "New South Wales": "新南威尔士",
  "Victoria": "维多利亚",
  "Bavaria": "巴伐利亚",
  "Hesse": "黑森",
  "馬斯喀特": "马斯喀特",
};

const CITY_MAP: Record<string, string> = {
  // UAE & Middle East Cities
  "Dubai": "迪拜",
  "Abu Dhabi": "阿布扎比",
  "Sharjah": "沙迦",
  "Ajman": "阿治曼",
  "Al Ain": "艾因",
  "阿布達比": "阿布扎比",
  "杜拜": "迪拜",
  "沙迦": "沙迦",
  "馬斯喀特": "马斯喀特",
  "Muscat": "马斯喀特",

  // China Major Cities
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
  "Jinhua": "金华",
  "Shaoxing": "绍兴",
  "Jiaxing": "嘉兴",
  "Huzhou": "湖州",
  "Taizhou": "台州",
  "Quanzhou": "泉州",
  "Zhuhai": "珠海",
  "Zhongshan": "中山",
  "Huizhou": "惠州",
  "Jiangmen": "江门",
  "Shantou": "汕头",
  "Zhanjiang": "湛江",
  "Yantai": "烟台",
  "Weifang": "潍坊",
  "Zibo": "淄博",
  "Linyi": "临沂",
  "Luoyang": "洛阳",
  "Xiangyang": "襄阳",
  "Yichang": "宜昌",
  "Zhuzhou": "株洲",
  "Xiangtan": "湘潭",
  "Mianyang": "绵阳",
  "Nanchong": "南充",
  "Yibin": "宜宾",
  "Hong Kong": "香港",
  "Macao": "澳门",
  "Macau": "澳门",
  "Taipei": "台北",
  "Kaohsiung": "高雄",
  "Taichung": "台中",
  "Tainan": "台南",

  // International Cities
  "Tokyo": "东京",
  "Osaka": "大阪",
  "Nagoya": "名古屋",
  "Kyoto": "京都",
  "Fukuoka": "福冈",
  "Sapporo": "札幌",
  "Yokohama": "横滨",
  "Seoul": "首尔",
  "Incheon": "仁川",
  "Busan": "釜山",
  "Singapore": "新加坡",
  "London": "伦敦",
  "Manchester": "曼彻斯特",
  "Birmingham": "伯明翰",
  "New York": "纽约",
  "Los Angeles": "洛杉矶",
  "San Francisco": "旧金山",
  "San Jose": "圣何塞",
  "Seattle": "西雅图",
  "Chicago": "芝加哥",
  "Houston": "休斯敦",
  "Dallas": "达拉斯",
  "Austin": "奥斯汀",
  "Miami": "迈阿密",
  "Boston": "波士顿",
  "Frankfurt": "法兰克福",
  "Berlin": "柏林",
  "Munich": "慕尼黑",
  "Hamburg": "汉堡",
  "Paris": "巴黎",
  "Marseille": "马赛",
  "Lyon": "里昂",
  "Sydney": "悉尼",
  "Melbourne": "墨尔本",
  "Brisbane": "布里斯班",
  "Perth": "珀斯",
  "Toronto": "多伦多",
  "Vancouver": "温哥华",
  "Montreal": "蒙特利尔",
  "Calgary": "卡尔加里",
  "Bangkok": "曼谷",
  "Kuala Lumpur": "吉隆坡",
  "Jakarta": "雅加达",
  "Manila": "马尼拉",
  "Ho Chi Minh City": "胡志明市",
  "Hanoi": "河内",
  "Amsterdam": "阿姆斯特丹",
  "Rotterdam": "鹿特丹",
  "Madrid": "马德里",
  "Barcelona": "巴塞罗那",
  "Rome": "罗马",
  "Milan": "米兰",
  "Moscow": "莫斯科",
  "Saint Petersburg": "圣彼得堡",
  "Istanbul": "伊斯坦布尔",
  "Riyadh": "利雅得",
  "Doha": "多哈",
};

export function getClientIp(request: Request): string {
  // 1. Cloudflare Connecting IP (most trusted behind CF)
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp && isValidPublicIp(cfConnectingIp.trim())) {
    return cfConnectingIp.trim();
  }

  // 2. Standard X-Real-IP
  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp && isValidPublicIp(xRealIp.trim())) {
    return xRealIp.trim();
  }

  // 3. X-Forwarded-For (iterate through comma-separated list)
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map((i) => i.trim()).filter(Boolean);
    for (const ip of ips) {
      if (isValidPublicIp(ip)) {
        return ip;
      }
    }
    if (ips.length > 0) return ips[0];
  }

  // 4. Other custom headers
  const otherHeaders = ["x-client-ip", "fastly-client-ip", "true-client-ip", "x-cluster-client-ip"];
  for (const h of otherHeaders) {
    const val = request.headers.get(h);
    if (val && isValidPublicIp(val.trim())) {
      return val.trim();
    }
  }

  if (cfConnectingIp) return cfConnectingIp.trim();
  if (xRealIp) return xRealIp.trim();

  return "127.0.0.1";
}

function isValidPublicIp(ip: string): boolean {
  if (!ip) return false;
  const trimmed = ip.trim();
  if (
    trimmed === "127.0.0.1" ||
    trimmed === "::1" ||
    trimmed.startsWith("10.") ||
    trimmed.startsWith("192.168.") ||
    trimmed.startsWith("172.16.") ||
    trimmed.startsWith("172.17.") ||
    trimmed.startsWith("172.18.") ||
    trimmed.startsWith("172.19.") ||
    trimmed.startsWith("172.20.") ||
    trimmed.startsWith("172.21.") ||
    trimmed.startsWith("172.22.") ||
    trimmed.startsWith("172.23.") ||
    trimmed.startsWith("172.24.") ||
    trimmed.startsWith("172.25.") ||
    trimmed.startsWith("172.26.") ||
    trimmed.startsWith("172.27.") ||
    trimmed.startsWith("172.28.") ||
    trimmed.startsWith("172.29.") ||
    trimmed.startsWith("172.30.") ||
    trimmed.startsWith("172.31.") ||
    trimmed.startsWith("fc00:") ||
    trimmed.startsWith("fe80:")
  ) {
    return false;
  }
  return true;
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

function safeDecode(val: string): string {
  try {
    return decodeURIComponent(val).trim();
  } catch (e) {
    return val.trim();
  }
}

export function clearIpCache() {
  ipCache.clear();
}

export function formatTwoTierLocation(country: string, region: string, city: string): string {
  country = (country || "中国")
    .replace("阿拉伯联合酋长国", "阿联酋")
    .replace("中华人民共和国", "中国")
    .replace("United Arab Emirates", "阿联酋")
    .replace("China", "中国")
    .replace(/^📍\s*/, "")
    .trim();

  let cleanCountry = COUNTRY_MAP[country] || country;

  let cleanRegion = region ? safeDecode(region) : "";
  cleanRegion = cleanRegion
    .replace(/省|自治区|特别行政区|酋長國|酋长国|State of|Province of|Prefecture|市/g, "")
    .trim();
  cleanRegion = PROVINCE_MAP[cleanRegion] || CITY_MAP[cleanRegion] || cleanRegion;

  let cleanCity = city ? safeDecode(city) : "";
  cleanCity = cleanCity
    .replace(/市|自治州|地区|特别行政区|City/gi, "")
    .trim();
  cleanCity = CITY_MAP[cleanCity] || cleanCity;

  let secondTier = "";

  if (cleanCity && cleanRegion) {
    if (cleanCity === cleanRegion || cleanCity.includes(cleanRegion) || cleanRegion.includes(cleanCity)) {
      secondTier = cleanCity;
    } else {
      secondTier = `${cleanRegion} ${cleanCity}`.trim();
    }
  } else if (cleanCity) {
    secondTier = cleanCity;
  } else if (cleanRegion) {
    secondTier = cleanRegion;
  }

  // Deduplicate repeated tokens (e.g. "马斯喀特 马斯喀特" -> "马斯喀特")
  if (secondTier) {
    const parts = secondTier.split(/\s+/);
    if (parts.length === 2 && (parts[0] === parts[1] || parts[0].includes(parts[1]) || parts[1].includes(parts[0]))) {
      secondTier = parts[0].length >= parts[1].length ? parts[0] : parts[1];
    }
  }

  if (!secondTier || secondTier === cleanCountry) {
    if (cleanCountry === "中国") return "中国 · 核心节点";
    return `${cleanCountry} · 本地`;
  }

  return `${cleanCountry} · ${secondTier}`;
}

export async function resolveIpLocation(ip: string, headers?: Headers): Promise<string> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || !isValidPublicIp(ip)) {
    return "本地局域网";
  }

  if (ipCache.has(ip)) {
    return ipCache.get(ip)!;
  }

  let cfFallback = "";

  // 1. Check Cloudflare Edge Headers (Zero Latency if city or specific region is known)
  if (headers) {
    const countryCode = (headers.get("cf-ipcountry") || "").toUpperCase();
    const cfRegion = headers.get("cf-region") || headers.get("cf-region-code") || "";
    const cfCity = headers.get("cf-ipcity") || "";

    if (countryCode && countryCode !== "XX" && countryCode !== "T1") {
      const countryName = COUNTRY_MAP[countryCode] || countryCode;
      
      // If Cloudflare provided city or region, format and use immediately if non-empty second tier
      if (cfCity || cfRegion) {
        const loc = formatTwoTierLocation(countryName, cfRegion, cfCity);
        if (!loc.endsWith("· 本地") && !loc.endsWith("· 核心节点")) {
          ipCache.set(ip, loc);
          return loc;
        }
      }

      cfFallback = countryName === "中国" ? "中国 · 核心节点" : `${countryName} · 本地`;
    }
  }

  // 2. Query HTTPS ip-api.com (Fast, Accurate worldwide Chinese translation)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.status === "success") {
        const country = data.country || "";
        const region = data.regionName || "";
        const city = data.city || "";

        const loc = formatTwoTierLocation(country, region, city);
        ipCache.set(ip, loc);
        return loc;
      }
    }
  } catch (e) {}

  // 3. Query HTTPS ipwho.is
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
        const country = data.country || "";
        const city = data.city || "";
        const region = data.region || "";

        const loc = formatTwoTierLocation(country, region, city);
        ipCache.set(ip, loc);
        return loc;
      }
    }
  } catch (e) {}

  // 4. Fallback: Query HTTPS freeipapi.com
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

  if (cfFallback) {
    ipCache.set(ip, cfFallback);
    return cfFallback;
  }

  return "中国 · 综合节点";
}
