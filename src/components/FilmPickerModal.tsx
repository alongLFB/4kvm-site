"use client";

import React, { useState, useEffect } from "react";
import { X, Search, Film, Star, Loader2, ChevronLeft, ChevronRight, RotateCcw, Filter, Plus, Check, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { VodItem } from "@/lib/types";

interface FilmPickerModalProps {
  isOpen: boolean;
  title?: string;
  actionLabel?: string;
  onClose: () => void;
  onSelect: (item: VodItem) => void;
}

// 6 Full Dimensions matching the entire movie library
const FILTER_CONFIG = {
  types: ["全部", "电影", "电视剧", "综艺", "动漫", "短剧", "纪录片", "4K专区"],
  areas: ["全部", "大陆", "香港", "台湾", "日本", "韩国", "欧美", "泰国", "其它"],
  langs: ["全部", "国语", "粤语", "英语", "韩语", "日语", "泰语", "其它"],
  years: ["全部", "今年", "去年", "10年代", "00年代", "90年代", "80年代", "更早"],
  qualities: ["全部", "4K超清", "1080P", "720P", "HD", "蓝光"],
  statuses: ["全部", "连载中", "全集"],
};

export function FilmPickerModal({
  isOpen,
  title = "挑选影片 · 发起放映厅",
  actionLabel = "发起一起看",
  onClose,
  onSelect,
}: FilmPickerModalProps) {
  const [selectedType, setSelectedType] = useState("全部");
  const [selectedArea, setSelectedArea] = useState("全部");
  const [selectedLang, setSelectedLang] = useState("全部");
  const [selectedYear, setSelectedYear] = useState("全部");
  const [selectedQuality, setSelectedQuality] = useState("全部");
  const [selectedStatus, setSelectedStatus] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expandFilters, setExpandFilters] = useState(false);

  const [vodList, setVodList] = useState<VodItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);

  const activeFilterCount = [
    selectedType !== "全部",
    selectedArea !== "全部",
    selectedLang !== "全部",
    selectedYear !== "全部",
    selectedQuality !== "全部",
    selectedStatus !== "全部",
  ].filter(Boolean).length;

  const fetchFilms = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedType !== "全部") params.set("type", selectedType);
      if (selectedArea !== "全部") params.set("area", selectedArea);
      if (selectedLang !== "全部") params.set("lang", selectedLang);
      if (selectedYear !== "全部") params.set("year", selectedYear);
      if (selectedQuality !== "全部") params.set("quality", selectedQuality);
      if (selectedStatus !== "全部") params.set("status", selectedStatus);
      if (searchQuery.trim()) params.set("wd", searchQuery.trim());
      params.set("pg", page.toString());
      params.set("limit", "12");

      const res = await fetch(`/api/vod?${params.toString()}`);
      const data = await res.json();
      if (data.code === 200) {
        setVodList(data.list || []);
        setTotal(data.total || 0);
        setPageCount(data.pagecount || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFilms();
    }
  }, [
    isOpen,
    selectedType,
    selectedArea,
    selectedLang,
    selectedYear,
    selectedQuality,
    selectedStatus,
    page,
  ]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setPage(1);
      fetchFilms();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleResetFilters = () => {
    setSelectedType("全部");
    setSelectedArea("全部");
    setSelectedLang("全部");
    setSelectedYear("全部");
    setSelectedQuality("全部");
    setSelectedStatus("全部");
    setSearchQuery("");
    setPage(1);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-dark-900 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-white">
            <Film className="w-5 h-5 text-cyan-400" />
            {title}
            {activeFilterCount > 0 && (
              <span className="text-[10px] bg-cyan-500/20 text-cyan-400 font-bold px-2 py-0.5 rounded-full border border-cyan-500/30">
                已启用 {activeFilterCount} 个过滤维度
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar + Controls */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索片名、演员、导演..."
              className="w-full bg-dark-800 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-base sm:text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setExpandFilters(!expandFilters)}
            className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 transition active:scale-95 ${
              expandFilters || activeFilterCount > 0
                ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                : "bg-dark-800 hover:bg-dark-700 border-white/10 text-gray-300"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">全部 6 维筛选</span>
            <span className="sm:hidden">筛选</span>
            {expandFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleResetFilters}
            className="px-3 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 border border-white/10 text-gray-400 hover:text-white text-xs flex items-center gap-1 shrink-0 transition"
            title="重置全部筛选"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">重置</span>
          </button>
        </div>

        {/* 6 Multi-Dimensional Filter Panel (Matching Entire Movie Library) */}
        <div className="p-3.5 rounded-2xl bg-dark-850 border border-white/5 space-y-2.5 text-xs">
          {/* 1. 全部类型 */}
          <div className="flex items-center gap-2">
            <span className="w-14 text-gray-400 font-bold shrink-0 text-[11px]">全部类型</span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {FILTER_CONFIG.types.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setSelectedType(t);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition text-[11px] ${
                    selectedType === t
                      ? "bg-cyan-500 text-dark-950 font-bold shadow-md shadow-cyan-500/20"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 2. 全部地区 */}
          <div className="flex items-center gap-2 pt-1.5 border-t border-white/5">
            <span className="w-14 text-gray-400 font-bold shrink-0 text-[11px]">全部地区</span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {FILTER_CONFIG.areas.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setSelectedArea(a);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition text-[11px] ${
                    selectedArea === a
                      ? "bg-cyan-500 text-dark-950 font-bold shadow-md shadow-cyan-500/20"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 全部年份 */}
          <div className="flex items-center gap-2 pt-1.5 border-t border-white/5">
            <span className="w-14 text-gray-400 font-bold shrink-0 text-[11px]">全部年份</span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {FILTER_CONFIG.years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setSelectedYear(y);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition text-[11px] ${
                    selectedYear === y
                      ? "bg-cyan-500 text-dark-950 font-bold shadow-md shadow-cyan-500/20"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Expanded Dimensions: 4. 全部语言, 5. 全部画质, 6. 全部状态 */}
          {expandFilters && (
            <div className="space-y-2.5 pt-1.5 border-t border-white/5 animate-in fade-in">
              {/* 4. 全部语言 */}
              <div className="flex items-center gap-2">
                <span className="w-14 text-gray-400 font-bold shrink-0 text-[11px]">全部语言</span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  {FILTER_CONFIG.langs.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => {
                        setSelectedLang(l);
                        setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition text-[11px] ${
                        selectedLang === l
                          ? "bg-cyan-500 text-dark-950 font-bold shadow-md shadow-cyan-500/20"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. 全部画质 */}
              <div className="flex items-center gap-2 pt-1.5 border-t border-white/5">
                <span className="w-14 text-gray-400 font-bold shrink-0 text-[11px]">全部画质</span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  {FILTER_CONFIG.qualities.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        setSelectedQuality(q);
                        setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition text-[11px] ${
                        selectedQuality === q
                          ? "bg-cyan-500 text-dark-950 font-bold shadow-md shadow-cyan-500/20"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. 全部状态 */}
              <div className="flex items-center gap-2 pt-1.5 border-t border-white/5">
                <span className="w-14 text-gray-400 font-bold shrink-0 text-[11px]">全部状态</span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  {FILTER_CONFIG.statuses.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSelectedStatus(s);
                        setPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition text-[11px] ${
                        selectedStatus === s
                          ? "bg-cyan-500 text-dark-950 font-bold shadow-md shadow-cyan-500/20"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Film Cards Results Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin min-h-[280px]">
          {loading ? (
            <div className="py-24 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <span className="text-xs">正在检索高码率片库...</span>
            </div>
          ) : vodList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {vodList.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-dark-850 border border-white/5 hover:border-cyan-500/40 flex flex-col justify-between gap-2.5 transition group shadow-md"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="relative w-14 h-20 rounded-xl overflow-hidden shadow shrink-0 bg-dark-800">
                      <img
                        src={item.pic}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/70 text-[9px] font-bold text-gold-400">
                        {item.remarks?.slice(0, 6) || "HD"}
                      </span>
                    </div>

                    <div className="overflow-hidden space-y-1 flex-1">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-400 transition">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-gray-400">
                        {item.year} · {item.type_name} {item.area ? `· ${item.area}` : ""}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {item.actor || "热播高分推荐"}
                      </p>
                      {item.rating > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-gold-400 font-bold">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{item.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className="w-full py-1.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-cyan-500/20 hover:from-blue-600 hover:to-cyan-500 text-cyan-300 hover:text-dark-950 font-bold text-xs transition flex items-center justify-center gap-1.5 border border-cyan-500/30 shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {actionLabel}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center space-y-3 bg-dark-850/50 rounded-2xl border border-white/5">
              <Film className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-gray-400 text-xs">没有找到符合组合条件的影视</p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-cyan-400 hover:underline"
              >
                重置筛选条件
              </button>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {pageCount > 1 && !loading && (
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
            <span className="text-gray-500 text-[11px]">
              共找到 <strong className="text-white">{total}</strong> 部作品 · 第 {page} / {pageCount} 页
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-dark-800 border border-white/10 text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-cyan-400 font-bold px-2">{page}</span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
                className="p-1.5 rounded-lg bg-dark-800 border border-white/10 text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
