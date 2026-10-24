"use client";

import React, { useEffect, useRef } from "react";
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
  initialIsPlaying?: boolean;
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
  initialIsPlaying = true,
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
  const hlsRef = useRef<Hls | null>(null);
  const isRemoteSyncingRef = useRef(false);
  const isInitializingRef = useRef(true);
  const lastSyncedTimeRef = useRef(initialTime);
  const canControlRef = useRef(canControl);
  canControlRef.current = canControl;

  useEffect(() => {
    if (!containerRef.current || !url) return;

    // Start in silent initialization mode
    isInitializingRef.current = true;
    isRemoteSyncingRef.current = true;

    // Cleanly destroy previous Hls & Artplayer instances
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
        hlsRef.current = null;
      } catch (e) {}
    }
    if (artRef.current) {
      try {
        artRef.current.destroy(false);
        artRef.current = null;
      } catch (e) {}
    }

    const art = new Artplayer({
      container: containerRef.current,
      url: url,
      poster: poster || "",
      volume: 0.8,
      autoplay: initialIsPlaying,
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
        playsInline: true,
        "x5-video-player-type": "h5",
        "x5-video-player-fullscreen": "true",
        "x5-playsinline": "true",
      } as any,
      customType: {
        m3u8: function (video: HTMLMediaElement, targetUrl: string, artInstance: Artplayer) {
          const updateRes = (w: number, h: number) => {
            let label = "1080p";
            if (w >= 3800 || h >= 2100) label = "4K";
            else if (w >= 2500 || h >= 1400) label = "2K";
            else if (w >= 1800 || h >= 950) label = "1080p";
            else if (w >= 1200 || h >= 680) label = "720p";
            else if (w >= 800 || h >= 460) label = "480p";
            else if (h > 0) label = `${h}p`;

            const el = artInstance.controls["resolution"];
            if (el) el.innerText = label;
          };

          const isM3U8 = targetUrl.includes(".m3u8") || !targetUrl.includes(".");
          const cleanSourceUrl = isM3U8 ? `/api/clean-m3u8?url=${encodeURIComponent(targetUrl)}` : targetUrl;

          if (Hls.isSupported()) {
            if (hlsRef.current) {
              hlsRef.current.destroy();
            }
            const hls = new Hls({
              maxBufferLength: 60,
              maxMaxBufferLength: 120,
              startFragPrefetch: true,
              enableWorker: true,
            });
            hlsRef.current = hls;
            artInstance.hls = hls;

            hls.loadSource(cleanSourceUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
              if (data.levels && data.levels.length > 0) {
                const lvl = data.levels[0];
                if (lvl && lvl.width && lvl.height) {
                  updateRes(lvl.width, lvl.height);
                }
              }
              if (initialTime > 0) {
                artInstance.currentTime = initialTime;
              }
              if (initialIsPlaying) {
                artInstance.play().catch(() => {});
              } else {
                artInstance.pause();
              }
            });

            // Fallback to targetUrl on network error
            hls.on(Hls.Events.ERROR, (event, data) => {
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    if (hls.url === cleanSourceUrl && cleanSourceUrl !== targetUrl) {
                      console.warn("[RoomPlayer] 纯净流异常，平滑切换至原画直连:", data);
                      hls.loadSource(targetUrl);
                      hls.startLoad();
                      return;
                    }
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    hls.recoverMediaError();
                    break;
                  default:
                    hls.destroy();
                    break;
                }
              }
            });

            artInstance.on("destroy", () => {
              hls.destroy();
              hlsRef.current = null;
            });
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = cleanSourceUrl;
            video.onerror = () => {
              if (video.src.includes("/api/clean-m3u8")) {
                video.src = targetUrl;
              }
            };
            if (initialTime > 0) {
              artInstance.currentTime = initialTime;
            }
            if (initialIsPlaying) {
              artInstance.play().catch(() => {});
            } else {
              artInstance.pause();
            }
          } else {
            video.src = targetUrl;
          }

          video.addEventListener("loadedmetadata", () => {
            const v = video as HTMLVideoElement;
            if (v.videoWidth && v.videoHeight) {
              updateRes(v.videoWidth, v.videoHeight);
            }
          });
        },
      },
      controls: [
        {
          name: "cleanModeBadge",
          position: "left",
          index: 6,
          tooltip: "纯净去广告模式：房间同步播放已自动剔除切片插播广告",
          html: `<span class="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full select-none cursor-default"><span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>纯净正片</span>`,
        },
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

    artRef.current = art;

    const handle: RoomPlayerHandle = {
      art,
      syncTime: (time: number) => {
        isRemoteSyncingRef.current = true;
        lastSyncedTimeRef.current = time;
        art.currentTime = time;
        if (art.video) art.video.currentTime = time;
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
        art.play().catch(() => {});
        if (art.video && art.video.paused) {
          art.video.play().catch(() => {});
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
        art.pause();
        if (art.video && !art.video.paused) {
          art.video.pause();
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
        art.currentTime = initialTime;
        lastSyncedTimeRef.current = initialTime;
      }
      if (initialIsPlaying) {
        art.play().catch(() => {});
      } else {
        art.pause();
      }

      // End silent initial state after player has stabilized
      setTimeout(() => {
        isInitializingRef.current = false;
        isRemoteSyncingRef.current = false;
      }, 1000);
    });

    art.on("play", () => {
      if (isInitializingRef.current || isRemoteSyncingRef.current) return;

      if (!canControlRef.current) {
        isRemoteSyncingRef.current = true;
        art.pause();
        if (art.video) art.video.pause();
        setTimeout(() => {
          isRemoteSyncingRef.current = false;
        }, 300);
        onPermissionDenied?.("👑 仅房主有进度控制特权");
        return;
      }

      onPlay?.(art.currentTime);
    });

    art.on("pause", () => {
      if (isInitializingRef.current || isRemoteSyncingRef.current) return;

      if (!canControlRef.current) {
        isRemoteSyncingRef.current = true;
        art.play().catch(() => {});
        if (art.video) art.video.play().catch(() => {});
        setTimeout(() => {
          isRemoteSyncingRef.current = false;
        }, 300);
        onPermissionDenied?.("👑 仅房主有进度控制特权");
        return;
      }

      onPause?.(art.currentTime);
    });

    art.on("seek", (time) => {
      if (isInitializingRef.current || isRemoteSyncingRef.current) return;

      if (!canControlRef.current) {
        isRemoteSyncingRef.current = true;
        art.currentTime = lastSyncedTimeRef.current;
        if (art.video) art.video.currentTime = lastSyncedTimeRef.current;
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
      if (!isRemoteSyncingRef.current && !isInitializingRef.current) {
        lastSyncedTimeRef.current = art.currentTime;
      }
      onTimeUpdate?.(art.currentTime, art.duration);
    });

    return () => {
      try {
        if (art.video) {
          art.video.pause();
          art.video.removeAttribute("src");
          art.video.load();
        }
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        if (art && art.destroy) {
          art.destroy(true);
          artRef.current = null;
        }
      } catch (e) {}
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
