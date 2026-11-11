import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { RoomStore } from "@/lib/room-store";

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createLiveKitJwt(apiKey: string, apiSecret: string, grant: any): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(grant));
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const room = RoomStore.getRoom(id);
    if (!room) {
      return NextResponse.json(
        { code: 404, message: "放映厅不存在" },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const userId = body.userId || "guest";
    const userName = body.userName || "影迷";

    const apiKey = process.env.LIVEKIT_API_KEY || "devkey";
    const apiSecret =
      process.env.LIVEKIT_API_SECRET || "secret_alonglfb_tv_livekit_voice_2026";
    const serverUrl = process.env.LIVEKIT_URL || "wss://livekit.alonglfb.com";

    const now = Math.floor(Date.now() / 1000);
    const grant = {
      sub: userId,
      name: userName,
      iss: apiKey,
      iat: now,
      nbf: now,
      exp: now + 24 * 3600,
      video: {
        room: id,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
    };

    const token = createLiveKitJwt(apiKey, apiSecret, grant);

    return NextResponse.json({
      code: 200,
      data: {
        token,
        serverUrl,
        roomId: id,
        userId,
        userName,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { code: 500, message: err.message },
      { status: 500 },
    );
  }
}
