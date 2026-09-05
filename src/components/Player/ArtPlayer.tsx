"use client";

import React, { useEffect, useRef, useState } from "react";
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
  const [showLandscapeHeader, setShowLandscapeHeader] = useState(true);
  const isLandscapeRef = useRef(false);

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

    const wrapper = wrapperRef.current;
    if (wrapper) {
      wrapper.classList.add("mobile-landscape-active");
      const isPort = window.innerHeight > window.innerWidth;
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

  useEffect(() => {
    // 监听移动端屏幕旋转动态更新
    const handleResize = () => {
      if (!isLandscapeRef.current) return;
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const isPort = window.innerHeight > window.innerWidth;
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
            paddingLeft: "max(16px, env(safe-area-inset-left))",
            paddingTop: "max(10px, env(safe-area-inset-top))",
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

      <div ref={artRef} className="w-full h-full" />
    </div>
  );
}
