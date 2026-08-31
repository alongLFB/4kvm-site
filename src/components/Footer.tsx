import React from "react";
import Link from "next/link";
import { ShieldCheck, Video, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-dark-950 mt-20 text-gray-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold-500 flex items-center justify-center text-dark-950 font-bold">
              4K
            </div>
            <div>
              <p className="font-bold text-white tracking-wide">4KVM 在线影视</p>
              <p className="text-xs text-gray-500">4kvm.alonglfb.com · 高清流媒体点播系统</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-400">
            <Link href="/" className="hover:text-gold-400 transition">首页</Link>
            <Link href="/category?type=电影" className="hover:text-gold-400 transition">电影库</Link>
            <Link href="/category?type=电视剧" className="hover:text-gold-400 transition">电视剧</Link>
            <Link href="/category?type=动漫" className="hover:text-gold-400 transition">动漫专区</Link>
            <Link href="/history" className="hover:text-gold-400 transition">观看历史</Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-gray-500 space-y-2">
          <p>免责声明：本站所有资源均来自互联网公开测试与切片流媒体协议，本站仅作流媒体协议解析与技术研究展示，不存储任何音视频文件。</p>
          <p>© 2026 4kvm.alonglfb.com · Powered by Next.js & ArtPlayer</p>
        </div>
      </div>
    </footer>
  );
}
