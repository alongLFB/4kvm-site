"use client";

import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // 1. Register service worker
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

    // 2. Capture beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA User response: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  if (!showInstallBanner) return null;

  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm bg-dark-900/95 backdrop-blur-md border border-cyan-500/30 p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-cyan-500 text-dark-950 font-black flex items-center justify-center shrink-0">
          4K
        </div>
        <div>
          <p className="font-bold text-white">安装 4KVM 原生应用</p>
          <p className="text-gray-400 text-[11px]">添加到主屏幕 · 秒开点播体验</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 rounded-lg bg-cyan-500 text-dark-950 font-bold hover:bg-cyan-400 transition shrink-0"
        >
          立即安装
        </button>
        <button
          onClick={() => setShowInstallBanner(false)}
          className="p-1 text-gray-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}