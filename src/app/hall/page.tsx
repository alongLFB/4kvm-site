"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Tv, Play, Plus, Sparkles, RefreshCw, Loader2, Globe, Clock } from "lucide-react";
import { WatchRoom } from "@/lib/room-store";

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function HallPage() {
  const [rooms, setRooms] = useState<WatchRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/room");
      const data = await res.json();
      if (data.code === 200) {
        setRooms(data.list || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-white/10 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            4KVM 公开放映广场 · 免登录实时一起看
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
            发现正在热映的放映厅，一键上车同步看剧
          </h1>

          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
            在这里你可以看到其他影迷正在观看的影视剧集与实时进度。如果你也感兴趣，点击即可秒级加入房间，进度毫秒级对齐，一边看剧一边实时吐槽聊天！
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/category"
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-dark-950 font-black text-xs sm:text-sm transition flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              挑选影片 · 发起我的放映房
            </Link>

            <button
              onClick={() => {
                setRefreshing(true);
                fetchRooms();
              }}
              className="px-4 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-gray-300 hover:text-white text-xs sm:text-sm transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
              刷新放映厅
            </button>
          </div>
        </div>
      </div>

      {/* Room List Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">当前活跃的公开放映厅</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20">
            {rooms.length} 房活跃
          </span>
        </div>
      </div>

      {/* Room Grid */}
      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-sm">正在检索全站放映厅...</span>
        </div>
      ) : rooms.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="group relative bg-dark-900 border border-white/10 rounded-2xl overflow-hidden hover:border-cyan-500/40 transition-all duration-300 shadow-xl flex flex-col justify-between"
            >
              <div className="p-5 space-y-4">
                {/* Header info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{room.hostAvatar || "🐱"}</span>
                    <div>
                      <p className="text-xs font-bold text-white">{room.hostName}</p>
                      <p className="text-[10px] text-gray-500">房号: {room.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/30">
                    <Users className="w-3.5 h-3.5" />
                    {room.members.length} 人在看
                  </div>
                </div>

                {/* Show details & Poster */}
                <div className="flex items-center gap-3.5 p-3 rounded-xl bg-dark-800/80 border border-white/5">
                  <img
                    src={room.vodPic}
                    alt={room.vodName}
                    className="w-14 h-20 rounded-lg object-cover shadow-md shrink-0"
                  />
                  <div className="space-y-1 overflow-hidden">
                    <h3 className="text-sm font-bold text-white truncate">{room.vodName}</h3>
                    <p className="text-xs text-cyan-400 font-semibold">{room.episodeName || "正片"}</p>
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span>进度: {formatTime(room.currentTime)}</span>
                    </div>
                  </div>
                </div>

                {/* Room Title */}
                <p className="text-xs text-gray-300 line-clamp-1 italic">
                  “{room.title}”
                </p>
              </div>

              {/* Action Button */}
              <div className="p-4 pt-0">
                <Link
                  href={`/room/${room.id}`}
                  className="w-full py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-dark-950 font-bold text-xs transition flex items-center justify-center gap-1.5 border border-cyan-500/30 hover:border-cyan-500"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  一键加入放映厅
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center space-y-3 bg-dark-900/50 rounded-3xl border border-white/5">
          <Tv className="w-10 h-10 text-gray-600 mx-auto" />
          <p className="text-gray-400 text-sm">暂无活跃的公开放映厅</p>
          <Link
            href="/category"
            className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> 成为第一位放映发起人
          </Link>
        </div>
      )}
    </div>
  );
}
