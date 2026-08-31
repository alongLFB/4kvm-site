import { NextResponse } from "next/server";
import { RoomStore } from "@/lib/room-store";
import { fetchLiveVodDetail } from "@/lib/vod-service";
import { getClientIp, resolveIpLocation, maskIp } from "@/lib/ip-service";

export async function GET() {
  const list = RoomStore.getAllRoomsForHall();
  return NextResponse.json({ code: 200, list });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, vodId, vodItem: passedVodItem, sourceIndex = 0, episodeIndex = 0, isPublic = true, password = "", controlMode = "free", host } = body;

    const vodItem = passedVodItem || (await fetchLiveVodDetail(vodId));
    if (!vodItem) {
      return NextResponse.json({ code: 404, message: "影视不存在" }, { status: 404 });
    }

    const rawIp = getClientIp(request);
    const location = await resolveIpLocation(rawIp, request.headers);
    const maskedIp = maskIp(rawIp);

    const room = RoomStore.createRoom({
      title: title || `${vodItem.name} 观影房`,
      vodItem,
      sourceIndex,
      episodeIndex,
      isPublic,
      password,
      controlMode,
      host: {
        ...host,
        location: `📍 ${location}`,
        maskedIp,
        fullIp: rawIp,
      },
    });

    return NextResponse.json({ code: 200, data: room });
  } catch (err: any) {
    return NextResponse.json({ code: 500, message: err.message }, { status: 500 });
  }
}
