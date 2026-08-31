import { VodItem } from "./types";

export interface RoomMember {
  id: string;
  name: string;
  avatar: string;
  joinedAt: number;
  lastActive: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
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
  controlMode: "host" | "free";
  hostId: string;
  hostName: string;
  hostAvatar: string;
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

// Seed 2 default public demonstration rooms if empty
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
    members: [
      { id: "system_host_1", name: "灵狐看客_9921", avatar: "🦊", joinedAt: Date.now() - 600000, lastActive: Date.now() },
      { id: "member_2", name: "萌熊影迷_3312", avatar: "🐼", joinedAt: Date.now() - 300000, lastActive: Date.now() },
      { id: "member_3", name: "橘猫追剧_7718", avatar: "🐱", joinedAt: Date.now() - 120000, lastActive: Date.now() },
    ],
    chatMessages: [
      { id: "msg_1", senderId: "sys", senderName: "系统提示", senderAvatar: "📢", text: "欢迎来到《早春晴朗》公开放映厅，大家可以一边看剧一边交流！", time: "刚刚", isSystem: true },
      { id: "msg_2", senderId: "system_host_1", senderName: "灵狐看客_9921", senderAvatar: "🦊", text: "这一集男女主对峙戏份太好看了！", time: "刚刚" },
    ],
    createdAt: Date.now() - 600000,
    updatedAt: Date.now(),
  };

  const demoRoom2: WatchRoom = {
    id: "6666",
    title: "✨ 《繁花》沪语 4K 原画共赏房",
    vodId: "blossoms-shanghai",
    vodName: "繁花",
    vodPic: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop",
    sourceIndex: 0,
    episodeIndex: 0,
    episodeName: "第01集",
    streamUrl: "https://vod.feifei-online.com/20260408/537930_e534c6c3/index.m3u8",
    currentTime: 350,
    duration: 2800,
    isPlaying: true,
    isPublic: true,
    controlMode: "free",
    hostId: "system_host_2",
    hostName: "上海宝总_888",
    hostAvatar: "🦁",
    members: [
      { id: "system_host_2", name: "上海宝总_888", avatar: "🦁", joinedAt: Date.now() - 800000, lastActive: Date.now() },
      { id: "member_4", name: "独角兽_1102", avatar: "🦄", joinedAt: Date.now() - 400000, lastActive: Date.now() },
    ],
    chatMessages: [
      { id: "msg_3", senderId: "sys", senderName: "系统提示", senderAvatar: "📢", text: "欢迎进入《繁花》共赏房，画质已开启 1080P 超清！", time: "刚刚", isSystem: true },
      { id: "msg_4", senderId: "system_host_2", senderName: "上海宝总_888", senderAvatar: "🦁", text: "王家卫的镜头语言是真的绝！", time: "刚刚" },
    ],
    createdAt: Date.now() - 800000,
    updatedAt: Date.now(),
  };

  rooms.set(demoRoom1.id, demoRoom1);
  rooms.set(demoRoom2.id, demoRoom2);
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

  getAllPublicRooms(): WatchRoom[] {
    const list: WatchRoom[] = [];
    rooms.forEach((r) => {
      if (r.isPublic) {
        list.push(r);
      }
    });
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  createRoom(params: {
    title: string;
    vodItem: VodItem;
    sourceIndex?: number;
    episodeIndex?: number;
    isPublic?: boolean;
    controlMode?: "host" | "free";
    host: { id: string; name: string; avatar: string };
  }): WatchRoom {
    const { title, vodItem, sourceIndex = 0, episodeIndex = 0, isPublic = true, controlMode = "free", host } = params;

    const source = vodItem.sources[sourceIndex] || vodItem.sources[0];
    const episode = source?.episodes[episodeIndex] || source?.episodes[0] || { name: "正片", url: "" };

    const roomId = String(Math.floor(1000 + Math.random() * 9000));
    const now = Date.now();

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
      controlMode,
      hostId: host.id,
      hostName: host.name,
      hostAvatar: host.avatar,
      members: [
        {
          id: host.id,
          name: host.name,
          avatar: host.avatar,
          joinedAt: now,
          lastActive: now,
        },
      ],
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

  joinRoom(roomId: string, user: { id: string; name: string; avatar: string }): WatchRoom | null {
    const room = rooms.get(roomId);
    if (!room) return null;

    const existingIdx = room.members.findIndex((m) => m.id === user.id);
    const now = Date.now();

    if (existingIdx >= 0) {
      room.members[existingIdx].name = user.name;
      room.members[existingIdx].avatar = user.avatar;
      room.members[existingIdx].lastActive = now;
    } else {
      room.members.push({
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        joinedAt: now,
        lastActive: now,
      });

      // System notification
      const joinMsg: ChatMessage = {
        id: `msg_${now}_${Math.random()}`,
        senderId: "system",
        senderName: "系统",
        senderAvatar: "👋",
        text: `【${user.name}】进入了观影房`,
        time: "刚刚",
        isSystem: true,
      };
      room.chatMessages.push(joinMsg);
      broadcastRoomEvent(roomId, { type: "chat", message: joinMsg });
    }

    room.updatedAt = now;
    broadcastRoomEvent(roomId, { type: "members", members: room.members });
    return room;
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

    // Check permission if controlMode is host
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

  addChat(roomId: string, sender: { id: string; name: string; avatar: string }, text: string): ChatMessage | null {
    const room = rooms.get(roomId);
    if (!room || !text.trim()) return null;

    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      senderId: sender.id,
      senderName: sender.name,
      senderAvatar: sender.avatar,
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
