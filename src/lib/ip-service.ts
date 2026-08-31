const ipCache = new Map<string, string>();

export function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();
  return "127.0.0.1";
}

export function maskIp(ip: string): string {
  if (!ip || ip === "127.0.0.1" || ip === "::1") return "127.0.0.*";
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return parts.slice(0, 2).join(":") + ":*";
  }
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  return ip;
}

export async function resolveIpLocation(ip: string, headers?: Headers): Promise<string> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return "本地局域网";
  }

  if (headers) {
    const city = headers.get("cf-ipcity");
    const country = headers.get("cf-ipcountry");
    if (city && country) {
      return `${country} · ${city}`;
    }
  }

  if (ipCache.has(ip)) {
    return ipCache.get(ip)!;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`https://whois.pconline.com.cn/ipJson.jsp?ip=${ip}&json=true`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.addr) {
        let location = data.addr
          .trim()
          .replace(/CZ88.NET/g, "")
          .replace(/省/g, " ")
          .replace(/市/g, "")
          .replace(/电信|联通|移动|广电|铁通/g, "")
          .trim();
        ipCache.set(ip, location || "中国");
        return location || "中国";
      }
    }
  } catch (e) {}

  return "中国";
}
