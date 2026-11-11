import { NextResponse } from "next/server";
import { getCorsHeaders, handleCorsOptions } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return handleCorsOptions(request);
}

export async function GET(request: Request) {
  return NextResponse.json(
    {
      id: "com.alonglfb.tv",
      version: "0.1.0",
      notes: "alonglfb-tv 跨平台 1.0 正式版就绪：全端 4K 硬解、LiveKit SFU 语音连麦、多端云同步与离线下载已全部集成。",
      url: "https://github.com/alonglfb/alonglfb-tv/releases/latest",
      canInstall: true,
      pub_date: new Date().toISOString(),
      platforms: {
        "windows-x86_64": {
          url: "https://github.com/alonglfb/alonglfb-tv/releases/download/v0.1.0/alonglfb-tv-0.1.0-windows-x86_64.zip",
          sha256: "1897f3af1a293419abbd83e36ff206f1a014f3336cd7849517e9af97e3b75a33",
          size: 23090591,
          signature: "SIP+n4SvUd7pe5EEsxB/OJUjRoGpjszkuPi3Yfbaa8fgJfkApUwEpWUFA/n4HFLxAEeCdSk7Tm8NH1xhZs1sAQ==",
        },
      },
    },
    {
      status: 200,
      headers: {
        ...getCorsHeaders(request),
        "Cache-Control": "public, max-age=60",
      },
    },
  );
}
