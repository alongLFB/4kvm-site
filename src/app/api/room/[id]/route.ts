import { NextResponse } from "next/server";
import { RoomStore } from "@/lib/room-store";
import { fetchLiveVodDetail } from "@/lib/vod-service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = RoomStore.getRoom(id);
  if (!room) {
    return NextResponse.json({ code: 404, message: "房间不存在或已解散" }, { status: 404 });
  }

  const vodItem = room.vodItem || (await fetchLiveVodDetail(room.vodId));

  return NextResponse.json({ code: 200, data: { room, vodItem } });
}
