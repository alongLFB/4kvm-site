import { NextResponse } from "next/server";
import { auth, ensureAuthAndSyncSchema } from "@/lib/auth";
import { getCorsHeaders, handleCorsOptions, withCors } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return handleCorsOptions(request);
}

async function handleAuthRequest(request: Request): Promise<Response> {
  ensureAuthAndSyncSchema();
  const url = new URL(request.url);

  // Native RFC 8252 Google OAuth entry point: /api/v1/auth/google/start
  if (
    request.method === "GET" &&
    url.pathname.endsWith("/api/v1/auth/google/start")
  ) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        {
          code: 503,
          message:
            "服务端尚未配置 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET，请先使用邮箱与密码登录。",
        },
        { status: 503, headers: getCorsHeaders(request) },
      );
    }

    const siteBase =
      process.env.BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://4kvm.alonglfb.com"
        : url.origin);
    const callbackURL = `${siteBase}/api/v1/auth/google/native-callback`;
    const signInRes = await auth.api.signInSocial({
      body: {
        provider: "google",
        callbackURL,
      },
      headers: request.headers,
      asResponse: true,
    });

    if (signInRes.ok) {
      try {
        const data = (await signInRes.clone().json()) as { url?: string };
        if (data?.url) {
          const redirectRes = NextResponse.redirect(data.url, 302);
          const setCookie = signInRes.headers.get("set-cookie");
          if (setCookie) {
            redirectRes.headers.set("set-cookie", setCookie);
          }
          return withCors(request, redirectRes);
        }
      } catch {
        // Fallback to raw response
      }
    }
    return withCors(request, signInRes);
  }

  // Native RFC 8252 Google OAuth callback -> mint oneTimeToken -> redirect to alonglfbtv://auth/callback
  if (
    request.method === "GET" &&
    url.pathname.endsWith("/api/v1/auth/google/native-callback")
  ) {
    try {
      const ott = await auth.api.generateOneTimeToken({
        headers: request.headers,
      });
      if (ott?.token) {
        const deepLink = `alonglfbtv://auth/callback?token=${encodeURIComponent(ott.token)}`;
        return new Response(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>登录成功</title><meta http-equiv="refresh" content="0;url=${deepLink}"></head><body style="background:#0A0A0C;color:#F8FAFC;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h2>Google 授权成功</h2><p>正在唤起 alonglfb-tv 客户端...</p><p><a href="${deepLink}" style="color:#06B6D4">点击此处手动打开客户端</a></p></div><script>window.location.href=${JSON.stringify(deepLink)};</script></body></html>`,
          {
            status: 200,
            headers: {
              ...getCorsHeaders(request),
              "Content-Type": "text/html; charset=utf-8",
            },
          },
        );
      }
    } catch (err) {
      console.error("[Auth] Failed to mint native oneTimeToken:", err);
    }

    return NextResponse.json(
      { code: 401, message: "未检测到有效 Google 登录会话，请重试" },
      { status: 401, headers: getCorsHeaders(request) },
    );
  }

  const response = await auth.handler(request);
  return withCors(request, response);
}

export async function GET(request: Request) {
  return handleAuthRequest(request);
}

export async function POST(request: Request) {
  return handleAuthRequest(request);
}

export async function PUT(request: Request) {
  return handleAuthRequest(request);
}

export async function PATCH(request: Request) {
  return handleAuthRequest(request);
}

export async function DELETE(request: Request) {
  return handleAuthRequest(request);
}
