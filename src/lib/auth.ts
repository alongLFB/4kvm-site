import { betterAuth } from "better-auth";
import { bearer, jwt, oneTimeToken } from "better-auth/plugins";
import { getDatabase } from "./db";
import { sendEmail } from "./email";

let schemaInitialized = false;

export function ensureAuthAndSyncSchema() {
  if (schemaInitialized) return;
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS "user" (
      "id" text NOT NULL PRIMARY KEY,
      "name" text NOT NULL,
      "email" text NOT NULL UNIQUE,
      "emailVerified" integer NOT NULL DEFAULT 0,
      "image" text,
      "createdAt" date NOT NULL,
      "updatedAt" date NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "session" (
      "id" text NOT NULL PRIMARY KEY,
      "expiresAt" date NOT NULL,
      "token" text NOT NULL UNIQUE,
      "createdAt" date NOT NULL,
      "updatedAt" date NOT NULL,
      "ipAddress" text,
      "userAgent" text,
      "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS "account" (
      "id" text NOT NULL PRIMARY KEY,
      "accountId" text NOT NULL,
      "providerId" text NOT NULL,
      "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
      "accessToken" text,
      "refreshToken" text,
      "idToken" text,
      "accessTokenExpiresAt" date,
      "refreshTokenExpiresAt" date,
      "scope" text,
      "password" text,
      "createdAt" date NOT NULL,
      "updatedAt" date NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "verification" (
      "id" text NOT NULL PRIMARY KEY,
      "identifier" text NOT NULL,
      "value" text NOT NULL,
      "expiresAt" date NOT NULL,
      "createdAt" date NOT NULL,
      "updatedAt" date NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "jwks" (
      "id" text NOT NULL PRIMARY KEY,
      "publicKey" text NOT NULL,
      "privateKey" text NOT NULL,
      "createdAt" date NOT NULL,
      "expiresAt" date,
      "alg" text,
      "crv" text
    );

    CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");
    CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");
    CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");

    CREATE TABLE IF NOT EXISTS "sync_cursor" (
      "user_id" text NOT NULL PRIMARY KEY REFERENCES "user" ("id") ON DELETE CASCADE,
      "cursor_seq" integer NOT NULL DEFAULT 0,
      "updated_at" integer NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS "user_history" (
      "user_id" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
      "vod_id" text NOT NULL,
      "vod_name" text NOT NULL DEFAULT '',
      "vod_pic" text NOT NULL DEFAULT '',
      "vod_remarks" text NOT NULL DEFAULT '',
      "episode_name" text NOT NULL DEFAULT '',
      "episode_index" integer NOT NULL DEFAULT 0,
      "source_index" integer NOT NULL DEFAULT 0,
      "current_time" real NOT NULL DEFAULT 0,
      "duration" real NOT NULL DEFAULT 0,
      "updated_at" integer NOT NULL DEFAULT 0,
      "deleted" integer NOT NULL DEFAULT 0,
      "sync_seq" integer NOT NULL DEFAULT 0,
      PRIMARY KEY ("user_id", "vod_id")
    );
    CREATE INDEX IF NOT EXISTS "user_history_sync_idx" ON "user_history" ("user_id", "sync_seq");

    CREATE TABLE IF NOT EXISTS "user_favorites" (
      "user_id" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
      "vod_id" text NOT NULL,
      "vod_name" text NOT NULL DEFAULT '',
      "vod_pic" text NOT NULL DEFAULT '',
      "vod_remarks" text NOT NULL DEFAULT '',
      "vod_score" text NOT NULL DEFAULT '',
      "type_name" text NOT NULL DEFAULT '',
      "vod_year" text NOT NULL DEFAULT '',
      "updated_at" integer NOT NULL DEFAULT 0,
      "deleted" integer NOT NULL DEFAULT 0,
      "sync_seq" integer NOT NULL DEFAULT 0,
      PRIMARY KEY ("user_id", "vod_id")
    );
    CREATE INDEX IF NOT EXISTS "user_favorites_sync_idx" ON "user_favorites" ("user_id", "sync_seq");

    CREATE TABLE IF NOT EXISTS "user_settings" (
      "user_id" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
      "setting_key" text NOT NULL,
      "setting_value" text NOT NULL DEFAULT '',
      "updated_at" integer NOT NULL DEFAULT 0,
      "sync_seq" integer NOT NULL DEFAULT 0,
      PRIMARY KEY ("user_id", "setting_key")
    );
    CREATE INDEX IF NOT EXISTS "user_settings_sync_idx" ON "user_settings" ("user_id", "sync_seq");
  `);

  schemaInitialized = true;
}

ensureAuthAndSyncSchema();

const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

const defaultBaseUrl =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://4kvm.alonglfb.com"
    : "http://localhost:3000");

export const auth = betterAuth({
  database: getDatabase(),
  basePath: "/api/v1/auth",
  baseURL: defaultBaseUrl,
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "4kvm-alonglfbtv-shared-auth-secret-key-2026-v1",
  trustedOrigins: [
    "https://4kvm.alonglfb.com",
    "https://tv.alonglfb.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "alonglfbtv://",
  ],
  advanced: {
    trustedProxyHeaders: true,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    requireEmailVerification: false,
    async sendResetPassword({ user, url, token }) {
      const recipientName = user.name || user.email;
      const html = `
        <div style="background:#0F172A;color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:32px 24px;border-radius:12px;max-width:560px;margin:0 auto;border:1px solid #334155;">
          <h2 style="color:#38BDF8;margin-top:0;font-size:20px;">【4KVM 在线影视】重置账号密码</h2>
          <p style="font-size:15px;line-height:1.6;">您好 <strong>${recipientName}</strong>，</p>
          <p style="font-size:14px;color:#CBD5E1;line-height:1.6;">系统收到了重置您账号密码的请求。您可以直接点击下方按钮完成重置：</p>
          <p style="margin:24px 0;">
            <a href="${url}" style="background:#0284C7;color:#FFFFFF;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;font-size:15px;">一键重置密码</a>
          </p>
          <p style="font-size:13px;color:#94A3B8;margin-top:20px;">
            如果您正在使用 TV 客户端或移动端，可在客户端弹窗中直接输入 6 位重置口令：
          </p>
          <div style="background:#1E293B;padding:12px 18px;border-radius:8px;font-size:20px;font-family:monospace;letter-spacing:3px;color:#38BDF8;display:inline-block;margin:8px 0 16px 0;border:1px solid #475569;">
            ${token}
          </div>
          <p style="font-size:12px;color:#64748B;line-height:1.6;margin-top:24px;border-top:1px solid #1E293B;padding-top:16px;">
            若非您本人操作，请忽略此邮件，您的账号密码将保持安全不变。<br/>
            重置链接：<a href="${url}" style="color:#38BDF8;word-break:break-all;">${url}</a>
          </p>
        </div>
      `;

      await sendEmail({
        to: user.email,
        subject: "【4KVM / alonglfb-tv】重置您的账号密码",
        html,
        text: `您好 ${recipientName}，请点击以下链接重置密码：${url} 或在客户端输入重置口令：${token}`,
      });

      console.info(
        `[Auth Reset Password] email=${user.email} token=${token} url=${url}`,
      );
    },
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : undefined,
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
  },
  plugins: [
    bearer(),
    jwt(),
    oneTimeToken({
      expiresIn: 5, // 5 minutes validity for native deep-link handoff
    }),
  ],
});

export async function getAuthenticatedUser(request: Request) {
  ensureAuthAndSyncSchema();
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    return session?.user ?? null;
  } catch {
    return null;
  }
}
