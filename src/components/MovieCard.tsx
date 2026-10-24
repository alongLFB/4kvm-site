import React from "react";
import Link from "next/link";
import { Play, Star, Users } from "lucide-react";
import { VodItem } from "@/lib/types";

interface MovieCardProps {
  item: VodItem;
  onCreateRoom?: (item: VodItem) => void;
}

export function MovieCard({ item, onCreateRoom }: MovieCardProps) {
  return (
    <div className="group relative flex flex-col rounded-2xl overflow-hidden bg-gradient-to-b from-[#131724]/90 to-[#0a0c12]/95 border border-white/[0.08] hover:border-cyan-500/40 transition-all duration-500 hover:shadow-[0_20px_45px_-15px_rgba(6,182,212,0.22)] hover:-translate-y-1.5 select-none">
      {/* Poster Image Container */}
      <Link href={`/play/${item.id}`} className="relative aspect-[2/3] w-full overflow-hidden bg-[#090b10] block">
        <img
          src={item.pic}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          loading="lazy"
        />

        {/* Ambient Top Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c12] via-transparent to-black/40 opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Top Floating Glass Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          <span className="px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-md text-[10px] font-bold text-cyan-300 border border-cyan-500/25 shadow-sm">
            {item.remarks || "HD"}
          </span>
        </div>

        {/* Rating Badge */}
        {item.rating > 0 && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-amber-400 text-dark-950 text-[11px] font-black flex items-center gap-0.5 shadow-md z-10">
            <Star className="w-3 h-3 fill-dark-950 text-dark-950" />
            {item.rating.toFixed(1)}
          </div>
        )}

        {/* Hover Center Play Button with Radial Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950/90 via-cyan-950/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
          <div className="w-13 h-13 rounded-2xl bg-cyan-500 text-dark-950 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.6)] transform scale-75 group-hover:scale-100 transition-all duration-300">
            <Play className="w-6 h-6 fill-dark-950 ml-0.5" />
          </div>
        </div>
      </Link>

      {/* Info Container */}
      <div className="p-3.5 flex flex-col justify-between flex-1 space-y-2.5 bg-gradient-to-b from-transparent to-[#07080c]">
        <Link href={`/play/${item.id}`} className="block group/link">
          <h3 className="text-xs sm:text-sm font-bold text-white group-hover/link:text-cyan-400 transition-colors line-clamp-1 tracking-tight">
            {item.name}
          </h3>
          <p className="text-[11px] text-gray-400 mt-1 line-clamp-1 font-medium">
            {item.actor || `${item.year} · ${item.type_name}`}
          </p>
        </Link>

        {onCreateRoom && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCreateRoom(item);
            }}
            className="w-full py-1.5 px-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-dark-950 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 border border-cyan-500/25 shadow-sm active:scale-95 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>发起一起看</span>
          </button>
        )}
      </div>
    </div>
  );
}
