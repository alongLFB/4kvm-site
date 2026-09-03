"use client";

import { useState, useEffect, useRef } from "react";
import { getGuestUser } from "@/lib/guest";

interface UseOnlineWatcherOptions {
  pageType?: "play" | "room";
  targetId: string;
  vodName?: string;
  enabled?: boolean;
  intervalMs?: number;
}

interface OnlineStats {
  totalOnline: number;
  currentTargetOnline: number;
}

export function useOnlineWatcher({
  pageType = "play",
  targetId,
  vodName,
  enabled = true,
  intervalMs = 15000,
}: UseOnlineWatcherOptions) {
  const [stats, setStats] = useState<OnlineStats>({
    totalOnline: 0,
    currentTargetOnline: 0,
  });
  const [isOnline, setIsOnline] = useState(false);

  const targetIdRef = useRef(targetId);
  const vodNameRef = useRef(vodName);
  const pageTypeRef = useRef(pageType);

  useEffect(() => {
    targetIdRef.current = targetId;
    vodNameRef.current = vodName;
    pageTypeRef.current = pageType;
  }, [targetId, vodName, pageType]);

  useEffect(() => {
    if (!enabled || !targetId) return;

    let isMounted = true;
    const user = getGuestUser();
    const viewerId = user.id;

    // Send heartbeat
    const sendHeartbeat = async () => {
      try {
        const res = await fetch("/api/stats/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            viewerId,
            pageType: pageTypeRef.current,
            targetId: targetIdRef.current,
            vodName: vodNameRef.current,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.data) {
            setStats({
              totalOnline: Number(data.data.totalOnline || 0),
              currentTargetOnline: Number(data.data.currentTargetOnline || 0),
            });
            setIsOnline(true);
          }
        }
      } catch (err) {
        // Silent error to prevent UI noise
      }
    };

    // Send leave signal
    const sendLeave = () => {
      const payload = JSON.stringify({ viewerId });
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/stats/leave", payload);
      } else {
        fetch("/api/stats/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };

    // Immediate first ping
    sendHeartbeat();

    // Setup recurring heartbeat
    const timer = setInterval(sendHeartbeat, intervalMs);

    // Listen to tab close / unload
    const handleUnload = () => {
      sendLeave();
    };

    window.addEventListener("pagehide", handleUnload);
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      isMounted = false;
      clearInterval(timer);
      window.removeEventListener("pagehide", handleUnload);
      window.removeEventListener("beforeunload", handleUnload);
      sendLeave();
    };
  }, [enabled, targetId, intervalMs]);

  return {
    totalOnline: stats.totalOnline,
    currentTargetOnline: stats.currentTargetOnline,
    isOnline,
  };
}
