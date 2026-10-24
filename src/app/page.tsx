import React from "react";
import Link from "next/link";
import { HeroBanner } from "@/components/HeroBanner";
import { MovieCard } from "@/components/MovieCard";
import { fetchLiveVods } from "@/lib/vod-service";
import { Film, Tv, Sparkles, Flame, Zap, ChevronRight, Layers } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SectionHeaderProps {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  moreHref: string;
}

function SectionHeader({ icon, iconBg, iconColor, title, subtitle, moreHref }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 pb-2 border-b border-white/[0.06]">
      <div className="flex items-center gap-3 sm:gap-3.5">
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl ${iconBg} ${iconColor} border border-white/10 flex items-center justify-center shadow-lg shadow-black/40 shrink-0`}>
          {icon}
        </div>
        <div>
          <h2 className="font-display text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            {title}
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-400 font-medium tracking-wide mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      <Link
        href={moreHref}
        className="group/more flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-cyan-500/30 text-xs font-semibold text-gray-300 hover:text-cyan-300 transition-all duration-200 shrink-0 active:scale-95"
      >
        <span>查看更多</span>
        <ChevronRight className="w-3.5 h-3.5 group-hover/more:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}

export default async function HomePage() {
  const [featuredData, tvData, movieData, shortData, animeData, varietyData] = await Promise.all([
    fetchLiveVods({ type: "全部", page: 1 }),
    fetchLiveVods({ type: "电视剧", page: 1 }),
    fetchLiveVods({ type: "电影", page: 1 }),
    fetchLiveVods({ type: "短剧", page: 1 }),
    fetchLiveVods({ type: "动漫", page: 1 }),
    fetchLiveVods({ type: "综艺", page: 1 }),
  ]);

  const featured = featuredData.list.slice(0, 6);
  const tvSeries = tvData.list.slice(0, 12);
  const movies = movieData.list.slice(0, 12);
  const shortDramas = shortData.list.slice(0, 12);
  const anime = animeData.list.slice(0, 12);
  const variety = varietyData.list.slice(0, 12);

  return (
    <div className="space-y-12 sm:space-y-20">
      {/* Cinematic Hero Showcase */}
      <HeroBanner featured={featured} />

      {/* 1. Hot TV Series */}
      <section className="space-y-5 sm:space-y-7">
        <SectionHeader
          icon={<Tv className="w-5 h-5" />}
          iconBg="bg-emerald-500/15"
          iconColor="text-emerald-400"
          title="热门热播剧集"
          subtitle="iKun 国际专线 · 1080P原画秒播 · 实时同步连载"
          moreHref="/category?type=电视剧"
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-6 lg:gap-7">
          {tvSeries.map((item) => (
            <MovieCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* 2. Blockbuster Movies */}
      <section className="space-y-5 sm:space-y-7">
        <SectionHeader
          icon={<Film className="w-5 h-5" />}
          iconBg="bg-cyan-500/15"
          iconColor="text-cyan-400"
          title="院线高清大片"
          subtitle="4K/1080P 极致画质 · 纯净无广告沉浸观影"
          moreHref="/category?type=电影"
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-6 lg:gap-7">
          {movies.map((item) => (
            <MovieCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* 3. Trending Short Dramas */}
      {shortDramas.length > 0 && (
        <section className="space-y-5 sm:space-y-7">
          <SectionHeader
            icon={<Zap className="w-5 h-5" />}
            iconBg="bg-rose-500/15"
            iconColor="text-rose-400"
            title="爆火爽文短剧"
            subtitle="高能反转短平快 · 精彩微剧集全集连播"
            moreHref="/category?type=短剧"
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-6 lg:gap-7">
            {shortDramas.map((item) => (
              <MovieCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* 4. Anime Series */}
      <section className="space-y-5 sm:space-y-7">
        <SectionHeader
          icon={<Sparkles className="w-5 h-5" />}
          iconBg="bg-indigo-500/15"
          iconColor="text-indigo-400"
          title="精选番剧动漫"
          subtitle="人气新番连载 · 经典神作全集中文配音/原声"
          moreHref="/category?type=动漫"
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-6 lg:gap-7">
          {anime.map((item) => (
            <MovieCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* 5. Variety Shows */}
      <section className="space-y-5 sm:space-y-7">
        <SectionHeader
          icon={<Flame className="w-5 h-5" />}
          iconBg="bg-amber-500/15"
          iconColor="text-amber-400"
          title="热门综艺娱乐"
          subtitle="欢声笑语最新期数 · 实时追踪潮流话题"
          moreHref="/category?type=综艺"
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-6 lg:gap-7">
          {variety.map((item) => (
            <MovieCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}