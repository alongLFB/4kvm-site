"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Artplayer from "artplayer";
import Hls from "hls.js";
import {
  Users,
  Share2,
  Check,
  Send,
  Sparkles,
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
  KeyRound,
  Radio,
  Film,
  MapPin,
} from "lucide-react";
import { WatchRoom, ChatMessage, RoomMember } from "@/lib/room-store";
import { VodItem } from "@/lib/types";
import { getGuestUser, updateGuestUser, GuestUser } from "@/lib/guest";
import { RoomSettingsModal } from "@/components/RoomSettingsModal";

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = use(params);
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

  // Private room password prompt if unauthorized
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [roomPasswordInput, setRoomPasswordInput] = useState(urlPassword);

  // Tabs: chat | members | episodes
  const [activeTab, setActiveTab] = useState<"chat" | "members" | "episodes">("episodes");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const artContainerRef = useRef<HTMLDivElement>(null);
  const artInstanceRef = useRef<Artplayer | null>(null);

  const isSyncingFromRemote = useRef(false);

  const isHost = room ? room.hostId === currentUser.id : false;

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
      .catch((err) => {
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

          // Check if password required
          if (!data.data.room.isPublic && data.data.room.password && data.data.room.hostId !== user.id) {
            if (urlPassword) {
              joinWithPassword(urlPassword);
            } else {
              setPasswordRequired(true);
              setLoading(false);
              return;
            }
          } else {
            // Join directly
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
        } else if (payload.type === "sync") {
          const art = artInstanceRef.current;
          if (!art) return;

          isSyncingFromRemote.current = true;

          if (payload.action === "play") {
            if (!art.playing) art.play();
            if (Math.abs(art.currentTime - payload.currentTime) > 1.5) {
              art.currentTime = payload.currentTime;
            }
          } else if (payload.action === "pause") {
            if (art.playing) art.pause();
            art.currentTime = payload.currentTime;
          } else if (payload.action === "seek") {
            art.currentTime = payload.currentTime;
          } else if (payload.action === "source" || payload.action === "episode") {
            if (payload.streamUrl) {
              const prevTime = payload.currentTime || 0;
              art.switchUrl(payload.streamUrl);
              if (prevTime > 0) {
                art.on("ready", () => {
                  art.currentTime = prevTime;
                });
              }
              setRoom((prev) =>
                prev
                  ? {
                      ...prev,
                      sourceIndex: typeof payload.sourceIndex === "number" ? payload.sourceIndex : prev.sourceIndex,
                      episodeIndex: typeof payload.episodeIndex === "number" ? payload.episodeIndex : prev.episodeIndex,
                      episodeName: payload.episodeName || prev.episodeName,
                      streamUrl: payload.streamUrl,
                    }
                  : null
              );
            }
          }

          setTimeout(() => {
            isSyncingFromRemote.current = false;
          }, 300);
        }
      } catch (err) {}
    };

    return () => {
      eventSource.close();
    };
  }, [roomId]);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize ArtPlayer
  useEffect(() => {
    if (!room || !artContainerRef.current || passwordRequired) return;

    if (artInstanceRef.current) {
      artInstanceRef.current.destroy(false);
    }

    const art = new Artplayer({
      container: artContainerRef.current,
      url: room.streamUrl,
      poster: room.vodPic || "",
      volume: 0.8,
      autoplay: true,
      pip: true,
      autoSize: true,
      autoMini: true,
      screenshot: true,
      setting: true,
      playbackRate: true,
      aspectRatio: true,
      hotkey: true,
      fullscreen: true,
      fullscreenWeb: true,
      autoOrientation: true,
      playsInline: true,
      lock: true,
      fastForward: true,
      airplay: true,
      theme: "#06b6d4",
      lang: "zh-cn",
      moreVideoAttr: {
        crossOrigin: "anonymous",
        preload: "auto",
        "x5-video-player-type": "h5",
        "x5-video-player-fullscreen": "true",
        "x5-playsinline": "true",
      },
      customType: {
        m3u8: function (video: HTMLMediaElement, url: string, art: Artplayer) {
          if (Hls.isSupported()) {
            if (art.hls) art.hls.destroy();
            const hls = new Hls({
              maxBufferLength: 60,
              maxMaxBufferLength: 120,
              startFragPrefetch: true,
            });
            hls.loadSource(url);
            hls.attachMedia(video);
            art.hls = hls;
            art.on("destroy", () => hls.destroy());
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
          }
        },
      },
    });

    artInstanceRef.current = art;

    art.on("ready", () => {
      if (room.currentTime > 0) {
        art.currentTime = room.currentTime;
      }
    });

    // Local interaction emits sync
    const emitSync = (actionType: "play" | "pause" | "seek") => {
      if (isSyncingFromRemote.current) return;

      const user = getGuestUser();
      fetch(`/api/room/${roomId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: actionType,
          currentTime: art.currentTime,
          duration: art.duration,
          sender: { id: user.id, name: user.name },
        }),
      });
    };

    art.on("play", () => emitSync("play"));
    art.on("pause", () => emitSync("pause"));
    art.on("seek", () => emitSync("seek"));

    return () => {
      if (art && art.destroy) {
        art.destroy(false);
      }
    };
  }, [room?.streamUrl, passwordRequired]);

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

  // Switch Line / Source with real-time sync
  const handleSwitchSource = (sourceIdx: number) => {
    if (!vodItem || !room) return;
    const targetSource = vodItem.sources[sourceIdx];
    if (!targetSource) return;

    const targetEpIndex = Math.min(room.episodeIndex, targetSource.episodes.length - 1);
    const targetEp = targetSource.episodes[targetEpIndex] || targetSource.episodes[0];
    const art = artInstanceRef.current;
    const currentTime = art ? art.currentTime : room.currentTime;

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

  // Switch Episode with real-time sync
  const handleSwitchEpisode = (idx: number, ep: { name: string; url: string }) => {
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

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-dark-900 border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/hall"
            className="p-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white transition"
            title="返回广场"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

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
              <span>片名: {room.vodName}</span>
              <span>·</span>
              <span className="text-cyan-400 font-semibold">{room.episodeName}</span>
              <span>·</span>
              <span className="text-emerald-400 font-medium">{currentSource.sourceName}</span>
              <span>·</span>
              <span>{room.controlMode === "host" ? "👑 仅房主可控" : "⚡ 全员自由控制"}</span>
            </p>
          </div>
        </div>

        {/* User Identity, Settings & Copy Button */}
        <div className="flex items-center gap-2.5">
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
        {/* Left 2 Cols: Sync Player */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10">
            <div ref={artContainerRef} className="w-full h-full" />
          </div>

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
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {activeTab === "episodes" && (
              <div className="space-y-4">
                {/* 1. Line / Source Switcher */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      切换播放源线路
                    </span>
                    <span className="text-[10px] text-gray-500">共 {vodItem.sources.length} 条可用专线</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {vodItem.sources.map((src, idx) => {
                      const isCurrent = idx === room.sourceIndex;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSwitchSource(idx)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                            isCurrent
                              ? "bg-cyan-500/15 border border-cyan-500/50 text-cyan-400 shadow-sm"
                              : "bg-dark-800 hover:bg-dark-700 text-gray-300 border border-white/5"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? "bg-cyan-400" : "bg-gray-600"}`} />
                            {src.sourceName}
                          </span>
                          <span className="text-[11px] opacity-70">共 {src.episodes.length} 集</span>
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
                    {episodes.map((ep, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSwitchEpisode(idx, ep)}
                        className={`p-2.5 rounded-xl text-xs font-semibold transition ${
                          room.episodeIndex === idx
                            ? "bg-cyan-500 text-dark-950 font-bold shadow-md shadow-cyan-500/20"
                            : "bg-dark-800 text-gray-300 hover:bg-dark-700 hover:text-white"
                        }`}
                      >
                        {ep.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "chat" && (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`text-xs p-2 rounded-xl ${
                      msg.isSystem
                        ? "bg-white/5 text-gray-400 text-center italic text-[11px]"
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
                    <p className={msg.isSystem ? "" : "text-white font-medium pl-5"}>{msg.text}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </>
            )}

            {activeTab === "members" && (
              <div className="space-y-2.5">
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

                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-dark-800/80 border border-white/5 space-y-1.5"
                    >
                      {/* Top: Avatar & Name */}
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

                        {/* Location Badge */}
                        <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-medium bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                          <MapPin className="w-3 h-3 text-cyan-400" />
                          <span>{m.location || "中国"}</span>
                        </div>
                      </div>

                      {/* Bottom metadata: Device & IP */}
                      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-white/5">
                        {/* Device */}
                        <div className="flex items-center gap-1">
                          <span className="text-gray-300 font-medium">{m.device || "💻 网页端"}</span>
                        </div>

                        {/* IP (Masked or Host-revealed) */}
                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                          <span>IP:</span>
                          <span className={`font-mono ${isHost && showFullIp ? "text-amber-400 font-bold" : "text-gray-400"}`}>
                            {displayIp || "127.0.0.*"}
                          </span>
                          {!isHost && <Lock className="w-2.5 h-2.5 text-gray-600" title="仅房主可看完整IP" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chat Input & Emoji footer */}
          {activeTab === "chat" && (
            <div className="p-3 border-t border-white/10 bg-dark-950/60 space-y-2">
              {/* Quick Emojis */}
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

              {/* Text Input */}
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
          )}
        </div>
      </div>

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
