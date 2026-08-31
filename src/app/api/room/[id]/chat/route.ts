import { NextResponse } from "next/server";
import { RoomStore } from "@/lib/room-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sender, text } = await request.json();

  const msg = RoomStore.addChat(id, sender, text);
  return NextResponse.json({ code: 200, data: msg });
}
