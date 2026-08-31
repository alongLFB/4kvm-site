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
  vodItem?: VodItem;
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
  switchMode: "host" | "free";
  hostId: string;
  hostName: string;
  hostAvatar: string;
  hostDevice: string;
  members: RoomMember[];
  chatMessages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  emptySince?: number;
}

// Global Singleton in Node.js
declare global {
  var __4kvm_rooms__: Map<string, WatchRoom> | undefined;
  var __4kvm_subscribers__: Map<string, Set<(event: any) => void>> | undefined;
  var __4kvm_cleaner_interval__: NodeJS.Timeout | undefined;
}

if (!global.__4kvm_rooms__) {
  global.__4kvm_rooms__ = new Map();
}

if (!global.__4kvm_subscribers__) {
  global.__4kvm_subscribers__ = new Map();
}

const rooms = global.__4kvm_rooms__;
const subscribers = global.__4kvm_subscribers__;

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

// Background cleanup worker (runs every 15s)
if (!global.__4kvm_cleaner_interval__) {
  global.__4kvm_cleaner_interval__ = setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, roomId) => {
      // 1. Remove members who haven't pinged in > 45 seconds
      const activeMembers = room.members.filter((m) => now - m.lastActive <= 45000);
      const offlineCount = room.members.length - activeMembers.length;

      if (offlineCount > 0) {
        const wasHostOffline = !activeMembers.some((m) => m.id === room.hostId);
        room.members = activeMembers;

        if (wasHostOffline && room.members.length > 0) {
          room.members.sort((a, b) => a.joinedAt - b.joinedAt);
          const newHost = room.members[0];
          const oldHostName = room.hostName;

          room.hostId = newHost.id;
          room.hostName = newHost.name;
          room.hostAvatar = newHost.avatar;
          room.hostDevice = newHost.device;
          room.updatedAt = now;

          const successionMsg: ChatMessage = {
            id: `msg_${now}_succession`,
            senderId: "system",
            senderName: "系统",
            senderAvatar: "👑",
            text: `原房主【${oldHostName}】已掉线，房主特权已自动顺延移交给【${newHost.name}】！`,
            time: "刚刚",
            isSystem: true,
          };
          room.chatMessages.push(successionMsg);
          broadcastRoomEvent(roomId, { type: "chat", message: successionMsg });
          broadcastRoomEvent(roomId, {
            type: "host_changed",
            hostId: newHost.id,
            hostName: newHost.name,
            hostAvatar: newHost.avatar,
            hostDevice: newHost.device,
          });
        }

        broadcastRoomEvent(roomId, { type: "members", members: room.members });
      }

      // 2. Track empty rooms and auto prune after 15 minutes of inactivity
      if (room.members.length === 0) {
        if (!room.emptySince) room.emptySince = now;
        if (now - room.emptySince > 900000) {
          rooms.delete(roomId);
        }
      } else {
        room.emptySince = undefined;
      }
    });
  }, 15000);
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
        switchMode: r.switchMode || "free",
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
    switchMode?: "host" | "free";
    host: { id: string; name: string; avatar: string; device?: string; location?: string; maskedIp?: string; fullIp?: string };
  }): WatchRoom {
    const { title, vodItem, sourceIndex = 0, episodeIndex = 0, isPublic = true, password = "", controlMode = "free", switchMode = "free", host } = params;

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
      vodItem,
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
      switchMode,
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
    switchMode?: "host" | "free";
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
    if (updates.switchMode) room.switchMode = updates.switchMode;
    if (updates.hostName) room.hostName = updates.hostName.trim();
    if (updates.hostAvatar) room.hostAvatar = updates.hostAvatar;

    room.updatedAt = Date.now();

    broadcastRoomEvent(roomId, {
      type: "settings_updated",
      title: room.title,
      isPublic: room.isPublic,
      hasPassword: !room.isPublic && !!room.password,
      controlMode: room.controlMode,
      switchMode: room.switchMode,
      hostName: room.hostName,
      hostAvatar: room.hostAvatar,
    });

    const sysMsg: ChatMessage = {
      id: `msg_${Date.now()}_sys`,
      senderId: "system",
      senderName: "系统",
      senderAvatar: "⚙️",
      text: `房主更新了房间设置（${room.isPublic ? "🌐 公开放映" : "🔒 私密放映"} · ${room.controlMode === "host" ? "👑 仅房主控进度" : "⚡ 全员自由控进度"} · ${room.switchMode === "host" ? "👑 仅房主可换集换源" : "⚡ 全员自由换集换源"}）`,
      time: "刚刚",
      isSystem: true,
    };
    room.chatMessages.push(sysMsg);
    broadcastRoomEvent(roomId, { type: "chat", message: sysMsg });

    return { success: true, room };
  },

  transferHost(roomId: string, currentHostId: string, targetUserId: string): { success: boolean; message?: string } {
    const room = rooms.get(roomId);
    if (!room) return { success: false, message: "房间不存在" };
    if (room.hostId !== currentHostId) return { success: false, message: "只有房主有权限移交房主" };

    const targetMember = room.members.find((m) => m.id === targetUserId);
    if (!targetMember) return { success: false, message: "目标用户不在房间中" };

    const oldHostName = room.hostName;
    room.hostId = targetMember.id;
    room.hostName = targetMember.name;
    room.hostAvatar = targetMember.avatar;
    room.hostDevice = targetMember.device;
    room.updatedAt = Date.now();

    const transferMsg: ChatMessage = {
      id: `msg_${Date.now()}_transfer`,
      senderId: "system",
      senderName: "系统",
      senderAvatar: "👑",
      text: `房主【${oldHostName}】已将房主管理特权主动移交给【${targetMember.name}】！`,
      time: "刚刚",
      isSystem: true,
    };
    room.chatMessages.push(transferMsg);
    broadcastRoomEvent(roomId, { type: "chat", message: transferMsg });
    broadcastRoomEvent(roomId, {
      type: "host_changed",
      hostId: targetMember.id,
      hostName: targetMember.name,
      hostAvatar: targetMember.avatar,
      hostDevice: targetMember.device,
    });
    broadcastRoomEvent(roomId, { type: "members", members: room.members });

    return { success: true };
  },

  kickMember(roomId: string, hostId: string, targetUserId: string): { success: boolean; message?: string } {
    const room = rooms.get(roomId);
    if (!room) return { success: false, message: "房间不存在" };
    if (room.hostId !== hostId) return { success: false, message: "只有房主有权限移出成员" };
    if (targetUserId === hostId) return { success: false, message: "房主不能踢出自己" };

    const target = room.members.find((m) => m.id === targetUserId);
    if (!target) return { success: false, message: "目标用户不存在" };

    room.members = room.members.filter((m) => m.id !== targetUserId);
    room.updatedAt = Date.now();

    const kickMsg: ChatMessage = {
      id: `msg_${Date.now()}_kick`,
      senderId: "system",
      senderName: "系统",
      senderAvatar: "🚫",
      text: `【${target.name}】已被房主移出房间`,
      time: "刚刚",
      isSystem: true,
    };
    room.chatMessages.push(kickMsg);
    broadcastRoomEvent(roomId, { type: "chat", message: kickMsg });
    broadcastRoomEvent(roomId, { type: "kicked", targetUserId });
    broadcastRoomEvent(roomId, { type: "members", members: room.members });

    return { success: true };
  },

  disbandRoom(roomId: string, hostId: string): { success: boolean; message?: string } {
    const room = rooms.get(roomId);
    if (!room) return { success: false, message: "房间不存在" };
    if (room.hostId !== hostId) return { success: false, message: "只有房主有权限解散房间" };

    broadcastRoomEvent(roomId, {
      type: "disbanded",
      message: `房主【${room.hostName}】已解散本放映厅，感谢大家的陪伴！`,
    });

    rooms.delete(roomId);
    return { success: true };
  },

  heartbeat(roomId: string, userId: string): boolean {
    const room = rooms.get(roomId);
    if (!room) return false;

    const member = room.members.find((m) => m.id === userId);
    if (member) {
      member.lastActive = Date.now();
      return true;
    }
    return false;
  },

  joinRoom(roomId: string, user: { id: string; name: string; avatar: string; device?: string; location?: string; maskedIp?: string; fullIp?: string }, password?: string): { success: boolean; message?: string; room?: WatchRoom } {
    const room = rooms.get(roomId);
    if (!room) return { success: false, message: "房间不存在" };

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
    room.emptySince = undefined;
    broadcastRoomEvent(roomId, { type: "members", members: room.members });
    return { success: true, room };
  },

  leaveRoom(roomId: string, userId: string, action?: "disband" | "transfer"): { success: boolean; message?: string } {
    const room = rooms.get(roomId);
    if (!room) return { success: false, message: "房间不存在" };

    const isHost = room.hostId === userId;
    const now = Date.now();

    if (isHost && action === "disband") {
      return this.disbandRoom(roomId, userId);
    }

    const member = room.members.find((m) => m.id === userId);
    room.members = room.members.filter((m) => m.id !== userId);

    if (member) {
      const leaveMsg: ChatMessage = {
        id: `msg_${now}_leave`,
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

    // If host left, automatically transfer to next member
    if (isHost) {
      if (room.members.length > 0) {
        room.members.sort((a, b) => a.joinedAt - b.joinedAt);
        const newHost = room.members[0];
        const oldHostName = room.hostName;

        room.hostId = newHost.id;
        room.hostName = newHost.name;
        room.hostAvatar = newHost.avatar;
        room.hostDevice = newHost.device;
        room.updatedAt = now;

        const successionMsg: ChatMessage = {
          id: `msg_${now}_auto_succession`,
          senderId: "system",
          senderName: "系统",
          senderAvatar: "👑",
          text: `原房主【${oldHostName}】已退出，房主特权已自动顺延移交给【${newHost.name}】！`,
          time: "刚刚",
          isSystem: true,
        };
        room.chatMessages.push(successionMsg);
        broadcastRoomEvent(roomId, { type: "chat", message: successionMsg });
        broadcastRoomEvent(roomId, {
          type: "host_changed",
          hostId: newHost.id,
          hostName: newHost.name,
          hostAvatar: newHost.avatar,
          hostDevice: newHost.device,
        });
      } else {
        room.emptySince = now;
      }
    }

    broadcastRoomEvent(roomId, { type: "members", members: room.members });
    return { success: true };
  },

  syncPlayback(
    roomId: string,
    action: {
      type: "play" | "pause" | "seek" | "source" | "episode" | "heartbeat";
      currentTime: number;
      duration?: number;
      sourceIndex?: number;
      sourceName?: string;
      episodeIndex?: number;
      episodeName?: string;
      streamUrl?: string;
      sender: { id: string; name: string };
    }
  ): boolean {
    const room = rooms.get(roomId);
    if (!room) return false;

    // Progress permission check
    if (room.controlMode === "host" && room.hostId !== action.sender.id && (action.type === "play" || action.type === "pause" || action.type === "seek")) {
      return false;
    }

    // Switch permission check
    if (room.switchMode === "host" && room.hostId !== action.sender.id && (action.type === "source" || action.type === "episode")) {
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
    } else if (action.type === "source") {
      if (typeof action.sourceIndex === "number") room.sourceIndex = action.sourceIndex;
      if (typeof action.episodeIndex === "number") room.episodeIndex = action.episodeIndex;
      if (action.episodeName) room.episodeName = action.episodeName;
      if (action.streamUrl) room.streamUrl = action.streamUrl;
      if (typeof action.currentTime === "number") room.currentTime = action.currentTime;

      const sourceMsg: ChatMessage = {
        id: `msg_${Date.now()}_src`,
        senderId: "system",
        senderName: "系统",
        senderAvatar: "📡",
        text: `【${action.sender.name}】切换播放线路至「${action.sourceName || "新线路"}」`,
        time: "刚刚",
        isSystem: true,
      };
      room.chatMessages.push(sourceMsg);
      broadcastRoomEvent(roomId, { type: "chat", message: sourceMsg });
      broadcastRoomEvent(roomId, {
        type: "sync",
        action: "source",
        sourceIndex: room.sourceIndex,
        episodeIndex: room.episodeIndex,
        episodeName: room.episodeName,
        streamUrl: room.streamUrl,
        currentTime: room.currentTime,
        sender: action.sender,
      });
    } else if (action.type === "episode") {
      if (typeof action.sourceIndex === "number") room.sourceIndex = action.sourceIndex;
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
        sourceIndex: room.sourceIndex,
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
