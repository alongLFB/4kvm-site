"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Users,
  Share2,
  Check,
  Send,
  Globe,
  Lock,
  Crown,
  Zap,
  MessageSquare,
  List,
  Edit2,
  ArrowLeft,
  Loader2,
  Shield,
  Eye,
  EyeOff,
  Settings,
  Radio,
  Film,
  MapPin,
  Trash2,
  UserCheck,
  UserX,
  X,
  AlertTriangle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { WatchRoom, ChatMessage, RoomMember } from "@/lib/room-store";
import { VodItem } from "@/lib/types";
import { getGuestUser, updateGuestUser, GuestUser } from "@/lib/guest";
import { RoomSettingsModal } from "@/components/RoomSettingsModal";
import { FilmPickerModal } from "@/components/FilmPickerModal";
import { RoomPlayerHandle } from "@/components/Player/RoomVideoPlayer";

const RoomVideoPlayer = dynamic(() => import("@/components/Player/RoomVideoPlayer"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video rounded-2xl bg-dark-900 flex items-center justify-center border border-white/10 text-gray-400">
      <div className="animate-pulse flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        <span className="text-xs">加载放映流中...</span>
      </div>
    </div>
  ),
});

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPassword = searchParams.get("pwd") || "";

  const [currentUser, setCurrentUser] = useState<GuestUser>({ id: "", name: "游客", avatar: "🐱", device: "💻 网页端" });
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");

  const [room, setRoom] = useState<WatchRoom | null>(null);
  const [vodItem, setVodItem] = useState<VodItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [showFullIp, setShowFullIp] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [permissionTip, setPermissionTip] = useState<string | null>(null);
  const [isWebFullscreen, setIsWebFullscreen] = useState(false);

  // In-Room Film Switcher Modal state
  const [changeVodModalOpen, setChangeVodModalOpen] = useState(false);

  // Host Exit Modal state
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [disbandNotice, setDisbandNotice] = useState<string | null>(null);

  // Private room password prompt if unauthorized
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [roomPasswordInput, setRoomPasswordInput] = useState(urlPassword);

  // Tabs: episodes | chat | members
  const [activeTab, setActiveTab] = useState<"episodes" | "chat" | "members">("episodes");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const playerHandleRef = useRef<RoomPlayerHandle | null>(null);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isHost = room ? room.hostId === currentUser.id : false;
  const canControl = isHost || (room?.controlMode !== "host");
  const canSwitch = isHost || (room?.switchMode !== "host");
  const otherMembers = members.filter((m) => m.id !== currentUser.id);

  const showPermToast = (msg: string) => {
    setPermissionTip(msg);
    setTimeout(() => setPermissionTip(null), 3000);
  };

  const joinWithPassword = (pwd: string) => {
    const user = getGuestUser();
    setLoading(true);
    setErrorMsg("");

    fetch(`/api/room/${roomId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, password: pwd }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 200 && data.data) {
          setRoom(data.data);
          setMessages(data.data.chatMessages || []);
          setMembers(data.data.members || []);
          setPasswordRequired(false);
        } else {
          setPasswordRequired(true);
          setErrorMsg(data.message || "口令错误，请重新输入");
        }
        setLoading(false);
      })
      .catch(() => {
        setErrorMsg("连接房间失败");
        setLoading(false);
      });
  };

  useEffect(() => {
    const user = getGuestUser();
    setCurrentUser(user);
    setNewName(user.name);

    // 1. Fetch initial room state
    fetch(`/api/room/${roomId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 200 && data.data) {
          setRoom(data.data.room);
          setVodItem(data.data.vodItem);
          setMessages(data.data.room.chatMessages || []);
          setMembers(data.data.room.members || []);

          if (!data.data.room.isPublic && data.data.room.password && data.data.room.hostId !== user.id) {
            if (urlPassword) {
              joinWithPassword(urlPassword);
            } else {
              setPasswordRequired(true);
              setLoading(false);
              return;
            }
          } else {
            joinWithPassword("");
          }
        } else {
          setErrorMsg(data.message || "房间不存在");
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });

    // 2. Connect to SSE EventStream
    const eventSource = new EventSource(`/api/room/${roomId}/events`);

    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "chat") {
          setMessages((prev) => [...prev, payload.message]);
        } else if (payload.type === "members") {
          setMembers(payload.members);
        } else if (payload.type === "settings_updated") {
          setRoom((prev) => (prev ? { ...prev, ...payload } : null));
        } else if (payload.type === "vod_changed") {
          setRoom(payload.room);
          setVodItem(payload.vodItem);
        } else if (payload.type === "host_changed") {
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  hostId: payload.hostId,
                  hostName: payload.hostName,
                  hostAvatar: payload.hostAvatar,
                  hostDevice: payload.hostDevice,
                }
              : null
          );
        } else if (payload.type === "disbanded") {
          setDisbandNotice(payload.message || "房主已解散本放映厅");
          setTimeout(() => router.push("/hall"), 2500);
        } else if (payload.type === "kicked") {
          if (payload.targetUserId === user.id) {
            setDisbandNotice("您已被房主移出本放映厅");
            setTimeout(() => router.push("/hall"), 2500);
          }
        } else if (payload.type === "sync") {
          const handle = playerHandleRef.current;
          if (!handle) return;

          if (payload.action === "play") {
            handle.syncPlay(payload.currentTime);
          } else if (payload.action === "pause") {
            handle.syncPause(payload.currentTime);
          } else if (payload.action === "seek") {
            handle.syncTime(payload.currentTime);
          } else if (payload.action === "web_fullscreen") {
            setIsWebFullscreen(!!payload.isWebFullscreen);
            handle.syncWebFullscreen(!!payload.isWebFullscreen);
          } else if (payload.action === "source" || payload.action === "episode") {
            if (payload.streamUrl) {
              setRoom((prev) =>
                prev
                  ? {
                      ...prev,
                      sourceIndex: typeof payload.sourceIndex === "number" ? payload.sourceIndex : prev.sourceIndex,
                      episodeIndex: typeof payload.episodeIndex === "number" ? payload.episodeIndex : prev.episodeIndex,
                      episodeName: payload.episodeName || prev.episodeName,
                      streamUrl: payload.streamUrl,
                      currentTime: payload.currentTime || 0,
                    }
                  : null
              );
            }
          }
        }
      } catch (err) {}
    };

    // 3. Heartbeat ping every 10s
    const heartbeatInterval = setInterval(() => {
      fetch(`/api/room/${roomId}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      }).catch(() => {});
    }, 10000);

    // 4. Reliable Tab Close / Pagehide leave beacon
    const handleUnload = () => {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          `/api/room/${roomId}/leave`,
          JSON.stringify({ userId: user.id, action: "transfer" })
        );
      }
    };
    window.addEventListener("pagehide", handleUnload);

    return () => {
      eventSource.close();
      clearInterval(heartbeatInterval);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [roomId, router]);

  // Auto scroll chat inside container only
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Back button click handler with Host Protection Modal
  const handleBackClick = () => {
    if (isHost) {
      setExitModalOpen(true);
    } else {
      fetch(`/api/room/${roomId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      router.push("/hall");
    }
  };

  const handleHostTransferAndExit = () => {
    fetch(`/api/room/${roomId}/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, action: "transfer" }),
    });
    router.push("/hall");
  };

  const handleHostDisbandAndExit = () => {
    fetch(`/api/room/${roomId}/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, action: "disband" }),
    });
    router.push("/hall");
  };

  const handleManualTransfer = (targetUserId: string) => {
    fetch(`/api/room/${roomId}/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: currentUser.id, targetUserId }),
    });
  };

  const handleKickMember = (targetUserId: string) => {
    fetch(`/api/room/${roomId}/kick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: currentUser.id, targetUserId }),
    });
  };

  const handleConfirmChangeVod = async (newVod: VodItem) => {
    if (!canSwitch) {
      showPermToast("👑 房主已设置【仅房主可换集换源】权限");
      return;
    }
    try {
      const res = await fetch(`/api/room/${roomId}/change-vod`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostId: currentUser.id,
          vodItem: newVod,
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setChangeVodModalOpen(false);
      } else {
        showPermToast(data.message || "更换影片失败");
      }
    } catch (e) {
      showPermToast("请求失败");
    }
  };

  // Toggle Web Fullscreen & Sync across room
  const toggleWebFullscreen = () => {
    const nextState = !isWebFullscreen;
    setIsWebFullscreen(nextState);
    const handle = playerHandleRef.current;
    if (handle) {
      handle.syncWebFullscreen(nextState);
    }

    const user = getGuestUser();
    fetch(`/api/room/${roomId}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "web_fullscreen",
        isWebFullscreen: nextState,
        sender: { id: user.id, name: user.name },
      }),
    });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    fetch(`/api/room/${roomId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: currentUser,
        text: chatInput,
      }),
    });
    setChatInput("");
  };

  const handleSendEmoji = (emoji: string) => {
    fetch(`/api/room/${roomId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: currentUser,
        text: emoji,
      }),
    });
  };

  // Switch Line / Source with permission check
  const handleSwitchSource = (sourceIdx: number) => {
    if (!canSwitch) {
      showPermToast("👑 房主已开启【仅房主可换集换源】特权");
      return;
    }
    if (!vodItem || !room) return;
    const targetSource = vodItem.sources[sourceIdx];
    if (!targetSource) return;

    const targetEpIndex = Math.min(room.episodeIndex, targetSource.episodes.length - 1);
    const targetEp = targetSource.episodes[targetEpIndex] || targetSource.episodes[0];
    const art = playerHandleRef.current?.art;
    const currentTime = art ? art.currentTime : room.currentTime;

    setRoom((prev) =>
      prev
        ? {
            ...prev,
            sourceIndex: sourceIdx,
            episodeIndex: targetEpIndex,
            episodeName: targetEp.name,
            streamUrl: targetEp.url,
            currentTime,
          }
        : null
    );

    const user = getGuestUser();
    fetch(`/api/room/${roomId}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "source",
        sourceIndex: sourceIdx,
        sourceName: targetSource.sourceName,
        episodeIndex: targetEpIndex,
        episodeName: targetEp.name,
        streamUrl: targetEp.url,
        currentTime: currentTime,
        sender: { id: user.id, name: user.name },
      }),
    });
  };

  // Switch Episode with permission check
  const handleSwitchEpisode = (idx: number, ep: { name: string; url: string }) => {
    if (!canSwitch) {
      showPermToast("👑 房主已开启【仅房主可换集换源】特权");
      return;
    }
    if (!room) return;

    setRoom((prev) =>
      prev
        ? {
            ...prev,
            episodeIndex: idx,
            episodeName: ep.name,
            streamUrl: ep.url,
            currentTime: 0,
          }
        : null
    );

    const user = getGuestUser();
    fetch(`/api/room/${roomId}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "episode",
        sourceIndex: room?.sourceIndex || 0,
        episodeIndex: idx,
        episodeName: ep.name,
        streamUrl: ep.url,
        currentTime: 0,
        sender: { id: user.id, name: user.name },
      }),
    });
  };

  // Player Sync Handlers
  const handlePlayerPlay = (currentTime: number) => {
    const user = getGuestUser();
    fetch(`/api/room/${roomId}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "play",
        currentTime: currentTime,
        sender: { id: user.id, name: user.name },
      }),
    });
  };

  const handlePlayerPause = (currentTime: number) => {
    const user = getGuestUser();
    fetch(`/api/room/${roomId}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "pause",
        currentTime: currentTime,
        sender: { id: user.id, name: user.name },
      }),
    });
  };

  const handlePlayerSeek = (seekTime: number) => {
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }
    seekTimeoutRef.current = setTimeout(() => {
      const user = getGuestUser();
      fetch(`/api/room/${roomId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "seek",
          currentTime: seekTime,
          sender: { id: user.id, name: user.name },
        }),
      });
    }, 250);
  };

  const copyRoomLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const saveNewName = () => {
    if (newName.trim()) {
      const updated = updateGuestUser({ name: newName.trim() });
      setCurrentUser(updated);
      setEditingName(false);
      fetch(`/api/room/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: updated }),
      });
    }
  };

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-sm">正在进入同步放映厅...</span>
      </div>
    );
  }

  // Overlay Notice for Room Disbanded or Kicked
  if (disbandNotice) {
    return (
      <div className="py-32 flex flex-col items-center justify-center gap-4 text-center max-w-md mx-auto p-6 rounded-3xl bg-dark-900 border border-white/10 shadow-2xl">
        <AlertTriangle className="w-10 h-10 text-amber-400 animate-bounce" />
        <h2 className="text-lg font-bold text-white">{disbandNotice}</h2>
        <p className="text-xs text-gray-400">即将自动为您返回放映广场...</p>
        <Link href="/hall" className="px-4 py-2 bg-cyan-500 text-dark-950 font-bold text-xs rounded-xl">
          立即返回广场
        </Link>
      </div>
    );
  }

  // Password Prompt Screen
  if (passwordRequired && room) {
    return (
      <div className="py-24 max-w-md mx-auto space-y-6">
        <div className="p-8 rounded-3xl bg-dark-900 border border-white/10 shadow-2xl space-y-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">🔒 这是一个私密观影房</h2>
            <p className="text-xs text-gray-400">房主已设置入房口令，请输入口令方可同步加入</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              joinWithPassword(roomPasswordInput);
            }}
            className="space-y-4"
          >
            <input
              type="text"
              autoFocus
              value={roomPasswordInput}
              onChange={(e) => setRoomPasswordInput(e.target.value)}
              placeholder="请输入入房口令 / 密码..."
              className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 font-mono text-center"
            />

            {errorMsg && <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-dark-950 font-bold text-xs transition shadow-lg shadow-amber-500/20"
            >
              验证口令并同步进入
            </button>
          </form>

          <Link href="/hall" className="text-xs text-gray-500 hover:text-cyan-400 block">
            返回放映广场
          </Link>
        </div>
      </div>
    );
  }

  if (!room || !vodItem) {
    return (
      <div className="py-24 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">{errorMsg || "房间不存在或已解散"}</h2>
        <Link href="/hall" className="text-xs text-cyan-400 hover:underline">
          返回放映广场
        </Link>
      </div>
    );
  }

  const currentSource = vodItem.sources[room.sourceIndex] || vodItem.sources[0];
  const episodes = currentSource?.episodes || [];
  const nextSuccessor = otherMembers[0];

  return (
    <div className="space-y-6">
      {/* Permission Alert Toast */}
      {permissionTip && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[999999] px-4 py-2 bg-amber-500 text-dark-950 font-bold text-xs rounded-full shadow-2xl animate-in fade-in slide-in-from-top-4 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          {permissionTip}
        </div>
      )}

      {/* Top Header Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-dark-900 border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackClick}
            className="p-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white transition"
            title="退出放映厅"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white">{room.title}</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-md">
                房号: {room.id}
              </span>
              {!room.isPublic && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> 私密
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 flex flex-wrap items-center gap-2 mt-0.5">
              <span>片名: <strong className="text-white">{room.vodName}</strong></span>
              <span>·</span>
              <span className="text-cyan-400 font-semibold">{room.episodeName}</span>
              <span>·</span>
              <span className="text-emerald-400 font-medium">{currentSource.sourceName}</span>
              <span>·</span>
              <span className={room.controlMode === "host" ? "text-amber-400 font-bold" : "text-gray-300"}>
                {room.controlMode === "host" ? "👑 仅房主控进度" : "⚡ 全员自由控进度"}
              </span>
              <span>·</span>
              <span className={room.switchMode === "host" ? "text-amber-400 font-bold" : "text-gray-300"}>
                {room.switchMode === "host" ? "👑 仅房主可换集换源" : "⚡ 全员自由换集换源"}
              </span>
            </p>
          </div>
        </div>

        {/* User Identity, Settings & Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Change Film Button (In-Room Movie Switcher) */}
          <button
            onClick={() => {
              if (!canSwitch) {
                showPermToast("👑 房主已开启【仅房主可换集换源】特权");
                return;
              }
              setChangeVodModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-cyan-500/20 hover:from-blue-600 hover:to-cyan-500 text-cyan-300 hover:text-dark-950 font-bold text-xs transition flex items-center gap-1.5 border border-cyan-500/30 shadow-md"
          >
            <Film className="w-3.5 h-3.5" />
            更换放映影片
          </button>

          {/* Web Fullscreen Sync Toggle */}
          <button
            onClick={toggleWebFullscreen}
            className="p-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white transition border border-white/10"
            title={isWebFullscreen ? "退出网页全屏" : "同步网页全屏剧场模式"}
          >
            {isWebFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Host Settings button */}
          {isHost && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-gold-400/15 hover:bg-gold-400 text-gold-400 hover:text-dark-950 font-bold text-xs transition flex items-center gap-1.5 border border-gold-400/30 shadow-md"
            >
              <Settings className="w-3.5 h-3.5" />
              房间设置
            </button>
          )}

          {/* Guest badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-800 border border-white/10 text-xs">
            <span>{currentUser.avatar}</span>
            {editingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-24 bg-dark-950 text-xs text-white px-2 py-0.5 rounded border border-cyan-500 focus:outline-none"
                />
                <button onClick={saveNewName} className="text-cyan-400 text-[10px] font-bold">
                  保存
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white">{currentUser.name}</span>
                <span className="text-[10px] text-cyan-400/80 bg-cyan-500/10 px-1.5 py-0.2 rounded">{currentUser.device}</span>
                <button onClick={() => setEditingName(true)} className="text-gray-500 hover:text-cyan-400">
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={copyRoomLink}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-dark-950 font-bold text-xs transition flex items-center gap-1.5 border border-cyan-500/30 shadow-md"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? "已复制邀请链接" : "邀请好友"}
          </button>
        </div>
      </div>

      {/* Main Grid: Player + Interaction Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Dedicated Room Video Player */}
        <div className="lg:col-span-2 space-y-4">
          <RoomVideoPlayer
            url={room.streamUrl}
            poster={room.vodPic || ""}
            initialTime={room.currentTime}
            canControl={canControl}
            onReadyInstance={(handle) => {
              playerHandleRef.current = handle;
            }}
            onPlay={handlePlayerPlay}
            onPause={handlePlayerPause}
            onSeek={handlePlayerSeek}
            onPermissionDenied={(msg) => showPermToast(msg)}
          />

          {/* Quick Info bar */}
          <div className="p-4 rounded-2xl bg-dark-900 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>当前线路：<strong className="text-cyan-400">{currentSource.sourceName}</strong> · 延迟 &lt; 30ms</span>
            </div>
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Users className="w-4 h-4" />
              <span>{members.length} 人在线实时共赏</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Chat, Members & Episodes/Sources */}
        <div className="bg-dark-900 border border-white/10 rounded-2xl flex flex-col h-[520px] lg:h-[580px] shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/10 bg-dark-950/50">
            <button
              onClick={() => setActiveTab("episodes")}
              className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === "episodes"
                  ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              选集与线路
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === "chat"
                  ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              公屏聊天
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === "members"
                  ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              观众 ({members.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === "episodes" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {/* Change Film Quick Banner */}
                <button
                  onClick={() => {
                    if (!canSwitch) {
                      showPermToast("👑 房主已开启【仅房主可换集换源】特权");
                      return;
                    }
                    setChangeVodModalOpen(true);
                  }}
                  className="w-full p-2.5 rounded-xl bg-gradient-to-r from-blue-600/10 to-cyan-500/10 hover:from-blue-600/20 hover:to-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-xs font-bold transition flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-cyan-400" />
                    <span>正在放映：《{room.vodName}》</span>
                  </span>
                  <span className="text-[11px] underline">更换影片 →</span>
                </button>

                {/* 1. Line / Source Switcher */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      切换播放源线路
                    </span>
                    {!canSwitch && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> 仅房主可换
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {vodItem.sources.map((src, idx) => {
                      const isCurrent = idx === room.sourceIndex;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSwitchSource(idx)}
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                            isCurrent
                              ? "bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/10 font-bold"
                              : "bg-dark-800 hover:bg-dark-700 text-gray-300 border border-white/5"
                          } ${!canSwitch ? "cursor-not-allowed opacity-80" : ""}`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isCurrent ? "bg-cyan-400 animate-pulse" : "bg-gray-600"}`} />
                            <span>{src.sourceName}</span>
                          </span>
                          <span className="text-[11px] opacity-75">{src.episodes.length} 集</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Episode Grid */}
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span className="flex items-center gap-1.5">
                      <List className="w-3.5 h-3.5 text-cyan-400" />
                      剧集列表
                    </span>
                    <span className="text-gray-400 text-[11px]">当前: {room.episodeName}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[260px] overflow-y-auto pr-1">
                    {episodes.map((ep, idx) => {
                      const isEpActive = room.episodeIndex === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSwitchEpisode(idx, ep)}
                          className={`p-2.5 rounded-xl text-xs font-semibold transition ${
                            isEpActive
                              ? "bg-cyan-500 text-dark-950 font-black shadow-md shadow-cyan-500/20 scale-[1.02]"
                              : "bg-dark-800 text-gray-300 hover:bg-dark-700 hover:text-white border border-white/5"
                          } ${!canSwitch && !isEpActive ? "opacity-75 cursor-not-allowed" : ""}`}
                        >
                          {ep.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "chat" && (
              <>
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`text-xs p-2 rounded-xl ${
                        msg.isSystem
                          ? "bg-white/5 text-gray-300 text-center text-[11px] py-1.5 px-3 border border-white/5"
                          : "bg-dark-800/80 border border-white/5 space-y-1"
                      }`}
                    >
                      {!msg.isSystem && (
                        <div className="flex items-center justify-between text-gray-500 text-[10px]">
                          <span className="font-bold text-cyan-400 flex items-center gap-1">
                            <span>{msg.senderAvatar || "🐱"}</span>
                            <span>{msg.senderName}</span>
                            {msg.senderDevice && (
                              <span className="text-[9px] text-gray-400 bg-dark-900 px-1 py-0.2 rounded font-normal">
                                {msg.senderDevice}
                              </span>
                            )}
                          </span>
                          <span>{msg.time}</span>
                        </div>
                      )}
                      <p className={msg.isSystem ? "font-medium" : "text-white font-medium pl-5"}>{msg.text}</p>
                    </div>
                  ))}
                </div>

                {/* Chat Input & Emoji footer */}
                <div className="p-3 border-t border-white/10 bg-dark-950/60 space-y-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-base">
                    {["🍿", "👏", "🤣", "😱", "🔥", "❤️", "👍", "🍻"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleSendEmoji(emoji)}
                        className="p-1 hover:scale-125 transition active:scale-95"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSendChat} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="说点什么，全员实时同步..."
                      className="flex-1 bg-dark-800 text-xs text-white placeholder-gray-500 px-3.5 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="submit"
                      className="p-2 rounded-xl bg-cyan-500 text-dark-950 font-bold hover:bg-cyan-400 transition"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </>
            )}

            {activeTab === "members" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-thin">
                {/* Host Admin Bar */}
                {isHost && (
                  <div className="p-2.5 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-between text-[11px]">
                    <span className="text-gold-400 font-bold flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" /> 房主管理视角 (敏感明文信息)
                    </span>
                    <button
                      onClick={() => setShowFullIp(!showFullIp)}
                      className="text-gold-300 hover:text-white flex items-center gap-1 font-semibold"
                    >
                      {showFullIp ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showFullIp ? "隐藏明文 IP" : "查看完整 IP"}
                    </button>
                  </div>
                )}

                {members.map((m) => {
                  const memberIsHost = m.id === room.hostId;
                  const displayIp = isHost && showFullIp && m.fullIp ? m.fullIp : m.maskedIp;
                  const cleanLoc = (m.location || "中国").replace(/^📍\s*/, "");

                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-dark-800/80 border border-white/5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{m.avatar}</span>
                          <span className="font-bold text-white text-xs">{m.name}</span>
                          {memberIsHost && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold text-gold-400 bg-gold-400/10 rounded-md border border-gold-400/20 flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5" /> 房主
                            </span>
                          )}
                          {m.id === currentUser.id && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold text-cyan-400 bg-cyan-500/10 rounded">
                              我
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-medium bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                          <MapPin className="w-3 h-3 text-cyan-400" />
                          <span>{cleanLoc}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1.5 border-t border-white/5">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-300 font-medium">{m.device || "💻 网页端"}</span>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                          <span>IP:</span>
                          <span className={`font-mono ${isHost && showFullIp ? "text-amber-400 font-bold" : "text-gray-400"}`}>
                            {displayIp || "127.0.0.*"}
                          </span>
                          {!isHost && <Lock className="w-2.5 h-2.5 text-gray-600" title="仅房主可看完整IP" />}
                        </div>
                      </div>

                      {isHost && m.id !== currentUser.id && (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleManualTransfer(m.id)}
                            className="px-2 py-0.8 bg-gold-400/10 hover:bg-gold-400 text-gold-400 hover:text-dark-950 text-[10px] font-bold rounded-lg border border-gold-400/20 transition flex items-center gap-1"
                          >
                            <Crown className="w-2.5 h-2.5" /> 移交房主
                          </button>
                          <button
                            type="button"
                            onClick={() => handleKickMember(m.id)}
                            className="px-2 py-0.8 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white text-[10px] font-bold rounded-lg border border-rose-500/20 transition flex items-center gap-1"
                          >
                            <UserX className="w-2.5 h-2.5" /> 移出
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In-Room Film Picker Modal with 6-Dimension Category Filters + Search */}
      <FilmPickerModal
        isOpen={changeVodModalOpen}
        title="更换本放映厅播放影片"
        actionLabel="换看这部"
        onClose={() => setChangeVodModalOpen(false)}
        onSelect={handleConfirmChangeVod}
      />

      {/* Host Exit Confirmation Dialog */}
      {exitModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-dark-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-base font-bold text-gold-400">
                <Crown className="w-5 h-5" />
                👑 房主退出管理选项
              </div>
              <button onClick={() => setExitModalOpen(false)} className="p-1 text-gray-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-gray-300">
              <p>
                您当前是本放映厅的<strong className="text-white font-bold">【创建者 / 房主】</strong>。
              </p>
              {otherMembers.length > 0 ? (
                <p className="text-gray-400">
                  房间内当前还有 <span className="text-cyan-400 font-bold">{otherMembers.length}</span> 位观众在线。您可以选择将房主特权顺延移交给下一位观众继续放映，或者直接解散关闭房间：
                </p>
              ) : (
                <p className="text-gray-400">
                  当前房间内暂无其他观众，退出将自动关闭本放映厅。
                </p>
              )}
            </div>

            <div className="space-y-3 pt-2">
              {otherMembers.length > 0 && nextSuccessor && (
                <button
                  type="button"
                  onClick={handleHostTransferAndExit}
                  className="w-full p-3.5 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-dark-950 font-bold text-xs border border-cyan-500/30 transition flex items-center justify-between group shadow-lg"
                >
                  <div className="flex items-center gap-2 text-left">
                    <UserCheck className="w-4 h-4 mt-0.5" />
                    <div>
                      <p className="font-bold">👑 顺延房主并退出</p>
                      <p className="text-[10px] opacity-75 font-normal">移交给【{nextSuccessor.name}】，其他人继续看</p>
                    </div>
                  </div>
                  <ArrowLeft className="w-4 h-4 rotate-180 opacity-60 group-hover:opacity-100" />
                </button>
              )}

              <button
                type="button"
                onClick={handleHostDisbandAndExit}
                className="w-full p-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white font-bold text-xs border border-rose-500/30 transition flex items-center justify-between group shadow-lg"
              >
                <div className="flex items-center gap-2 text-left">
                  <Trash2 className="w-4 h-4 mt-0.5" />
                  <div>
                    <p className="font-bold">💥 直接解散关闭放映厅</p>
                    <p className="text-[10px] opacity-75 font-normal">全员退出并解散该房间</p>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 rotate-180 opacity-60 group-hover:opacity-100" />
              </button>

              <button
                type="button"
                onClick={() => setExitModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white font-semibold text-xs transition"
              >
                取消，留在房间
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Host Settings Modal */}
      {isHost && (
        <RoomSettingsModal
          room={room}
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSaved={(updated) => setRoom((prev) => (prev ? { ...prev, ...updated } : null))}
        />
      )}
    </div>
  );
}
