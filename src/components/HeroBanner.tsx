"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Play, Info, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { VodItem } from "@/lib/types";

interface HeroBannerProps {
  featured: VodItem[];
}

export function HeroBanner({ featured }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featured.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [featured.length]);

  if (!featured || featured.length === 0) return null;
  const current = featured[currentIndex];

  return (
    <div className="relative w-full h-[420px] sm:h-[500px] lg:h-[560px] overflow-hidden rounded-3xl mb-12 shadow-2xl border border-white/10">
      {/* Background Image with Gradient Overlays */}
      <div className="absolute inset-0">
        <img
          src={current.banner || current.pic}
          alt={current.name}
          className="w-full h-full object-cover object-center transform scale-105 transition-all duration-1000 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-950 via-dark-950/70 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 max-w-3xl p-6 sm:p-10 lg:p-14 z-10">
        {/* Tags */}
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-1 rounded-md bg-gold-500/20 text-gold-400 text-xs font-bold border border-gold-500/30 flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-gold-400 text-gold-400" />
            {current.rating} 高分热推
          </span>
          <span className="px-2.5 py-1 rounded-md bg-white/10 backdrop-blur-md text-gray-200 text-xs font-medium">
            {current.year} · {current.type_name}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-white/10 backdrop-blur-md text-gray-200 text-xs font-medium">
            {current.remarks}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-3">
          {current.name}
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base text-gray-300 line-clamp-2 sm:line-clamp-3 mb-6 max-w-2xl leading-relaxed">
          {current.content}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <Link
            href={`/play/${current.id}`}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-dark-950 font-black text-sm sm:text-base flex items-center gap-2 shadow-lg shadow-gold-500/25 transition transform hover:scale-105 active:scale-95"
          >
            <Play className="w-5 h-5 fill-dark-950" />
            立即播放
          </Link>
          <Link
            href={`/play/${current.id}`}
            className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold text-sm sm:text-base flex items-center gap-2 border border-white/10 transition"
          >
            <Info className="w-5 h-5 text-gray-300" />
            详情介绍
          </Link>
        </div>
      </div>

      {/* Slide switcher dots */}
      <div className="absolute bottom-6 right-6 z-10 flex items-center gap-2">
        {featured.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === currentIndex ? "w-8 bg-gold-400" : "w-2 bg-white/30 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
