import { NextResponse } from "next/server";
import { RoomStore } from "@/lib/room-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { userId, isSpeaking } = body;

    if (!userId) {
      return NextResponse.json({ code: 400, message: "缺少参数" }, { status: 400 });
    }

    RoomStore.updateSpeakingState(id, userId, !!isSpeaking);
    return NextResponse.json({ code: 200, message: "ok" });
  } catch (err: any) {
    return NextResponse.json({ code: 500, message: err.message }, { status: 500 });
  }
}
