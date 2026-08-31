"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MovieCard } from "@/components/MovieCard";
import { Search, Loader2 } from "lucide-react";
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

    fetch(`/api/vod?wd=${encodeURIComponent(q.trim())}`)
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
    <div className="space-y-8">
      <div className="p-6 rounded-2xl bg-dark-900 border border-white/10 flex items-center gap-3">
        <Search className="w-6 h-6 text-gold-400" />
        <div>
          <h1 className="text-lg font-bold text-white">
            搜索关键字：<span className="text-gold-400">“{q}”</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            实时检索 非凡 / 量子 片库，共找到 {results.length} 部匹配作品
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
          <span className="text-sm">正在从上游采集源检索 “{q}”...</span>
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {results.map((item) => (
            <MovieCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center space-y-3">
          <p className="text-gray-400 text-base">未找到与 “{q}” 相关的影视</p>
          <p className="text-xs text-gray-500">建议尝试输入：早春晴朗、繁花、狂飙、三体、海贼王、流浪地球 等关键词</p>
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