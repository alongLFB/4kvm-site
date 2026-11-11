import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = new Set([
  "https://4kvm.alonglfb.com",
  "https://tv.alonglfb.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
]);

export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "";
  const allowOrigin = origin || "*";

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
  const corsHeaders = getCorsHeaders(request);
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders)) {
    headers.set(k, v);
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
