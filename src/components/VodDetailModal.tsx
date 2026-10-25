"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  Play,
  Star,
  Users,
  Share2,
  Film,
  Calendar,
  Globe,
  Tag,
  Check,
  Clapperboard,
  Tv,
  Sparkles,
} from "lucide-react";
import { VodItem } from "@/lib/types";

interface VodDetailModalProps {
  item: VodItem | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom?: (item: VodItem) => void;
}

export function VodDetailModal({
  item,
  isOpen,
  onClose,
  onCreateRoom,
}: VodDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);

  // Close on Escape & lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset active source index when item changes
  useEffect(() => {
    setActiveSourceIndex(0);
  }, [item?.id]);

  if (!isOpen || !item) return null;

  const handleShare = () => {
    if (typeof window !== "undefined") {
      const shareUrl = `${window.location.origin}/play/${item.id}`;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper to split actor/director strings
  const splitNames = (raw?: string) => {
    if (!raw || !raw.trim() || raw.trim() === "未知") return [];
    return raw
      .split(/[,/、|;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const actors = splitNames(item.actor);
  const directors = splitNames(item.director);
  const currentSource = item.sources?.[activeSourceIndex] || item.sources?.[0];
  const episodes = currentSource?.episodes || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 lg:p-10 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xl transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Container */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0c0f17] border border-white/10 rounded-3xl sm:rounded-[32px] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.9)] flex flex-col z-10 animate-in zoom-in-95 duration-200">
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-gray-300 hover:text-white border border-white/10 backdrop-blur-xl flex items-center justify-center transition active:scale-90 cursor-pointer shadow-lg"
          aria-label="关闭详情"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto overscroll-contain flex-1 custom-scrollbar">
          {/* Header Banner Section (Netflix Style) */}
          <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[380px] overflow-hidden bg-black">
            <img
              src={item.banner || item.pic}
              alt={item.name}
              className="w-full h-full object-cover object-center"
            />
            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f17] via-[#0c0f17]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c0f17] via-[#0c0f17]/40 to-transparent max-w-2xl" />

            {/* Banner Floating Metadata & CTA */}
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-8 sm:left-8 sm:right-8 z-10 flex flex-col justify-end">
              <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/30 backdrop-blur-md">
                  {item.type_name}
                  {item.sub_type ? ` · ${item.sub_type}` : ""}
                </span>
                {item.remarks && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-white/10 text-gray-200 text-xs font-semibold backdrop-blur-md border border-white/10">
                    {item.remarks}
                  </span>
                )}
              </div>

              <h2 className="font-display text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-md mb-3 sm:mb-5">
                {item.name}
              </h2>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5">
                <Link
                  href={`/play/${item.id}`}
                  className="px-5 py-2.5 sm:px-7 sm:py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 hover:from-cyan-300 hover:to-blue-400 active:scale-95 text-dark-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_10px_30px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-dark-950" />
                  <span>立即起播</span>
                </Link>

                {onCreateRoom && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onCreateRoom(item);
                    }}
                    className="px-4 py-2.5 sm:px-6 sm:py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 border border-white/15 backdrop-blur-xl transition cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>一起看</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleShare}
                  className="px-4 py-2.5 sm:px-5 sm:py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-gray-300 hover:text-white font-semibold text-xs sm:text-sm flex items-center gap-2 border border-white/10 backdrop-blur-xl transition cursor-pointer"
                  title="复制影视分享链接"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">已复制</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-gray-400" />
                      <span>分享</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Details Body */}
          <div className="p-5 sm:p-8 space-y-6">
            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mb-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>综合评分</span>
                </div>
                <div className="text-base sm:text-lg font-black text-amber-300">
                  {item.rating > 0 ? `${item.rating.toFixed(1)} 分` : "暂无评分"}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>首映年份</span>
                </div>
                <div className="text-base sm:text-lg font-black text-white">
                  {item.year || "未知"}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mb-1">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>制片地区</span>
                </div>
                <div className="text-base sm:text-lg font-black text-white truncate">
                  {item.area || "未知"}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mb-1">
                  <Tv className="w-3.5 h-3.5 text-emerald-400" />
                  <span>语言制式</span>
                </div>
                <div className="text-base sm:text-lg font-black text-white truncate">
                  {item.lang || "原声"}
                </div>
              </div>
            </div>

            {/* Synopsis / 剧情介绍 */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-400 flex items-center gap-1.5 tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>剧情故事梗概</span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-300/90 leading-relaxed font-normal bg-white/[0.02] p-4 sm:p-5 rounded-2xl border border-white/[0.05]">
                {item.content || "暂无详细故事梗概，请直接点击起播观赏原画正片。"}
              </p>
            </div>

            {/* Cast & Crew / 演职员阵容 */}
            <div className="space-y-4 pt-1">
              {/* Director */}
              {directors.length > 0 && (
                <div className="flex items-start gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-400 font-medium shrink-0 pt-1">
                    <Clapperboard className="w-3.5 h-3.5 text-cyan-400" />
                    <span>导演：</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {directors.map((d, idx) => (
                      <Link
                        key={idx}
                        href={`/search?q=${encodeURIComponent(d)}`}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-cyan-500/15 text-gray-200 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 transition text-xs font-medium cursor-pointer"
                      >
                        {d}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Actors */}
              {actors.length > 0 && (
                <div className="flex items-start gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-400 font-medium shrink-0 pt-1">
                    <Film className="w-3.5 h-3.5 text-indigo-400" />
                    <span>领衔主演：</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {actors.map((actor, idx) => (
                      <Link
                        key={idx}
                        href={`/search?q=${encodeURIComponent(actor)}`}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-cyan-500/15 text-gray-200 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 transition text-xs font-medium cursor-pointer"
                      >
                        {actor}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex items-start gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-400 font-medium shrink-0 pt-1">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>相关标签：</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-md bg-white/[0.03] text-gray-400 border border-white/[0.05] text-[11px]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Episode Selection / 选集快速直达 */}
            {episodes.length > 1 && (
              <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-cyan-400" />
                    <span>正片选集（共 {episodes.length} 集）</span>
                  </h3>

                  {/* Multi-source switcher if available */}
                  {item.sources && item.sources.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      {item.sources.map((src, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveSourceIndex(idx)}
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition border cursor-pointer ${
                            idx === activeSourceIndex
                              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                              : "bg-white/[0.03] text-gray-400 border-white/[0.06] hover:bg-white/[0.06]"
                          }`}
                        >
                          {src.sourceName.split(" ")[1] || `线路${idx + 1}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {episodes.map((ep, idx) => (
                    <Link
                      key={idx}
                      href={`/play/${item.id}?ep=${idx}&src=${activeSourceIndex}`}
                      className="px-2 py-2 rounded-xl bg-white/[0.04] hover:bg-cyan-500/20 hover:text-cyan-300 hover:border-cyan-500/30 text-gray-300 text-xs font-medium text-center border border-white/[0.06] transition truncate active:scale-95"
                      title={ep.name}
                    >
                      {ep.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
