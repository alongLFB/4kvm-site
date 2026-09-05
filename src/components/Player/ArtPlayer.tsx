"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";

interface ArtPlayerProps {
  url: string;
  title: string;
  poster?: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  initialTime?: number;
  getInstance?: (art: Artplayer) => void;
}

interface HudState {
  type: "brightness" | "volume" | "seek";
  value?: number;
  targetTime?: number;
  duration?: number;
  delta?: number;
}

const FULLSCREEN_ON_SVG = `<svg class="icon" width="22" height="22" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M625.777778 256h142.222222V398.222222h113.777778V142.222222H625.777778v113.777778zM256 398.222222V256H398.222222v-113.777778H142.222222V398.222222h113.777778zM768 625.777778v142.222222H625.777778v113.777778h256V625.777778h-113.777778zM398.222222 768H256V625.777778h-113.777778v256H398.222222v-113.777778z" fill="currentColor" /></svg>`;

const FULLSCREEN_OFF_SVG = `<svg class="icon" width="22" height="22" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M768 298.666667h170.666667v85.333333h-256V128h85.333333v170.666667zM341.333333 384H85.333333V298.666667h170.666667V128h85.333333v256z m426.666667 341.333333v170.666667h-85.333333v-256h256v85.333333h-170.666667zM341.333333 640v256H256v-170.666667H85.333333v-85.333333h256z" fill="currentColor" /></svg>`;

const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return (
    isIOS ||
    /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    window.matchMedia("(max-width: 768px)").matches
  );
};

const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
};

