"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import Artplayer from "artplayer";
import Hls from "hls.js";

export interface RoomPlayerHandle {
  art: Artplayer | null;
  syncTime: (time: number) => void;
  syncPlay: (time?: number) => void;
  syncPause: (time?: number) => void;
  syncWebFullscreen: (isFull: boolean) => void;
}

interface RoomVideoPlayerProps {
  url: string;
  poster?: string;
  initialTime?: number;
  canControl?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlay?: (currentTime: number) => void;
  onPause?: (currentTime: number) => void;
  onSeek?: (time: number) => void;
  onPermissionDenied?: (msg: string) => void;
  onReadyInstance?: (handle: RoomPlayerHandle) => void;
}

export default function RoomVideoPlayer({
  url,
  poster,
  initialTime = 0,
  canControl = true,
  onTimeUpdate,
  onPlay,
  onPause,
  onSeek,
  onPermissionDenied,
  onReadyInstance,
}: RoomVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);
  const isRemoteSyncingRef = useRef(false);
  const lastSyncedTimeRef = useRef(initialTime);
  const canControlRef = useRef(canControl);
  canControlRef.current = canControl;

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
                isRemoteSyncingRef.current = true;
                artInstance.currentTime = initialTime;
                setTimeout(() => {
                  isRemoteSyncingRef.current = false;
                }, 400);
              }
              artInstance.play().catch(() => {});
            });

            artInstance.on("destroy", () => hls.destroy());
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = targetUrl;
            if (initialTime > 0) {
              isRemoteSyncingRef.current = true;
              artInstance.currentTime = initialTime;
              setTimeout(() => {
                isRemoteSyncingRef.current = false;
              }, 400);
            }
            artInstance.play().catch(() => {});
          } else {
            video.src = targetUrl;
          }
        },
      },
    });

    artRef.current = art;

    const handle: RoomPlayerHandle = {
      art,
      syncTime: (time: number) => {
        isRemoteSyncingRef.current = true;
        lastSyncedTimeRef.current = time;
        art.currentTime = time;
        setTimeout(() => {
          isRemoteSyncingRef.current = false;
        }, 400);
      },
      syncPlay: (time?: number) => {
        isRemoteSyncingRef.current = true;
        if (typeof time === "number" && Math.abs(art.currentTime - time) > 1.5) {
          art.currentTime = time;
          lastSyncedTimeRef.current = time;
        }
        if (!art.playing) {
          art.play().catch(() => {});
        }
        setTimeout(() => {
          isRemoteSyncingRef.current = false;
        }, 400);
      },
      syncPause: (time?: number) => {
        isRemoteSyncingRef.current = true;
        if (typeof time === "number") {
          art.currentTime = time;
          lastSyncedTimeRef.current = time;
        }
        if (art.playing) {
          art.pause();
        }
        setTimeout(() => {
          isRemoteSyncingRef.current = false;
        }, 400);
      },
      syncWebFullscreen: (isFull: boolean) => {
        art.fullscreenWeb = isFull;
      },
    };

    if (onReadyInstance) {
      onReadyInstance(handle);
    }

    art.on("ready", () => {
      if (initialTime > 0) {
        isRemoteSyncingRef.current = true;
        art.currentTime = initialTime;
        lastSyncedTimeRef.current = initialTime;
        setTimeout(() => {
          isRemoteSyncingRef.current = false;
        }, 400);
      }
      art.play().catch(() => {});
    });

    art.on("play", () => {
      if (isRemoteSyncingRef.current) return;
      if (!canControlRef.current) {
        isRemoteSyncingRef.current = true;
        art.pause();
        setTimeout(() => {
          isRemoteSyncingRef.current = false;
        }, 300);
        onPermissionDenied?.("👑 仅房主有进度控制特权");
        return;
      }
      onPlay?.(art.currentTime);
    });

    art.on("pause", () => {
      if (isRemoteSyncingRef.current) return;
      if (!canControlRef.current) {
        isRemoteSyncingRef.current = true;
        art.play().catch(() => {});
        setTimeout(() => {
          isRemoteSyncingRef.current = false;
        }, 300);
        onPermissionDenied?.("👑 仅房主有进度控制特权");
        return;
      }
      onPause?.(art.currentTime);
    });

    art.on("seek", (time) => {
      if (isRemoteSyncingRef.current) return;
      if (!canControlRef.current) {
        isRemoteSyncingRef.current = true;
        art.currentTime = lastSyncedTimeRef.current;
        setTimeout(() => {
          isRemoteSyncingRef.current = false;
        }, 300);
        onPermissionDenied?.("👑 仅房主有进度控制特权");
        return;
      }
      lastSyncedTimeRef.current = time;
      onSeek?.(time);
    });

    art.on("video:timeupdate", () => {
      if (!isRemoteSyncingRef.current) {
        lastSyncedTimeRef.current = art.currentTime;
      }
      onTimeUpdate?.(art.currentTime, art.duration);
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
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10 group">
      <div ref={containerRef} className="w-full h-full" />
      {!canControl && (
        <div className="absolute top-3 right-3 z-30 pointer-events-none px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold backdrop-blur-md flex items-center gap-1 shadow-lg">
          <span>👑</span>
          <span>仅房主控进度</span>
        </div>
      )}
    </div>
  );
}
