import { NextResponse } from "next/server";
import { querySuggestions } from "@/lib/search-engine";
import { GATED_CONFIG } from "@/config/gated-sections";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || searchParams.get("keyword") || "";
  const limit = parseInt(searchParams.get("limit") || "6", 10);

  if (!q.trim()) {
    return NextResponse.json({ code: 200, list: [] });
  }

  // 提取口令判断是否解锁
  const headerPin = request.headers.get(GATED_CONFIG.headerKey);
  const paramPin = searchParams.get("pin");
  const isUnlocked =
    headerPin === GATED_CONFIG.passcode || paramPin === GATED_CONFIG.passcode;

  let list = querySuggestions(q, limit + 5);

  // 若未解锁受控专区，过滤掉受控专区的内容
  if (!isUnlocked) {
    list = list.filter((item) => !GATED_CONFIG.lockedTypes.includes(item.type_name));
  }

  return NextResponse.json({
    code: 200,
    list: list.slice(0, limit),
  });
}
