"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Users, Globe, Lock, Crown, Zap, Play, Loader2, KeyRound, Edit2, Check, Radio } from "lucide-react";
import { VodItem } from "@/lib/types";
import { getGuestUser, updateGuestUser, GuestUser } from "@/lib/guest";

interface CreateRoomModalProps {
  vodItem: VodItem;
  initialSourceIndex?: number;
  initialEpisodeIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

const AVATARS = ["🐱", "🦊", "🐼", "🐰", "🦁", "🐬", "🦉", "🐯", "🐨", "🦄"];

export function CreateRoomModal({
  vodItem,
  initialSourceIndex = 0,
  initialEpisodeIndex = 0,
  isOpen,
  onClose,
}: CreateRoomModalProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<GuestUser>({ id: "", name: "游客", avatar: "🐱", device: "💻 网页端" });
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  const [title, setTitle] = useState(`${vodItem.name} 共赏房`);
  const [sourceIndex, setSourceIndex] = useState(initialSourceIndex);
  const [episodeIndex, setEpisodeIndex] = useState(initialEpisodeIndex);
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("8888");
  const [controlMode, setControlMode] = useState<"host" | "free">("free");
  const [switchMode, setSwitchMode] = useState<"host" | "free">("free");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const user = getGuestUser();
      setCurrentUser(user);
      setTempName(user.name);
      setTitle(`${vodItem.name} 共赏房`);
      setSourceIndex(initialSourceIndex);
      setEpisodeIndex(initialEpisodeIndex);
    }
  }, [isOpen, vodItem, initialSourceIndex, initialEpisodeIndex]);

  if (!isOpen) return null;

  const currentSource = vodItem.sources[sourceIndex] || vodItem.sources[0];
  const episodes = currentSource?.episodes || [];

  const handleSaveName = () => {
    if (tempName.trim()) {
      const updated = updateGuestUser({ name: tempName.trim() });
      setCurrentUser(updated);
      setEditingName(false);
    }
  };

  const handleSelectAvatar = (emoji: string) => {
    const updated = updateGuestUser({ avatar: emoji });
    setCurrentUser(updated);
  };

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
          vodItem,
          sourceIndex,
          episodeIndex,
          isPublic,
          password: isPublic ? undefined : password,
          controlMode,
          switchMode,
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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-dark-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <Users className="w-5 h-5 text-cyan-400" />
            发起多人同步观影 · 《{vodItem.name}》
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Host Profile Banner */}
        <div className="p-3.5 rounded-2xl bg-dark-850 border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">发起人（我）的身份定制</span>
            <span className="text-[10px] text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              {currentUser.device}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => handleSelectAvatar(av)}
                  className={`text-xl p-1 rounded-xl transition ${
                    currentUser.avatar === av ? "bg-cyan-500/20 scale-110 border border-cyan-500" : "hover:bg-white/5 opacity-70 hover:opacity-100"
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-white/5">
            {editingName ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="flex-1 bg-dark-800 text-xs text-white px-3 py-1.5 rounded-xl border border-cyan-500 focus:outline-none"
                  placeholder="输入您的新昵称..."
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500 text-dark-950 font-bold text-xs hover:bg-cyan-400 transition flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> 保存
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{currentUser.name}</span>
                  <span className="text-gray-500 text-[11px]">(房主)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 font-semibold"
                >
                  <Edit2 className="w-3 h-3" /> 修改昵称
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Form fields */}
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

          {/* Line & Episode Select */}
          <div className="grid grid-cols-2 gap-3">
            {vodItem.sources.length > 1 && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">起始线路</label>
                <select
                  value={sourceIndex}
                  onChange={(e) => {
                    const newSrc = Number(e.target.value);
                    setSourceIndex(newSrc);
                    setEpisodeIndex(0);
                  }}
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {vodItem.sources.map((src, idx) => (
                    <option key={idx} value={idx}>
                      {src.sourceName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {episodes.length > 1 && (
              <div className={vodItem.sources.length <= 1 ? "col-span-2" : ""}>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">起始集数</label>
                <select
                  value={episodeIndex}
                  onChange={(e) => setEpisodeIndex(Number(e.target.value))}
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {episodes.map((ep, idx) => (
                    <option key={idx} value={idx}>
                      {ep.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Public vs Private */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">可见范围与保护</label>
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
                  <p className="text-[11px] text-gray-400">公开在广场大厅，免密直入</p>
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
                  <p className="text-[11px] text-gray-400">需凭口令密码方可加入</p>
                </div>
              </button>
            </div>
          </div>

          {/* Password Input for Private Room */}
          {!isPublic && (
            <div className="p-3.5 rounded-xl bg-dark-850 border border-amber-500/30 space-y-2 animate-in fade-in">
              <label className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <KeyRound className="w-3.5 h-3.5" /> 设置入房口令 / 密码
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="例如: 8888 或 专属口令"
                  className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setPassword(String(Math.floor(1000 + Math.random() * 9000)))}
                  className="px-3 py-2 bg-dark-700 hover:bg-dark-600 text-xs font-bold text-gray-300 hover:text-white rounded-xl transition"
                >
                  随机口令
                </button>
              </div>
            </div>
          )}

          {/* Granular Permission 1: Progress Control */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">① 播放进度控制权限 (播放/暂停/快进)</label>
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
                  <p className="text-xs font-bold text-white">⚡ 全员自由控进度</p>
                  <p className="text-[11px] text-gray-400">任何人均可暂停/快进</p>
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
                  <p className="text-xs font-bold text-white">👑 仅房主控进度</p>
                  <p className="text-[11px] text-gray-400">仅房主能控制进度</p>
                </div>
              </button>
            </div>
          </div>

          {/* Granular Permission 2: Switch Line & Episode */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">② 选集与换源权限 (换集/切换播放线路)</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSwitchMode("free")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  switchMode === "free"
                    ? "bg-cyan-500/10 border-cyan-500/50 text-white"
                    : "bg-dark-800 border-white/5 text-gray-400 hover:bg-dark-700"
                }`}
              >
                <Radio className={`w-4 h-4 mt-0.5 ${switchMode === "free" ? "text-cyan-400" : "text-gray-500"}`} />
                <div>
                  <p className="text-xs font-bold text-white">⚡ 全员自由换集换源</p>
                  <p className="text-[11px] text-gray-400">观众也可切线路或选集</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSwitchMode("host")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                  switchMode === "host"
                    ? "bg-cyan-500/10 border-cyan-500/50 text-white"
                    : "bg-dark-800 border-white/5 text-gray-400 hover:bg-dark-700"
                }`}
              >
                <Lock className={`w-4 h-4 mt-0.5 ${switchMode === "host" ? "text-gold-400" : "text-gray-500"}`} />
                <div>
                  <p className="text-xs font-bold text-white">👑 仅房主可换集换源</p>
                  <p className="text-[11px] text-gray-400">防止他人误切打扰全员</p>
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
