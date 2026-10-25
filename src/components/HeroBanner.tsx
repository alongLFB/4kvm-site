"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Play, Info, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { VodItem } from "@/lib/types";
import { VodDetailModal } from "@/components/VodDetailModal";

interface HeroBannerProps {
  featured: VodItem[];
}

export function HeroBanner({ featured }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Touch Swipe Support for Mobile
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  useEffect(() => {
    if (isPaused || isDetailModalOpen) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featured.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [featured.length, isPaused, isDetailModalOpen]);

  if (!featured || featured.length === 0) return null;
  const current = featured[currentIndex];

  const handlePrev = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setCurrentIndex((prev) => (prev - 1 + featured.length) % featured.length);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setCurrentIndex((prev) => (prev + 1) % featured.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 45;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
  };

  return (
    <>
      <div
        className="relative w-full min-h-[460px] sm:min-h-[540px] lg:min-h-[620px] rounded-3xl sm:rounded-[36px] overflow-hidden mb-10 sm:mb-16 border border-white/10 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.8)] group select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background Poster Image with Smooth Cross-Dissolve Transition */}
        {featured.map((item, idx) => (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
              idx === currentIndex ? "opacity-100 z-0" : "opacity-0 -z-10 pointer-events-none"
            }`}
          >
            <img
              src={item.banner || item.pic}
              alt={item.name}
              className={`w-full h-full object-cover object-center transform transition-transform duration-[8000ms] ease-out ${
                idx === currentIndex ? "scale-105" : "scale-100"
              }`}
            />
            {/* Multi-Layer Cinematic Obsidian Masks */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#06070a] via-[#06070a]/70 to-transparent opacity-95" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#06070a] via-[#06070a]/85 to-transparent/30 max-w-4xl" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.15),transparent_60%)]" />
          </div>
        ))}

        {/* Top Subtle Brand Watermark */}
        <div className="absolute top-4 left-4 sm:top-8 sm:left-8 z-10 flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 text-[10px] sm:text-[11px] font-bold text-cyan-400 tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>4KVM 焦点精选 · 首映</span>
          </span>
        </div>

        {/* Floating Carousel Navigation (Desktop: bottom-right; Mobile: top-right to prevent collision with buttons) */}
        <div className="absolute top-4 right-4 sm:top-auto sm:bottom-10 sm:right-10 z-20 flex items-center gap-1.5 sm:gap-3 bg-black/50 backdrop-blur-2xl p-1.5 sm:p-2.5 rounded-2xl border border-white/10 shadow-2xl">
          <button
            onClick={handlePrev}
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-white/5 hover:bg-white/15 active:scale-90 text-gray-300 hover:text-white flex items-center justify-center transition border border-white/5 cursor-pointer"
            aria-label="上一部热映"
            title="上一部"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </button>

          {/* Progress Dots */}
          <div className="flex items-center gap-1 sm:gap-1.5 px-0.5 sm:px-1">
            {featured.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 sm:h-2 rounded-full transition-all duration-500 cursor-pointer ${
                  idx === currentIndex
                    ? "w-5 sm:w-9 bg-gradient-to-r from-cyan-400 to-blue-400 shadow-sm shadow-cyan-400/50"
                    : "w-1.5 sm:w-2 bg-white/20 hover:bg-white/40"
                }`}
                aria-label={`切换到第 ${idx + 1} 个精选视频`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-white/5 hover:bg-white/15 active:scale-90 text-gray-300 hover:text-white flex items-center justify-center transition border border-white/5 cursor-pointer"
            aria-label="下一部热映"
            title="下一部"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="absolute bottom-0 left-0 right-0 max-w-4xl p-5 sm:p-10 lg:p-14 z-10 flex flex-col justify-end">
          {/* Editorial Spec Pills & Rating */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 mb-2.5 sm:mb-4">
            {current.rating > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-300 text-xs font-black border border-amber-400/30 flex items-center gap-1 backdrop-blur-md shadow-sm">
                <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                {current.rating.toFixed(1)} 殿堂评分
              </span>
            )}

            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 text-xs font-bold border border-cyan-500/25 backdrop-blur-md">
              4K 超高清 · 60FPS
            </span>

            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-gray-200 text-xs font-semibold backdrop-blur-md border border-white/10">
              {current.year} · {current.type_name}
            </span>

            {current.remarks && (
              <span className="px-2.5 py-1 rounded-lg bg-white/10 text-gray-300 text-xs font-medium backdrop-blur-md border border-white/5 truncate max-w-[140px] sm:max-w-none">
                {current.remarks}
              </span>
            )}
          </div>

          {/* Cinematic Title */}
          <h1 className="font-display text-2xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08] mb-2.5 sm:mb-4 drop-shadow-[0_8px_20px_rgba(0,0,0,0.8)] line-clamp-1 sm:line-clamp-2">
            {current.name}
          </h1>

          {/* Narrative Synopses */}
          <p className="text-xs sm:text-sm lg:text-base text-gray-300/90 line-clamp-2 sm:line-clamp-3 mb-5 sm:mb-8 max-w-2xl leading-relaxed font-normal">
            {current.content || "全网高分影视资源，免VIP无广告直连秒播，支持全集多线程高速下载与PWA离线畅享。"}
          </p>

          {/* Action Controls - Clear, Non-overlapping on mobile and desktop */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            <Link
              href={`/play/${current.id}`}
              className="px-5 py-3 sm:px-8 sm:py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 hover:from-cyan-300 hover:to-blue-400 active:scale-95 text-dark-950 font-black text-xs sm:text-base flex items-center gap-2 sm:gap-2.5 shadow-[0_10px_35px_-5px_rgba(6,182,212,0.4)] hover:shadow-[0_15px_45px_0_rgba(6,182,212,0.6)] transition-all duration-300 cursor-pointer group/btn"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-dark-950 group-hover/btn:scale-110 transition-transform" />
              <span>立即起播</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsDetailModalOpen(true)}
              className="px-4 py-3 sm:px-7 sm:py-4 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-semibold text-xs sm:text-base flex items-center gap-1.5 sm:gap-2 border border-white/15 backdrop-blur-xl transition-all duration-300 cursor-pointer hover:border-white/30"
            >
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
              <span>影剧档案</span>
            </button>
          </div>
        </div>
      </div>

      {/* Netflix-Style Quick-View Detail Modal */}
      <VodDetailModal
        item={current}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </>
  );
}
