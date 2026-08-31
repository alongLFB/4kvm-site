"use client";

import React from "react";
import { Mic, MicOff, Volume2, VolumeX, ShieldAlert, Sparkles } from "lucide-react";

interface VoiceControlBarProps {
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isMutedAll?: boolean;
  isHost?: boolean;
  onToggleMic: () => void;
  onToggleDeafen: () => void;
  onToggleMuteAll?: () => void;
}

export function VoiceControlBar({
  isMuted,
  isDeafened,
  isSpeaking,
  isMutedAll = false,
  isHost = false,
  onToggleMic,
  onToggleDeafen,
  onToggleMuteAll,
}: VoiceControlBarProps) {
  return (
    <div className="p-3 sm:p-3.5 rounded-2xl bg-dark-900/90 border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-xl backdrop-blur-md">
      {/* Left: Status & Audio Waves */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              !isMuted
                ? isSpeaking
                  ? "bg-emerald-500 text-dark-950 shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-500/30 scale-105"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-dark-800 text-gray-400 border border-white/5"
            }`}
          >
            {!isMuted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-rose-400" />}
          </div>
          {isSpeaking && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">语音连麦室</span>
            {!isMuted ? (
              <span className="px-1.5 py-0.2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded">
                {isSpeaking ? "🟢 正在说话..." : "🎙️ 开麦就绪"}
              </span>
            ) : (
              <span className="px-1.5 py-0.2 text-[10px] font-bold text-gray-400 bg-white/5 rounded">
                🔇 麦克风已闭麦
              </span>
            )}
            {isMutedAll && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded flex items-center gap-0.5">
                <ShieldAlert className="w-2.5 h-2.5" /> 全员禁言中
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">
            硬件级降噪 & 回声消除，外放电影不受干扰
          </p>
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2">
        {/* 1. Mic Button */}
        <button
          type="button"
          onClick={onToggleMic}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-md ${
            !isMuted
              ? "bg-emerald-500 hover:bg-emerald-400 text-dark-950 border-emerald-400 shadow-emerald-500/20"
              : "bg-dark-800 hover:bg-dark-700 text-gray-300 border-white/10 hover:text-white"
          }`}
        >
          {!isMuted ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5 text-rose-400" />}
          <span>{!isMuted ? "已开麦" : "点击开麦"}</span>
        </button>

        {/* 2. Deafen / Speaker Button */}
        <button
          type="button"
          onClick={onToggleDeafen}
          className={`p-2 rounded-xl text-xs font-bold transition border ${
            !isDeafened
              ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
              : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30"
          }`}
          title={!isDeafened ? "点击静音全屋语音" : "恢复全屋语音"}
        >
          {!isDeafened ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* 3. Host Mute-All Toggle */}
        {isHost && onToggleMuteAll && (
          <button
            type="button"
            onClick={onToggleMuteAll}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 border ${
              isMutedAll
                ? "bg-amber-500 hover:bg-amber-400 text-dark-950 border-amber-400 shadow-amber-500/20"
                : "bg-dark-800 hover:bg-dark-700 text-amber-400 border-amber-500/30"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{isMutedAll ? "解除全员禁言" : "全员静音"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
