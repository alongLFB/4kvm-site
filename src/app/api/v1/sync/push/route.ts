import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { type SyncPushRequest, pushUserSyncData } from "@/lib/sync-service";

export async function OPTIONS(request: Request) {
  return handleCorsOptions(request);
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { code: 401, message: "未登录或会话已过期" },
      { status: 401, headers: getCorsHeaders(request) },
    );
  }

  try {
    const body = (await request.json()) as SyncPushRequest;
    const result = pushUserSyncData(user.id, body);
    return NextResponse.json(
      {
        code: 200,
        cursor: result.cursor,
        applied: result.applied,
        serverTime: Date.now(),
      },
      { status: 200, headers: getCorsHeaders(request) },
    );
  } catch (err) {
    console.error("[Sync Push Error]", err);
    return NextResponse.json(
      { code: 500, message: "同步推送失败" },
      { status: 500, headers: getCorsHeaders(request) },
    );
  }
}
