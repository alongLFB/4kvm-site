import { NextResponse } from "next/server";
import { RoomStore } from "@/lib/room-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { hostId, title, isPublic, password, controlMode, hostName, hostAvatar } = body;

  const result = RoomStore.updateSettings(id, hostId, {
    title,
    isPublic,
    password,
    controlMode,
    hostName,
    hostAvatar,
  });

  if (!result.success) {
    return NextResponse.json({ code: 403, message: result.message }, { status: 403 });
  }

  return NextResponse.json({ code: 200, data: result.room });
}
