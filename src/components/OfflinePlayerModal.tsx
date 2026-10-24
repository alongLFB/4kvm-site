"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Artplayer from "artplayer";
import {
  X,
  Play,
  HardDrive,
  CheckCircle2,
  ChevronLeft,
  Zap,
  ShieldCheck,
  FastForward,
} from "lucide-react";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [lastCalibratedTime, setLastCalibratedTime] = useState<number | null>(null);

  // 防卡顿校准器内部追踪变量
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);
  const secondaryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rVFCCallbackIdRef = useRef<number | null>(null);
  const framesRenderedRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);
  const isCalibratingRef = useRef<boolean>(false);
  const stallCountRef = useRef<number>(0);

  // 手动/自动执行音画关键帧校准 (支持微步对齐与深度跳过卡顿广告片段)
  const performCalibration = useCallback((isManual = false, isDeepSkip = false) => {
    const art = artRef.current;
    if (!art || !art.video) return;

    isCalibratingRef.current = true;
    setCalibrating(true);

    const vid = art.video;
    const curTime = vid.currentTime;

    // 常规微步前移 0.08s 跳过残损 GOP；若遭遇插播广告片段卡死则跳跃 +5s 彻底跨越
    const nudgeDelta = isDeepSkip ? 5.0 : 0.08;
    vid.currentTime = Math.min(vid.duration || Infinity, curTime + nudgeDelta);

    if (art.notice) {
      art.notice.show = isDeepSkip
        ? "⏩ 已跳过卡顿片段 (+5秒)，音画重新同步"
        : isManual
        ? "⚡ 手动校准关键帧中..."
        : "⚡ 画面校准中，正在对齐关键帧...";
    }

    setTimeout(() => {
      // 若依然未渲染出新画面且仍在播放，进行快速排空解码器缓存循环
      if (vid && !vid.paused && framesRenderedRef.current === 0) {
        vid.pause();
        vid.currentTime = vid.currentTime + (isDeepSkip ? 2.0 : 0.15);
        vid.play().catch(() => {});
      }
      if (art.notice) {
        art.notice.show = isDeepSkip ? "⚡ 已成功跨越卡顿片段" : "⚡ 关键帧校准完成，音画已同步";
      }
      setLastCalibratedTime(Date.now());
      setCalibrating(false);
      isCalibratingRef.current = false;
    }, 280);
  }, []);

  // 锁定背景页面滚动
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

  // 初始化专业播放器及挂载防卡顿监听器
  useEffect(() => {
    if (!isOpen || !videoUrl || !containerRef.current) return;

    // 清理可能存在的旧实例与定时器
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    if (secondaryTimerRef.current) clearTimeout(secondaryTimerRef.current);

    const art = new Artplayer({
      container: containerRef.current,
      url: videoUrl,
      volume: 0.85,
      autoplay: true,
      pip: true,
      autoSize: false,
      autoMini: false,
      screenshot: true,
      setting: true,
      loop: false,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      hotkey: true,
      fullscreen: true,
      fullscreenWeb: true,
      autoOrientation: true,
      playsInline: true,
      lock: true,
      fastForward: true,
      airplay: false,
      mutex: true,
      theme: "#10b981", // 离线下载专属翠绿主题色
      lang: "zh-cn",
      moreVideoAttr: {
        crossOrigin: "anonymous",
        preload: "auto",
        playsInline: true,
        "webkit-playsinline": "true",
        "x5-video-player-type": "h5",
        "x5-video-player-fullscreen": "true",
        "x5-playsinline": "true",
      } as any,
      controls: [
        {
          name: "offlineTag",
          position: "left",
          index: 5,
          tooltip: "PWA 本地存储离线播放 · 0流量消耗",
          html: `<span class="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full select-none"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>0流量离线</span>`,
        },
        {
          name: "calibrateButton",
          position: "right",
          index: 15,
          tooltip: "若拖动进度条后画面卡住定格，点击此处立即强制校准关键帧与音画同步",
          html: `<button type="button" class="calibrate-action-btn flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 font-semibold px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition cursor-pointer select-none">⚡ 画面校准</button>`,
          click: function () {
            performCalibration(true, false);
          },
        },
        {
          name: "skipAdButton",
          position: "right",
          index: 16,
          tooltip: "若画面遇到插播广告或严重卡顿，点击直接快进 5 秒跳过卡顿片段",
          html: `<button type="button" class="skip-action-btn flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200 font-semibold px-2 py-0.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 transition cursor-pointer select-none">⏩ 跳过广告 (+5s)</button>`,
          click: function () {
            performCalibration(true, true);
          },
        },
      ],
    });

    artRef.current = art;

    const vid = art.video;

    // 核心防卡顿引擎：启动视频物理帧呈现监听器
    const setupFrameWatcher = () => {
      if (!vid) return;

      if ("requestVideoFrameCallback" in vid) {
        const onFrame = () => {
          framesRenderedRef.current++;
          stallCountRef.current = 0;
          if (watchdogTimerRef.current) {
            clearTimeout(watchdogTimerRef.current);
            watchdogTimerRef.current = null;
          }
          if (vid && "requestVideoFrameCallback" in vid) {
            rVFCCallbackIdRef.current = (vid as any).requestVideoFrameCallback(onFrame);
          }
        };
        rVFCCallbackIdRef.current = (vid as any).requestVideoFrameCallback(onFrame);
      }
    };

    setupFrameWatcher();

    // 监听拖动进度条开始
    art.on("video:seeking", () => {
      isSeekingRef.current = true;
      framesRenderedRef.current = 0;
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
      if (secondaryTimerRef.current) {
        clearTimeout(secondaryTimerRef.current);
        secondaryTimerRef.current = null;
      }
    });

    // 监听拖动进度条结束：启动关键帧守护看门狗
    art.on("video:seeked", () => {
      isSeekingRef.current = false;
      const seekTarget = vid?.currentTime || 0;
      framesRenderedRef.current = 0;

      // 拖动后给底层解码器 320ms 时间生产新帧
      watchdogTimerRef.current = setTimeout(() => {
        if (!vid || vid.paused || vid.ended || isCalibratingRef.current) return;

        // 如果播放中，且 requestVideoFrameCallback 始终未产生新帧，说明解码器卡在非 IDR 帧或广告段上
        const isFrameStalled = framesRenderedRef.current === 0;

        if (isFrameStalled) {
          stallCountRef.current++;
          const isDeepAdStall = stallCountRef.current >= 2;
          console.warn(
            `[OfflinePlayer] 检测到拖拽进度条至 ${seekTarget.toFixed(2)}s 后画面定格 (连续卡顿: ${stallCountRef.current})，执行校准...`
          );
          performCalibration(false, isDeepAdStall);
        } else {
          stallCountRef.current = 0;
        }
      }, 320);
    });

    // 监听播放器停滞事件
    art.on("video:waiting", () => {
      if (!isSeekingRef.current && !isCalibratingRef.current && vid && !vid.paused) {
        watchdogTimerRef.current = setTimeout(() => {
          if (vid && !vid.paused && framesRenderedRef.current === 0) {
            stallCountRef.current++;
            performCalibration(false, stallCountRef.current >= 2);
          }
        }, 500);
      }
    });

    return () => {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      if (secondaryTimerRef.current) clearTimeout(secondaryTimerRef.current);
      if (vid && rVFCCallbackIdRef.current !== null && "cancelVideoFrameCallback" in vid) {
        (vid as any).cancelVideoFrameCallback(rVFCCallbackIdRef.current);
      }
      try {
        if (art.video) {
          art.video.pause();
          art.video.removeAttribute("src");
          art.video.load();
        }
        if (art.destroy) {
          art.destroy(true);
        }
      } catch (e) {}
      artRef.current = null;
    };
  }, [isOpen, videoUrl, performCalibration]);

  if (!isOpen || !videoUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[100000] overscroll-contain bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-dark-900 border border-white/10 rounded-2xl sm:rounded-3xl w-full max-w-5xl flex flex-col shadow-2xl overflow-hidden overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-white/10 flex items-center justify-between bg-dark-950/90 gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
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
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <HardDrive className="w-3 h-3" />
                  本地离线播放 · 0流量
                </span>
                <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  防画面卡顿保护已开启
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 顶栏快速画面校准按钮 */}
            <button
              type="button"
              onClick={() => performCalibration(true, false)}
              disabled={calibrating}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 transition border border-amber-500/30 shadow-sm cursor-pointer disabled:opacity-50"
              title="若拖拽进度条后画面定格不动，点击此处立即微调对齐关键帧"
            >
              <Zap className={`w-3.5 h-3.5 ${calibrating ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">画面校准</span>
            </button>

            {/* 顶栏跳过卡顿/广告按钮 */}
            <button
              type="button"
              onClick={() => performCalibration(true, true)}
              disabled={calibrating}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 active:scale-95 text-xs font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 transition border border-cyan-500/30 shadow-sm cursor-pointer disabled:opacity-50"
              title="若画面卡在广告页面或严重黑屏，点击直接快进 5 秒跳过"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">跳过卡顿 (+5s)</span>
            </button>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition cursor-pointer flex items-center gap-1 shrink-0"
              title="关闭播放器"
            >
              <span className="text-xs text-gray-400 hidden sm:inline">关闭</span>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player Area with ArtPlayer */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
          <div ref={containerRef} className="w-full h-full" />
        </div>

        {/* Footer info */}
        <div className="p-3 sm:p-3.5 bg-dark-950/95 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>已启用关键帧防卡顿校准机制 · 如拖动后画面停顿可点击【画面校准】即刻同步</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => performCalibration(true)}
              className="text-amber-400/90 hover:text-amber-300 underline underline-offset-2 transition cursor-pointer"
            >
              音画不同步？点击画面校准
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition cursor-pointer"
            >
              退出播放
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
