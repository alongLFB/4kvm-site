"use client";

import React from "react";
import { Mic, MicOff, Volume2, VolumeX, ShieldAlert, Sparkles, Activity } from "lucide-react";

export interface ActiveSpeaker {
  id: string;
  name: string;
  avatar: string;
}

interface VoiceControlBarProps {
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  localLevel?: number; // 0~100
  activeSpeakers: ActiveSpeaker[];
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
  localLevel = 0,
  activeSpeakers = [],
  isMutedAll = false,
  isHost = false,
  onToggleMic,
  onToggleDeafen,
  onToggleMuteAll,
}: VoiceControlBarProps) {
  return (
    <div className="p-3 sm:p-3.5 rounded-2xl bg-dark-900/90 border border-white/10 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shadow-xl backdrop-blur-md">
      {/* Left: Status, Active Speakers & Audio Level */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="relative shrink-0">
          <div
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all ${
              !isMuted
                ? isSpeaking
                  ? "bg-emerald-500 text-dark-950 shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-500/30 scale-105"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-dark-800 text-gray-400 border border-white/5"
            }`}
          >
            {!isMuted ? <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />}
          </div>
          {isSpeaking && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-bold text-white shrink-0">语音连麦室</span>

            {/* Dynamic Active Speakers display */}
            {activeSpeakers.length > 0 ? (
              <div className="px-2 py-0.5 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/40 rounded-full flex items-center gap-1.5 animate-pulse shadow-sm shadow-emerald-500/10 max-w-[180px] sm:max-w-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate max-w-[90px] sm:max-w-[180px]">
                  {activeSpeakers.map((s) => s.name).join("、")}
                </span>
                <span className="shrink-0">讲话中</span>
                {/* 4-bar equalizer */}
                <div className="flex items-end gap-0.5 h-2.5 shrink-0">
                  <span className="w-0.5 bg-emerald-400 animate-[bounce_0.6s_infinite_100ms] h-full" />
                  <span className="w-0.5 bg-emerald-400 animate-[bounce_0.6s_infinite_250ms] h-2/3" />
                  <span className="w-0.5 bg-emerald-400 animate-[bounce_0.6s_infinite_400ms] h-full" />
                </div>
              </div>
            ) : !isMuted ? (
              <span className="px-1.5 py-0.2 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded truncate">
                🎙️ 开麦就绪 · 全屋静默
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

          {/* Realtime Local Input Meter or Subtitle */}
          <div className="flex items-center gap-2 mt-1">
            {!isMuted ? (
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <span>麦克风音量:</span>
                <div className="w-14 sm:w-16 h-1.5 bg-dark-800 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-75"
                    style={{ width: `${Math.min(100, Math.max(localLevel, isSpeaking ? 30 : 0))}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-gray-400 line-clamp-1">
                硬件级降噪 & 回声消除，观众列表中可调节音量
              </p>
            )}
          </div>
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
