"use client";

import React, { useEffect, useRef } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";

interface RoomVideoPlayerProps {
  url: string;
  poster?: string;
  initialTime?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  getInstance?: (art: Artplayer) => void;
}

export default function RoomVideoPlayer({
  url,
  poster,
  initialTime = 0,
  onTimeUpdate,
  onPlay,
  onPause,
  onSeek,
  getInstance,
}: RoomVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !url) return;

    if (artRef.current) {
      try {
        artRef.current.destroy(false);
      } catch (e) {}
    }

    const art = new Artplayer({
      container: containerRef.current,
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
      hotkey: true,
      fullscreen: true,
      fullscreenWeb: true,
      autoOrientation: true,
      playsInline: true,
      lock: true,
      fastForward: true,
      airplay: true,
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
        m3u8: function (video: HTMLMediaElement, targetUrl: string, artInstance: Artplayer) {
          if (Hls.isSupported()) {
            if (artInstance.hls) artInstance.hls.destroy();
            const hls = new Hls({
              maxBufferLength: 60,
              maxMaxBufferLength: 120,
              startFragPrefetch: true,
            });
            hls.loadSource(targetUrl);
            hls.attachMedia(video);
            artInstance.hls = hls;

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              if (initialTime > 0) {
                artInstance.currentTime = initialTime;
              }
              artInstance.play().catch(() => {});
            });

            artInstance.on("destroy", () => hls.destroy());
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = targetUrl;
            if (initialTime > 0) {
              artInstance.currentTime = initialTime;
            }
            artInstance.play().catch(() => {});
          } else {
            video.src = targetUrl;
          }
        },
      },
    });

    artRef.current = art;

    if (getInstance) {
      getInstance(art);
    }

    art.on("ready", () => {
      if (initialTime > 0) {
        art.currentTime = initialTime;
      }
      art.play().catch(() => {});
    });

    art.on("play", () => {
      if (onPlay) onPlay();
    });

    art.on("pause", () => {
      if (onPause) onPause();
    });

    art.on("seek", (time) => {
      if (onSeek) onSeek(time);
    });

    art.on("video:timeupdate", () => {
      if (onTimeUpdate) {
        onTimeUpdate(art.currentTime, art.duration);
      }
    });

    return () => {
      if (art && art.destroy) {
        try {
          art.destroy(false);
        } catch (e) {}
      }
    };
  }, [url]);

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
