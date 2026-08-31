"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Users, Globe, Lock, Crown, Zap, Play, Loader2 } from "lucide-react";
import { VodItem } from "@/lib/types";
import { getGuestUser } from "@/lib/guest";

interface CreateRoomModalProps {
  vodItem: VodItem;
  initialSourceIndex?: number;
  initialEpisodeIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRoomModal({
  vodItem,
  initialSourceIndex = 0,
  initialEpisodeIndex = 0,
  isOpen,
  onClose,
}: CreateRoomModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState(`${vodItem.name} 共赏房`);
  const [sourceIndex, setSourceIndex] = useState(initialSourceIndex);
  const [episodeIndex, setEpisodeIndex] = useState(initialEpisodeIndex);
  const [isPublic, setIsPublic] = useState(true);
  const [controlMode, setControlMode] = useState<"host" | "free">("free");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentSource = vodItem.sources[sourceIndex] || vodItem.sources[0];
  const episodes = currentSource?.episodes || [];

  const handleCreate = async () => {
    setSubmitting(true);
    const host = getGuestUser();

    try {
      const res = await fetch("/api/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          vodId: vodItem.id,
          sourceIndex,
          episodeIndex,
          isPublic,
          controlMode,
          host,
        }),
      });
      const data = await res.json();
      if (data.code === 200 && data.data) {
        onClose();
        router.push(`/room/${data.data.id}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-dark-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <Users className="w-5 h-5 text-cyan-400" />
            发起多人同步观影
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Room Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">房间标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Episode Select */}
          {episodes.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">起始集数</label>
              <select
                value={episodeIndex}
                onChange={(e) => setEpisodeIndex(Number(e.target.value))}
                className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {episodes.map((ep, idx) => (
                  <option key={idx} value={idx}>
                    {ep.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Public vs Private */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">可见范围</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  isPublic
                    ? "bg-cyan-500/10 border-cyan-500/50 text-white"
                    : "bg-dark-800 border-white/5 text-gray-400 hover:bg-dark-700"
                }`}
              >
                <Globe className={`w-4 h-4 mt-0.5 ${isPublic ? "text-cyan-400" : "text-gray-500"}`} />
                <div>
                  <p className="text-xs font-bold text-white">🌐 公开放映广场</p>
                  <p className="text-[11px] text-gray-400">公开在广场大厅，任何人可浏览并加入一起看</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  !isPublic
                    ? "bg-cyan-500/10 border-cyan-500/50 text-white"
                    : "bg-dark-800 border-white/5 text-gray-400 hover:bg-dark-700"
                }`}
              >
                <Lock className={`w-4 h-4 mt-0.5 ${!isPublic ? "text-cyan-400" : "text-gray-500"}`} />
                <div>
                  <p className="text-xs font-bold text-white">🔒 私密好友房</p>
                  <p className="text-[11px] text-gray-400">不公开展示，仅持链接或房间码可加入</p>
                </div>
              </button>
            </div>
          </div>

          {/* Control Mode */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">进度控制权限</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setControlMode("free")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  controlMode === "free"
                    ? "bg-cyan-500/10 border-cyan-500/50 text-white"
                    : "bg-dark-800 border-white/5 text-gray-400 hover:bg-dark-700"
                }`}
              >
                <Zap className={`w-4 h-4 mt-0.5 ${controlMode === "free" ? "text-cyan-400" : "text-gray-500"}`} />
                <div>
                  <p className="text-xs font-bold text-white">⚡ 全员自由控制</p>
                  <p className="text-[11px] text-gray-400">任何人均可暂停/快进/换集，全员同步</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setControlMode("host")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  controlMode === "host"
                    ? "bg-cyan-500/10 border-cyan-500/50 text-white"
                    : "bg-dark-800 border-white/5 text-gray-400 hover:bg-dark-700"
                }`}
              >
                <Crown className={`w-4 h-4 mt-0.5 ${controlMode === "host" ? "text-gold-400" : "text-gray-500"}`} />
                <div>
                  <p className="text-xs font-bold text-white">👑 仅房主可控</p>
                  <p className="text-[11px] text-gray-400">仅房主能控制播放进度，其他人只负责看</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-dark-950 font-black text-sm hover:opacity-95 transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          立即创建并进入观影房
        </button>
      </div>
    </div>
  );
}
