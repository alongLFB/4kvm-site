"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MovieCard } from "@/components/MovieCard";
import { Search, Loader2 } from "lucide-react";
import { GATED_CONFIG } from "@/config/gated-sections";
import { VodItem } from "@/lib/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams?.get("q") || "";

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VodItem[]>([]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
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

    fetch(`/api/vod?wd=${encodeURIComponent(q.trim())}`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setResults(data.list || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [q]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="p-4 sm:p-6 rounded-2xl bg-dark-900 border border-white/10 flex items-center gap-3">
        <Search className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 shrink-0" />
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-white truncate">
            搜索关键字：<span className="text-cyan-400">“{q}”</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            实时检索 6.3 万部片库，共找到 {results.length} 部匹配作品 (支持汉字、全拼及拼音首字母)
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-sm">正在智能检索 “{q}”...</span>
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
          {results.map((item) => (
            <MovieCard key={item.id} item={item} />
          ))}
        </div>
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