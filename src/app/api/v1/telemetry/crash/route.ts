import { NextResponse } from "next/server";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return handleCorsOptions(request);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    console.warn("[App Telemetry / Crash]", JSON.stringify(payload));
    return NextResponse.json(
      {
        code: 200,
        message: "诊断日志已接收并记录",
        reportId: `crash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      },
      {
        status: 200,
        headers: getCorsHeaders(request),
      },
    );
  } catch {
    return NextResponse.json(
      { code: 500, message: "记录失败" },
      { status: 500, headers: getCorsHeaders(request) },
    );
  }
}
