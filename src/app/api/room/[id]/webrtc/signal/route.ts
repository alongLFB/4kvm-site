import { NextResponse } from "next/server";
import { RoomStore } from "@/lib/room-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { fromUserId, toUserId, signal } = body;

    if (!fromUserId || !toUserId || !signal) {
      return NextResponse.json({ code: 400, message: "缺少信令参数" }, { status: 400 });
    }

    RoomStore.sendWebRTCSignal(id, fromUserId, toUserId, signal);
    return NextResponse.json({ code: 200, message: "ok" });
  } catch (err: any) {
    return NextResponse.json({ code: 500, message: err.message }, { status: 500 });
  }
}
