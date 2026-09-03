import { NextResponse } from "next/server";
import { OnlineWatcherStore } from "@/lib/online-store";
import { getClientIp } from "@/lib/ip-service";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json().catch(() => ({}));
    const { viewerId, pageType = "play", targetId, vodName } = body;

    if (!viewerId || !targetId) {
      return NextResponse.json(
        { code: 400, message: "Missing viewerId or targetId" },
        { status: 400 }
      );
    }

    const result = OnlineWatcherStore.recordHeartbeat({
      viewerId,
      ip,
      pageType: pageType === "room" ? "room" : "play",
      targetId: String(targetId),
      vodName: vodName ? String(vodName) : undefined,
    });

    return NextResponse.json({
      code: result.success ? 200 : 429,
      success: result.success,
      reason: result.reason,
      data: {
        totalOnline: result.totalOnline,
        currentTargetOnline: result.currentTargetOnline,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { code: 500, message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
