"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Film,
  Tv,
  Users,
  Flame,
  History,
  Menu,
  X,
  Sparkles,
  Home,
  SlidersHorizontal,
  Trophy,
  Lock,
} from "lucide-react";
import { GATED_CONFIG, isTypeGated } from "@/config/gated-sections";
import { DesktopSearch, MobileSearchModal } from "@/components/Search/GlobalSearch";
import { OnlineBadge } from "@/components/OnlineBadge";

function NavbarContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const isHome = pathname === "/";
  const isHall = pathname === "/hall" || pathname.startsWith("/room");
  const isHistory = pathname === "/history";

  // Precision Category matching based on query parameter
  const isCategoryPath = pathname === "/category";
  const isCategory = isCategoryPath;
  const currentCategoryType = isCategoryPath ? (searchParams.get("type") || "全部") : null;

  const isMovie = isCategoryPath && currentCategoryType === "电影";
  const isTv = isCategoryPath && currentCategoryType === "电视剧";
  const isAnime = isCategoryPath && currentCategoryType === "动漫";
  const isVariety = isCategoryPath && currentCategoryType === "综艺";
  const isSports = isCategoryPath && currentCategoryType === "体育";
  const isAllCategory = isCategoryPath && (currentCategoryType === "全部" || !searchParams.get("type"));

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, searchParams]);

  return (
    <>
      {/* Top Main Navbar with iOS PWA Safe Area support */}
      <nav className="sticky top-0 z-50 bg-dark-950/90 backdrop-blur-md border-b border-white/10 pt-[env(safe-area-inset-top,0px)]">
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* 1. Left: Brand Logo */}
            <div className="flex items-center shrink-0">
              <Link
                href="/"
                onClick={handleLogoClick}
                className="flex items-center gap-2 group cursor-pointer active:scale-95 transition select-none shrink-0"
                title="返回4KVM影视首页"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-cyan-500/20 group-hover:scale-105 group-hover:shadow-cyan-500/40 transition">
                  4K
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-black tracking-wider text-white flex items-center gap-1">
                    4KVM<span className="text-cyan-400 text-xs font-semibold px-1.5 py-0.5 bg-cyan-400/10 rounded">影视</span>
                  </span>
                </div>
              </Link>
            </div>

            {/* 2. Center: Centered Desktop Navigation Dock */}
            <div className="hidden md:flex items-center justify-center flex-1 px-4 min-w-0">
              <div className="flex items-center space-x-1 lg:space-x-1.5 px-3 py-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xs shadow-inner shrink-0">
                <Link
                  href="/"
                  className={`px-3 py-1.5 rounded-xl text-xs lg:text-sm font-medium transition whitespace-nowrap shrink-0 ${
                    isHome ? "text-cyan-400 bg-white/10 font-bold shadow-xs" : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  首页
                </Link>
                <Link
                  href="/category?type=电影"
                  className={`px-3 py-1.5 rounded-xl text-xs lg:text-sm font-medium transition whitespace-nowrap shrink-0 ${
                    isMovie ? "text-cyan-400 bg-white/10 font-bold shadow-xs" : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  电影
                </Link>
                <Link
                  href="/category?type=电视剧"
                  className={`px-3 py-1.5 rounded-xl text-xs lg:text-sm font-medium transition whitespace-nowrap shrink-0 ${
                    isTv ? "text-cyan-400 bg-white/10 font-bold shadow-xs" : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  电视剧
                </Link>
                <Link
                  href="/category?type=动漫"
                  className={`hidden lg:flex px-3 py-1.5 rounded-xl text-xs lg:text-sm font-medium transition whitespace-nowrap shrink-0 ${
                    isAnime ? "text-cyan-400 bg-white/10 font-bold shadow-xs" : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  动漫
                </Link>
                <Link
                  href="/category?type=综艺"
                  className={`hidden xl:flex px-3 py-1.5 rounded-xl text-xs lg:text-sm font-medium transition whitespace-nowrap shrink-0 ${
                    isVariety ? "text-cyan-400 bg-white/10 font-bold shadow-xs" : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  综艺
                </Link>
                <Link
                  href="/category?type=体育"
                  className={`hidden 2xl:flex px-3 py-1.5 rounded-xl text-xs lg:text-sm font-medium transition items-center gap-1 whitespace-nowrap shrink-0 ${
                    isSports ? "text-cyan-400 bg-white/10 font-bold shadow-xs" : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  体育
                  {isTypeGated("体育") && (
                    <Lock className="w-3 h-3 text-amber-400" />
                  )}
                </Link>
                <Link
                  href="/category"
                  className={`px-3 py-1.5 rounded-xl text-xs lg:text-sm font-medium transition whitespace-nowrap shrink-0 ${
                    isAllCategory
                      ? "text-cyan-400 bg-white/10 font-bold shadow-xs"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  全部片库
                </Link>
                <Link
                  href="/hall"
                  className={`px-3 py-1.5 rounded-xl text-xs lg:text-sm font-medium transition whitespace-nowrap shrink-0 ${
                    isHall
                      ? "text-cyan-400 bg-cyan-500/15 font-bold border border-cyan-500/30 shadow-sm"
                      : "text-gray-300 hover:text-cyan-400 hover:bg-white/5"
                  }`}
                >
                  🎪 放映广场
                </Link>
              </div>
            </div>

            {/* 3. Right: Search & Actions */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3 shrink-0">
              <DesktopSearch />

              <Link
                href="/history"
                className={`p-2 rounded-full transition shrink-0 ${
                  isHistory ? "text-cyan-400 bg-white/10" : "text-gray-300 hover:text-cyan-400 hover:bg-white/5"
                }`}
                title="观看历史"
              >
                <History className="w-4 h-4 lg:w-5 lg:h-5" />
              </Link>

              <OnlineBadge />
            </div>

            {/* Mobile Header Actions */}
            <div className="flex md:hidden items-center gap-1.5">
              <button
                onClick={() => setMobileSearchOpen(true)}
                className="p-2 text-gray-300 hover:text-white rounded-xl bg-white/5 active:bg-white/10 transition flex items-center justify-center"
                aria-label="搜索影视"
                title="搜索影视"
              >
                <Search className="w-4 h-4 text-cyan-400" />
              </button>
              <Link
                href="/hall"
                className="px-2.5 py-1 text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center gap-1"
              >
                <Users className="w-3.5 h-3.5" />
                一起看
              </Link>
              <Link href="/history" className="p-2 text-gray-300">
                <History className="w-5 h-5" />
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-300 hover:text-white focus:outline-none"
                aria-label="切换菜单"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu with Click-Outside Backdrop */}
        {mobileMenuOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 top-[calc(env(safe-area-inset-top,0px)+4rem)] z-40 bg-black/50 backdrop-blur-xs animate-in fade-in"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-50 md:hidden border-t border-white/10 bg-dark-900/98 backdrop-blur-xl px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2 shadow-2xl">
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-xs font-semibold text-gray-400">实时观影概况</span>
                <OnlineBadge />
              </div>

              <div
                onClick={() => {
                  setMobileMenuOpen(false);
                  setMobileSearchOpen(true);
                }}
                className="relative flex items-center cursor-pointer"
              >
                <div className="w-full bg-dark-800 text-sm text-gray-400 px-4 py-2.5 pl-9 rounded-xl border border-white/10 flex items-center">
                  搜索片名、拼音、演员...
                </div>
                <Search className="w-4 h-4 text-cyan-400 absolute left-3" />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 transition ${
                    isHome
                      ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-bold"
                      : "bg-dark-800 active:bg-dark-700 text-white"
                  }`}
                >
                  <Home className="w-4 h-4 text-cyan-400" />
                  首页
                </Link>
                <Link
                  href="/hall"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-3 rounded-xl text-sm font-bold flex items-center gap-2 transition ${
                    isHall
                      ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400"
                      : "bg-dark-800 active:bg-dark-700 text-white"
                  }`}
                >
                  <Users className="w-4 h-4 text-cyan-400" />
                  🎪 放映广场
                </Link>
                <Link
                  href="/category"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 transition ${
                    isAllCategory
                      ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-bold"
                      : "bg-dark-800 active:bg-dark-700 text-white"
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  全部片库
                </Link>
                <Link
                  href="/category?type=电影"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 transition ${
                    isMovie
                      ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-bold"
                      : "bg-dark-800 active:bg-dark-700 text-white"
                  }`}
                >
                  <Film className="w-4 h-4 text-blue-400" />
                  电影
                </Link>
                <Link
                  href="/category?type=电视剧"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 transition ${
                    isTv
                      ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-bold"
                      : "bg-dark-800 active:bg-dark-700 text-white"
                  }`}
                >
                  <Tv className="w-4 h-4 text-emerald-400" />
                  电视剧
                </Link>
                <Link
                  href="/category?type=动漫"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 transition ${
                    isAnime
                      ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-bold"
                      : "bg-dark-800 active:bg-dark-700 text-white"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  动漫
                </Link>
                <Link
                  href="/category?type=综艺"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 transition ${
                    isVariety
                      ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-bold"
                      : "bg-dark-800 active:bg-dark-700 text-white"
                  }`}
                >
                  <Flame className="w-4 h-4 text-amber-400" />
                  综艺
                </Link>
                <Link
                  href="/category?type=体育"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-3 rounded-xl text-sm font-medium flex items-center justify-between transition ${
                    isSports
                      ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-bold"
                      : "bg-dark-800 active:bg-dark-700 text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-rose-400" />
                    体育
                  </div>
                  {isTypeGated("体育") && (
                    <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      <Lock className="w-2.5 h-2.5" /> 口令
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </>
        )}
      </nav>

      {/* Mobile Fullscreen Search Overlay */}
      <MobileSearchModal
        isOpen={mobileSearchOpen}
        onClose={() => setMobileSearchOpen(false)}
      />

      {/* Mobile Sticky Bottom Tab Bar (Streamlined to 4 core tabs) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-950/95 backdrop-blur-xl border-t border-white/10 px-3 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-2xl">
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition active:scale-95 ${
            isHome ? "text-cyan-400 font-bold bg-cyan-500/10" : "text-gray-400 hover:text-white"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">首页</span>
        </Link>
        <Link
          href="/category"
          className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition active:scale-95 ${
            isCategory ? "text-cyan-400 font-bold bg-cyan-500/10" : "text-gray-400 hover:text-white"
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span className="text-[10px]">片库</span>
        </Link>
        <Link
          href="/hall"
          className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition active:scale-95 ${
            isHall ? "text-cyan-400 font-bold bg-cyan-500/10" : "text-gray-400 hover:text-white"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">放映广场</span>
        </Link>
        <Link
          href="/history"
          className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition active:scale-95 ${
            isHistory ? "text-cyan-400 font-bold bg-cyan-500/10" : "text-gray-400 hover:text-white"
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px]">历史</span>
        </Link>
      </div>
    </>
  );
}

export function Navbar() {
  return (
    <Suspense fallback={<nav className="sticky top-0 z-50 bg-dark-950/90 backdrop-blur-md border-b border-white/10 h-16 pt-[env(safe-area-inset-top,0px)]" />}>
      <NavbarContent />
    </Suspense>
  );
}
