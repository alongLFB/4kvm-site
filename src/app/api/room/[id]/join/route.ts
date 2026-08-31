import { NextResponse } from "next/server";
import { RoomStore } from "@/lib/room-store";
import { getClientIp, resolveIpLocation, maskIp } from "@/lib/ip-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { user, password } = body;

  const rawIp = getClientIp(request);
  const location = await resolveIpLocation(rawIp, request.headers);
  const maskedIp = maskIp(rawIp);

  const result = RoomStore.joinRoom(
    id,
    {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      device: user.device,
      location: `📍 ${location}`,
      maskedIp,
      fullIp: rawIp,
    },
    password
  );

  if (!result.success) {
    return NextResponse.json({ code: 403, message: result.message || "加入失败" }, { status: 403 });
  }

  return NextResponse.json({ code: 200, data: result.room });
}
