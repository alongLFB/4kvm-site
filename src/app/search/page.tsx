"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MovieCard } from "@/components/MovieCard";
import { Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { GATED_CONFIG } from "@/config/gated-sections";
import { VodItem } from "@/lib/types";

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
      <div className="p-4 sm:p-6 rounded-2xl bg-dark-900 border border-white/10 flex items-center gap-3">
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

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-sm">正在智能检索 “{q}” (第 {currentPage} 页)...</span>
        </div>
      ) : results.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
            {results.map((item) => (
              <MovieCard key={item.id} item={item} />
            ))}
          </div>

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
          <p className="text-xs text-gray-500">支持全拼输入（如 <span className="text-cyan-400 font-mono">chun</span>）或首字母（如 <span className="text-cyan-400 font-mono">zcql</span>）快捷找片</p>
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