"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { WatchHistoryItem } from "@/lib/types";
import { History, Trash2, Play, Star, Cloud, RefreshCw } from "lucide-react";
import { useAuthSync } from "@/contexts/AuthSyncContext";

export default function HistoryPage() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"history" | "favorites">("history");
  const {
    user,
    syncing,
    favorites,
    openAccountModal,
    syncNow,
    toggleFavorite,
  } = useAuthSync();

  const loadLocalHistory = () => {
    try {
      const data = localStorage.getItem("watch_history");
      if (data) {
        setHistory(JSON.parse(data));
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadLocalHistory();
    const onUpdated = () => loadLocalHistory();
    window.addEventListener("4kvm-sync-updated", onUpdated);
    return () => window.removeEventListener("4kvm-sync-updated", onUpdated);
  }, []);

  const handleClear = () => {
    if (confirm("确定要清空全部本地播放历史吗？")) {
      localStorage.removeItem("watch_history");
      setHistory([]);
    }
  };

  const formatSeconds = (s: number) => {
    const total = Math.max(0, Math.floor(s || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-dark-900 border border-white/10">
        <div className="flex items-center gap-3">
          <History className="w-6 h-6 text-gold-400 shrink-0" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white">
              观看历史与收藏夹
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {user
                ? `已登录「${user.name}」· 与 alonglfb-tv 客户端实时云同步`
                : "当前为游客模式 · 登录即可在手机、电脑与客户端间同步"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user ? (
            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={syncing}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 border border-cyan-500/30 transition"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
              />
              <span>{syncing ? "云同步中..." : "立即云端同步"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openAccountModal}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 border border-cyan-500/30 transition"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>登录开启多端同步</span>
            </button>
          )}

          {activeTab === "history" && history.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition border border-red-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空记录</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "history"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
              : "bg-dark-900 text-gray-400 border border-white/5 hover:text-white"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>观看历史 ({history.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("favorites")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === "favorites"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
              : "bg-dark-900 text-gray-400 border border-white/5 hover:text-white"
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>我的收藏 ({favorites.length})</span>
        </button>
      </div>

      {activeTab === "history" ? (
        history.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {history.map((h, idx) => (
              <Link
                key={idx}
                href={`/play/${h.vodId}?src=${h.sourceIndex || 0}&ep=${h.episodeIndex || 0}&t=${h.currentTime || 0}`}
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
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>播放至: {formatSeconds(h.currentTime)}</span>
                    <span className="text-cyan-400 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 font-medium">
                      <Play className="w-3 h-3 fill-cyan-400" />
                      继续观看
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center text-gray-500 text-sm">
            暂无观看记录，快去探索精彩影片吧
          </div>
        )
      ) : favorites.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {favorites.map((fav) => (
            <div
              key={fav.vodId}
              className="p-4 rounded-xl bg-dark-850 border border-white/5 hover:border-cyan-500/40 transition flex gap-3 group"
            >
              <img
                src={fav.vodPic}
                alt={fav.vodName}
                className="w-16 h-24 object-cover rounded-lg bg-dark-800"
              />
              <div className="flex flex-col justify-between flex-1 min-w-0">
                <div>
                  <h3 className="text-sm font-bold text-white truncate">
                    {fav.vodName}
                  </h3>
                  <p className="text-xs text-cyan-400/80 mt-1 font-semibold">
                    {fav.vodRemarks || fav.typeName || "精选"}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs pt-2">
                  <Link
                    href={`/play/${fav.vodId}`}
                    className="text-cyan-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-cyan-400" />
                    去播放
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      toggleFavorite({
                        id: fav.vodId,
                        name: fav.vodName,
                        pic: fav.vodPic,
                        remarks: fav.vodRemarks,
                      })
                    }
                    className="text-gray-400 hover:text-red-400 transition"
                  >
                    取消收藏
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center text-gray-500 text-sm">
          暂无收藏影片，在播放页点击收藏即可多端同步
        </div>
      )}
    </div>
  );
}
