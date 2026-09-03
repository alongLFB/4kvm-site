/**
 * 4KVM 在线观影人数统计与防刷去重引擎
 * 全局单例维护所有在线活跃观看者（含单片播放页与放映室）
 */

export interface WatcherRecord {
  viewerId: string;        // 唯一设备/用户ID (如 guest_xxx)
  ip: string;              // 客户端IP
  pageType: "play" | "room";
  targetId: string;        // 视频ID (vodId) 或 房间ID (roomId)
  vodName?: string;        // 当前观看的影视名称
  lastSeen: number;        // 最后一次心跳时间戳 (ms)
  lastHeartbeatAt: number; // 上一次上报时间戳 (用于<5s节流)
}

interface IpRateLimit {
  count: number;
  resetAt: number;
}

// 核心配置常量
const TIMEOUT_MS = 45 * 1000;           // 45秒超时无心跳视为离线
const MIN_INTERVAL_MS = 5 * 1000;        // 同一viewerId最少间隔5秒心跳
const MAX_WATCHERS_PER_IP = 5;          // 单IP最多同时计入5个不同活跃观影设备 (防单机伪造UUID刷量)
const MAX_REQUESTS_PER_MIN_IP = 120;    // 单IP每分钟请求上限

// Node.js 全局单例保护，防止热重载或重复引入时状态丢失
declare global {
  var __4kvm_online_watchers__: Map<string, WatcherRecord> | undefined;
  var __4kvm_ip_rate_limits__: Map<string, IpRateLimit> | undefined;
  var __4kvm_clean_timer__: NodeJS.Timeout | undefined;
}

const watchers: Map<string, WatcherRecord> =
  global.__4kvm_online_watchers__ || new Map<string, WatcherRecord>();
global.__4kvm_online_watchers__ = watchers;

const ipRateLimits: Map<string, IpRateLimit> =
  global.__4kvm_ip_rate_limits__ || new Map<string, IpRateLimit>();
global.__4kvm_ip_rate_limits__ = ipRateLimits;

// 启动后台低频定时器，自动清理过期离线人员与过期频控
if (!global.__4kvm_clean_timer__) {
  global.__4kvm_clean_timer__ = setInterval(() => {
    OnlineWatcherStore.pruneExpired();
  }, 30 * 1000);
}

