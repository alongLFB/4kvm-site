"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

const PWA_DISMISSED_KEY = "pwa_prompt_dismissed_until";
const PWA_INSTALLED_KEY = "pwa_installed";
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 1 天免打扰

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const checkIsEligible = () => {
    if (typeof window === "undefined") return false;

    try {
      // 1. 检查是否已经在独立 PWA 窗口运行
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      if (isStandalone) return false;

      // 2. 检查是否已确认安装过
      if (localStorage.getItem(PWA_INSTALLED_KEY) === "true") return false;

      // 3. 检查 1 天免打扰冷却期
      const dismissedUntil = localStorage.getItem(PWA_DISMISSED_KEY);
      if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
        return false;
      }

      return true;
    } catch {
      return true;
    }
  };

  useEffect(() => {
    // 1. 注册 Service Worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("PWA ServiceWorker registered with scope:", reg.scope);
          })
          .catch((err) => {
            console.error("PWA ServiceWorker registration failed:", err);
          });
      });
    }

    let delayTimer: NodeJS.Timeout | null = null;

    // 2. 捕获 beforeinstallprompt 原生安装事件
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      if (!checkIsEligible()) return;

      setDeferredPrompt(e);

      // 温和延迟 2.5 秒展示，避免刚进站突兀弹窗打扰用户
      delayTimer = setTimeout(() => {
        if (checkIsEligible()) {
          setShowInstallBanner(true);
        }
      }, 2500);
    };

    // 3. 监听应用安装完成事件
    const handleAppInstalled = () => {
      try {
        localStorage.setItem(PWA_INSTALLED_KEY, "true");
      } catch {}
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setShowInstallBanner(false);
    try {
      // 记录 1 天免打扰时间戳
      localStorage.setItem(
        PWA_DISMISSED_KEY,
        (Date.now() + DISMISS_COOLDOWN_MS).toString()
      );
    } catch (err) {
      console.error("Failed to save dismiss state:", err);
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      try {
        localStorage.setItem(PWA_INSTALLED_KEY, "true");
      } catch {}
    } else {
      // 若用户在系统弹窗中取消，同样进入 1 天冷却期，避免重复骚扰
      try {
        localStorage.setItem(
          PWA_DISMISSED_KEY,
          (Date.now() + DISMISS_COOLDOWN_MS).toString()
        );
      } catch {}
    }

    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  if (!showInstallBanner) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md bg-dark-900/95 backdrop-blur-xl border border-cyan-500/30 p-3.5 rounded-2xl shadow-2xl shadow-cyan-950/50 flex items-center justify-between gap-3 text-xs animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-black flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/30">
          4K
        </div>
        <div className="truncate">
          <p className="font-bold text-white tracking-wide">安装 4KVM 原生应用</p>
          <p className="text-gray-400 text-[11px] truncate">添加到桌面/主屏幕 · 秒开畅享高清观影</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 rounded-xl bg-cyan-500 text-dark-950 font-bold hover:bg-cyan-400 active:scale-95 transition shadow-sm shrink-0"
        >
          立即安装
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 active:scale-90 transition"
          title="关闭（1天内不再提示）"
          aria-label="关闭提示"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}