/**
 * 4KVM 专区加锁 / 口令解锁全局配置中心
 * 可随时在此自定义需要输入口令的一级主分类、细分子类或具体 type_id
 */
export const GATED_CONFIG = {
  // 解锁口令（支持在环境变量 NEXT_PUBLIC_GATED_PIN 中覆盖，默认口令 666888）
  passcode: process.env.NEXT_PUBLIC_GATED_PIN || "666888",

  // 需要加锁的一级主分类名称（可在数组中自由添加或修改，例如 ["体育", "综艺"]）
  lockedTypes: ["体育"],

  // 或者按具体 type_id 细粒度加锁（40-55 为体育各项赛事及电竞）
  lockedTypeIds: [40, 41, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55],

  // 客户端持久化存储与请求头安全 Key
  storageKey: "4kvm_gated_passcode_token",
  headerKey: "x-access-pin",

  // 弹窗与展示文案
  badgeText: "专享",
  title: "专享特约放映专区",
  description: "该板块已开启专区访问保护，请输入专属访问口令后进入观看",
};
