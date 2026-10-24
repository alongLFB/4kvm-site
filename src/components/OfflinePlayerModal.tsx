"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";
import {
  X,
  Play,
  HardDrive,
  CheckCircle2,
  ChevronLeft,
  Zap,
  ShieldCheck,
  FastForward,
  AlertTriangle,
  ArrowDownToLine,
  RefreshCw,
} from "lucide-react";

interface OfflinePlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId?: string;
  vodName: string;
  episodeName: string;
  videoUrl: string;
  onExport?: () => void;
}

export function OfflinePlayerModal({
  isOpen,
  onClose,
  taskId,
  vodName,
  episodeName,
  videoUrl,
  onExport,
}: OfflinePlayerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [lastCalibratedTime, setLastCalibratedTime] = useState<number | null>(null);
  const [playbackError, setPlaybackError] = useState<{
    code?: number;
    message: string;
    detail?: string;
  } | null>(null);

  // 防卡顿校准器内部追踪变量
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);
  const secondaryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rVFCCallbackIdRef = useRef<number | null>(null);
  const framesRenderedRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);
  const isCalibratingRef = useRef<boolean>(false);
  const stallCountRef = useRef<number>(0);
  const calibrationCountRef = useRef<number>(0);

  // 手动/自动执行音画关键帧校准 (支持微步对齐与深度跳过卡顿广告片段)
  const performCalibration = useCallback((isManual = false, isDeepSkip = false) => {
    const art = artRef.current;
    if (!art || !art.video) return;

    // 视频出错时坚决不执行校准，终止重试链，彻底遏制死循环
    if (art.video.error) {
      console.warn("[OfflinePlayer] 视频底层已报错，终止自动校准");
      return;
    }

    // 连续自动校准超过 3 次且物理帧数依然为 0，停止自动重试
    if (!isManual) {
      calibrationCountRef.current++;
      if (calibrationCountRef.current > 3 && framesRenderedRef.current === 0) {
        console.warn("[OfflinePlayer] 自动校准达到 3 次上限且无物理帧呈现，停止自动重试以防死循环");
        if (art.notice) {
          art.notice.show = "⚠️ 解码未产生新画面，已停止自动重试";
        }
        return;
      }
    } else {
      // 手动触发则重置计数器
      calibrationCountRef.current = 0;
    }

    isCalibratingRef.current = true;
    setCalibrating(true);

    const vid = art.video;
    const curTime = vid.currentTime;

    // 常规微步前移 0.08s 跳过残损 GOP；若遭遇插播广告片段卡死则跳跃 +5s 彻底跨越
    const nudgeDelta = isDeepSkip ? 5.0 : 0.08;
    try {
      vid.currentTime = Math.min(vid.duration || Infinity, curTime + nudgeDelta);
    } catch (e) {}

    if (art.notice) {
      art.notice.show = isDeepSkip
        ? "⏩ 已跳过卡顿片段 (+5秒)，音画重新同步"
        : isManual
        ? "⚡ 手动校准关键帧中..."
        : "⚡ 画面校准中，正在对齐关键帧...";
    }

    setTimeout(() => {
      // 若依然未渲染出新画面且仍在播放，进行快速排空解码器缓存循环
      if (vid && !vid.paused && !vid.error && framesRenderedRef.current === 0) {
        try {
          vid.pause();
          vid.currentTime = vid.currentTime + (isDeepSkip ? 2.0 : 0.15);
          vid.play().catch(() => {});
        } catch (e) {}
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

    // 重置状态
    setPlaybackError(null);
    calibrationCountRef.current = 0;
    framesRenderedRef.current = 0;

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
      customType: {
        m3u8: function (video: HTMLMediaElement, url: string, artInstance: Artplayer) {
          if (Hls.isSupported()) {
            if ((artInstance as any).hls) ((artInstance as any).hls as any).destroy();
            const hls = new Hls({
              maxBufferLength: 30,
            });
            hls.loadSource(url);
            hls.attachMedia(video);
            (artInstance as any).hls = hls;
            artInstance.on("destroy", () => hls.destroy());
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
          } else {
            if (artInstance.notice) {
              artInstance.notice.show = "当前环境不支持播放 M3U8 格式";
            }
          }
        },
      },
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
          calibrationCountRef.current = 0; // 成功产生画面物理帧，重置连续校准保护计数
          setPlaybackError(null);

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
        if (!vid || vid.paused || vid.ended || vid.error || isCalibratingRef.current) return;

        // 如果播放中，且始终未产生新帧，说明解码器卡在非 IDR 帧或广告段上
        const isFrameStalled = framesRenderedRef.current === 0;

        if (isFrameStalled && calibrationCountRef.current < 3) {
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
      if (!isSeekingRef.current && !isCalibratingRef.current && vid && !vid.paused && !vid.error) {
        watchdogTimerRef.current = setTimeout(() => {
          if (vid && !vid.paused && !vid.error && framesRenderedRef.current === 0 && calibrationCountRef.current < 3) {
            stallCountRef.current++;
            performCalibration(false, stallCountRef.current >= 2);
          }
        }, 500);
      }
    });

    // 监听视频底层严重错误：立即清除看门狗，停止重试，展示友好错误指引
    const onVideoError = () => {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      if (secondaryTimerRef.current) clearTimeout(secondaryTimerRef.current);
      isCalibratingRef.current = false;

      const mediaErr = vid?.error;
      console.error("[OfflinePlayer] 视频底层解码/播放错误:", mediaErr);

      let msg = "离线视频加载或解码异常";
      let detail = "当前播放环境未能成功解码该本地视频文件。";
      if (mediaErr) {
        if (mediaErr.code === 3) {
          msg = "视频解码失败 (MEDIA_ERR_DECODE)";
          detail = "iOS WebKit 底层引擎对该离线封装格式解码受限。推荐直接点击下方【导出视频】保存到手机相册或在系统播放器中观看。";
        } else if (mediaErr.code === 4) {
          msg = "播放格式不受支持 (MEDIA_ERR_SRC_NOT_SUPPORTED)";
          detail = "浏览器不支持直接播放此离线视频格式。推荐点击下方按钮导出文件至本地。";
        } else if (mediaErr.code === 2) {
          msg = "本地流媒体读取中断 (MEDIA_ERR_NETWORK)";
          detail = "读取沙盒离线数据中断，您可以点击重新加载或导出视频。";
        }
      }

      setPlaybackError({
        code: mediaErr?.code,
        message: msg,
        detail,
      });

      if (art.notice) {
        art.notice.show = `❌ ${msg}`;
      }
    };

    if (vid) {
      vid.addEventListener("error", onVideoError);
    }
    art.on("error", onVideoError);

    return () => {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      if (secondaryTimerRef.current) clearTimeout(secondaryTimerRef.current);
      if (vid && rVFCCallbackIdRef.current !== null && "cancelVideoFrameCallback" in vid) {
        (vid as any).cancelVideoFrameCallback(rVFCCallbackIdRef.current);
      }
      try {
        if (art.video) {
          art.video.removeEventListener("error", onVideoError);
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
      className="fixed inset-0 z-[100000] overscroll-contain bg-black/90 backdrop-blur-xl flex items-center justify-center p-2 sm:p-5 animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Ambient Theater Backlight Glow */}
      <div className="absolute w-[80vw] max-w-4xl h-[400px] bg-gradient-to-r from-emerald-500/15 via-cyan-500/15 to-blue-500/10 filter blur-[100px] pointer-events-none -z-10 opacity-70" />

      <div
        className="bg-[#0a0d16]/95 border border-white/[0.08] rounded-3xl w-full max-w-5xl flex flex-col shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)] overflow-hidden overscroll-contain relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 pt-[max(1rem,env(safe-area-inset-top))] border-b border-white/[0.08] flex items-center justify-between bg-[#06080e]/95 backdrop-blur-xl gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* 移动端专享返回按钮 */}
            <button
              onClick={onClose}
              className="p-1.5 -ml-1 text-gray-300 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 flex items-center gap-1 transition cursor-pointer shrink-0"
              title="返回下载中心"
              aria-label="返回下载中心"
            >
              <ChevronLeft className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold text-gray-200">返回</span>
            </button>

            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] shrink-0">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>

            <div className="min-w-0">
              <h3 className="font-display text-sm sm:text-base font-black text-white flex items-center gap-2 truncate">
                <span>{vodName}</span>
                <span className="text-xs font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 shrink-0 shadow-sm">
                  {episodeName}
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <HardDrive className="w-3 h-3" />
                  本地 0 流量离线播
                </span>
                <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  防定格看门狗守护
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 快捷导出视频按钮 (iOS / 移动端可直接存入相册) */}
            {onExport && (
              <button
                type="button"
                onClick={onExport}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-xs font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1.5 transition border border-emerald-500/35 shadow-sm cursor-pointer"
                title="导出视频至本地文件或直接存入 iOS 相册"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">导出到相册</span>
              </button>
            )}

            {/* 顶栏快速画面校准按钮 */}
            <button
              type="button"
              onClick={() => performCalibration(true, false)}
              disabled={calibrating}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-xs font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 transition border border-amber-500/30 shadow-sm cursor-pointer disabled:opacity-50"
              title="若拖拽进度条后画面定格不动，点击此处立即微调对齐关键帧"
            >
              <Zap className={`w-3.5 h-3.5 ${calibrating ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">对齐关键帧</span>
            </button>

            {/* 顶栏跳过卡顿/广告按钮 */}
            <button
              type="button"
              onClick={() => performCalibration(true, true)}
              disabled={calibrating}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 active:scale-95 text-xs font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 transition border border-cyan-500/30 shadow-sm cursor-pointer disabled:opacity-50"
              title="若画面卡在广告页面或严重黑屏，点击直接快进 5 秒跳过"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">跨越 (+5s)</span>
            </button>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 active:scale-90 transition cursor-pointer flex items-center gap-1 shrink-0"
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

          {/* 异常防护与优雅提示浮层 (彻底遏制无限重试卡顿) */}
          {playbackError && (
            <div className="absolute inset-0 z-30 bg-[#06080e]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center text-gray-200">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_30px_rgba(244,63,94,0.25)]">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h4 className="font-display text-lg font-black text-white mb-2">{playbackError.message}</h4>
              <p className="text-xs sm:text-sm text-gray-400 max-w-md leading-relaxed mb-6 font-normal">
                {playbackError.detail}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {onExport && (
                  <button
                    type="button"
                    onClick={onExport}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-dark-950 font-black text-xs sm:text-sm flex items-center gap-2 transition active:scale-95 shadow-[0_4px_25px_rgba(16,185,129,0.35)] cursor-pointer"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>立即导出视频 (存入相册/文件)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPlaybackError(null);
                    calibrationCountRef.current = 0;
                    if (artRef.current && artRef.current.video) {
                      artRef.current.video.load();
                      artRef.current.video.play().catch(() => {});
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer border border-white/10"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>重新加载</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-gray-400 hover:text-white font-medium text-xs sm:text-sm transition cursor-pointer"
                >
                  退出播放
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 sm:p-4 bg-[#06080e]/95 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-2 text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>PWA 本地沙盒极速免流 · 防卡顿守护已开启 · 拖拽进度若定格可点击【对齐关键帧】</span>
          </span>

          <div className="flex items-center gap-3">
            {onExport && (
              <button
                type="button"
                onClick={onExport}
                className="text-emerald-400 hover:text-emerald-300 font-bold underline underline-offset-4 transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>导出到本地相册</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 font-bold transition cursor-pointer active:scale-95"
            >
              退出播放
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
