"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { MovieCard } from "@/components/MovieCard";
import { CreateRoomModal } from "@/components/CreateRoomModal";
import { Film, Share2, Radio, Users, Loader2 } from "lucide-react";
import { VodItem, WatchHistoryItem } from "@/lib/types";

const VideoPlayer = dynamic(() => import("@/components/Player/ArtPlayer"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video rounded-2xl bg-dark-900 flex items-center justify-center border border-white/10 text-gray-400">
      <div className="animate-pulse flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        <span className="text-xs">加载播放器中...</span>
      </div>
    </div>
  ),
});

export default function PlayPage() {
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<VodItem | null>(null);
  const [recommendations, setRecommendations] = useState<VodItem[]>([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [currentEpIndex, setCurrentEpIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    fetch(`/api/vod?action=detail&id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setItem(data.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });

    fetch(`/api/vod?type=电影&pg=1`)
      .then((res) => res.json())
      .then((data) => {
        if (data.list) {
          setRecommendations(data.list.filter((x: VodItem) => x.id !== id).slice(0, 5));
        }
      })
      .catch(console.error);
  }, [id]);

  if (loading || !item) {
    return (
      <div className="py-40 flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        <span className="text-sm">正在加载视频播放流与剧集列表...</span>
      </div>
    );
  }

  const currentSource = item.sources[currentSourceIndex] || item.sources[0] || { sourceName: "默认线路", episodes: [] };
  const currentEpisode = currentSource.episodes[currentEpIndex] || currentSource.episodes[0] || { name: "正片", url: "" };

  const handleTimeUpdate = (currentTime: number, duration: number) => {
    if (typeof window === "undefined" || currentTime <= 2) return;
    try {
      const historyStr = localStorage.getItem("watch_history") || "[]";
      let list: WatchHistoryItem[] = JSON.parse(historyStr);
      list = list.filter((h) => h.vodId !== item.id);
      list.unshift({
        vodId: item.id,
        vodName: item.name,
        vodPic: item.pic,
        sourceIndex: currentSourceIndex,
        episodeIndex: currentEpIndex,
        episodeName: currentEpisode.name,
        currentTime: Math.floor(currentTime),
        duration: Math.floor(duration),
        timestamp: Date.now(),
      });
      localStorage.setItem("watch_history", JSON.stringify(list.slice(0, 30)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <VideoPlayer
            url={currentEpisode.url}
            title={`${item.name} - ${currentEpisode.name}`}
            poster={item.banner || item.pic}
            onEnded={() => {
              if (currentEpIndex < currentSource.episodes.length - 1) {
                setCurrentEpIndex(currentEpIndex + 1);
              }
            }}
            onTimeUpdate={handleTimeUpdate}
          />

          <div className="p-6 rounded-2xl bg-dark-900 border border-white/10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-3">
                  {item.name}
                  <span className="text-sm font-normal text-cyan-400 px-2.5 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/20">
                    {currentEpisode.name}
                  </span>
                </h1>
                <p className="text-xs text-gray-400 mt-1">
                  {item.year} · {item.area} · {item.lang} · {item.type_name} · 当前播放：{currentSource.sourceName}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Watch Party Button */}
                <button
                  onClick={() => setCreateRoomOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500/15 to-blue-500/15 hover:from-cyan-500 hover:to-blue-600 text-xs font-bold text-cyan-400 hover:text-dark-950 flex items-center gap-1.5 transition border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
                >
                  <Users className="w-4 h-4" />
                  👥 邀请好友一起看
                </button>

                <button
                  onClick={handleShare}
                  className="px-3.5 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-xs font-semibold text-gray-200 flex items-center gap-1.5 transition border border-white/5"
                >
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  {copied ? "已复制链接" : "分享"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
              {item.tags.map((t, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-md bg-dark-800 text-xs text-gray-300 border border-white/5">
                  #{t}
                </span>
              ))}
            </div>

            <div className="text-sm text-gray-300 leading-relaxed bg-dark-850 p-4 rounded-xl border border-white/5">
              <p className="text-xs font-bold text-gray-400 mb-1">剧情简介：</p>
              {item.content}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-400 pt-2">
              <p><span className="text-gray-500">导演：</span>{item.director || "未知"}</p>
              <p><span className="text-gray-500">主演：</span>{item.actor || "未知"}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-dark-900 border border-white/10 space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-2.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                切换播放源线路
              </div>
              <div className="flex flex-col gap-1.5">
                {item.sources.map((src, idx) => {
                  const isCurrent = idx === currentSourceIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentSourceIndex(idx);
                        if (currentEpIndex >= src.episodes.length) {
                          setCurrentEpIndex(0);
                        }
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                        isCurrent
                          ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 shadow-sm"
                          : "bg-dark-800 hover:bg-dark-700 text-gray-300 border border-white/5"
                      }`}
                    >
                      <span>{src.sourceName}</span>
                      <span className="text-[11px] opacity-70">共 {src.episodes.length} 集</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Film className="w-4 h-4 text-cyan-400" />
                选集列表
              </h2>
              <span className="text-xs text-gray-400">
                共 {currentSource.episodes.length} 集
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {currentSource.episodes.map((ep, idx) => {
                const isActive = idx === currentEpIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentEpIndex(idx)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center text-center ${
                      isActive
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-dark-950 shadow-lg shadow-cyan-500/20 scale-[1.02]"
                        : "bg-dark-800 hover:bg-dark-700 text-gray-300 hover:text-white border border-white/5"
                    }`}
                  >
                    {ep.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {recommendations.length > 0 && (
        <section className="space-y-4 pt-8 border-t border-white/10">
          <h2 className="text-lg font-bold text-white">为您推荐</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {recommendations.map((rec) => (
              <MovieCard key={rec.id} item={rec} />
            ))}
          </div>
        </section>
      )}

      {/* Modal */}
      <CreateRoomModal
        vodItem={item}
        initialSourceIndex={currentSourceIndex}
        initialEpisodeIndex={currentEpIndex}
        isOpen={createRoomOpen}
        onClose={() => setCreateRoomOpen(false)}
      />
    </div>
  );
}
