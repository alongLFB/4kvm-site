"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MovieCard } from "@/components/MovieCard";
import { VodDetailModal } from "@/components/VodDetailModal";
import { CreateRoomModal } from "@/components/CreateRoomModal";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  Play,
  Info,
  Users,
  Star,
  Calendar,
  Sparkles,
} from "lucide-react";
import { GATED_CONFIG } from "@/config/gated-sections";
import { VodItem } from "@/lib/types";

// 高亮关键词
function HighlightMatchedText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <span>{text}</span>;
  const q = query.trim();
  const index = text.toLowerCase().indexOf(q.toLowerCase());
  if (index === -1) {
    return <span>{text}</span>;
  }
  const before = text.slice(0, index);
  const match = text.slice(index, index + q.length);
  const after = text.slice(index + q.length);
  return (
    <span>
      {before}
      <span className="text-cyan-400 font-bold underline underline-offset-2">{match}</span>
      {after}
    </span>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams?.get("q") || "";
  const initialPage = parseInt(searchParams?.get("page") || searchParams?.get("pg") || "1", 10);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VodItem[]>([]);
  const [currentPage, setCurrentPage] = useState(initialPage > 0 ? initialPage : 1);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [jumpInput, setJumpInput] = useState("");

  // 视图模式：默认详细档案列表 (list)，也可切换海报网格 (grid)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // 弹窗状态
  const [selectedDetailItem, setSelectedDetailItem] = useState<VodItem | null>(null);
  const [roomVod, setRoomVod] = useState<VodItem | null>(null);

  // 当搜索关键词变化时，重置回到第 1 页
  useEffect(() => {
    setCurrentPage(1);
  }, [q]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      setTotal(0);
      setPageCount(1);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const pin =
      typeof window !== "undefined"
        ? localStorage.getItem(GATED_CONFIG.storageKey) || ""
        : "";
    const headers: Record<string, string> = {};
    if (pin) headers[GATED_CONFIG.headerKey] = pin;

    fetch(
      `/api/vod?wd=${encodeURIComponent(q.trim())}&pg=${currentPage}&limit=20`,
      { headers }
    )
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setResults(data.list || []);
        setTotal(Number(data.total || 0));
        setPageCount(Math.max(1, Number(data.pagecount || 1)));
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [q, currentPage]);

  const changePage = (p: number) => {
    if (p < 1 || p > pageCount || p === currentPage) return;
    setCurrentPage(p);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 搜索状态与视图切换栏 */}
      <div className="p-4 sm:p-6 rounded-2xl bg-dark-900 border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Search className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white truncate">
              搜索关键字：<span className="text-cyan-400">“{q}”</span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              实时检索 6.3 万部片库，共找到 <span className="text-white font-semibold">{total}</span> 部匹配作品
              {total > 0 && (
                <span className="text-cyan-400/90 ml-1.5 font-medium">
                  (当前第 {currentPage} / {pageCount} 页)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* 视图切换按钮 */}
        {results.length > 0 && (
          <div className="flex items-center gap-1 p-1 rounded-xl bg-dark-950/80 border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === "list"
                  ? "bg-cyan-500 text-dark-950 font-black shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
              title="图文详细档案视图"
            >
              <List className="w-3.5 h-3.5" />
              <span>详细档案</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === "grid"
                  ? "bg-cyan-500 text-dark-950 font-black shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
              title="海报卡片网格视图"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>海报网格</span>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-sm">正在智能检索 “{q}” (第 {currentPage} 页)...</span>
        </div>
      ) : results.length > 0 ? (
        <>
          {/* 模式 1: 图文详细档案列表 (展示上映年份、类型、地区、主演、导演、故事梗概) */}
          {viewMode === "list" ? (
            <div className="space-y-4">
              {results.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#131724]/85 to-[#0a0c12]/95 border border-white/[0.08] hover:border-cyan-500/40 transition-all duration-300 hover:shadow-[0_15px_40px_-15px_rgba(6,182,212,0.25)] select-none"
                >
                  {/* 左侧封面海报 */}
                  <Link
                    href={`/play/${item.id}`}
                    className="relative aspect-[2/3] w-28 sm:w-36 lg:w-40 shrink-0 rounded-2xl overflow-hidden bg-black/60 block self-start shadow-md group/poster"
                  >
                    <img
                      src={item.pic}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover/poster:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    {/* 连载/画质角标 */}
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                      <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-cyan-300 border border-cyan-500/25">
                        {item.remarks || "HD"}
                      </span>
                    </div>
                    {/* 评分角标 */}
                    {item.rating > 0 && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-amber-400 text-dark-950 text-[10px] font-black flex items-center gap-0.5 shadow-md z-10">
                        <Star className="w-2.5 h-2.5 fill-dark-950" />
                        {item.rating.toFixed(1)}
                      </div>
                    )}
                    {/* Hover 快捷播放悬浮 */}
                    <div className="absolute inset-0 bg-dark-950/40 opacity-0 group-hover/poster:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-11 h-11 rounded-2xl bg-cyan-500 text-dark-950 flex items-center justify-center shadow-lg transform scale-75 group-hover/poster:scale-100 transition-transform">
                        <Play className="w-5 h-5 fill-dark-950 ml-0.5" />
                      </div>
                    </div>
                  </Link>

                  {/* 右侧详细资料栏 */}
                  <div className="flex-1 flex flex-col justify-between space-y-3 min-w-0">
                    <div className="space-y-2.5">
                      {/* 片名 */}
                      <Link href={`/play/${item.id}`} className="block group/title">
                        <h2 className="text-base sm:text-xl font-black text-white group-hover/title:text-cyan-400 transition-colors tracking-tight">
                          <HighlightMatchedText text={item.name} query={q} />
                        </h2>
                      </Link>

                      {/* 规格标签条 (上映年份、分类、子类型、地区、语言) */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {item.year && (
                          <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1 shadow-sm">
                            <Calendar className="w-3 h-3 text-cyan-400" />
                            <span>{item.year}年</span>
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-md bg-white/[0.06] text-gray-200 border border-white/10 text-xs font-semibold">
                          {item.type_name}
                          {item.sub_type ? ` · ${item.sub_type}` : ""}
                        </span>
                        {item.area && (
                          <span className="px-2.5 py-0.5 rounded-md bg-white/[0.04] text-gray-300 border border-white/[0.06] text-xs">
                            {item.area}
                          </span>
                        )}
                        {item.lang && (
                          <span className="px-2.5 py-0.5 rounded-md bg-white/[0.04] text-gray-400 border border-white/[0.06] text-xs">
                            {item.lang}
                          </span>
                        )}
                      </div>

                      {/* 导演与主演 */}
                      <div className="space-y-1 text-xs text-gray-400 pt-0.5">
                        {item.director && (
                          <p className="truncate">
                            <span className="text-gray-500 font-medium">导演：</span>
                            <span className="text-gray-300">{item.director}</span>
                          </p>
                        )}
                        {item.actor && (
                          <p className="line-clamp-1">
                            <span className="text-gray-500 font-medium">领衔主演：</span>
                            <span className="text-gray-300">
                              <HighlightMatchedText text={item.actor} query={q} />
                            </span>
                          </p>
                        )}
                      </div>

                      {/* 剧情故事梗概预览 */}
                      {item.content && (
                        <p className="text-xs text-gray-400/90 line-clamp-2 leading-relaxed bg-white/[0.02] p-2.5 sm:p-3 rounded-xl border border-white/[0.04]">
                          <span className="text-gray-500 font-medium">剧情简介：</span>
                          {item.content}
                        </p>
                      )}
                    </div>

                    {/* 快捷操作区 */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/[0.06]">
                      <Link
                        href={`/play/${item.id}`}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 hover:from-cyan-300 hover:to-blue-400 active:scale-95 text-dark-950 font-black text-xs flex items-center gap-1.5 shadow-[0_4px_15px_rgba(6,182,212,0.3)] transition cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-dark-950" />
                        <span>立即起播</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => setSelectedDetailItem(item)}
                        className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-semibold text-xs flex items-center gap-1.5 border border-white/10 active:scale-95 transition cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5 text-cyan-400" />
                        <span>影视档案</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRoomVod(item)}
                        className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-dark-950 font-semibold text-xs flex items-center gap-1.5 border border-cyan-500/25 active:scale-95 transition cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>发起一起看</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* 模式 2: 海报网格卡片 (同样完整显示年份、分类、主演) */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
              {results.map((item) => (
                <MovieCard
                  key={item.id}
                  item={item}
                  onCreateRoom={(vod) => setRoomVod(vod)}
                />
              ))}
            </div>
          )}

          {/* 分页控制栏 */}
          {pageCount > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-6 pb-4">
              <button
                type="button"
                onClick={() => changePage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 sm:px-4 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white hover:bg-dark-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> 上一页
              </button>

              <span className="px-3 sm:px-4 py-2 text-xs font-bold text-cyan-400 bg-dark-900 rounded-xl border border-cyan-500/20">
                {currentPage} / {pageCount}
              </span>

              <button
                type="button"
                onClick={() => changePage(currentPage + 1)}
                disabled={currentPage >= pageCount}
                className="px-3 sm:px-4 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white hover:bg-dark-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition active:scale-95 cursor-pointer"
              >
                下一页 <ChevronRight className="w-4 h-4" />
              </button>

              {/* 快速直达跳转框 */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const p = parseInt(jumpInput, 10);
                  if (!isNaN(p) && p >= 1 && p <= pageCount) {
                    changePage(p);
                    setJumpInput("");
                  }
                }}
                className="flex items-center gap-1.5 bg-dark-900 border border-white/10 px-2.5 py-1 rounded-xl text-xs"
              >
                <span className="text-gray-400 text-[11px]">前往</span>
                <input
                  type="number"
                  min="1"
                  max={pageCount}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  placeholder={`${currentPage}`}
                  className="w-12 bg-dark-800 text-base sm:text-xs text-center text-white px-1 py-1 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-gray-400 text-[11px]">页</span>
                <button
                  type="submit"
                  className="px-2 py-1 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-dark-950 font-bold text-[11px] rounded-lg transition cursor-pointer"
                >
                  跳转
                </button>
              </form>
            </div>
          )}
        </>
      ) : (
        <div className="py-24 text-center space-y-4">
          <p className="text-gray-400 text-base">未找到与 “{q}” 相关的影视</p>
          <p className="text-xs text-gray-500">
            支持全拼输入（如 <span className="text-cyan-400 font-mono">chun</span>）或首字母（如{" "}
            <span className="text-cyan-400 font-mono">zcql</span>）快捷找片
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-xs text-gray-400">热门搜索推荐：</span>
            {["早春晴朗", "短剧", "NBA", "动漫", "庆余年", "繁花", "狂飙"].map((tag) => (
              <a
                key={tag}
                href={`/search?q=${encodeURIComponent(tag)}`}
                className="px-3 py-1 text-xs rounded-lg bg-white/5 hover:bg-cyan-500/20 text-gray-300 hover:text-cyan-400 border border-white/5 transition"
              >
                {tag}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 影视档案 Netflix 风格详情弹窗 */}
      <VodDetailModal
        item={selectedDetailItem}
        isOpen={!!selectedDetailItem}
        onClose={() => setSelectedDetailItem(null)}
        onCreateRoom={(vod) => {
          setSelectedDetailItem(null);
          setRoomVod(vod);
        }}
      />

      {/* 快捷发起一起看弹窗 */}
      {roomVod && (
        <CreateRoomModal
          vodItem={roomVod}
          isOpen={!!roomVod}
          onClose={() => setRoomVod(null)}
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-400">搜索中...</div>}>
      <SearchContent />
    </Suspense>
  );
}