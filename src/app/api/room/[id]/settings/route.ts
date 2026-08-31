import { NextResponse } from "next/server";
import { RoomStore } from "@/lib/room-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { hostId, title, isPublic, password, controlMode, switchMode, hostName, hostAvatar } = body;

    const result = RoomStore.updateSettings(id, hostId, {
      title,
      isPublic,
      password,
      controlMode,
      switchMode,
      hostName,
      hostAvatar,
    });

    if (!result.success) {
      return NextResponse.json({ code: 403, message: result.message }, { status: 403 });
    }

    return NextResponse.json({ code: 200, data: result.room });
  } catch (err: any) {
    return NextResponse.json({ code: 500, message: err.message }, { status: 500 });
  }
}
