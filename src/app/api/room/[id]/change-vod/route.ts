import { NextResponse } from "next/server";
import { RoomStore } from "@/lib/room-store";
import { fetchLiveVodDetail } from "@/lib/vod-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { hostId, vodItem } = body;

    if (!vodItem || !vodItem.id) {
      return NextResponse.json({ code: 400, message: "缺少影视数据" }, { status: 400 });
    }

    // Enrich with full sources and episodes if not loaded
    let fullVod = vodItem;
    if (!vodItem.sources || vodItem.sources.length === 0 || !vodItem.sources[0]?.episodes?.length) {
      const detail = await fetchLiveVodDetail(vodItem.id);
      if (detail) {
        fullVod = detail;
      }
    }

    const result = RoomStore.changeVod(id, hostId, fullVod);
    if (result.success) {
      return NextResponse.json({ code: 200, data: result.room });
    } else {
      return NextResponse.json({ code: 403, message: result.message }, { status: 403 });
    }
  } catch (err: any) {
    return NextResponse.json({ code: 500, message: err.message }, { status: 500 });
  }
}
