"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MovieCard } from "@/components/MovieCard";
import { CreateRoomModal } from "@/components/CreateRoomModal";
import { PasscodeModal } from "@/components/PasscodeModal";
import { GATED_CONFIG } from "@/config/gated-sections";
import { Film, Share2, Radio, Users, Loader2, Lock, ChevronDown, ArrowUpDown } from "lucide-react";
import { VodItem, WatchHistoryItem } from "@/lib/types";
import { useOnlineWatcher } from "@/hooks/useOnlineWatcher";

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

function renderPersonLinks(rawText?: string) {
  if (!rawText || !rawText.trim() || rawText.trim() === "未知") {
    return <span className="text-gray-400">未知</span>;
  }
  const names = rawText
    .split(/[,/、|;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (names.length === 0) {
    return <span className="text-gray-400">{rawText}</span>;
  }

  return (
    <span className="inline-flex flex-wrap gap-x-1.5 gap-y-0.5">
      {names.map((name, i) => (
        <React.Fragment key={i}>
          <Link
            href={`/search?q=${encodeURIComponent(name)}`}
            className="text-gray-300 hover:text-cyan-400 hover:underline transition underline-offset-2"
          >
            {name}
          </Link>
          {i < names.length - 1 && <span className="text-gray-600">/</span>}
        </React.Fragment>
      ))}
    </span>
  );
}

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
  const [isGatedLocked, setIsGatedLocked] = useState(false);
  const [passcodeModalOpen, setPasscodeModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 新增：自动续播初始进度与提示、选集正反序、剧情简介折叠状态
  const [initialTime, setInitialTime] = useState<number>(0);
  const [historyPrompt, setHistoryPrompt] = useState<{ epName: string; timeText: string } | null>(null);
  const hasRestoredHistoryRef = useRef(false);
  const [isEpReversed, setIsEpReversed] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  const onlineStats = useOnlineWatcher({
    pageType: "play",
    targetId: id,
    vodName: item?.name,
    enabled: !!item && !loading && !isGatedLocked,
  });

  // Playback state restoration when opening/closing modal
  const wasPlayingRef = useRef(false);
  const playerRef = useRef<any>(null);

  const loadVodDetail = (pinOverride?: string) => {
    if (!id) return;
    setLoading(true);
    setErrorMsg("");

    const savedPin =
      pinOverride !== undefined
        ? pinOverride
        : typeof window !== "undefined"
        ? localStorage.getItem(GATED_CONFIG.storageKey) || ""
        : "";

    const headers: Record<string, string> = {};
    if (savedPin) {
      headers[GATED_CONFIG.headerKey] = savedPin;
    }

    fetch(`/api/vod?action=detail&id=${id}`, { headers })
      .then(async (res) => {
        if (res.status === 403) {
          setIsGatedLocked(true);
          setPasscodeModalOpen(true);
          setLoading(false);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.code === 200 && data.data) {
          const vod = data.data;
          setItem(vod);
          setIsGatedLocked(false);
          setPasscodeModalOpen(false);

          // 自动跳转到历史记录/URL参数中对应的集数与播放进度
          if (!hasRestoredHistoryRef.current && vod.sources && vod.sources.length > 0) {
            hasRestoredHistoryRef.current = true;
            let targetSrc = -1;
            let targetEp = -1;
            let targetTime = 0;

            if (typeof window !== "undefined") {
              const urlParams = new URLSearchParams(window.location.search);
              const spSrc = urlParams.get("src");
              const spEp = urlParams.get("ep");
              const spT = urlParams.get("t");
              if (spEp !== null) {
                targetEp = parseInt(spEp, 10);
                targetSrc = spSrc !== null ? parseInt(spSrc, 10) : 0;
                targetTime = spT !== null ? parseInt(spT, 10) : 0;
              } else {
                try {
                  const histStr = localStorage.getItem("watch_history") || "[]";
                  const histList: WatchHistoryItem[] = JSON.parse(histStr);
                  const found = histList.find((h) => h.vodId === vod.id);
                  if (found) {
                    targetSrc = found.sourceIndex ?? 0;
                    targetEp = found.episodeIndex ?? 0;
                    targetTime = found.currentTime ?? 0;
                  }
                } catch (e) {}
              }
            }

            if (targetEp >= 0) {
              const safeSrc = targetSrc >= 0 && targetSrc < vod.sources.length ? targetSrc : 0;
              const source = vod.sources[safeSrc];
              if (source && targetEp < source.episodes.length) {
                setCurrentSourceIndex(safeSrc);
                setCurrentEpIndex(targetEp);
                if (targetTime > 2) {
                  setInitialTime(targetTime);
                  const mins = Math.floor(targetTime / 60);
                  const secs = targetTime % 60;
                  const timeText = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
                  setHistoryPrompt({
                    epName: source.episodes[targetEp]?.name || `第${targetEp + 1}集`,
                    timeText,
                  });
                  setTimeout(() => setHistoryPrompt(null), 6000);
                }
              }
            }
          }
        } else if (data.code === 403) {
          setIsGatedLocked(true);
          setPasscodeModalOpen(true);
        } else {
          setErrorMsg(data.msg || "该影视不存在或已被下线");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg("网络异常，无法加载视频详情");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadVodDetail();

    fetch(`/api/vod?type=电影&pg=1`)
      .then((res) => res.json())
      .then((data) => {
        if (data.list) {
          setRecommendations(data.list.filter((x: VodItem) => x.id !== id).slice(0, 5));
        }
      })
      .catch(console.error);
  }, [id]);

  if (isGatedLocked) {
    return (
      <>
        <div className="py-32 flex flex-col items-center justify-center gap-4 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/5">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">此内容属于【特约专区】受限板块</h2>
          <p className="text-sm text-gray-400 max-w-md">
            当前视频已开启专区访问保护，请输入访问口令后解锁观看。
          </p>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => setPasscodeModalOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm shadow-lg shadow-cyan-500/20 transition cursor-pointer"
            >
              输入口令解锁
            </button>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium transition"
            >
              返回首页
            </Link>
          </div>
        </div>

        <PasscodeModal
          isOpen={passcodeModalOpen}
          onClose={() => setPasscodeModalOpen(false)}
          onSuccess={(pin) => {
            setPasscodeModalOpen(false);
            loadVodDetail(pin);
          }}
          onUnlock={(pin) => {
            setPasscodeModalOpen(false);
            loadVodDetail(pin);
          }}
        />
      </>
    );
  }

  if (errorMsg) {
    return (
      <div className="py-36 flex flex-col items-center justify-center gap-3 text-gray-400 text-center px-4">
        <p className="text-base text-gray-300">{errorMsg}</p>
        <Link href="/" className="text-sm text-cyan-400 hover:underline">
          返回主页探索更多影视
        </Link>
      </div>
    );
  }

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

  // 1. Pause video when opening modal, and record playing state
  const handleOpenCreateRoom = () => {
    const player = playerRef.current || (typeof window !== "undefined" ? (window as any).__4kvm_player__ : null);
    if (player) {
      if (player.playing) {
        wasPlayingRef.current = true;
        player.pause();
      } else {
        wasPlayingRef.current = false;
      }
    }
    setCreateRoomOpen(true);
  };

  // 2. Resume video if it was playing before when modal is closed
  const handleCloseCreateRoom = () => {
    setCreateRoomOpen(false);
    const player = playerRef.current || (typeof window !== "undefined" ? (window as any).__4kvm_player__ : null);
    if (player && wasPlayingRef.current) {
      player.play();
      wasPlayingRef.current = false;
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {historyPrompt && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 shadow-md">
              <span className="flex items-center gap-2">
                <span>⏱️</span>
                <span>已为您自动定位至上次观看的【{historyPrompt.epName}】({historyPrompt.timeText})</span>
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setHistoryPrompt(null);
                    if (playerRef.current) {
                      playerRef.current.currentTime = 0;
                    }
                  }}
                  className="hover:text-white underline underline-offset-2 cursor-pointer font-medium"
                >
                  从头播放
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryPrompt(null)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <VideoPlayer
            url={currentEpisode.url}
            title={`${item.name} - ${currentEpisode.name}`}
            poster={item.banner || item.pic}
            initialTime={initialTime}
            getInstance={(art) => {
              playerRef.current = art;
            }}
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
                <div className="flex items-center gap-2 mt-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 shadow-sm select-none">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-bold text-white">
                      🔥 {onlineStats.currentTargetOnline}
                    </span>
                    <span className="text-cyan-400/90">人正在看</span>
                    <span className="text-white/20 mx-0.5">·</span>
                    <span className="text-gray-400">
                      全站 <strong className="text-white font-semibold">{onlineStats.totalOnline}</strong> 人在线
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Watch Party Button with auto pause/resume lifecycle */}
                <button
                  onClick={handleOpenCreateRoom}
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

            {/* 剧情简介：自适应展开全部与折叠 */}
            {(() => {
              const cleanContent = item.content
                ? item.content.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()
                : "暂无剧情简介";
              const isLongContent = cleanContent.length > 130;
              return (
                <div className="text-sm text-gray-300 leading-relaxed bg-dark-850 p-4 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-400">剧情简介：</p>
                    {isLongContent && (
                      <button
                        type="button"
                        onClick={() => setIsContentExpanded((prev) => !prev)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer select-none"
                      >
                        <span>{isContentExpanded ? "收起简介" : "展开全部介绍"}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isContentExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    )}
                  </div>
                  <p className={`transition-all duration-200 ${!isContentExpanded && isLongContent ? "line-clamp-3" : ""}`}>
                    {cleanContent}
                  </p>
                </div>
              );
            })()}

            {/* 导演与主演：点击直接跳转至人名作品搜索 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-400 pt-2">
              <div className="flex items-start gap-1">
                <span className="text-gray-500 shrink-0">导演：</span>
                {renderPersonLinks(item.director)}
              </div>
              <div className="flex items-start gap-1">
                <span className="text-gray-500 shrink-0">主演：</span>
                {renderPersonLinks(item.actor)}
              </div>
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
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  共 {currentSource.episodes.length} 集
                </span>
                {currentSource.episodes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setIsEpReversed((prev) => !prev)}
                    className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-xs text-gray-300 hover:text-cyan-400 flex items-center gap-1 transition border border-white/5 cursor-pointer"
                    title={isEpReversed ? "当前倒序，点击切换为正序" : "当前正序，点击切换为倒序"}
                  >
                    <ArrowUpDown className="w-3 h-3 text-cyan-400" />
                    <span>{isEpReversed ? "倒序" : "正序"}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {(isEpReversed
                ? currentSource.episodes.map((ep, idx) => ({ ep, idx })).reverse()
                : currentSource.episodes.map((ep, idx) => ({ ep, idx }))
              ).map(({ ep, idx }) => {
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

      {/* Modal with auto pause/resume */}
      <CreateRoomModal
        vodItem={item}
        initialSourceIndex={currentSourceIndex}
        initialEpisodeIndex={currentEpIndex}
        isOpen={createRoomOpen}
        onClose={handleCloseCreateRoom}
      />
    </div>
  );
}
