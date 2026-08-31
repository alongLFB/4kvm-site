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
  // 1. Cloudflare header
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  // 2. Real IP header
  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();

  // 3. Forwarded For header
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  return "127.0.0.1";
}

export function maskIp(ip: string): string {
  if (!ip || ip === "127.0.0.1" || ip === "::1") return "127.0.0.*";

  // IPv6 masking: e.g. 240e:388:1234:5678:abcd:ef01:2345:6789 -> 240e:388:****:****::*
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:****:****::*`;
    }
    return `${ip.slice(0, 8)}::*`;
  }

  // IPv4 masking: e.g. 217.165.201.169 -> 217.165.*.*
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }

  return ip;
}

export async function resolveIpLocation(ip: string, headers?: Headers): Promise<string> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.16.")) {
    return "本地局域网";
  }

  if (ipCache.has(ip)) {
    return ipCache.get(ip)!;
  }

  // 1. Check Cloudflare Geo Headers if available
  if (headers) {
    const countryCode = (headers.get("cf-ipcountry") || "").toUpperCase();
    const city = headers.get("cf-ipcity");
    const countryName = COUNTRY_NAME_MAP[countryCode] || countryCode;
    if (countryName && city) {
      const loc = `${countryName} · ${city}`;
      ipCache.set(ip, loc);
      return loc;
    } else if (countryName && countryName !== "XX" && countryName !== "T1") {
      const loc = countryName;
      ipCache.set(ip, loc);
      return loc;
    }
  }

  // 2. Query ip-api.com with Chinese localization (supports both IPv4 & IPv6 worldwide)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.status === "success") {
        let country = data.country || "";
        if (country === "阿拉伯联合酋长国") country = "阿联酋";

        const region = data.regionName || "";
        const city = data.city || "";

        let parts: string[] = [];
        if (country) parts.push(country);

        if (city && city !== country) {
          if (region && region !== city && region !== country && !city.includes(region)) {
            parts.push(`${region} ${city}`);
          } else {
            parts.push(city);
          }
        } else if (region && region !== country) {
          parts.push(region);
        }

        const loc = parts.join(" · ") || country || "海外";
        ipCache.set(ip, loc);
        return loc;
      }
    }
  } catch (e) {}

  // 3. Fallback to ipwho.is (global GeoIP with zh-CN support)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`https://ipwho.is/${ip}?lang=zh-CN`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        let country = data.country || "";
        if (country === "阿拉伯联合酋长国") country = "阿联酋";
        const city = data.city || "";
        const region = data.region || "";

        let parts: string[] = [];
        if (country) parts.push(country);
        if (city && city !== country) {
          parts.push(city);
        } else if (region && region !== country) {
          parts.push(region);
        }

        const loc = parts.join(" · ") || country || "海外";
        ipCache.set(ip, loc);
        return loc;
      }
    }
  } catch (e) {}

  return "中国";
}
