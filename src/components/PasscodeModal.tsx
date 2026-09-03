"use client";

import React, { useState } from "react";
import { Lock, KeyRound, X, Sparkles, AlertCircle } from "lucide-react";
import { GATED_CONFIG } from "@/config/gated-sections";

interface PasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (pin: string) => void;
  onUnlock?: (pin: string) => void;
  targetCategoryName?: string;
}

export function PasscodeModal({
  isOpen,
  onClose,
  onSuccess,
  onUnlock,
  targetCategoryName,
}: PasscodeModalProps) {
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    if (!cleanPin) {
      setErrorMsg("请输入访问口令");
      return;
    }

    setLoading(true);
    // 客户端初步判断，与服务端校验标准一致
    if (cleanPin === GATED_CONFIG.passcode) {
      localStorage.setItem(GATED_CONFIG.storageKey, cleanPin);
      setErrorMsg("");
      setLoading(false);
      onSuccess?.(cleanPin);
      onUnlock?.(cleanPin);
      onClose();
    } else {
      setLoading(false);
      setErrorMsg("访问口令错误，请重新输入");
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-dark-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-5 shadow-2xl relative">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 头部图标与标题 */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 shadow-lg shadow-cyan-500/10">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            {targetCategoryName ? `${targetCategoryName} · ${GATED_CONFIG.title}` : GATED_CONFIG.title}
          </h3>
          <p className="text-xs text-gray-400 px-2 leading-relaxed">
            {GATED_CONFIG.description}
          </p>
        </div>

        {/* 输入表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="relative">
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                placeholder="请输入专区解锁口令..."
                className={`w-full bg-dark-800 text-center tracking-widest text-base text-white placeholder-gray-500 px-4 py-3 rounded-xl border transition ${
                  errorMsg
                    ? "border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    : "border-white/10 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                } focus:outline-none`}
                autoFocus
              />
              <KeyRound className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-rose-400 text-xs justify-center pt-1 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-dark-950 font-bold text-sm rounded-xl transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {loading ? "正在验证..." : "立即验证解锁"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs text-gray-400 hover:text-gray-200 transition"
            >
              返回公开片库
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
