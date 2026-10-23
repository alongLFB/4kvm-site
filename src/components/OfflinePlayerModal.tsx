"use client";

import React, { useEffect } from "react";
import { X, Play, HardDrive, CheckCircle2, ChevronLeft } from "lucide-react";

interface OfflinePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vodName: string;
  episodeName: string;
  videoUrl: string;
}

export function OfflinePlayerModal({
  isOpen,
  onClose,
  vodName,
  episodeName,
  videoUrl,
}: OfflinePlayerModalProps) {
  // Prevent background scroll
  useEffect(() => {
    if (!isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [isOpen]);

  // 监听浏览器/手机手势返回 (popstate) 与 ESC 键
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ modal: "offline-player" }, "");

    const handlePopState = () => {
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
      if (window.history.state?.modal === "offline-player") {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen || !videoUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[100000] overscroll-contain bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-dark-900 border border-white/10 rounded-3xl w-full max-w-4xl flex flex-col shadow-2xl overflow-hidden overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 pt-[max(1rem,env(safe-area-inset-top))] border-b border-white/10 flex items-center justify-between bg-dark-950/80 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* 移动端专享返回按钮 */}
            <button
              onClick={onClose}
              className="p-1.5 -ml-1 text-gray-300 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 flex items-center gap-0.5 transition cursor-pointer shrink-0"
              title="返回下载中心"
              aria-label="返回下载中心"
            >
              <ChevronLeft className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold text-gray-200">返回</span>
            </button>

            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
                {vodName}
                <span className="text-xs font-normal text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                  {episodeName}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                  <HardDrive className="w-3 h-3" />
                  本地离线播放 · 0流量
                </span>
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition cursor-pointer flex items-center gap-1 shrink-0"
            title="关闭播放器"
          >
            <span className="text-xs text-gray-400 hidden sm:inline">关闭</span>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Area */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          <video
            src={videoUrl}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-dark-950/90 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            已从 PWA 本地 IndexedDB 缓存完全载入，断网离线也能顺畅播放
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition cursor-pointer"
          >
            退出全屏
          </button>
        </div>
      </div>
    </div>
  );
}
