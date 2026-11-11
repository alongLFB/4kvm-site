import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";
import { pullUserSyncData } from "@/lib/sync-service";

export async function OPTIONS(request: Request) {
  return handleCorsOptions(request);
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { code: 401, message: "未登录或会话已过期" },
      { status: 401, headers: getCorsHeaders(request) },
    );
  }

  try {
    const url = new URL(request.url);
    const sinceParam = Number(url.searchParams.get("since") || "0");
    const result = pullUserSyncData(user.id, sinceParam);

    return NextResponse.json(
      {
        code: 200,
        ...result,
        serverTime: Date.now(),
      },
      { status: 200, headers: getCorsHeaders(request) },
    );
  } catch (err) {
    console.error("[Sync Pull Error]", err);
    return NextResponse.json(
      { code: 500, message: "同步拉取失败" },
      { status: 500, headers: getCorsHeaders(request) },
    );
  }
}
