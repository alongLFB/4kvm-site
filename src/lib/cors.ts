import { NextResponse } from "next/server";

const ALLOWED_ORIGIN_SET = new Set([
  "https://4kvm.alonglfb.com",
  "http://4kvm.alonglfb.com",
  "https://tv.alonglfb.com",
  "http://tv.alonglfb.com",
  "https://alonglfb.com",
  "http://alonglfb.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "alonglfbtv://",
]);

function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGIN_SET.has(origin)) return true;
  try {
    const url = new URL(origin);
    if (
      url.hostname.endsWith(".alonglfb.com") ||
      url.hostname === "alonglfb.com"
    ) {
      return true;
    }
  } catch {}
  return false;
}

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");

  // Direct navigations or same-origin requests without an Origin header
  // MUST NOT receive wildcard '*' with credentials: true.
  if (!origin) {
    return {
      Vary: "Origin",
    };
  }

  const allowed = isOriginAllowed(origin);
  const allowOrigin = allowed ? origin : "null";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, x-access-pin, x-requested-with, Cache-Control, Pragma",
    "Access-Control-Expose-Headers": "set-auth-token",
    Vary: "Origin",
  };
}

export function withCors(request: Request, response: Response): Response {
  // If response is a redirect (3xx, such as OAuth callback redirect),
  // NEVER modify, re-wrap, or recreate it. Return it directly to preserve Location & Set-Cookie!
  if (response.status >= 300 && response.status < 400) {
    return response;
  }

  const origin = request.headers.get("origin");
  // If there is no Origin header (same-origin browser navigation/fetch),
  // no CORS headers are required. Return response directly.
  if (!origin) {
    return response;
  }

  const corsHeaders = getCorsHeaders(request);
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders)) {
    headers.set(k, v);
  }

  // Preserve all Set-Cookie headers accurately
  const setCookies = response.headers.getSetCookie?.() || [];
  if (setCookies.length > 0) {
    headers.delete("set-cookie");
    for (const c of setCookies) {
      headers.append("set-cookie", c);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function handleCorsOptions(request: Request): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

