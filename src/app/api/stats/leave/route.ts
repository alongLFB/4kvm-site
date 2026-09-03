import { NextResponse } from "next/server";
import { OnlineWatcherStore } from "@/lib/online-store";

export async function POST(request: Request) {
  try {
    let viewerId = "";

    // Support both application/json and text/plain (navigator.sendBeacon)
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      viewerId = body.viewerId;
    } else {
      const raw = await request.text().catch(() => "");
      try {
        const parsed = JSON.parse(raw);
        viewerId = parsed.viewerId;
      } catch (e) {
        viewerId = raw.trim();
      }
    }

    if (viewerId) {
      OnlineWatcherStore.recordLeave(viewerId);
    }

    return NextResponse.json({
      code: 200,
      success: true,
      totalOnline: OnlineWatcherStore.getTotalOnlineCount(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { code: 500, message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
