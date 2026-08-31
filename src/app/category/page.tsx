"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MovieCard } from "@/components/MovieCard";
import { CreateRoomModal } from "@/components/CreateRoomModal";
import { VodItem } from "@/lib/types";
import { Loader2, ChevronLeft, ChevronRight, RotateCcw, Sparkles } from "lucide-react";

const FILTER_CONFIG = {
  types: ["全部", "电影", "电视剧", "综艺", "动漫", "短剧", "纪录片", "4K专区"],
  areas: ["全部", "大陆", "香港", "台湾", "日本", "韩国", "欧美", "泰国", "其它"],
  langs: ["全部", "国语", "粤语", "英语", "韩语", "日语", "泰语", "其它"],
  years: ["全部", "今年", "去年", "10年代", "00年代", "90年代", "80年代", "更早"],
  qualities: ["全部", "4K超清", "1080P", "720P", "HD", "蓝光"],
  statuses: ["全部", "连载中", "全集"],
};

function CategoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentType = searchParams.get("type") || "全部";
  const currentArea = searchParams.get("area") || "全部";
  const currentLang = searchParams.get("lang") || "全部";
  const currentYear = searchParams.get("year") || "全部";
  const currentQuality = searchParams.get("quality") || "全部";
  const currentStatus = searchParams.get("status") || "全部";
  const currentPage = parseInt(searchParams.get("pg") || "1", 10);

  const [vods, setVods] = useState<VodItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);

  // Watch Party Quick Modal state
  const [pickedVod, setPickedVod] = useState<VodItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (currentType !== "全部") params.set("type", currentType);
    if (currentArea !== "全部") params.set("area", currentArea);
    if (currentLang !== "全部") params.set("lang", currentLang);
    if (currentYear !== "全部") params.set("year", currentYear);
    if (currentQuality !== "全部") params.set("quality", currentQuality);
    if (currentStatus !== "全部") params.set("status", currentStatus);
    params.set("pg", currentPage.toString());

    fetch(`/api/vod?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 200) {
          setVods(data.list || []);
          setTotal(data.total || 0);
          setPageCount(data.pagecount || 1);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [currentType, currentArea, currentLang, currentYear, currentQuality, currentStatus, currentPage]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "全部") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set("pg", "1");
    router.push(`/category?${params.toString()}`);
  };

  const changePage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pg", page.toString());
    router.push(`/category?${params.toString()}`);
  };

  const resetAllFilters = () => {
    router.push("/category");
  };

  return (
    <div className="space-y-8">
      {/* Filter Options Container */}
      <div className="bg-dark-900 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            影视片库多维筛选
          </div>
          <button
            onClick={resetAllFilters}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 重置筛选
          </button>
        </div>

        {/* 1. 全部类型 */}
        <div className="flex items-center sm:items-start gap-2 sm:gap-3 text-xs leading-none">
          <span className="w-16 sm:w-20 shrink-0 font-bold text-gray-400 py-1.5">全部类型</span>
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
              <MovieCard
                key={item.id}
                item={item}
                onCreateRoom={(picked) => {
                  setPickedVod(picked);
                  setModalOpen(true);
                }}
              />
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

      {/* Quick Watch Party Modal */}
      {pickedVod && (
        <CreateRoomModal
          vodItem={pickedVod}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setPickedVod(null);
          }}
        />
      )}
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
