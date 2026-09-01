import { resolveIpLocation, formatTwoTierLocation, maskIp, getClientIp, clearIpCache } from "../src/lib/ip-service.ts";

const TEST_CASES = [
  { ip: "217.165.201.169", desc: "阿联酋 阿布扎比 (用户反馈IP)" },
  { ip: "5.36.0.1", desc: "阿联酋 迪拜/阿曼" },
  { ip: "94.200.0.1", desc: "阿联酋 迪拜/沙迦" },
  { ip: "114.114.114.114", desc: "中国 江苏/山东" },
  { ip: "220.181.38.148", desc: "中国 北京" },
  { ip: "113.96.16.1", desc: "中国 广东 广州" },
  { ip: "124.160.1.1", desc: "中国 浙江 杭州" },
  { ip: "203.208.60.1", desc: "中国 北京 海淀" },
  { ip: "140.112.1.1", desc: "中国台湾 台北" },
  { ip: "8.8.8.8", desc: "美国 弗吉尼亚/加州" },
  { ip: "133.242.0.1", desc: "日本 东京" },
  { ip: "13.124.0.1", desc: "韩国 首尔/仁川" },
  { ip: "139.162.0.1", desc: "新加坡/德国" },
  { ip: "185.86.151.11", desc: "英国 伦敦" },
  { ip: "103.28.248.1", desc: "新加坡" },
];

async function runTests() {
  console.log("=================================================");
  console.log("  4KVM IP 归属地解析与二段式格式化验证用例");
  console.log("=================================================\n");

  console.log("--- 1. 无 Headers (纯公网多源 API 实时穿透解析) 测试 ---");
  clearIpCache();
  for (const item of TEST_CASES) {
    const start = Date.now();
    const result = await resolveIpLocation(item.ip);
    const duration = Date.now() - start;
    console.log(`[IP] ${item.ip.padEnd(16)} | 预期参考: ${item.desc.padEnd(18)} | 解析结果: ${result.padEnd(20)} (${duration}ms)`);
  }

  console.log("\n--- 2. Cloudflare Headers 场景模拟测试 (阿联酋 217.165.201.169) ---");

  // 场景 A: Cloudflare 免费版/标准版仅下发 cf-ipcountry: 'AE' (无 cf-ipcity / 无 cf-region)
  clearIpCache();
  const headersCountryOnly = new Headers({
    "cf-connecting-ip": "217.165.201.169",
    "cf-ipcountry": "AE",
  });
  const resA = await resolveIpLocation("217.165.201.169", headersCountryOnly);
  console.log("场景 A (CF 仅下发 cf-ipcountry: 'AE'，自动回退并发公网 API 补齐城市):");
  console.log(" -> 解析结果:", resA);

  // 场景 B: Cloudflare 下发了 ISO 省份代码 cf-region-code: 'AZ' (Abu Dhabi)
  clearIpCache();
  const headersWithRegionCode = new Headers({
    "cf-connecting-ip": "217.165.201.169",
    "cf-ipcountry": "AE",
    "cf-region-code": "AZ",
  });
  const resB = await resolveIpLocation("217.165.201.169", headersWithRegionCode);
  console.log("场景 B (CF 下发 cf-ipcountry: 'AE' + cf-region-code: 'AZ'，零延迟格式化):");
  console.log(" -> 解析结果:", resB);

  // 场景 C: Cloudflare 开启 Transform 规则下发 URL 编码城市名 cf-ipcity: 'Abu%20Dhabi'
  clearIpCache();
  const headersWithCity = new Headers({
    "cf-connecting-ip": "217.165.201.169",
    "cf-ipcountry": "AE",
    "cf-ipcity": "Abu%20Dhabi",
    "cf-region": "Abu%20Dhabi",
  });
  const resC = await resolveIpLocation("217.165.201.169", headersWithCity);
  console.log("场景 C (CF 下发 cf-ipcity: 'Abu%20Dhabi'，零延迟解码格式化):");
  console.log(" -> 解析结果:", resC);

  // 场景 D: Cloudflare 中国境内真实节点
  clearIpCache();
  const headersChina = new Headers({
    "cf-connecting-ip": "113.96.16.1",
    "cf-ipcountry": "CN",
    "cf-region": "Guangdong",
    "cf-ipcity": "Guangzhou",
  });
  const resD = await resolveIpLocation("113.96.16.1", headersChina);
  console.log("场景 D (CF 中国IP: CN / Guangdong / Guangzhou):");
  console.log(" -> 解析结果:", resD);

  console.log("\n=================================================");
}

runTests();
