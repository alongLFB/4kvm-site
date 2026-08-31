import { NextResponse } from "next/server";
import { RoomStore } from "@/lib/room-store";
import { getClientIp, resolveIpLocation, maskIp } from "@/lib/ip-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { user } = body;

  const rawIp = getClientIp(request);
  const location = await resolveIpLocation(rawIp, request.headers);
  const maskedIp = maskIp(rawIp);

  const room = RoomStore.joinRoom(id, {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    device: user.device,
    location: `📍 ${location}`,
    maskedIp,
    fullIp: rawIp,
  });

  if (!room) {
    return NextResponse.json({ code: 404, message: "房间不存在" }, { status: 404 });
  }

  return NextResponse.json({ code: 200, data: room });
}
