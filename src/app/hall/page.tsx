"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Tv, Play, Plus, Sparkles, RefreshCw, Loader2, Globe, Lock, Clock, KeyRound, X } from "lucide-react";
import { VodItem } from "@/lib/types";
import { FilmPickerModal } from "@/components/FilmPickerModal";
import { CreateRoomModal } from "@/components/CreateRoomModal";

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function HallPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Password Prompt Modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [targetRoom, setTargetRoom] = useState<any | null>(null);
  const [inputPassword, setInputPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Category + Search Film Picker Modal
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedVod, setSelectedVod] = useState<VodItem | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

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
    const interval = setInterval(fetchRooms, 6000);
    return () => clearInterval(interval);
  }, []);

  const handlePickFilmToCreate = (item: VodItem) => {
    setSelectedVod(item);
    setPickerOpen(false);
    setCreateModalOpen(true);
  };

  const handleJoinClick = (room: any) => {
    if (room.hasPassword) {
      setTargetRoom(room);
      setInputPassword("");
      setPasswordError("");
      setPasswordModalOpen(true);
    } else {
      router.push(`/room/${room.id}`);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPassword.trim()) {
      setPasswordError("请输入房间口令");
      return;
    }
    if (!targetRoom) return;

    router.push(`/room/${targetRoom.id}?pwd=${encodeURIComponent(inputPassword.trim())}`);
  };

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
            在这里你可以看到其他影迷正在观看的影视剧集与实时进度。公开放映厅免密一键直达，私密放映厅支持口令加入，进度毫秒级对齐，一边看剧一边实时吐槽聊天！
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setPickerOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-dark-950 font-black text-xs sm:text-sm transition flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              挑选影片 · 立即发起放映房
            </button>

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
          <h2 className="text-lg font-bold text-white">当前活跃放映厅</h2>
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
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{room.hostAvatar || "🐱"}</span>
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{room.hostName}</span>
                        {room.hostDevice && (
                          <span className="text-[9px] text-gray-400 bg-dark-800 px-1.5 py-0.2 rounded font-normal">
                            {room.hostDevice}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-500">房号: {room.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {room.hasPassword ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> 私密房
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold border border-cyan-500/30 flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" /> 公开
                      </span>
                    )}

                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-gray-300 text-[10px] font-bold border border-white/10">
                      <Users className="w-2.5 h-2.5 text-cyan-400" />
                      {room.memberCount || 1}
                    </span>
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
                <button
                  onClick={() => handleJoinClick(room)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 border shadow-md ${
                    room.hasPassword
                      ? "bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-dark-950 border-amber-500/30 hover:border-amber-500"
                      : "bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-dark-950 border-cyan-500/30 hover:border-cyan-500"
                  }`}
                >
                  {room.hasPassword ? <KeyRound className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  {room.hasPassword ? "输入口令进入私密房" : "一键加入放映厅"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center space-y-4 bg-dark-900/50 rounded-3xl border border-white/5 p-8">
          <Tv className="w-12 h-12 text-gray-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">暂无活跃放映厅</h3>
            <p className="text-gray-400 text-xs">挑选一部精彩影视，成为全站第一位放映发起人吧！</p>
          </div>
          <button
            onClick={() => setPickerOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-dark-950 font-bold text-xs transition inline-flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" /> 挑选影片 · 立即发起放映房
          </button>
        </div>
      )}

      {/* Category + Search Film Picker Modal */}
      <FilmPickerModal
        isOpen={pickerOpen}
        title="挑选影片 · 立即发起放映房"
        actionLabel="发起一起看"
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickFilmToCreate}
      />

      {/* Create Room Modal when picked */}
      {selectedVod && (
        <CreateRoomModal
          vodItem={selectedVod}
          isOpen={createModalOpen}
          onClose={() => {
            setCreateModalOpen(false);
            setSelectedVod(null);
          }}
        />
      )}

      {/* Password Prompt Modal */}
      {passwordModalOpen && targetRoom && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm bg-dark-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
                <Lock className="w-4 h-4" />
                该放映厅已开启私密保护
              </div>
              <button onClick={() => setPasswordModalOpen(false)} className="p-1 text-gray-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              您正在加入由 <strong className="text-white">{targetRoom.hostName}</strong> 发起的《{targetRoom.vodName}》私密共赏房，请输入房主设置的口令：
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={inputPassword}
                onChange={(e) => {
                  setInputPassword(e.target.value);
                  setPasswordError("");
                }}
                placeholder="请输入入房口令 / 密码..."
                className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />

              {passwordError && <p className="text-xs text-rose-400">{passwordError}</p>}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-dark-950 font-bold text-xs transition shadow-lg shadow-amber-500/20"
              >
                验证口令并进入房间
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
