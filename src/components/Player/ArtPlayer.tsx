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
  getInstance?: (art: Artplayer) => void;
}

export default function VideoPlayer({
  url,
  title,
  poster,
  onEnded,
  onTimeUpdate,
  initialTime = 0,
  getInstance,
}: ArtPlayerProps) {
  const artRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Artplayer | null>(null);

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
      fullscreen: true,
      fullscreenWeb: false,
      autoOrientation: true,
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
      ],
    });

    instanceRef.current = art;

    if (getInstance) {
      getInstance(art);
    }
    if (typeof window !== "undefined") {
      (window as any).__4kvm_player__ = art;
    }

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
