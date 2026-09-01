import React from "react";
import Link from "next/link";
import { HeroBanner } from "@/components/HeroBanner";
import { MovieCard } from "@/components/MovieCard";
import { fetchLiveVods } from "@/lib/vod-service";
import { Film, Tv, Sparkles, Flame, ChevronRight } from "lucide-react";

export default async function HomePage() {
  const [featuredData, tvData, movieData, animeData, varietyData] = await Promise.all([
    fetchLiveVods({ type: "全部", page: 1 }),
    fetchLiveVods({ type: "电视剧", page: 1 }),
    fetchLiveVods({ type: "电影", page: 1 }),
    fetchLiveVods({ type: "动漫", page: 1 }),
    fetchLiveVods({ type: "综艺", page: 1 }),
  ]);

  const featured = featuredData.list.slice(0, 5);
  const tvSeries = tvData.list.slice(0, 10);
  const movies = movieData.list.slice(0, 10);
  const anime = animeData.list.slice(0, 10);
  const variety = varietyData.list.slice(0, 10);

  return (
    <div className="space-y-12">
      <HeroBanner featured={featured} />

      {/* Hot TV Series */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">热门热播剧集</h2>
              <p className="text-xs text-gray-400">非凡资源 · 量子专线 · 实时同步连载</p>
            </div>
          </div>
          <Link
            href="/category?type=电视剧"
            className="text-xs font-semibold text-gray-400 hover:text-gold-400 flex items-center gap-1 transition"
          >
            查看更多 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
          {tvSeries.map((item) => (
            <MovieCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* Movies */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">院线高清大片</h2>
              <p className="text-xs text-gray-400">1080P原画 · 极致影音体验</p>
            </div>
          </div>
          <Link
            href="/category?type=电影"
            className="text-xs font-semibold text-gray-400 hover:text-gold-400 flex items-center gap-1 transition"
          >
            查看更多 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
          {movies.map((item) => (
            <MovieCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* Anime */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">精选番剧动漫</h2>
              <p className="text-xs text-gray-400">人气新番全集连载</p>
            </div>
          </div>
          <Link
            href="/category?type=动漫"
            className="text-xs font-semibold text-gray-400 hover:text-gold-400 flex items-center gap-1 transition"
          >
            查看更多 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
          {anime.map((item) => (
            <MovieCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* Variety */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">热门综艺娱乐</h2>
              <p className="text-xs text-gray-400">最新期数实时同步</p>
            </div>
          </div>
          <Link
            href="/category?type=综艺"
            className="text-xs font-semibold text-gray-400 hover:text-gold-400 flex items-center gap-1 transition"
          >
            查看更多 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
          {variety.map((item) => (
            <MovieCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}