import { NextResponse } from "next/server";
import { OnlineWatcherStore } from "@/lib/online-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get("targetId") || undefined;

    const stats = OnlineWatcherStore.getStats(targetId);

    return NextResponse.json({
      code: 200,
      success: true,
      data: stats,
    });
  } catch (err: any) {
    return NextResponse.json(
      { code: 500, message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
