import { NextResponse } from "next/server";
import { RoomStore } from "@/lib/room-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { sender, text } = await request.json().catch(() => ({}));

    if (!sender || !text) {
      return NextResponse.json({ code: 400, message: "参数错误" }, { status: 400 });
    }

    const msg = RoomStore.addChat(id, sender, text);
    return NextResponse.json({ code: 200, data: msg });
  } catch (err: any) {
    return NextResponse.json({ code: 500, message: err?.message || "Internal error" }, { status: 500 });
  }
}
