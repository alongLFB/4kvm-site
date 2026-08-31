"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MovieCard } from "@/components/MovieCard";
import { Filter, ChevronLeft, ChevronRight, Loader2, RotateCcw } from "lucide-react";
import { VodItem } from "@/lib/types";

const FILTER_CONFIG = {
  types: [
    "全部", "电影", "电视剧", "综艺", "动漫", "短剧", "纪录片",
    "动作片", "喜剧片", "爱情片", "科幻片", "悬疑片", "恐怖片",
    "国产剧", "香港剧", "韩国剧", "欧美剧", "日本剧", "台湾剧", "泰国剧",
    "国产动漫", "日本动漫", "欧美动漫",
    "大陆综艺", "港台综艺", "日韩综艺", "欧美综艺"
  ],
  areas: ["全部", "大陆", "香港", "台湾", "日本", "韩国", "欧美", "英国", "泰国", "其它"],
  langs: ["全部", "国语", "粤语", "英语", "韩语", "日语", "西班牙语", "法语", "德语", "意大利语", "泰语", "其它"],
  years: ["全部", "2026", "2025", "2024", "2023", "2022", "2021", "2020", "10年代", "00年代", "90年代", "80年代", "更早"],
  qualities: ["全部", "4K", "1080P", "720P", "HD"],
  statuses: ["全部", "全集", "连载中"]
};

function CategoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentType = searchParams?.get("type") || "全部";
  const currentArea = searchParams?.get("area") || "全部";
  const currentLang = searchParams?.get("lang") || "全部";
  const currentYear = searchParams?.get("year") || "全部";
  const currentQuality = searchParams?.get("quality") || "全部";
  const currentStatus = searchParams?.get("status") || "全部";
  const currentPage = parseInt(searchParams?.get("pg") || "1", 10);

  const [loading, setLoading] = useState(true);
  const [vods, setVods] = useState<VodItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const queryParams = new URLSearchParams({
      type: currentType,
      area: currentArea,
      lang: currentLang,
      year: currentYear,
      quality: currentQuality,
      status: currentStatus,
      pg: String(currentPage),
    });

    fetch(`/api/vod?${queryParams.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setVods(data.list || []);
        setTotal(data.total || 0);
        setPageCount(data.pagecount || 1);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentType, currentArea, currentLang, currentYear, currentQuality, currentStatus, currentPage]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (value === "全部") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set("pg", "1");
    router.push(`/category?${params.toString()}`);
  };

  const resetAllFilters = () => {
    router.push("/category");
  };

  const changePage = (newPage: number) => {
    if (newPage < 1 || newPage > pageCount) return;
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("pg", String(newPage));
    router.push(`/category?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isFiltered = currentType !== "全部" || currentArea !== "全部" || currentLang !== "全部" || currentYear !== "全部" || currentQuality !== "全部" || currentStatus !== "全部";

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Multi-Dimensional Filter Board */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#0e1320] border border-white/10 space-y-3.5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Filter className="w-4 h-4 text-cyan-400" />
            全部片库 · 6维组合筛选
          </div>
          {isFiltered && (
            <button
              onClick={resetAllFilters}
              className="text-xs text-gray-400 hover:text-cyan-400 flex items-center gap-1 transition px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重置
            </button>
          )}
        </div>

        {/* 1. 全部板块 */}
        <div className="flex items-center sm:items-start gap-2 sm:gap-3 text-xs leading-none pt-1">
          <span className="w-16 sm:w-20 shrink-0 font-bold text-gray-400 py-1.5">全部板块</span>
          <div className="flex flex-nowrap sm:flex-wrap gap-1.5 flex-1 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
            {FILTER_CONFIG.types.map((item) => {
              const active = currentType === item;
              return (
                <button
                  key={item}
                  onClick={() => updateFilter("type", item)}
                  className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition ${
                    active
                      ? "bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 全部地区 */}
        <div className="flex items-center sm:items-start gap-2 sm:gap-3 text-xs leading-none pt-2 border-t border-white/5">
          <span className="w-16 sm:w-20 shrink-0 font-bold text-gray-400 py-1.5">全部地区</span>
          <div className="flex flex-nowrap sm:flex-wrap gap-1.5 flex-1 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
            {FILTER_CONFIG.areas.map((item) => {
              const active = currentArea === item;
              return (
                <button
                  key={item}
                  onClick={() => updateFilter("area", item)}
                  className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition ${
                    active
                      ? "bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 全部语言 */}
        <div className="flex items-center sm:items-start gap-2 sm:gap-3 text-xs leading-none pt-2 border-t border-white/5">
          <span className="w-16 sm:w-20 shrink-0 font-bold text-gray-400 py-1.5">全部语言</span>
          <div className="flex flex-nowrap sm:flex-wrap gap-1.5 flex-1 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
            {FILTER_CONFIG.langs.map((item) => {
              const active = currentLang === item;
              return (
                <button
                  key={item}
                  onClick={() => updateFilter("lang", item)}
                  className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition ${
                    active
                      ? "bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. 全部年份 */}
        <div className="flex items-center sm:items-start gap-2 sm:gap-3 text-xs leading-none pt-2 border-t border-white/5">
          <span className="w-16 sm:w-20 shrink-0 font-bold text-gray-400 py-1.5">全部年份</span>
          <div className="flex flex-nowrap sm:flex-wrap gap-1.5 flex-1 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
            {FILTER_CONFIG.years.map((item) => {
              const active = currentYear === item;
              return (
                <button
                  key={item}
                  onClick={() => updateFilter("year", item)}
                  className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition ${
                    active
                      ? "bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. 全部画质 */}
        <div className="flex items-center sm:items-start gap-2 sm:gap-3 text-xs leading-none pt-2 border-t border-white/5">
          <span className="w-16 sm:w-20 shrink-0 font-bold text-gray-400 py-1.5">全部画质</span>
          <div className="flex flex-nowrap sm:flex-wrap gap-1.5 flex-1 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
            {FILTER_CONFIG.qualities.map((item) => {
              const active = currentQuality === item;
              return (
                <button
                  key={item}
                  onClick={() => updateFilter("quality", item)}
                  className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition ${
                    active
                      ? "bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. 全部状态 */}
        <div className="flex items-center sm:items-start gap-2 sm:gap-3 text-xs leading-none pt-2 border-t border-white/5">
          <span className="w-16 sm:w-20 shrink-0 font-bold text-gray-400 py-1.5">全部状态</span>
          <div className="flex flex-nowrap sm:flex-wrap gap-1.5 flex-1 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
            {FILTER_CONFIG.statuses.map((item) => {
              const active = currentStatus === item;
              return (
                <button
                  key={item}
                  onClick={() => updateFilter("status", item)}
                  className={`px-3 py-1.5 rounded-md whitespace-nowrap shrink-0 transition ${
                    active
                      ? "bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter Results & Counter */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            筛选结果：共找到 <span className="text-cyan-400 font-bold">{total.toLocaleString()}</span> 部作品 · 当前第{" "}
            <span className="text-white font-bold">{currentPage}</span> / {pageCount} 页
          </p>
        </div>

        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <span className="text-sm">正在检索匹配片库中...</span>
          </div>
        ) : vods.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {vods.map((item) => (
              <MovieCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center space-y-3 bg-dark-900/50 rounded-2xl border border-white/5">
            <p className="text-gray-400 text-sm">暂无符合当前全部组合条件的影视作品</p>
            <button
              onClick={resetAllFilters}
              className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> 重置所有筛选条件
            </button>
          </div>
        )}

        {/* Pagination Bar */}
        {pageCount > 1 && !loading && (
          <div className="flex items-center justify-center gap-2 pt-8 pb-4">
            <button
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-4 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white hover:bg-dark-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
            >
              <ChevronLeft className="w-4 h-4" /> 上一页
            </button>

            <span className="px-4 py-2 text-xs font-bold text-cyan-400 bg-dark-900 rounded-xl border border-cyan-500/20">
              {currentPage} / {pageCount}
            </span>

            <button
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage >= pageCount}
              className="px-4 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white hover:bg-dark-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
            >
              下一页 <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-400">加载片库中...</div>}>
      <CategoryContent />
    </Suspense>
  );
}