export const OnlineWatcherStore = {
  /**
   * 清理过期未响应的心跳以及过期的 IP 频控记录
   */
  pruneExpired(): void {
    const now = Date.now();
    for (const [id, record] of watchers.entries()) {
      if (now - record.lastSeen > TIMEOUT_MS) {
        watchers.delete(id);
      }
    }

    for (const [ip, limit] of ipRateLimits.entries()) {
      if (now > limit.resetAt) {
        ipRateLimits.delete(ip);
      }
    }
  },

  /**
   * 记录心跳请求并执行防刷与去重
   */
  recordHeartbeat(params: {
    viewerId: string;
    ip: string;
    pageType: "play" | "room";
    targetId: string;
    vodName?: string;
  }): {
    success: boolean;
    reason?: string;
    totalOnline: number;
    currentTargetOnline: number;
  } {
    const { viewerId, ip, pageType, targetId, vodName } = params;
    const now = Date.now();

    // 1. 合法性校验 (字符长度与格式防注入)
    if (!viewerId || typeof viewerId !== "string" || !/^[a-zA-Z0-9_\-:]{6,64}$/.test(viewerId)) {
      return {
        success: false,
        reason: "Invalid viewer ID",
        totalOnline: this.getTotalOnlineCount(),
        currentTargetOnline: this.getTargetOnlineCount(targetId),
      };
    }

    if (!targetId || typeof targetId !== "string" || targetId.length > 64) {
      return {
        success: false,
        reason: "Invalid target ID",
        totalOnline: this.getTotalOnlineCount(),
        currentTargetOnline: 0,
      };
    }

    // 2. 单 IP 每分钟限频检查
    const safeIp = ip || "127.0.0.1";
    let ipLimit = ipRateLimits.get(safeIp);
    if (!ipLimit || now > ipLimit.resetAt) {
      ipLimit = { count: 1, resetAt: now + 60 * 1000 };
      ipRateLimits.set(safeIp, ipLimit);
    } else {
      ipLimit.count++;
      if (ipLimit.count > MAX_REQUESTS_PER_MIN_IP) {
        return {
          success: false,
          reason: "Rate limit exceeded for IP",
          totalOnline: this.getTotalOnlineCount(),
          currentTargetOnline: this.getTargetOnlineCount(targetId),
        };
      }
    }

    // 3. 检查同 viewerId 心跳间隔 (防止客户端死循环或极端高频请求)
    const existing = watchers.get(viewerId);
    if (existing && now - existing.lastHeartbeatAt < MIN_INTERVAL_MS) {
      // 距离上次心跳小于 5 秒，节流直接返回当前在线数，不抛错也不重复刷更新
      return {
        success: true,
        totalOnline: this.getTotalOnlineCount(),
        currentTargetOnline: this.getTargetOnlineCount(targetId),
      };
    }

    // 4. 防刷攻击：检查该 IP 当前正在计入的独立 viewerId 数量
    // 如果已有记录属于该 viewerId，则允许更新；如果是全新 viewerId，检查是否超过单 IP 上限
    if (!existing) {
      let activeCountForThisIp = 0;
      for (const record of watchers.values()) {
        if (record.ip === safeIp && now - record.lastSeen <= TIMEOUT_MS) {
          activeCountForThisIp++;
        }
      }

      if (activeCountForThisIp >= MAX_WATCHERS_PER_IP) {
        // 超过单 IP 限制，说明可能是脚本单机批量刷量，拒绝新增
        return {
          success: false,
          reason: "Too many concurrent watchers from this IP",
          totalOnline: this.getTotalOnlineCount(),
          currentTargetOnline: this.getTargetOnlineCount(targetId),
        };
      }
    }

    // 5. 去重保存/更新活跃状态
    watchers.set(viewerId, {
      viewerId,
      ip: safeIp,
      pageType,
      targetId,
      vodName: vodName || existing?.vodName || "",
      lastSeen: now,
      lastHeartbeatAt: now,
    });

    return {
      success: true,
      totalOnline: this.getTotalOnlineCount(),
      currentTargetOnline: this.getTargetOnlineCount(targetId),
    };
  },

  /**
   * 用户离开 (关闭标签页、返回上一页等)
   */
  recordLeave(viewerId: string): void {
    if (viewerId && watchers.has(viewerId)) {
      watchers.delete(viewerId);
    }
  },

  /**
   * 获取全站实时去重在线观影总人数
   */
  getTotalOnlineCount(): number {
    this.pruneExpired();
    return watchers.size;
  },

  /**
   * 获取特定视频或放映室当前的正在观看人数
   */
  getTargetOnlineCount(targetId?: string): number {
    if (!targetId) return 0;
    const now = Date.now();
    let count = 0;
    for (const record of watchers.values()) {
      if (record.targetId === targetId && now - record.lastSeen <= TIMEOUT_MS) {
        count++;
      }
    }
    return count;
  },

  /**
   * 获取综合统计详情（供后台或详细展示）
   */
  getStats(targetId?: string): {
    totalOnline: number;
    currentTargetOnline: number;
    playCount: number;
    roomCount: number;
  } {
    this.pruneExpired();
    const now = Date.now();
    let playCount = 0;
    let roomCount = 0;
    let currentTargetOnline = 0;

    for (const record of watchers.values()) {
      if (now - record.lastSeen <= TIMEOUT_MS) {
        if (record.pageType === "play") playCount++;
        else if (record.pageType === "room") roomCount++;

        if (targetId && record.targetId === targetId) {
          currentTargetOnline++;
        }
      }
    }

    return {
      totalOnline: watchers.size,
      currentTargetOnline,
      playCount,
      roomCount,
    };
  },
};
