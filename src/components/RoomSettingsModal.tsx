"use client";

import React, { useState } from "react";
import { X, Settings, Globe, Lock, Crown, Zap, KeyRound, Check, Loader2, Radio } from "lucide-react";
import { WatchRoom } from "@/lib/room-store";

interface RoomSettingsModalProps {
  room: WatchRoom;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: any) => void;
}

export function RoomSettingsModal({ room, isOpen, onClose, onSaved }: RoomSettingsModalProps) {
  const [title, setTitle] = useState(room.title);
  const [isPublic, setIsPublic] = useState(room.isPublic);
  const [password, setPassword] = useState(room.password || "8888");
  const [controlMode, setControlMode] = useState<"host" | "free">(room.controlMode);
  const [switchMode, setSwitchMode] = useState<"host" | "free">(room.switchMode || "free");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/room/${room.id}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostId: room.hostId,
          title,
          isPublic,
          password: isPublic ? undefined : password,
          controlMode,
          switchMode,
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        onSaved(data.data);
        onClose();
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
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <Settings className="w-5 h-5 text-gold-400" />
            👑 房主管理 · 房间属性与权限设置
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Room Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">房间标题 (广场实时同步)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Visibility */}
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
                  <p className="text-xs font-bold text-white">🌐 公开放映</p>
                  <p className="text-[11px] text-gray-400">免密公开在广场大厅</p>
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
                  <p className="text-xs font-bold text-white">🔒 私密放映</p>
                  <p className="text-[11px] text-gray-400">需凭口令方可进入</p>
                </div>
              </button>
            </div>
          </div>

          {/* Password */}
          {!isPublic && (
            <div className="p-3 rounded-xl bg-dark-850 border border-amber-500/30 space-y-2 animate-in fade-in">
              <label className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <KeyRound className="w-3.5 h-3.5" /> 房间入房口令 / 密码
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="设置 4-8 位口令"
                className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
          )}

          {/* Control Mode */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">① 播放进度控制权限</label>
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
                  <p className="text-[11px] text-gray-400">全员皆可暂停/快进</p>
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
                  <p className="text-[11px] text-gray-400">仅房主能控制进度</p>
                </div>
              </button>
            </div>
          </div>

          {/* Switch Mode */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">② 选集与换源权限</label>
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
                  <p className="text-[11px] text-gray-400">观众亦可切线路/选集</p>
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
                  <p className="text-[11px] text-gray-400">防止他人误切</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-gold-400 hover:bg-gold-300 text-dark-950 font-black text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-gold-500/20 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-4 h-4" />}
          保存并实时同步全员
        </button>
      </div>
    </div>
  );
}
