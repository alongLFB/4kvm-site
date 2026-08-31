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
    <div className="group relative flex flex-col rounded-xl overflow-hidden bg-dark-850 border border-white/5 hover:border-gold-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-gold-500/10 hover:-translate-y-1">
      {/* Poster Image Container */}
      <Link href={`/play/${item.id}`} className="relative aspect-[2/3] w-full overflow-hidden bg-dark-800 block">
        <img
          src={item.pic}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[11px] font-semibold text-gold-400 border border-gold-500/20">
            {item.remarks || "HD"}
          </span>
        </div>

        {/* Rating Badge */}
        {item.rating > 0 && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-gold-500 text-dark-950 text-xs font-black flex items-center gap-0.5 shadow-md">
            <Star className="w-3 h-3 fill-dark-950" />
            {item.rating.toFixed(1)}
          </div>
        )}

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-gold-500 text-dark-950 flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-6 h-6 fill-dark-950 ml-0.5" />
          </div>
        </div>
      </Link>

      {/* Info Container */}
      <div className="p-3 flex flex-col justify-between flex-1 space-y-2">
        <Link href={`/play/${item.id}`} className="block">
          <h3 className="text-sm font-bold text-white group-hover:text-gold-400 transition-colors line-clamp-1">
            {item.name}
          </h3>
          <p className="text-xs text-gray-400 mt-1 line-clamp-1">
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
            className="w-full py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-dark-950 text-xs font-bold transition flex items-center justify-center gap-1 border border-cyan-500/20 shadow-sm"
          >
            <Users className="w-3.5 h-3.5" />
            👥 发起一起看
          </button>
        )}
      </div>
    </div>
  );
}
