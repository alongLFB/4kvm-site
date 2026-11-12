import { betterAuth } from "better-auth";
import { bearer, jwt, oneTimeToken } from "better-auth/plugins";
import { getDatabase } from "./db";

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
      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.AUTH_FROM_EMAIL || "noreply@alonglfb.com";
      if (resendKey) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromEmail,
              to: user.email,
              subject: "【4KVM / alonglfb-tv】重置您的账号密码",
              html: `<p>您好 ${user.name || user.email}，</p><p>请点击以下链接重置密码：<a href="${url}">${url}</a></p><p>或者在客户端输入重置口令：<code>${token}</code></p>`,
            }),
          });
        } catch (err) {
          console.error("[Auth] Failed to send reset email via Resend:", err);
        }
      } else {
        console.info(
          `[Auth Reset Password] email=${user.email} token=${token} url=${url}`,
        );
      }
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
