"use client";

import React, { useState, useEffect } from "react";
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
  History,
  Play,
  ChevronRight,
  Star,
  SlidersHorizontal,
  Settings,
  ShieldAlert,
  Search,
  Check,
  ToggleLeft,
  ToggleRight,
  Tv,
} from "lucide-react";
import { useAuthSync } from "@/contexts/AuthSyncContext";
import { GATED_CONFIG } from "@/config/gated-sections";

type AuthTab = "login" | "register" | "reset";
type UserCenterTab = "settings" | "history" | "favorites";

function formatSeconds(s: number) {
  const total = Math.max(0, Math.floor(s || 0));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function AccountModal() {
  const {
    user,
    syncing,
    lastSyncedAt,
    favorites,
    history,
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
    toggleFavorite,
    deleteHistoryItem,
    clearAllHistory,
    clearAllFavorites,
    syncSearchHistory,
    setSyncSearchHistory,
    autoPlayNext,
    setAutoPlayNext,
    autoResume,
    setAutoResume,
  } = useAuthSync();

  const [tab, setTab] = useState<AuthTab>("login");
  const [centerTab, setCenterTab] = useState<UserCenterTab>("settings");
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

  // 2-step account deletion state
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirming">("idle");
  const [deleteInputText, setDeleteInputText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Special section PIN record status
  const [pinSaved, setPinSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPinSaved(!!localStorage.getItem(GATED_CONFIG.storageKey));
    }
  }, [isAccountModalOpen]);

  useEffect(() => {
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
      setSuccessMsg("昵称已更新，放映厅与多端将同步展示新昵称");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearSavedPin = () => {
    if (confirm("确定要清除当前浏览器记住的特约专区访问口令吗？清除后需重新输入口令。")) {
      localStorage.removeItem(GATED_CONFIG.storageKey);
      setPinSaved(false);
      setSuccessMsg("已成功清除特约专区口令");
      window.dispatchEvent(
        new CustomEvent("4kvm-sync-updated", { detail: { syncRemote: true } }),
      );
    }
  };

  const handleDeleteAccountConfirm = async () => {
    if (deleteInputText.trim() !== "注销") {
      setErrorMsg("请输入【注销】二字以确认删除账号");
      return;
    }
    setDeleteLoading(true);
    setErrorMsg("");
    try {
      await deleteAccount();
      closeAccountModal();
      setDeleteStep("idle");
      setDeleteInputText("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "注销账号失败，请稍后重试");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] rounded-3xl bg-[#0f121d] border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {user ? "用户中心与偏好设置" : "登录 / 注册通行证"}
              </h2>
              <p className="text-[11px] text-gray-400">
                4KVM Web 与 alonglfb-tv 全平台共用账号与多端云同步
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAccountModal}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Logged In: 3 Tabs (Settings, History, Favorites) */}
        {user && (
          <div className="flex items-center gap-1 p-1 bg-black/40 border-b border-white/10 px-4 shrink-0">
            <button
              type="button"
              onClick={() => {
                setCenterTab("settings");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                centerTab === "settings"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>账号与偏好</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCenterTab("history");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                centerTab === "history"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>云端历史 ({history.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCenterTab("favorites");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                centerTab === "favorites"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>云端收藏 ({favorites.length})</span>
            </button>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
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
            centerTab === "settings" ? (
              <div className="space-y-4">
                {/* 1. Profile Info Card */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-base font-black text-dark-950 shadow-md">
                      {(user.name || user.email || "U").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                        <span>{user.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          已登录通行证
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 truncate mt-0.5">
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
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                    />
                    <button
                      type="button"
                      disabled={submitting || !editName.trim()}
                      onClick={handleSaveNickname}
                      className="px-3.5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/30 disabled:opacity-40 transition cursor-pointer"
                    >
                      保存昵称
                    </button>
                  </div>
                </div>

                {/* 2. Cloud Sync Status Card */}
                <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5" />
                      多端增量云同步已开启
                    </span>
                    <button
                      type="button"
                      disabled={syncing}
                      onClick={() => void syncNow()}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer border border-cyan-500/30"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
                      />
                      <span>{syncing ? "同步中..." : "立即增量同步"}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    云端已同步：观看历史 <strong className="text-cyan-300 font-semibold">{history.length}</strong> 条 · 收藏 <strong className="text-amber-300 font-semibold">{favorites.length}</strong> 部影片 ·{" "}
                    {lastSyncedAt
                      ? `上次同步 ${new Date(lastSyncedAt).toLocaleTimeString()}`
                      : "实时就绪"}
                  </p>
                </div>

                {/* 3. Preferences & Default Settings */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>播放体验与云同步偏好</span>
                  </div>

                  {/* Setting: Search History Cloud Sync */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-cyan-400" />
                        <span>多端云同步搜索历史</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        开启后，搜索记录将自动同步并在手机、电脑与客户端间共享；关闭则仅保留本地记录
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSyncSearchHistory(!syncSearchHistory)}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        syncSearchHistory ? "bg-cyan-500" : "bg-white/15"
                      }`}
                      aria-label="切换搜索历史云端同步"
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                          syncSearchHistory ? "left-6.5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Setting: Auto Resume Playback */}
                  <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-white/5">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 text-cyan-400" />
                        <span>自动定位续播进度</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        进入播放页面时，自动定位至上次观看的集数与进度
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoResume(!autoResume)}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        autoResume ? "bg-cyan-500" : "bg-white/15"
                      }`}
                      aria-label="切换自动续播"
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                          autoResume ? "left-6.5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Setting: Auto Play Next */}
                  <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-white/5">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                        <Tv className="w-3.5 h-3.5 text-cyan-400" />
                        <span>剧集自动连播</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        当前集数播放结束后，自动切换并起播下一集
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoPlayNext(!autoPlayNext)}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        autoPlayNext ? "bg-cyan-500" : "bg-white/15"
                      }`}
                      aria-label="切换剧集连播"
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                          autoPlayNext ? "left-6.5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Setting: Gated Section PIN */}
                  <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-white/5">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>特约专区访问口令状态</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {pinSaved
                          ? "当前浏览器已记住解锁口令，受限内容处于解锁状态"
                          : "当前未记录访问口令，进入受限板块时需输入访问口令"}
                      </p>
                    </div>
                    {pinSaved && (
                      <button
                        type="button"
                        onClick={handleClearSavedPin}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold shrink-0 transition cursor-pointer"
                      >
                        清除口令
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. Danger Zone & 2-Step Deletion */}
                {deleteStep === "confirming" ? (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/40 space-y-3 animate-in fade-in">
                    <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>高危操作：注销账号确认（二次安全校验）</span>
                    </div>
                    <p className="text-xs text-red-300/90 leading-relaxed">
                      注销账号为<strong>不可逆操作</strong>！一旦注销，您的通行证、云端所有播放历史、收藏记录以及个性化设置将被<strong>永久销毁</strong>且无法恢复。
                    </p>
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] text-gray-300">
                        请输入【<strong className="text-red-400 font-black">注销</strong>】以确认自愿注销该账号：
                      </label>
                      <input
                        type="text"
                        value={deleteInputText}
                        onChange={(e) => setDeleteInputText(e.target.value)}
                        placeholder="请输入 注销 两个字"
                        className="w-full bg-black/60 border border-red-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-400"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteStep("idle");
                          setDeleteInputText("");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-semibold transition cursor-pointer"
                      >
                        取消返回
                      </button>
                      <button
                        type="button"
                        disabled={deleteInputText.trim() !== "注销" || deleteLoading}
                        onClick={handleDeleteAccountConfirm}
                        className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer"
                      >
                        {deleteLoading ? "正在永久注销..." : "确认永久删除账号"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setDeleteStep("confirming")}
                      className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
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
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>退出登录</span>
                    </button>
                  </div>
                )}
              </div>
            ) : centerTab === "history" ? (
              /* Tab 2: Cloud Watch History Management */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-gray-300">
                    已同步云端历史 ({history.length} 条)
                  </span>
                  {history.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            "确定要清空全部播放历史吗？此操作将在所有同步设备生效。",
                          )
                        ) {
                          clearAllHistory();
                          setSuccessMsg("已清空全部播放历史并同步至云端");
                        }
                      }}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>清空全部</span>
                    </button>
                  )}
                </div>

                {history.length > 0 ? (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                    {history.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-cyan-500/30 transition group"
                      >
                        <img
                          src={h.vodPic}
                          alt={h.vodName}
                          className="w-10 h-14 object-cover rounded-xl bg-dark-800 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-300">
                            {h.vodName}
                          </h4>
                          <p className="text-[11px] text-cyan-400/90 font-medium mt-0.5 truncate">
                            {h.episodeName} · 播至 {formatSeconds(h.currentTime)}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {new Date(h.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link
                            href={`/play/${h.vodId}?src=${h.sourceIndex || 0}&ep=${h.episodeIndex || 0}&t=${h.currentTime || 0}`}
                            onClick={closeAccountModal}
                            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1 transition"
                            title="继续播放"
                          >
                            <Play className="w-3 h-3 fill-cyan-300" />
                            <span>播放</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              deleteHistoryItem(h.vodId);
                              setSuccessMsg(`已从云端删除《${h.vodName}》的观看记录`);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                            title="删除此记录"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-500 text-xs bg-black/20 rounded-2xl border border-white/5 space-y-1">
                    <History className="w-8 h-8 text-gray-600 mx-auto stroke-1" />
                    <p>暂无云端播放记录</p>
                    <p className="text-[11px] text-gray-600">
                      在视频播放页观看后将自动在此呈现与多端同步
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Tab 3: Cloud Favorites Management */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-gray-300">
                    已同步云端收藏 ({favorites.length} 部)
                  </span>
                  {favorites.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            "确定要清空全部收藏影片吗？此操作将在所有同步设备生效。",
                          )
                        ) {
                          clearAllFavorites();
                          setSuccessMsg("已清空全部收藏影片并同步至云端");
                        }
                      }}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>清空全部</span>
                    </button>
                  )}
                </div>

                {favorites.length > 0 ? (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                    {favorites.map((fav) => (
                      <div
                        key={fav.vodId}
                        className="flex items-center gap-3 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-amber-500/30 transition group"
                      >
                        <img
                          src={fav.vodPic}
                          alt={fav.vodName}
                          className="w-10 h-14 object-cover rounded-xl bg-dark-800 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-300">
                            {fav.vodName}
                          </h4>
                          <p className="text-[11px] text-amber-400/90 font-medium mt-0.5 truncate">
                            {fav.vodRemarks || fav.typeName || "精选收藏"}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {new Date(fav.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link
                            href={`/play/${fav.vodId}`}
                            onClick={closeAccountModal}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1 transition"
                            title="立即播放"
                          >
                            <Play className="w-3 h-3 fill-amber-300" />
                            <span>播放</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              toggleFavorite({
                                id: fav.vodId,
                                name: fav.vodName,
                                pic: fav.vodPic,
                                remarks: fav.vodRemarks,
                              });
                              setSuccessMsg(`已取消收藏《${fav.vodName}》`);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                            title="取消收藏"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-500 text-xs bg-black/20 rounded-2xl border border-white/5 space-y-1">
                    <Star className="w-8 h-8 text-gray-600 mx-auto stroke-1" />
                    <p>暂无收藏影片</p>
                    <p className="text-[11px] text-gray-600">
                      在播放页或影视卡片点击「收藏」即可在此统一管理并多端同步
                    </p>
                  </div>
                )}
              </div>
            )
          ) : (
            /* Guest / Login / Register */
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
                  className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
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
                  className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
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
                  className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
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
                      className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition cursor-pointer"
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
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition disabled:opacity-50 cursor-pointer"
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
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
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
