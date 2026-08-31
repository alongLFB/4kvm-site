"use client";

import React, { useEffect, useRef } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";

interface ArtPlayerProps {
  url: string;
  title: string;
  poster?: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  initialTime?: number;
}

export default function VideoPlayer({
  url,
  title,
  poster,
  onEnded,
  onTimeUpdate,
  initialTime = 0,
}: ArtPlayerProps) {
  const artRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Artplayer | null>(null);

  useEffect(() => {
    if (!artRef.current) return;

    // 根据 ArtPlayer 官方源码规范初始化的最简且标准配置
    const art = new Artplayer({
      container: artRef.current,
      url: url,
      poster: poster || "",
      volume: 0.8,
      autoplay: true,
      pip: true,
      autoSize: true,
      autoMini: true,
      screenshot: true,
      setting: true,
      loop: false,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      hotkey: true,          // 键盘快捷键支持
      fullscreen: true,      // 允许原生全屏
      fullscreenWeb: true,   // 允许网页全屏（移动端 autoOrientation 的基石）
      autoOrientation: true, // 核心：开启原生移动端全屏自动横屏旋转
      playsInline: true,     // 标准配置：第一级原生顶层参数，Artplayer 内部会自动挂载 playsinline/webkit-playsinline
      lock: true,            // 移动端锁屏防误触
      fastForward: true,     // 移动端长按 2x 倍速快进
      airplay: true,         // 支持苹果无线投屏
      mutex: true,           // 多播放器互斥
      theme: "#06b6d4",
      lang: "zh-cn",

      // moreVideoAttr 仅用于配置底层 <video> DOM 元素的非标准扩展属性（如跨域、预加载和腾讯X5/微信内核属性）
      moreVideoAttr: {
        crossOrigin: "anonymous",
        preload: "auto",
        "x5-video-player-type": "h5",
        "x5-video-player-fullscreen": "true",
        "x5-playsinline": "true",
      },

      customType: {
        m3u8: function (video: HTMLMediaElement, url: string, art: Artplayer) {
          if (Hls.isSupported()) {
            if (art.hls) art.hls.destroy();
            const hls = new Hls({
              maxBufferLength: 60,
              maxMaxBufferLength: 120,
              startFragPrefetch: true,
            });
            hls.loadSource(url);
            hls.attachMedia(video);
            art.hls = hls;
            art.on("destroy", () => hls.destroy());
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
          } else {
            art.notice.show = "当前浏览器不支持播放此格式";
          }
        },
      },
      quality: [
        {
          default: true,
          html: "1080P 原画",
          url: url,
        },
        {
          default: false,
          html: "720P 高清",
          url: url,
        },
      ],
    });

    instanceRef.current = art;

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
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10">
      <div ref={artRef} className="w-full h-full" />
    </div>
  );
}