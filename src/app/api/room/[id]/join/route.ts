import { NextResponse } from "next/server";
import { RoomStore } from "@/lib/room-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { user } = body;

  const room = RoomStore.joinRoom(id, user);
  if (!room) {
    return NextResponse.json({ code: 404, message: "房间不存在" }, { status: 404 });
  }

  return NextResponse.json({ code: 200, data: room });
}
