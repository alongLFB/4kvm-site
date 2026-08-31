const ipCache = new Map<string, string>();

const COUNTRY_NAME_MAP: Record<string, string> = {
  CN: "中国",
  AE: "阿联酋",
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
    .trim();

  let secondTier = "";

  if (city && region) {
    const cleanCity = city.replace(/市|自治州|地区|特别行政区/g, "").trim();
    const cleanRegion = region.replace(/省|自治区|特别行政区|酋長國|酋长国/g, "").trim();
    if (cleanCity === cleanRegion || cleanCity.includes(cleanRegion) || cleanRegion.includes(cleanCity)) {
      secondTier = cleanCity;
    } else {
      secondTier = `${cleanRegion} ${cleanCity}`.trim();
    }
  } else if (city) {
    secondTier = city.replace(/市|自治州|地区|特别行政区/g, "").trim();
  } else if (region) {
    secondTier = region.replace(/省|自治区|特别行政区|酋長國|酋长国/g, "").trim();
  }

  if (!secondTier || secondTier === country) {
    if (country === "中国") return "中国 · 核心枢纽";
    return `${country} · 本地`;
  }

  return `${country} · ${secondTier}`;
}

export async function resolveIpLocation(ip: string, headers?: Headers): Promise<string> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.16.")) {
    return "局域网 · 本地节点";
  }

  if (ipCache.has(ip)) {
    return ipCache.get(ip)!;
  }

  // 1. Check Cloudflare Geo Headers
  if (headers) {
    const countryCode = (headers.get("cf-ipcountry") || "").toUpperCase();
    const city = headers.get("cf-ipcity") || "";
    const countryName = COUNTRY_NAME_MAP[countryCode] || countryCode;
    if (countryName && city) {
      const loc = formatTwoTierLocation(countryName, "", city);
      ipCache.set(ip, loc);
      return loc;
    }
  }

  // 2. Query ip-api.com with Chinese localization (supports IPv4 & IPv6 worldwide)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);

    const res = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`, {
      signal: controller.signal,
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

  // 3. Fallback to ipwho.is (global GeoIP with zh-CN support)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);

    const res = await fetch(`https://ipwho.is/${ip}?lang=zh-CN`, {
      signal: controller.signal,
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

  // 4. China domestic fallback
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`https://whois.pconline.com.cn/ipJson.jsp?ip=${ip}&json=true`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.pro || data.city) {
        const loc = formatTwoTierLocation("中国", data.pro || "", data.city || "");
        ipCache.set(ip, loc);
        return loc;
      }
    }
  } catch (e) {}

  return "中国 · 综合网络";
}
