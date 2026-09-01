"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { WatchHistoryItem } from "@/lib/types";
import { History, Trash2, Play } from "lucide-react";

export default function HistoryPage() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);

  useEffect(() => {
    try {
      const data = localStorage.getItem("watch_history");
      if (data) {
        setHistory(JSON.parse(data));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleClear = () => {
    if (confirm("确定要清空全部播放历史吗？")) {
      localStorage.removeItem("watch_history");
      setHistory([]);
    }
  };

  const formatSeconds = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 sm:p-6 rounded-2xl bg-dark-900 border border-white/10">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <History className="w-5 h-5 sm:w-6 sm:h-6 text-gold-400 shrink-0" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white">观看历史记录</h1>
            <p className="text-xs text-gray-400 mt-0.5">本地自动同步您的最近观看进度</p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClear}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition border border-red-500/20 active:scale-95 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>清空记录</span>
          </button>
        )}
      </div>

      {history.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {history.map((h, idx) => (
            <Link
              key={idx}
              href={`/play/${h.vodId}`}
              className="p-4 rounded-xl bg-dark-850 border border-white/5 hover:border-gold-500/40 transition flex gap-3 group"
            >
              <img
                src={h.vodPic}
                alt={h.vodName}
                className="w-16 h-24 object-cover rounded-lg bg-dark-800"
              />
              <div className="flex flex-col justify-between flex-1 min-w-0">
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-gold-400 truncate">
                    {h.vodName}
                  </h3>
                  <p className="text-xs text-gold-400/80 mt-1 font-semibold">
                    {h.episodeName}
                  </p>
                </div>
                <p className="text-[11px] text-gray-500">
                  播放至: {formatSeconds(h.currentTime)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center text-gray-500 text-sm">
          暂无观看记录，快去探索精彩影片吧
        </div>
      )}
    </div>
  );
}
