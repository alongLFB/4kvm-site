"use client";

import React, { useState, useEffect } from "react";
import { Users, Activity } from "lucide-react";

interface OnlineBadgeProps {
  className?: string;
  showIcon?: boolean;
}

export function OnlineBadge({ className = "", showIcon = true }: OnlineBadgeProps) {
  const [totalOnline, setTotalOnline] = useState<number | null>(null);

  const fetchOnline = async () => {
    try {
      const res = await fetch("/api/stats/online");
      if (res.ok) {
        const json = await res.json();
        if (json.data && typeof json.data.totalOnline === "number") {
          setTotalOnline(json.data.totalOnline);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchOnline();
    const timer = setInterval(fetchOnline, 25000);
    return () => clearInterval(timer);
  }, []);

  if (totalOnline === null) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-medium text-cyan-300 select-none shadow-sm transition-all hover:bg-cyan-500/15 whitespace-nowrap shrink-0 ${className}`}
      title="4KVM 全站实时在线观影人数 (每25秒自动同步)"
    >
      {/* Static Green Dot */}
      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />

      {showIcon && <Users className="w-3 h-3 text-cyan-400 hidden xl:inline" />}

      <span className="font-bold tracking-tight text-white">
        {totalOnline}
      </span>
      <span className="text-[11px] text-cyan-400/90 hidden xl:inline">
        人在线观影
      </span>
      <span className="text-[11px] text-cyan-400/90 xl:hidden">
        人在线
      </span>
    </div>
  );
}
