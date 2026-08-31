import { NextResponse } from "next/server";
import { RoomStore } from "@/lib/room-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { hostId, isMutedAll, targetUserId } = body;

    if (!hostId) {
      return NextResponse.json({ code: 400, message: "缺少房主身份" }, { status: 400 });
    }

    if (targetUserId) {
      const res = RoomStore.muteUser(id, hostId, targetUserId);
      return NextResponse.json({ code: res.success ? 200 : 403, message: res.message || "ok" });
    }

    const res = RoomStore.toggleMuteAll(id, hostId, !!isMutedAll);
    return NextResponse.json({ code: res.success ? 200 : 403, message: res.message || "ok" });
  } catch (err: any) {
    return NextResponse.json({ code: 500, message: err.message }, { status: 500 });
  }
}