export default function VideoPlayer({
  url,
  title,
  poster,
  onEnded,
  onTimeUpdate,
  initialTime = 0,
  getInstance,
}: ArtPlayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Artplayer | null>(null);
  const fsControlRef = useRef<HTMLElement | null>(null);

  const [isLandscape, setIsLandscape] = useState(false);
  const [isRealLandscape, setIsRealLandscape] = useState(false);
  const [showLandscapeHeader, setShowLandscapeHeader] = useState(true);
  const [hud, setHud] = useState<HudState | null>(null);

  const isLandscapeRef = useRef(false);
  const hudTimerRef = useRef<NodeJS.Timeout | null>(null);
  const brightnessRef = useRef<number>(1.0);

  // 手势触摸状态变量
  const touchStateRef = useRef<{
    startX: number;
    startY: number;
    initialVolume: number;
    initialBrightness: number;
    initialTime: number;
    mode: "brightness" | "volume" | "seek" | null;
    isLeftHalf: boolean;
    isRotated: boolean;
    targetSeekTime: number;
  }>({
    startX: 0,
    startY: 0,
    initialVolume: 0.8,
    initialBrightness: 1.0,
    initialTime: 0,
    mode: null,
    isLeftHalf: false,
    isRotated: false,
    targetSeekTime: 0,
  });

  const showHudMessage = useCallback((newHud: HudState) => {
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    setHud(newHud);
    hudTimerRef.current = setTimeout(() => {
      setHud(null);
    }, 850);
  }, []);

  // 更新全屏图标与提示
  const updateFullscreenIcon = (isFs: boolean) => {
    if (fsControlRef.current) {
      const iconContainer =
        fsControlRef.current.querySelector(".art-icon") || fsControlRef.current;
      iconContainer.innerHTML = isFs ? FULLSCREEN_OFF_SVG : FULLSCREEN_ON_SVG;
      fsControlRef.current.setAttribute(
        "data-tooltip",
        isFs ? "退出全屏" : "全屏"
      );
      fsControlRef.current.setAttribute(
        "aria-label",
        isFs ? "退出全屏" : "全屏"
      );
    }
  };

  // 移动端进入横屏伪全屏模式
  const enterLandscape = () => {
    isLandscapeRef.current = true;
    setIsLandscape(true);
    setShowLandscapeHeader(true);

    // 锁定背景页面滚动与滚动条
    document.documentElement.classList.add("landscape-locked");
    document.body.classList.add("landscape-locked");

    const wrapper = wrapperRef.current;
    if (wrapper) {
      wrapper.classList.add("mobile-landscape-active");
      const isPort = window.innerHeight > window.innerWidth;
      setIsRealLandscape(!isPort);

      if (isPort) {
        wrapper.classList.remove("in-real-landscape");
        if (instanceRef.current) (instanceRef.current as any).isRotate = true;
      } else {
        wrapper.classList.add("in-real-landscape");
        if (instanceRef.current) (instanceRef.current as any).isRotate = false;
      }
    }

    if (instanceRef.current) {
      instanceRef.current.emit("resize");
      instanceRef.current.resize();
    }

    updateFullscreenIcon(true);

    try {
      window.history.pushState({ isLandscapeFullscreen: true }, "");
    } catch {}
  };

  // 退出横屏伪全屏模式
  const exitLandscape = (needPop = true) => {
    isLandscapeRef.current = false;
    setIsLandscape(false);
    setIsRealLandscape(false);

    // 恢复背景页面滚动
    document.documentElement.classList.remove("landscape-locked");
    document.body.classList.remove("landscape-locked");

    const wrapper = wrapperRef.current;
    if (wrapper) {
      wrapper.classList.remove("mobile-landscape-active", "in-real-landscape");
    }

    if (instanceRef.current) {
      (instanceRef.current as any).isRotate = false;
      instanceRef.current.emit("resize");
      instanceRef.current.resize();
    }

    updateFullscreenIcon(false);

    if (
      needPop &&
      typeof window !== "undefined" &&
      window.history.state?.isLandscapeFullscreen
    ) {
      window.history.back();
    }
  };

  // 统一全屏触发逻辑
  const handleFullscreenToggle = () => {
    if (isMobileDevice()) {
      if (isLandscapeRef.current) {
        exitLandscape();
      } else {
        enterLandscape();
      }
    } else {
      // PC 桌面端使用标准 HTML5 全屏
      if (!document.fullscreenElement) {
        wrapperRef.current?.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }
  };

  // 触摸手势监听处理
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const target = e.target as HTMLElement;

      // 若播放器处于锁定状态，禁止触发任何手势调节
      if ((instanceRef.current as any)?.isLock) {
        return;
      }

      // 若点击在控制条、锁定按钮、进度条等控件上，不触发手势调节
      if (
        target.closest(".art-bottom") ||
        target.closest(".art-controls") ||
        target.closest(".art-progress") ||
        target.closest(".art-settings") ||
        target.closest(".art-contextmenus") ||
        target.closest(".art-landscape-header") ||
        target.closest(".art-layer-lock") ||
        target.closest(".art-layer") ||
        target.closest("button")
      ) {
        return;
      }

      const touch = e.touches[0];
      const isPort = window.innerHeight > window.innerWidth;
      const isRotated = isLandscapeRef.current && isPort;

      // 判断触摸落在横屏视角的左半区（亮度）还是右半区（音量）
      let isLeft = false;
      if (isRotated) {
        // 手机逆时针旋转观看：物理顶部(刘海/灵动岛)位于左侧，物理底部位于右侧
        isLeft = touch.clientY < window.innerHeight / 2;
      } else {
        isLeft = touch.clientX < window.innerWidth / 2;
      }

      touchStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        initialVolume: instanceRef.current ? instanceRef.current.volume : 0.8,
        initialBrightness: brightnessRef.current,
        initialTime: instanceRef.current ? instanceRef.current.currentTime : 0,
        mode: null,
        isLeftHalf: isLeft,
        isRotated,
        targetSeekTime: instanceRef.current ? instanceRef.current.currentTime : 0,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const ts = touchStateRef.current;
      if (ts.startX === 0 && ts.startY === 0) return;

      const touch = e.touches[0];
      const diffRawX = touch.clientX - ts.startX;
      const diffRawY = touch.clientY - ts.startY;

      // 换算到横屏坐标系中的横向和纵向位移
      let deltaX = 0; // 沿视频水平方向（右为正）
      let deltaY = 0; // 沿视频垂直方向（上为正）

      if (ts.isRotated) {
        // 逆时针旋转 90 度后观看：
        // 手指向物理下方滑动 (diffRawY > 0) = 沿横向视野向右滑动 (快进)
        // 手指向物理右方滑动 (diffRawX > 0) = 沿纵向视野向上滑动 (调大)
        deltaX = diffRawY;
        deltaY = diffRawX;
      } else {
        deltaX = diffRawX;
        deltaY = -diffRawY;
      }

      // 判断手势触发阈值与意图锁定
      if (ts.mode === null) {
        if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
          ts.mode = "seek";
        } else if (Math.abs(deltaY) > 12) {
          ts.mode = ts.isLeftHalf ? "brightness" : "volume";
        }
      }

      // 处于全屏横屏或已识别手势模式时，彻底拦截浏览器默认滚动行为
      if (isLandscapeRef.current || ts.mode !== null) {
        if (e.cancelable) e.preventDefault();
      }

      if (ts.mode !== null) {
        e.stopPropagation();

        if (ts.mode === "brightness") {
          // 亮度调节：范围 0.2 ~ 1.8，默认 1.0 (50%)
          const MIN_BRI = 0.2;
          const MAX_BRI = 1.8;
          const step = deltaY / 220;
          const newBri = Math.min(Math.max(ts.initialBrightness + step, MIN_BRI), MAX_BRI);
          brightnessRef.current = newBri;
          if (instanceRef.current?.video) {
            instanceRef.current.video.style.filter = `brightness(${newBri})`;
          }
          const percent = Math.round(((newBri - MIN_BRI) / (MAX_BRI - MIN_BRI)) * 100);
          showHudMessage({
            type: "brightness",
            value: percent,
          });
        } else if (ts.mode === "volume") {
          // 音量调节：范围 0 ~ 1
          const step = deltaY / 220;
          const newVol = Math.min(Math.max(ts.initialVolume + step, 0), 1);
          if (instanceRef.current) {
            instanceRef.current.volume = newVol;
          }
          showHudMessage({
            type: "volume",
            value: Math.round(newVol * 100),
          });
        } else if (ts.mode === "seek") {
          // 进度调节：按拖拽距离快进/快退
          const duration = instanceRef.current?.duration || 0;
          const seekDelta = (deltaX / 260) * Math.min(duration * 0.15, 90);
          const target = Math.min(Math.max(ts.initialTime + seekDelta, 0), duration);
          ts.targetSeekTime = target;
          showHudMessage({
            type: "seek",
            targetTime: target,
            duration,
            delta: Math.round(seekDelta),
          });
        }
      }
    };

    const onTouchEnd = () => {
      const ts = touchStateRef.current;
      if (ts.mode === "seek" && ts.targetSeekTime !== ts.initialTime) {
        if (instanceRef.current) {
          instanceRef.current.seek = ts.targetSeekTime;
        }
      }

      touchStateRef.current = {
        startX: 0,
        startY: 0,
        initialVolume: 0.8,
        initialBrightness: 1.0,
        initialTime: 0,
        mode: null,
        isLeftHalf: false,
        isRotated: false,
        targetSeekTime: 0,
      };
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [showHudMessage]);

  useEffect(() => {
    // 监听移动端屏幕旋转动态更新
    const handleResize = () => {
      if (!isLandscapeRef.current) return;
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const isPort = window.innerHeight > window.innerWidth;
      setIsRealLandscape(!isPort);

      if (isPort) {
        wrapper.classList.remove("in-real-landscape");
        if (instanceRef.current) (instanceRef.current as any).isRotate = true;
      } else {
        wrapper.classList.add("in-real-landscape");
        if (instanceRef.current) (instanceRef.current as any).isRotate = false;
      }

      if (instanceRef.current) {
        instanceRef.current.emit("resize");
        instanceRef.current.resize();
      }
    };

    // 监听历史记录后退（如 iOS 屏幕边缘左滑返回）
    const handlePopState = () => {
      if (isLandscapeRef.current) {
        exitLandscape(false);
      }
    };

    // 监听 PC 原生全屏状态变化（ESC 退出等）
    const handleDocFsChange = () => {
      if (!isMobileDevice()) {
        const isFs = !!document.fullscreenElement;
        updateFullscreenIcon(isFs);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("fullscreenchange", handleDocFsChange);

    return () => {
      // 页面卸载时确保解除页面滚动锁定
      document.documentElement.classList.remove("landscape-locked");
      document.body.classList.remove("landscape-locked");

      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("fullscreenchange", handleDocFsChange);
    };
  }, []);

  useEffect(() => {
    if (!artRef.current) return;

    const art = new Artplayer({
      container: artRef.current,
      url: url,
      poster: poster || "",
      volume: 0.8,
      autoplay: true,
      pip: false,
      autoSize: false,
      autoMini: false,
      screenshot: true,
      setting: true,
      loop: false,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      hotkey: true,
      fullscreen: false, // 禁用默认全屏以接管自定义横屏全屏
      fullscreenWeb: false, // 禁用默认网页全屏避免多余图标
      autoOrientation: false,
      playsInline: true,
      lock: true,
      fastForward: true,
      airplay: false,
      mutex: true,
      theme: "#06b6d4",
      lang: "zh-cn",
      moreVideoAttr: {
        crossOrigin: "anonymous",
        preload: "auto",
        playsinline: "true",
        "webkit-playsinline": "true",
        "x5-video-player-type": "h5",
        "x5-video-player-fullscreen": "true",
        "x5-playsinline": "true",
      },
      customType: {
        m3u8: function (video: HTMLMediaElement, url: string, art: Artplayer) {
          const updateRes = (w: number, h: number) => {
            let label = "1080p";
            if (w >= 3800 || h >= 2100) label = "4K";
            else if (w >= 2500 || h >= 1400) label = "2K";
            else if (w >= 1800 || h >= 950) label = "1080p";
            else if (w >= 1200 || h >= 680) label = "720p";
            else if (w >= 800 || h >= 460) label = "480p";
            else if (h > 0) label = `${h}p`;

            const el = art.controls["resolution"];
            if (el) el.innerText = label;
          };

          if (Hls.isSupported()) {
            if (art.hls) art.hls.destroy();
            const hls = new Hls({
              maxBufferLength: 60,
              maxMaxBufferLength: 120,
              startFragPrefetch: true,
            });
            hls.loadSource(url);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
              if (data.levels && data.levels.length > 0) {
                const lvl = data.levels[0];
                if (lvl && lvl.width && lvl.height) {
                  updateRes(lvl.width, lvl.height);
                }
              }
            });

            art.hls = hls;
            art.on("destroy", () => hls.destroy());
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
          } else {
            art.notice.show = "当前浏览器不支持播放此格式";
          }

          video.addEventListener("loadedmetadata", () => {
            if (video.videoWidth && video.videoHeight) {
              updateRes(video.videoWidth, video.videoHeight);
            }
          });
        },
      },
      controls: [
        {
          name: "resolution",
          position: "right",
          index: 10,
          html: "1080p",
          tooltip: "实际画质",
          style: {
            fontSize: "12px",
            fontWeight: "bold",
            color: "#22d3ee",
            padding: "0 8px",
            lineHeight: "22px",
            display: "flex",
            alignItems: "center",
          },
        },
        {
          name: "customFullscreen",
          position: "right",
          index: 70,
          tooltip: "全屏",
          html: `<i class="art-icon">${FULLSCREEN_ON_SVG}</i>`,
          click: function () {
            handleFullscreenToggle();
          },
          mounted: ($control: HTMLElement) => {
            fsControlRef.current = $control;
          },
        },
      ],
    });

    instanceRef.current = art;

    if (getInstance) {
      getInstance(art);
    }
    if (typeof window !== "undefined") {
      (window as any).__4kvm_player__ = art;
    }

    // 控制栏显隐同步顶部退出横屏条
    art.on("control", (state: boolean) => {
      setShowLandscapeHeader(state);
    });

    art.on("ready", () => {
      if (initialTime > 0) {
        art.currentTime = initialTime;
      }
    });

    art.on("video:timeupdate", () => {
      if (onTimeUpdate) {
        onTimeUpdate(art.currentTime, art.duration);
      }
    });

    art.on("video:ended", () => {
      if (onEnded) onEnded();
    });

    return () => {
      if (art && art.destroy) {
        art.destroy(false);
      }
    };
  }, [url]);

  return (
    <div
      ref={wrapperRef}
      className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10"
    >
      {/* 移动端横屏模式下的沉浸式顶部返回条 */}
      {isLandscape && (
        <div
          className={`absolute top-0 left-0 right-0 z-[65] flex items-center px-4 pt-3 pb-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent transition-opacity duration-300 pointer-events-auto ${
            showLandscapeHeader
              ? "opacity-100"
              : "opacity-0 pointer-events-none"
          }`}
          style={{
            paddingLeft: isRealLandscape
              ? "max(20px, env(safe-area-inset-left, 20px))"
              : "max(28px, env(safe-area-inset-top, 28px))",
            paddingRight: isRealLandscape
              ? "max(20px, env(safe-area-inset-right, 20px))"
              : "max(28px, env(safe-area-inset-bottom, 28px))",
            paddingTop: isRealLandscape
              ? "max(12px, env(safe-area-inset-top, 12px))"
              : "max(14px, env(safe-area-inset-right, 14px))",
          }}
        >
          <button
            type="button"
            onClick={() => exitLandscape()}
            className="flex items-center gap-2 text-white bg-black/60 hover:bg-black/90 active:scale-95 px-3.5 py-1.5 rounded-full border border-white/20 backdrop-blur-md text-sm font-medium transition shadow-lg cursor-pointer"
          >
            <svg
              className="w-5 h-5 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="truncate max-w-[200px] sm:max-w-[360px]">
              {title}
            </span>
            <span className="text-xs text-white/50 border-l border-white/20 pl-2 ml-1">
              退出横屏
            </span>
          </button>
        </div>
      )}

      {/* 手势调节沉浸式 HUD 悬浮框 */}
      {hud && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center pointer-events-none transition-opacity duration-150">
          <div className="flex flex-col items-center gap-2.5 bg-black/85 backdrop-blur-xl border border-white/25 px-6 py-4 rounded-2xl text-white shadow-2xl min-w-[170px]">
            {hud.type === "brightness" && (
              <>
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-base">
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
                  </svg>
                  <span>亮度 {hud.value}%</span>
                </div>
                <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-75 shadow-sm"
                    style={{ width: `${hud.value}%` }}
                  />
                </div>
              </>
            )}
            {hud.type === "volume" && (
              <>
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-base">
                  {hud.value !== undefined && hud.value > 0 ? (
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  ) : (
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  )}
                  <span>音量 {hud.value}%</span>
                </div>
                <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full transition-all duration-75 shadow-sm"
                    style={{ width: `${hud.value}%` }}
                  />
                </div>
              </>
            )}
            {hud.type === "seek" && (
              <>
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-base">
                  <span>{hud.delta !== undefined && hud.delta >= 0 ? "⏩ 快进" : "⏪ 快退"}</span>
                  <span className="text-xs text-white/70">
                    ({hud.delta !== undefined && hud.delta >= 0 ? `+${hud.delta}s` : `${hud.delta}s`})
                  </span>
                </div>
                <div className="text-sm font-mono tracking-wider text-white/90">
                  {formatTime(hud.targetTime || 0)} / {formatTime(hud.duration || 0)}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div ref={artRef} className="w-full h-full" />
    </div>
  );
}
