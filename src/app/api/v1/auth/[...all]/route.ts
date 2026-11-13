import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { auth, ensureAuthAndSyncSchema } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { sendEmail } from "@/lib/email";
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
          const cookies = signInRes.headers.getSetCookie?.() || [];
          if (cookies.length > 0) {
            for (const c of cookies) {
              redirectRes.headers.append("set-cookie", c);
            }
          } else {
            const setCookie = signInRes.headers.get("set-cookie");
            if (setCookie) {
              redirectRes.headers.set("set-cookie", setCookie);
            }
          }
          return redirectRes;
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

  // 1. 发送注册 6 位邮箱验证码接口
  if (
    request.method === "POST" &&
    url.pathname.endsWith("/api/v1/auth/send-register-code")
  ) {
    try {
      const body = (await request.json().catch(() => ({}))) as {
        email?: string;
      };
      const email =
        typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return NextResponse.json(
          { code: 400, message: "请输入有效的电子邮箱地址" },
          { status: 400, headers: getCorsHeaders(request) },
        );
      }

      const db = getDatabase();
      // 检查该邮箱是否已注册
      const existingUser = db
        .prepare('SELECT id FROM "user" WHERE LOWER(email) = ?')
        .get(email) as { id: string } | undefined;

      if (existingUser) {
        return NextResponse.json(
          {
            code: 400,
            message: "该邮箱已被注册，请直接使用密码登录或使用找回密码",
          },
          { status: 400, headers: getCorsHeaders(request) },
        );
      }

      const identifier = `register-code:${email}`;

      // 发送频率限制：60 秒冷却
      const existingCode = db
        .prepare('SELECT createdAt FROM "verification" WHERE identifier = ?')
        .get(identifier) as { createdAt: string } | undefined;

      if (existingCode?.createdAt) {
        const timeDiff =
          Date.now() - new Date(existingCode.createdAt).getTime();
        if (timeDiff < 60000) {
          const remaining = Math.ceil((60000 - timeDiff) / 1000);
          return NextResponse.json(
            {
              code: 429,
              message: `验证码发送过于频繁，请 ${remaining} 秒后再试`,
            },
            { status: 429, headers: getCorsHeaders(request) },
          );
        }
      }

      // 生成 6 位纯数字验证码
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const now = new Date().toISOString();
      const id = crypto.randomUUID();

      db.prepare('DELETE FROM "verification" WHERE identifier = ?').run(
        identifier,
      );
      db.prepare(
        'INSERT INTO "verification" ("id", "identifier", "value", "expiresAt", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)',
      ).run(id, identifier, code, expiresAt, now, now);

      // 通过统一邮件服务发送
      const html = `
        <div style="background:#0F172A;color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:32px 24px;border-radius:12px;max-width:540px;margin:0 auto;border:1px solid #334155;">
          <h2 style="color:#38BDF8;margin-top:0;font-size:20px;">【4KVM 在线影视】账号注册验证码</h2>
          <p style="font-size:15px;line-height:1.6;">您好！</p>
          <p style="font-size:14px;color:#CBD5E1;line-height:1.6;">您正在申请注册 4KVM 在线影视账号，您的 6 位注册验证码为：</p>
          <div style="background:#1E293B;padding:14px 20px;border-radius:8px;font-size:26px;font-family:monospace;letter-spacing:4px;color:#38BDF8;font-weight:700;display:inline-block;margin:12px 0 16px 0;border:1px solid #475569;">
            ${code}
          </div>
          <p style="font-size:13px;color:#94A3B8;line-height:1.6;">
            验证码在 <strong>10 分钟</strong> 内有效。为保障您的账号安全，请勿向任何人泄露验证码。
          </p>
          <p style="font-size:12px;color:#64748B;line-height:1.6;margin-top:24px;border-top:1px solid #1E293B;padding-top:16px;">
            若非您本人操作，请忽略此邮件，不会对您造成任何影响。
          </p>
        </div>
      `;

      await sendEmail({
        to: email,
        subject: "【4KVM / alonglfb-tv】您的账号注册验证码",
        html,
        text: `【4KVM 在线影视】您的账号注册验证码为：${code}，10分钟内有效。若非本人操作请忽略。`,
      });

      console.info(
        `[Auth Register Code] Sent registration OTP to ${email}: ${code}`,
      );

      return NextResponse.json(
        { code: 200, message: "验证码已成功发送至您的邮箱，请查收" },
        { status: 200, headers: getCorsHeaders(request) },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Auth] Failed to send register code:", err);
      return NextResponse.json(
        { code: 500, message: `发送验证码失败: ${msg}` },
        { status: 500, headers: getCorsHeaders(request) },
      );
    }
  }

  // 2. 邮箱注册拦截：强校验 6 位验证码，彻底杜绝机器批量刷库
  if (
    request.method === "POST" &&
    url.pathname.endsWith("/api/v1/auth/sign-up/email")
  ) {
    try {
      const clonedReq = request.clone();
      const body = (await clonedReq.json().catch(() => null)) as {
        name?: string;
        email?: string;
        password?: string;
        code?: string;
        [key: string]: unknown;
      } | null;

      if (!body?.email || !body?.password) {
        return withCors(request, await auth.handler(request));
      }

      const email = String(body.email).trim().toLowerCase();
      const code = typeof body.code === "string" ? body.code.trim() : "";

      if (!code || code.length !== 6) {
        return NextResponse.json(
          { code: 400, message: "请输入 6 位邮箱验证码" },
          { status: 400, headers: getCorsHeaders(request) },
        );
      }

      const db = getDatabase();
      const identifier = `register-code:${email}`;
      const record = db
        .prepare(
          'SELECT value, expiresAt FROM "verification" WHERE identifier = ?',
        )
        .get(identifier) as { value: string; expiresAt: string } | undefined;

      if (!record) {
        return NextResponse.json(
          { code: 400, message: "未获取验证码或验证码已失效，请重新获取" },
          { status: 400, headers: getCorsHeaders(request) },
        );
      }

      if (new Date(record.expiresAt).getTime() < Date.now()) {
        db.prepare('DELETE FROM "verification" WHERE identifier = ?').run(
          identifier,
        );
        return NextResponse.json(
          { code: 400, message: "验证码已过期，请重新获取" },
          { status: 400, headers: getCorsHeaders(request) },
        );
      }

      if (record.value !== code) {
        return NextResponse.json(
          { code: 400, message: "验证码不正确，请核对后重试" },
          { status: 400, headers: getCorsHeaders(request) },
        );
      }

      // 验证码比对正确，立即消费销毁，防止验证码被重复利用
      db.prepare('DELETE FROM "verification" WHERE identifier = ?').run(
        identifier,
      );

      // 剔除自定义的 code 字段，转发标准注册请求给 Better Auth
      const { code: _, ...cleanBody } = body;
      const forwardReq = new Request(request.url, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(cleanBody),
      });

      const response = await auth.handler(forwardReq);

      // 若注册成功，将用户 emailVerified 置为 1 (已被邮箱验证码核实)
      if (response.ok) {
        try {
          db.prepare(
            'UPDATE "user" SET "emailVerified" = 1 WHERE LOWER(email) = ?',
          ).run(email);
        } catch (updateErr) {
          console.warn("[Auth] Failed to set emailVerified:", updateErr);
        }
      }

      return withCors(request, response);
    } catch (err: unknown) {
      console.error("[Auth] Sign-up interception error:", err);
      return withCors(request, await auth.handler(request));
    }
  }

  const response = await auth.handler(request);
  if (response.status >= 300 && response.status < 400) {
    return response;
  }
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
