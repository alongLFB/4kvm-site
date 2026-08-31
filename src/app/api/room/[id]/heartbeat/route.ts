import { NextResponse } from "next/server";
import { RoomStore } from "@/lib/room-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { userId } = body;

    const success = RoomStore.heartbeat(id, userId);
    return NextResponse.json({ code: 200, success });
  } catch (err: any) {
    return NextResponse.json({ code: 500, message: err.message }, { status: 500 });
  }
}
