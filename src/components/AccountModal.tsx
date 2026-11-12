"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  X,
  User,
  Mail,
  Lock,
  KeyRound,
  Cloud,
  RefreshCw,
  LogOut,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuthSync } from "@/contexts/AuthSyncContext";

type AuthTab = "login" | "register" | "reset";

export function AccountModal() {
  const {
    user,
    syncing,
    lastSyncedAt,
    favorites,
    isAccountModalOpen,
    closeAccountModal,
    loginWithEmail,
    sendRegisterCode,
    registerWithEmail,
    requestPasswordReset,
    loginWithGoogle,
    updateProfileName,
    logout,
    deleteAccount,
    syncNow,
  } = useAuthSync();

  const [tab, setTab] = useState<AuthTab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sendCooldown, setSendCooldown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  const [password, setPassword] = useState("");
  const [editName, setEditName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  React.useEffect(() => {
    if (sendCooldown <= 0) return;
    const timer = setInterval(() => {
      setSendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [sendCooldown]);

  if (!isAccountModalOpen) return null;

  const handleSendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg("请先输入有效的电子邮箱地址");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    setSendingCode(true);
    try {
      await sendRegisterCode(trimmed);
      setSuccessMsg("验证码已发送至您的邮箱，10 分钟内有效");
      setSendCooldown(60);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "发送验证码失败");
    } finally {
      setSendingCode(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      if (tab === "login") {
        await loginWithEmail(email, password);
        setSuccessMsg("登录成功，已自动合并并同步您的云端观看记录与收藏！");
      } else if (tab === "register") {
        if (!code.trim() || code.trim().length !== 6) {
          setErrorMsg("请输入 6 位邮箱验证码");
          setSubmitting(false);
          return;
        }
        await registerWithEmail(name, email, password, code.trim());
        setSuccessMsg("账号创建成功，本地游客历史与收藏已自动同步至云端！");
        setCode("");
      } else {
        await requestPasswordReset(email);
        setSuccessMsg("密码重置说明已发送至您的邮箱，请查收。");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "操作失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveNickname = async () => {
    if (!editName.trim()) return;
    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);
    try {
      await updateProfileName(editName.trim());
      setEditName("");
      setSuccessMsg("昵称已更新，放映厅将同步展示新昵称");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-[#11131a] border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {user ? "个人中心与多端云同步" : "登录 / 注册通行证"}
              </h2>
              <p className="text-[11px] text-gray-400">
                4KVM Web 与 alonglfb-tv 全平台共用账号
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAccountModal}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {user ? (
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-base font-bold text-cyan-300">
                    {(user.name || user.email || "U").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">
                      {user.name}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {user.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder={`修改昵称（当前：${user.name}）`}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                  />
                  <button
                    type="button"
                    disabled={submitting || !editName.trim()}
                    onClick={handleSaveNickname}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/30 disabled:opacity-40 transition"
                  >
                    保存
                  </button>
                </div>
              </div>

              {/* Cloud Sync Status */}
              <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5" />
                    多端增量云同步已开启
                  </span>
                  <button
                    type="button"
                    disabled={syncing}
                    onClick={() => void syncNow()}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`}
                    />
                    <span>{syncing ? "同步中..." : "立即同步"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">
                  云端已同步收藏 {favorites.length} 部影片 ·{" "}
                  {lastSyncedAt
                    ? `上次同步 ${new Date(lastSyncedAt).toLocaleTimeString()}`
                    : "实时就绪"}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      confirm(
                        "确定要永久注销该账号并清除云端同步的所有历史与收藏数据吗？",
                      )
                    ) {
                      await deleteAccount();
                      closeAccountModal();
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>注销账号</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    closeAccountModal();
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>退出登录</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Auth Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/40 border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setTab("login");
                    setErrorMsg("");
                    setSuccessMsg("");
                    setCode("");
                  }}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                    tab === "login"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  密码登录
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("register");
                    setErrorMsg("");
                    setSuccessMsg("");
                    setCode("");
                  }}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                    tab === "register"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  注册账号
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab("reset");
                    setErrorMsg("");
                    setSuccessMsg("");
                    setCode("");
                  }}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                    tab === "reset"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  找回密码
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-3">
                {tab === "register" && (
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="您的昵称（在放映厅中展示）"
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="电子邮箱地址"
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {tab === "register" && (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <KeyRound className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={code}
                        onChange={(e) =>
                          setCode(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="6 位邮箱验证码"
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 tracking-wider"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={sendCooldown > 0 || sendingCode}
                      onClick={handleSendCode}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition"
                    >
                      {sendingCode
                        ? "发送中..."
                        : sendCooldown > 0
                          ? `${sendCooldown}s 后重试`
                          : "获取验证码"}
                    </button>
                  </div>
                )}

                {tab !== "reset" && (
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="密码（至少 6 位字符）"
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
                >
                  {submitting
                    ? "处理中..."
                    : tab === "login"
                      ? "立即登录并同步记录"
                      : tab === "register"
                        ? "创建账号并合并本地历史"
                        : "发送重置密码链接"}
                </button>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-white/10" />
                <span className="flex-shrink mx-3 text-[11px] text-gray-500">
                  或使用快捷方式
                </span>
                <div className="flex-grow border-t border-white/10" />
              </div>

              <button
                type="button"
                onClick={async () => {
                  setErrorMsg("");
                  try {
                    await loginWithGoogle();
                  } catch (err) {
                    setErrorMsg(
                      err instanceof Error ? err.message : "Google 登录暂不可用",
                    );
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <span className="font-bold text-cyan-400">G</span>
                <span>使用 Google 账号快速登录</span>
              </button>
            </>
          )}

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500">
            <span>登录后自动在手机、桌面与网页端同步进度</span>
            <Link
              href="/privacy"
              onClick={closeAccountModal}
              className="text-cyan-400 hover:underline"
            >
              隐私政策
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
