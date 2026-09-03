import { NextResponse } from "next/server";
import { fetchLiveVods, fetchLiveVodDetail } from "@/lib/vod-service";
import { GATED_CONFIG, isItemGated, isTypeGated, isTypeIdGated } from "@/config/gated-sections";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "list";
  const id = searchParams.get("id");

  // 服务端口令提取校验
  const checkPasscode = () => {
    const headerPin = request.headers.get(GATED_CONFIG.headerKey);
    const paramPin = searchParams.get("pin");
    return headerPin === GATED_CONFIG.passcode || paramPin === GATED_CONFIG.passcode;
  };

  if (action === "detail" && id) {
    const item = await fetchLiveVodDetail(id);
    if (item && isItemGated(item)) {
      if (!checkPasscode()) {
        return NextResponse.json(
          { code: 403, msg: "该内容属于专享保护板块，请提供访问口令" },
          { status: 403 }
        );
      }
    }
    return NextResponse.json({ code: 200, data: item });
  }

  const type = searchParams.get("type") || "全部";
  const typeId = searchParams.get("type_id") || searchParams.get("typeId") || searchParams.get("t") || undefined;

  // 服务端双重安全防护：若请求受保护分类，强制验证口令
  if (isTypeGated(type) || (typeId && isTypeIdGated(typeId))) {
    if (!checkPasscode()) {
      return NextResponse.json(
        {
          code: 403,
          msg: "该板块已开启专区访问保护，请输入访问口令",
          list: [],
          total: 0,
          page: 1,
          pagecount: 0,
        },
        { status: 403 }
      );
    }
  }

  const subType = searchParams.get("sub_type") || searchParams.get("subType") || "全部";
  const area = searchParams.get("area") || "全部";
  const lang = searchParams.get("lang") || "全部";
  const year = searchParams.get("year") || "全部";
  const quality = searchParams.get("quality") || "全部";
  const status = searchParams.get("status") || "全部";
  const sort = searchParams.get("sort") || "hot";
  const page = parseInt(searchParams.get("pg") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const query = searchParams.get("keyword") || searchParams.get("wd") || searchParams.get("q") || "";

  const result = await fetchLiveVods({
    type,
    typeId,
    subType,
    area,
    lang,
    year,
    quality,
    status,
    sort,
    page,
    limit,
    query,
    excludeGated: !checkPasscode(),
  });

  return NextResponse.json({ code: 200, ...result });
}
