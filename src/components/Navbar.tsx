"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const isHome = pathname === "/";
  const isCategory = pathname === "/category";
  const isHall = pathname === "/hall";
  const isHistory = pathname === "/history";

  return (
    <>
      {/* Top Main Navbar with iOS PWA Safe Area support */}
      <nav className="sticky top-0 z-50 bg-dark-950/90 backdrop-blur-md border-b border-white/10 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition">
                  4K
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-black tracking-wider text-white flex items-center gap-1">
                    4KVM<span className="text-cyan-400 text-xs font-semibold px-1.5 py-0.5 bg-cyan-400/10 rounded">影视</span>
                  </span>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-1">
                <Link
                  href="/"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                    isHome ? "text-cyan-400 bg-white/5 font-bold" : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Home className="w-4 h-4 text-cyan-400" />
                  首页
                </Link>
                <Link
                  href="/category?type=电影"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5"
                >
                  <Film className="w-4 h-4 text-blue-400" />
                  电影
                </Link>
                <Link
                  href="/category?type=电视剧"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5"
                >
                  <Tv className="w-4 h-4 text-emerald-400" />
                  电视剧
                </Link>
                <Link
                  href="/category?type=动漫"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  动漫
                </Link>
                <Link
                  href="/category?type=综艺"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5"
                >
                  <Flame className="w-4 h-4 text-amber-400" />
                  综艺
                </Link>
                <Link
                  href="/category"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                    isCategory
                      ? "text-cyan-400 bg-cyan-500/10 font-bold border border-cyan-500/20"
                      : "text-gray-300 hover:text-cyan-400 hover:bg-white/5"
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  全部片库
                </Link>
                <Link
                  href="/hall"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                    isHall
                      ? "text-cyan-400 bg-cyan-500/15 font-bold border border-cyan-500/30 shadow-sm"
                      : "text-gray-300 hover:text-cyan-400 hover:bg-white/5"
                  }`}
                >
                  <Users className="w-4 h-4 text-cyan-400" />
                  🎪 放映广场 (一起看)
                </Link>
              </div>
            </div>

            {/* Search bar & Actions */}
            <div className="hidden md:flex items-center gap-4">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索片名、演员或导演..."
                  className="w-56 lg:w-72 bg-dark-850/90 text-sm text-white placeholder-gray-400 px-4 py-2 pl-9 rounded-full border border-white/10 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </form>

              <Link
                href="/history"
                className={`p-2 rounded-full transition ${
                  isHistory ? "text-cyan-400 bg-white/10" : "text-gray-300 hover:text-cyan-400 hover:bg-white/5"
                }`}
                title="观看历史"
              >
                <History className="w-5 h-5" />
              </Link>
            </div>

            {/* Mobile Header Actions */}
            <div className="flex md:hidden items-center gap-2">
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
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-dark-900/98 backdrop-blur-xl px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索片名、演员或导演..."
                className="w-full bg-dark-800 text-base sm:text-sm text-white placeholder-gray-400 px-4 py-2.5 pl-9 rounded-xl border border-white/10 focus:outline-none focus:border-cyan-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
            </form>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 bg-dark-800 active:bg-dark-700 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition"
              >
                <Home className="w-4 h-4 text-cyan-400" />
                首页
              </Link>
              <Link
                href="/hall"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 bg-cyan-500/15 border border-cyan-500/40 active:bg-cyan-500/25 rounded-xl text-sm font-bold text-cyan-400 flex items-center gap-2 transition"
              >
                <Users className="w-4 h-4 text-cyan-400" />
                🎪 放映广场 (一起看)
              </Link>
              <Link
                href="/category"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 bg-dark-800 active:bg-dark-700 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition"
              >
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                全部片库 (多维筛选)
              </Link>
              <Link
                href="/category?type=电影"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 bg-dark-800 active:bg-dark-700 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition"
              >
                <Film className="w-4 h-4 text-blue-400" />
                电影
              </Link>
              <Link
                href="/category?type=电视剧"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 bg-dark-800 active:bg-dark-700 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition"
              >
                <Tv className="w-4 h-4 text-emerald-400" />
                电视剧
              </Link>
              <Link
                href="/category?type=动漫"
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 bg-dark-800 active:bg-dark-700 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                动漫
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Sticky Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-950/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-2xl">
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition active:scale-95 ${
            isHome ? "text-cyan-400 font-bold bg-cyan-500/10" : "text-gray-400 hover:text-white"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">首页</span>
        </Link>
        <Link
          href="/category?type=电影"
          className="flex flex-col items-center gap-0.5 py-1 px-3 text-gray-400 hover:text-white rounded-xl transition active:scale-95"
        >
          <Film className="w-5 h-5" />
          <span className="text-[10px]">电影</span>
        </Link>
        <Link
          href="/category"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition active:scale-95 ${
            isCategory
              ? "text-cyan-400 font-bold bg-cyan-500/15 border border-cyan-500/30"
              : "text-gray-300 hover:text-cyan-400"
          }`}
        >
          <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
          <span className="text-[10px] text-cyan-400 font-bold">片库</span>
        </Link>
        <Link
          href="/hall"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition active:scale-95 ${
            isHall
              ? "text-cyan-400 font-bold bg-cyan-500/15 border border-cyan-500/40"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">放映广场</span>
        </Link>
        <Link
          href="/history"
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition active:scale-95 ${
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
