function parseStringList(val: string | undefined, defaultList: string[]): string[] {
  if (val === undefined || val === null || val.trim() === "") return defaultList;
  return val
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseNumberList(val: string | undefined, defaultList: number[]): number[] {
  if (val === undefined || val === null || val.trim() === "") return defaultList;
  return val
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
}

/**
 * 4KVM 专区加锁 / 口令解锁全局配置中心
 * 支持通过 .env 或 .env.local 环境变量完全覆盖与动态配置
 */
export const GATED_CONFIG = {
  // 解锁口令（环境变量 NEXT_PUBLIC_GATED_PIN，默认 666888）
  passcode: process.env.NEXT_PUBLIC_GATED_PIN || "666888",

  // 粗粒度：需要加锁的一级主分类名称（环境变量 NEXT_PUBLIC_GATED_LOCKED_TYPES，英文逗号分隔，例如 "体育,综艺"）
  lockedTypes: parseStringList(process.env.NEXT_PUBLIC_GATED_LOCKED_TYPES, [""]),

  // 细粒度：按具体 type_id 细粒度加锁（环境变量 NEXT_PUBLIC_GATED_LOCKED_TYPE_IDS，英文逗号分隔）
  lockedTypeIds: parseNumberList(
    process.env.NEXT_PUBLIC_GATED_LOCKED_TYPE_IDS,
    []
  ),

  // 客户端持久化存储与请求头安全 Key
  storageKey: "4kvm_gated_passcode_token",
  headerKey: "x-access-pin",

  // 弹窗与展示文案
  badgeText: "专享",
  title: "专享特约放映专区",
  description: "该板块已开启专区访问保护，请输入专属访问口令后进入观看",
};

/**
 * 校验某一级主分类名称是否属于特约受限专区
 */
export function isTypeGated(typeName?: string | null): boolean {
  if (!typeName) return false;
  return GATED_CONFIG.lockedTypes.includes(typeName);
}

/**
 * 校验某个细分子分类 ID 是否属于特约受限专区
 */
export function isTypeIdGated(typeId?: number | string | null): boolean {
  if (typeId === undefined || typeId === null) return false;
  const tid = typeof typeId === "number" ? typeId : parseInt(String(typeId), 10);
  return !isNaN(tid) && GATED_CONFIG.lockedTypeIds.includes(tid);
}

/**
 * 校验某个影片或分类对象是否属于受保护专区
 * 
 * 【优先级与判定逻辑：并集策略 (Union Policy)】
 * 1. Step 1 (粗粒度快速覆盖)：若其一级分类名称 (type_name) 在 lockedTypes 列表中，立刻判定为受限；
 * 2. Step 2 (细粒度精准补漏)：若一级分类未命中，但其具体子分类 ID (type_id) 在 lockedTypeIds 列表中，亦判定为受限；
 * 3. 命中任一规则即受保护！
 */
export function isItemGated(item?: { type_name?: string; type_id?: number | string } | null): boolean {
  if (!item) return false;
  if (item.type_name && isTypeGated(item.type_name)) {
    return true;
  }
  if (item.type_id !== undefined && item.type_id !== null && isTypeIdGated(item.type_id)) {
    return true;
  }
  return false;
}
