import { VodItem } from "./types";

export interface RoomMember {
  id: string;
  name: string;
  avatar: string;
  device: string;
  location: string;
  maskedIp: string;
  fullIp?: string;
  joinedAt: number;
  lastActive: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderDevice?: string;
  text: string;
  time: string;
  isSystem?: boolean;
}

export interface WatchRoom {
  id: string;
  title: string;
  vodId: string;
  vodName: string;
  vodPic: string;
  sourceIndex: number;
  episodeIndex: number;
  episodeName: string;
  streamUrl: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isPublic: boolean;
  password?: string;
  controlMode: "host" | "free";
  hostId: string;
  hostName: string;
  hostAvatar: string;
  hostDevice: string;
  members: RoomMember[];
  chatMessages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// Global Singleton in Node.js
declare global {
  var __4kvm_rooms__: Map<string, WatchRoom> | undefined;
  var __4kvm_subscribers__: Map<string, Set<(event: any) => void>> | undefined;
}

if (!global.__4kvm_rooms__) {
  global.__4kvm_rooms__ = new Map();
}

if (!global.__4kvm_subscribers__) {
  global.__4kvm_subscribers__ = new Map();
}

const rooms = global.__4kvm_rooms__;
const subscribers = global.__4kvm_subscribers__;

// Seed demo rooms
if (rooms.size === 0) {
  const demoRoom1: WatchRoom = {
    id: "8888",
    title: "🌸 《早春晴朗》超清追剧放映厅",
    vodId: "ch4izw8wt",
    vodName: "早春晴朗",
    vodPic: "https://gimg0.baidu.com/gimg/app=2001&n=0&g=0n&fmt=jpeg&src=4kvm.staticimgjs.org/uploads/2026/08/douban_1788053004-300x450.jpg",
    sourceIndex: 0,
    episodeIndex: 0,
    episodeName: "第01集",
    streamUrl: "https://oss.douyinbit.com/m3u8/d36b88127cc45aaf6e838fa266cd196c.m3u8",
    currentTime: 120,
    duration: 2700,
    isPlaying: true,
    isPublic: true,
    controlMode: "free",
    hostId: "system_host_1",
    hostName: "灵狐看客_9921",
    hostAvatar: "🦊",
    hostDevice: "📱 iPhone 手机",
    members: [
      { id: "system_host_1", name: "灵狐看客_9921", avatar: "🦊", device: "📱 iPhone 手机", location: "📍 北京", maskedIp: "123.114.*.*", fullIp: "123.114.88.21", joinedAt: Date.now() - 600000, lastActive: Date.now() },
      { id: "member_2", name: "萌熊影迷_3312", avatar: "🐼", device: "💻 Windows PC", location: "📍 广东 广州", maskedIp: "113.108.*.*", fullIp: "113.108.22.45", joinedAt: Date.now() - 300000, lastActive: Date.now() },
      { id: "member_3", name: "橘猫追剧_7718", avatar: "🐱", device: "📱 iPad 平板", location: "📍 浙江 杭州", maskedIp: "122.224.*.*", fullIp: "122.224.19.82", joinedAt: Date.now() - 120000, lastActive: Date.now() },
    ],
    chatMessages: [
      { id: "msg_1", senderId: "sys", senderName: "系统提示", senderAvatar: "📢", text: "欢迎来到《早春晴朗》公开放映厅，大家可以一边看剧一边交流！", time: "刚刚", isSystem: true },
      { id: "msg_2", senderId: "system_host_1", senderName: "灵狐看客_9921", senderAvatar: "🦊", senderDevice: "📱 iPhone 手机", text: "这一集男女主对峙戏份太好看了！", time: "刚刚" },
    ],
    createdAt: Date.now() - 600000,
    updatedAt: Date.now(),
  };

  const demoPrivateRoom: WatchRoom = {
    id: "5200",
    title: "🔒 好友私密观影专厅",
    vodId: "ch4izw8wt",
    vodName: "早春晴朗",
    vodPic: "https://gimg0.baidu.com/gimg/app=2001&n=0&g=0n&fmt=jpeg&src=4kvm.staticimgjs.org/uploads/2026/08/douban_1788053004-300x450.jpg",
    sourceIndex: 0,
    episodeIndex: 0,
    episodeName: "第01集",
    streamUrl: "https://oss.douyinbit.com/m3u8/d36b88127cc45aaf6e838fa266cd196c.m3u8",
    currentTime: 450,
    duration: 2700,
    isPlaying: true,
    isPublic: false,
    password: "666",
    controlMode: "host",
    hostId: "system_host_private",
    hostName: "独角兽_88",
    hostAvatar: "🦄",
    hostDevice: "💻 Mac 电脑",
    members: [
      { id: "system_host_private", name: "独角兽_88", avatar: "🦄", device: "💻 Mac 电脑", location: "📍 上海", maskedIp: "222.66.*.*", fullIp: "222.66.12.8", joinedAt: Date.now() - 400000, lastActive: Date.now() },
    ],
    chatMessages: [
      { id: "msg_p1", senderId: "sys", senderName: "系统提示", senderAvatar: "📢", text: "欢迎来到私密放映厅！", time: "刚刚", isSystem: true },
    ],
    createdAt: Date.now() - 400000,
    updatedAt: Date.now(),
  };

  rooms.set(demoRoom1.id, demoRoom1);
  rooms.set(demoPrivateRoom.id, demoPrivateRoom);
}

export function broadcastRoomEvent(roomId: string, eventData: any) {
  const set = subscribers.get(roomId);
  if (set) {
    set.forEach((cb) => {
      try {
        cb(eventData);
      } catch (e) {}
    });
  }
}

export function subscribeRoom(roomId: string, callback: (eventData: any) => void) {
  if (!subscribers.has(roomId)) {
    subscribers.set(roomId, new Set());
  }
  const set = subscribers.get(roomId)!;
  set.add(callback);

  return () => {
    set.delete(callback);
    if (set.size === 0) {
      subscribers.delete(roomId);
    }
  };
}

export const RoomStore = {
  getRoom(id: string): WatchRoom | null {
    return rooms.get(id) || null;
  },

  getAllRoomsForHall(): any[] {
    const list: any[] = [];
    rooms.forEach((r) => {
      list.push({
        id: r.id,
        title: r.title,
        vodId: r.vodId,
        vodName: r.vodName,
        vodPic: r.vodPic,
        episodeName: r.episodeName,
        currentTime: r.currentTime,
        isPlaying: r.isPlaying,
        isPublic: r.isPublic,
        hasPassword: !r.isPublic && !!r.password,
        controlMode: r.controlMode,
        hostId: r.hostId,
        hostName: r.hostName,
        hostAvatar: r.hostAvatar,
        hostDevice: r.hostDevice,
        memberCount: r.members.length,
        updatedAt: r.updatedAt,
      });
    });
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  createRoom(params: {
    title: string;
    vodItem: VodItem;
    sourceIndex?: number;
    episodeIndex?: number;
    isPublic?: boolean;
    password?: string;
    controlMode?: "host" | "free";
    host: { id: string; name: string; avatar: string; device?: string; location?: string; maskedIp?: string; fullIp?: string };
  }): WatchRoom {
    const { title, vodItem, sourceIndex = 0, episodeIndex = 0, isPublic = true, password = "", controlMode = "free", host } = params;

    const source = vodItem.sources[sourceIndex] || vodItem.sources[0];
    const episode = source?.episodes[episodeIndex] || source?.episodes[0] || { name: "正片", url: "" };

    const roomId = String(Math.floor(1000 + Math.random() * 9000));
    const now = Date.now();

    const hostMember: RoomMember = {
      id: host.id,
      name: host.name,
      avatar: host.avatar,
      device: host.device || "💻 网页端",
      location: host.location || "📍 中国",
      maskedIp: host.maskedIp || "127.0.0.*",
      fullIp: host.fullIp || "127.0.0.1",
      joinedAt: now,
      lastActive: now,
    };

    const room: WatchRoom = {
      id: roomId,
      title: title || `${vodItem.name} 观影房`,
      vodId: vodItem.id,
      vodName: vodItem.name,
      vodPic: vodItem.pic,
      sourceIndex,
      episodeIndex,
      episodeName: episode.name,
      streamUrl: episode.url,
      currentTime: 0,
      duration: 0,
      isPlaying: true,
      isPublic,
      password: isPublic ? undefined : password.trim(),
      controlMode,
      hostId: host.id,
      hostName: host.name,
      hostAvatar: host.avatar,
      hostDevice: hostMember.device,
      members: [hostMember],
      chatMessages: [
        {
          id: `msg_${now}`,
          senderId: "system",
          senderName: "系统",
          senderAvatar: "📢",
          text: `🎉 房间创建成功！欢迎加入《${vodItem.name}》一起看！`,
          time: "刚刚",
          isSystem: true,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    rooms.set(roomId, room);
    return room;
  },

  updateSettings(roomId: string, hostId: string, updates: {
    title?: string;
    isPublic?: boolean;
    password?: string;
    controlMode?: "host" | "free";
    hostName?: string;
    hostAvatar?: string;
  }): { success: boolean; message?: string; room?: WatchRoom } {
    const room = rooms.get(roomId);
    if (!room) return { success: false, message: "房间不存在" };
    if (room.hostId !== hostId) return { success: false, message: "只有房主有权限修改房间设置" };

    if (updates.title) room.title = updates.title.trim();
    if (typeof updates.isPublic === "boolean") {
      room.isPublic = updates.isPublic;
      if (room.isPublic) {
        room.password = undefined;
      } else if (updates.password !== undefined) {
        room.password = updates.password.trim();
      }
    } else if (updates.password !== undefined && !room.isPublic) {
      room.password = updates.password.trim();
    }

    if (updates.controlMode) room.controlMode = updates.controlMode;
    if (updates.hostName) room.hostName = updates.hostName.trim();
    if (updates.hostAvatar) room.hostAvatar = updates.hostAvatar;

    room.updatedAt = Date.now();

    // Broadcast update
    broadcastRoomEvent(roomId, {
      type: "settings_updated",
      title: room.title,
      isPublic: room.isPublic,
      hasPassword: !room.isPublic && !!room.password,
      controlMode: room.controlMode,
      hostName: room.hostName,
      hostAvatar: room.hostAvatar,
    });

    const sysMsg: ChatMessage = {
      id: `msg_${Date.now()}_sys`,
      senderId: "system",
      senderName: "系统",
      senderAvatar: "⚙️",
      text: `房主更新了房间设置（${room.isPublic ? "🌐 公开放映" : "🔒 私密放映"} · ${room.controlMode === "host" ? "👑 仅房主可控" : "⚡ 全员自由控制"}）`,
      time: "刚刚",
      isSystem: true,
    };
    room.chatMessages.push(sysMsg);
    broadcastRoomEvent(roomId, { type: "chat", message: sysMsg });

    return { success: true, room };
  },

  joinRoom(roomId: string, user: { id: string; name: string; avatar: string; device?: string; location?: string; maskedIp?: string; fullIp?: string }, password?: string): { success: boolean; message?: string; room?: WatchRoom } {
    const room = rooms.get(roomId);
    if (!room) return { success: false, message: "房间不存在" };

    // Check password if private and user is not host
    if (!room.isPublic && room.password && user.id !== room.hostId) {
      if (!password || password.trim() !== room.password.trim()) {
        return { success: false, message: "房间口令/密码错误" };
      }
    }

    const existingIdx = room.members.findIndex((m) => m.id === user.id);
    const now = Date.now();

    if (existingIdx >= 0) {
      room.members[existingIdx].name = user.name;
      room.members[existingIdx].avatar = user.avatar;
      if (user.device) room.members[existingIdx].device = user.device;
      if (user.location) room.members[existingIdx].location = user.location;
      if (user.maskedIp) room.members[existingIdx].maskedIp = user.maskedIp;
      if (user.fullIp) room.members[existingIdx].fullIp = user.fullIp;
      room.members[existingIdx].lastActive = now;
    } else {
      const newMember: RoomMember = {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        device: user.device || "💻 网页端",
        location: user.location || "📍 中国",
        maskedIp: user.maskedIp || "127.0.0.*",
        fullIp: user.fullIp || "127.0.0.1",
        joinedAt: now,
        lastActive: now,
      };

      room.members.push(newMember);

      const joinMsg: ChatMessage = {
        id: `msg_${now}_${Math.random()}`,
        senderId: "system",
        senderName: "系统",
        senderAvatar: "👋",
        text: `【${user.name}】（来自 ${newMember.location} · ${newMember.device}）进入了观影房`,
        time: "刚刚",
        isSystem: true,
      };
      room.chatMessages.push(joinMsg);
      broadcastRoomEvent(roomId, { type: "chat", message: joinMsg });
    }

    room.updatedAt = now;
    broadcastRoomEvent(roomId, { type: "members", members: room.members });
    return { success: true, room };
  },

  leaveRoom(roomId: string, userId: string) {
    const room = rooms.get(roomId);
    if (!room) return;

    const member = room.members.find((m) => m.id === userId);
    room.members = room.members.filter((m) => m.id !== userId);

    if (member) {
      const leaveMsg: ChatMessage = {
        id: `msg_${Date.now()}_leave`,
        senderId: "system",
        senderName: "系统",
        senderAvatar: "🚪",
        text: `【${member.name}】离开了房间`,
        time: "刚刚",
        isSystem: true,
      };
      room.chatMessages.push(leaveMsg);
      broadcastRoomEvent(roomId, { type: "chat", message: leaveMsg });
    }

    broadcastRoomEvent(roomId, { type: "members", members: room.members });
  },

  syncPlayback(
    roomId: string,
    action: {
      type: "play" | "pause" | "seek" | "episode" | "heartbeat";
      currentTime: number;
      duration?: number;
      episodeIndex?: number;
      episodeName?: string;
      streamUrl?: string;
      sender: { id: string; name: string };
    }
  ): boolean {
    const room = rooms.get(roomId);
    if (!room) return false;

    if (room.controlMode === "host" && room.hostId !== action.sender.id && action.type !== "heartbeat") {
      return false;
    }

    room.currentTime = action.currentTime;
    if (action.duration) room.duration = action.duration;
    room.updatedAt = Date.now();

    if (action.type === "play") {
      room.isPlaying = true;
      broadcastRoomEvent(roomId, { type: "sync", action: "play", currentTime: room.currentTime, sender: action.sender });
    } else if (action.type === "pause") {
      room.isPlaying = false;
      broadcastRoomEvent(roomId, { type: "sync", action: "pause", currentTime: room.currentTime, sender: action.sender });
    } else if (action.type === "seek") {
      broadcastRoomEvent(roomId, { type: "sync", action: "seek", currentTime: room.currentTime, sender: action.sender });
    } else if (action.type === "episode") {
      if (typeof action.episodeIndex === "number") room.episodeIndex = action.episodeIndex;
      if (action.episodeName) room.episodeName = action.episodeName;
      if (action.streamUrl) room.streamUrl = action.streamUrl;
      room.currentTime = 0;
      room.isPlaying = true;

      const epMsg: ChatMessage = {
        id: `msg_${Date.now()}_ep`,
        senderId: "system",
        senderName: "系统",
        senderAvatar: "🎬",
        text: `【${action.sender.name}】切换到了 ${room.episodeName}`,
        time: "刚刚",
        isSystem: true,
      };
      room.chatMessages.push(epMsg);
      broadcastRoomEvent(roomId, { type: "chat", message: epMsg });
      broadcastRoomEvent(roomId, {
        type: "sync",
        action: "episode",
        episodeIndex: room.episodeIndex,
        episodeName: room.episodeName,
        streamUrl: room.streamUrl,
        currentTime: 0,
        sender: action.sender,
      });
    }

    return true;
  },

  addChat(roomId: string, sender: { id: string; name: string; avatar: string; device?: string }, text: string): ChatMessage | null {
    const room = rooms.get(roomId);
    if (!room || !text.trim()) return null;

    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      senderId: sender.id,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      senderDevice: sender.device,
      text: text.trim(),
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    };

    room.chatMessages.push(msg);
    if (room.chatMessages.length > 100) {
      room.chatMessages = room.chatMessages.slice(-100);
    }
    room.updatedAt = Date.now();

    broadcastRoomEvent(roomId, { type: "chat", message: msg });
    return msg;
  },
};
