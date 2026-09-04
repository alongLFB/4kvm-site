"use client";

import React, { useState, useEffect } from "react";
import { Heart, ChevronUp, X, QrCode, Coffee, Sparkles, Check } from "lucide-react";

export function FloatingActions() {
  const [visible, setVisible] = useState(false);
  const [sponsorOpen, setSponsorOpen] = useState(false);
  const [payType, setPayType] = useState<"wechat" | "alipay">("wechat");
  const [imgError, setImgError] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleScroll = () => {
      // 页面向下滚动超过 280px 时显现
      setVisible(window.scrollY > 280);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // 按下 ESC 键快速关闭弹窗
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSponsorOpen(false);
      }
    };
    if (sponsorOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [sponsorOpen]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleImageError = (type: string) => {
    setImgError((prev) => ({ ...prev, [type]: true }));
  };

  return (
    <>
      {/* 1. 右下角悬浮操作按钮组 */}
      <div
        className={`fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 flex flex-col items-center gap-3 transition-all duration-300 ${
          visible
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-8 pointer-events-none"
        }`}
      >
        {/* 心形赞赏按钮 */}
        <div className="relative group">
          <button
            onClick={() => setSponsorOpen(true)}
            className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-dark-900/90 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/60 shadow-lg shadow-rose-950/40 backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
            aria-label="赞赏支持"
            title="赞赏支持"
          >
            <Heart className="w-5 h-5 fill-rose-500/20 text-rose-400 group-hover:fill-rose-500 transition-colors" />
          </button>
          {/* 桌面端悬浮气泡提示 */}
          <span className="hidden md:block absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-dark-900/95 border border-white/10 text-rose-300 text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none shadow-md">
            赞赏支持
          </span>
        </div>

        {/* 返回顶部按钮 */}
        <div className="relative group">
          <button
            onClick={scrollToTop}
            className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-dark-900/90 hover:bg-cyan-500/20 text-gray-300 hover:text-cyan-400 border border-white/10 hover:border-cyan-500/50 shadow-lg shadow-black/40 backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
            aria-label="返回顶部"
            title="返回顶部"
          >
            <ChevronUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
          {/* 桌面端悬浮气泡提示 */}
          <span className="hidden md:block absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-dark-900/95 border border-white/10 text-cyan-300 text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none shadow-md">
            返回顶部
          </span>
        </div>
      </div>

      {/* 2. 赞赏支持弹窗 */}
      {sponsorOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSponsorOpen(false)}
        >
          <div
            className="bg-dark-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm sm:max-w-md shadow-2xl relative space-y-5 animate-in zoom-in-95 duration-200 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => setSponsorOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 头部图标与文案 */}
            <div className="flex flex-col items-center gap-2 pt-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-pink-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/10">
                <Heart className="w-6 h-6 fill-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-1.5">
                赞赏支持 4KVM
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                全站免 VIP、无片头广告。如果觉得网站好用，欢迎请作者喝杯咖啡 ☕ 您的每一份心意都是维护高速服务器的持续动力！
              </p>
            </div>

            {/* 支付方式切换 Tab */}
            <div className="flex rounded-xl bg-dark-950 p-1 border border-white/10">
              <button
                onClick={() => setPayType("wechat")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  payType === "wechat"
                    ? "bg-[#07C160]/20 text-[#07C160] border border-[#07C160]/40 shadow-xs"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#07C160]" />
                微信支付
              </button>
              <button
                onClick={() => setPayType("alipay")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  payType === "alipay"
                    ? "bg-[#1677FF]/20 text-[#1677FF] border border-[#1677FF]/40 shadow-xs"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#1677FF]" />
                支付宝
              </button>
            </div>

            {/* 二维码展示展示区 */}
            <div className="flex flex-col items-center justify-center">
              <div
                className={`bg-white p-2.5 rounded-2xl shadow-xl w-56 h-56 sm:w-60 sm:h-60 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 border-2 ${
                  payType === "wechat"
                    ? "border-[#07C160]/30 shadow-[#07C160]/10"
                    : "border-[#1677FF]/30 shadow-[#1677FF]/10"
                }`}
              >
                {!imgError[payType] ? (
                  <img
                    src={payType === "wechat" ? "/wechat-reward.jpg" : "/alipay-reward.jpg"}
                    alt={payType === "wechat" ? "微信赞赏码" : "支付宝赞赏码"}
                    className="w-full h-full object-contain rounded-xl"
                    onError={() => handleImageError(payType)}
                  />
                ) : (
                  /* 当图片尚未放入 public 目录时的优雅占位引导 */
                  <div className="flex flex-col items-center justify-center text-center p-3 h-full">
                    <QrCode
                      className={`w-14 h-14 mb-2 ${
                        payType === "wechat" ? "text-[#07C160]" : "text-[#1677FF]"
                      }`}
                    />
                    <span className="text-dark-900 font-bold text-xs">
                      {payType === "wechat" ? "微信收款码" : "支付宝收款码"}
                    </span>
                    <span className="text-gray-500 text-[10px] mt-1 leading-tight">
                      请将图片保存为
                      <br />
                      <code className="text-gray-800 font-mono font-bold">
                        {payType === "wechat" ? "wechat-reward.jpg" : "alipay-reward.jpg"}
                      </code>
                      <br />
                      放置于 <code className="text-gray-800 font-mono">public/</code> 即可自动显示
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-400">
                <Coffee className="w-3.5 h-3.5 text-amber-400" />
                <span>金额随意 · 感谢您的信任与支持</span>
              </div>
            </div>

            {/* 底部关闭按钮 */}
            <div className="pt-1">
              <button
                onClick={() => setSponsorOpen(false)}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold transition"
              >
                好的，稍后再说
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
