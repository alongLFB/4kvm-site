import { NextResponse } from "next/server";
import { RoomStore } from "@/lib/room-store";
import { getClientIp, resolveIpLocation, maskIp } from "@/lib/ip-service";

export async function GET() {
  const rooms = RoomStore.getAllRoomsForHall();
  return NextResponse.json({ code: 200, list: rooms });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, vodItem, sourceIndex = 0, episodeIndex = 0, isPublic = true, password = "", controlMode = "free", switchMode = "free", host } = body;

    if (!vodItem) {
      return NextResponse.json({ code: 400, message: "缺少影片信息" }, { status: 400 });
    }

    const rawIp = getClientIp(request);
    const location = await resolveIpLocation(rawIp, request.headers);
    const maskedIp = maskIp(rawIp);

    const room = RoomStore.createRoom({
      title,
      vodItem,
      sourceIndex,
      episodeIndex,
      isPublic,
      password,
      controlMode,
      switchMode,
      host: {
        id: host.id,
        name: host.name,
        avatar: host.avatar,
        device: host.device,
        location,
        maskedIp,
        fullIp: rawIp,
      },
    });

    return NextResponse.json({ code: 200, data: room });
  } catch (err: any) {
    return NextResponse.json({ code: 500, message: err.message }, { status: 500 });
  }
}
