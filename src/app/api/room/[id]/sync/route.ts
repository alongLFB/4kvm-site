import { NextResponse } from "next/server";
import { RoomStore } from "@/lib/room-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const success = RoomStore.syncPlayback(id, body);
    return NextResponse.json({ code: 200, success });
  } catch (err: any) {
    return NextResponse.json({ code: 500, message: err?.message || "Internal error" }, { status: 500 });
  }
}
