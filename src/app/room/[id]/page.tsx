"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import Artplayer from "artplayer";
import Hls from "hls.js";
import {
  Users,
  Share2,
  Copy,
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
} from "lucide-react";
import { WatchRoom, ChatMessage, RoomMember } from "@/lib/room-store";
import { VodItem } from "@/lib/types";
import { getGuestUser, updateGuestUser, GuestUser } from "@/lib/guest";

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = use(params);

  const [currentUser, setCurrentUser] = useState<GuestUser>({ id: "", name: "游客", avatar: "🐱" });
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");

  const [room, setRoom] = useState<WatchRoom | null>(null);
  const [vodItem, setVodItem] = useState<VodItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Tabs: chat | members | episodes
  const [activeTab, setActiveTab] = useState<"chat" | "members" | "episodes">("chat");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const artContainerRef = useRef<HTMLDivElement>(null);
  const artInstanceRef = useRef<Artplayer | null>(null);

  // State sync control
  const isSyncingFromRemote = useRef(false);

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

          // Join room
          fetch(`/api/room/${roomId}/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user }),
          });
        }
        setLoading(false);
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
          } else if (payload.action === "episode") {
            if (payload.streamUrl) {
              art.switchUrl(payload.streamUrl);
              setRoom((prev) => prev ? { ...prev, episodeIndex: payload.episodeIndex, episodeName: payload.episodeName } : null);
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
    if (!room || !artContainerRef.current) return;

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

    // Local user interaction triggers remote sync
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
  }, [room?.streamUrl]);

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

  const handleSwitchEpisode = (idx: number, ep: { name: string; url: string }) => {
    const user = getGuestUser();
    fetch(`/api/room/${roomId}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "episode",
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

  if (!room || !vodItem) {
    return (
      <div className="py-24 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">房间不存在或已解散</h2>
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
                房间码: {room.id}
              </span>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
              <span>片名: {room.vodName}</span>
              <span>·</span>
              <span className="text-cyan-400 font-semibold">{room.episodeName}</span>
              <span>·</span>
              <span>{room.controlMode === "host" ? "👑 仅房主可控" : "⚡ 全员自由控制"}</span>
            </p>
          </div>
        </div>

        {/* User Identity & Copy Button */}
        <div className="flex items-center gap-3">
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
          <div className="p-4 rounded-2xl bg-dark-900 border border-white/10 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>实时进度同步已开启（延迟 &lt; 30ms）</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Users className="w-4 h-4" />
              <span>{members.length} 人正在实时共赏</span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Chat, Members & Episodes */}
        <div className="bg-dark-900 border border-white/10 rounded-2xl flex flex-col h-[480px] lg:h-[540px] shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/10 bg-dark-950/50">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === "chat"
                  ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              实时公屏
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
            <button
              onClick={() => setActiveTab("episodes")}
              className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === "episodes"
                  ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              选集 ({episodes.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
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
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-dark-800/80 border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{m.avatar}</span>
                      <span className="font-bold text-white">{m.name}</span>
                    </div>
                    {m.id === room.hostId && (
                      <span className="px-2 py-0.5 text-[10px] font-bold text-gold-400 bg-gold-400/10 rounded-md flex items-center gap-1">
                        <Crown className="w-3 h-3" /> 房主
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === "episodes" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
    </div>
  );
}
