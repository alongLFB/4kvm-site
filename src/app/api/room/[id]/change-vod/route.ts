import { NextResponse } from "next/server";
import { RoomStore } from "@/lib/room-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { hostId, vodItem } = body;

    if (!vodItem) {
      return NextResponse.json({ code: 400, message: "缺少影视数据" }, { status: 400 });
    }

    const result = RoomStore.changeVod(id, hostId, vodItem);
    if (result.success) {
      return NextResponse.json({ code: 200, data: result.room });
    } else {
      return NextResponse.json({ code: 403, message: result.message }, { status: 403 });
    }
  } catch (err: any) {
    return NextResponse.json({ code: 500, message: err.message }, { status: 500 });
  }
}
