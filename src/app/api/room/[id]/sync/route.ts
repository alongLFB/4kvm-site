import { NextResponse } from "next/server";
import { RoomStore } from "@/lib/room-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const success = RoomStore.syncPlayback(id, body);
  return NextResponse.json({ code: 200, success });
}
