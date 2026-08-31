import { NextResponse } from "next/server";
import { fetchLiveVods, fetchLiveVodDetail } from "@/lib/vod-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "list";
  const id = searchParams.get("id");

  if (action === "detail" && id) {
    const item = await fetchLiveVodDetail(id);
    return NextResponse.json({ code: 200, data: item });
  }

  const type = searchParams.get("type") || "全部";
  const area = searchParams.get("area") || "全部";
  const lang = searchParams.get("lang") || "全部";
  const year = searchParams.get("year") || "全部";
  const quality = searchParams.get("quality") || "全部";
  const status = searchParams.get("status") || "全部";
  const page = parseInt(searchParams.get("pg") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "18", 10);
  const query = searchParams.get("wd") || "";

  const result = await fetchLiveVods({
    type,
    area,
    lang,
    year,
    quality,
    status,
    page,
    limit,
    query,
  });

  return NextResponse.json({ code: 200, ...result });
}
