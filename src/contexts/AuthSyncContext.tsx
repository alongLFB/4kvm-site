"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { GATED_CONFIG } from "@/config/gated-sections";
import { updateGuestUser } from "@/lib/guest";
import type { WatchHistoryItem } from "@/lib/types";

export interface AuthUserInfo {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified?: boolean;
}

export interface WebFavoriteItem {
  vodId: string;
  vodName: string;
  vodPic: string;
  vodRemarks?: string;
  vodScore?: string;
  typeName?: string;
  vodYear?: string;
  updatedAt: number;
  deleted?: boolean;
}

interface AuthSyncContextValue {
  user: AuthUserInfo | null;
  loading: boolean;
  syncing: boolean;
  lastSyncedAt: number | null;
  favorites: WebFavoriteItem[];
  history: WatchHistoryItem[];
  isAccountModalOpen: boolean;
  openAccountModal: () => void;
  closeAccountModal: () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  sendRegisterCode: (email: string) => Promise<void>;
  registerWithEmail: (
    name: string,
    email: string,
    password: string,
    code: string,
  ) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  syncNow: () => Promise<void>;
  isFavorite: (vodId: string) => boolean;
  toggleFavorite: (item: {
    id: string;
    name: string;
    pic: string;
    remarks?: string;
    rating?: number;
    type_name?: string;
    year?: string;
  }) => void;
  deleteHistoryItem: (vodId: string) => void;
  clearAllHistory: () => void;
  clearAllFavorites: () => void;
  syncSearchHistory: boolean;
  setSyncSearchHistory: (enabled: boolean) => void;
  autoPlayNext: boolean;
  setAutoPlayNext: (enabled: boolean) => void;
  autoResume: boolean;
  setAutoResume: (enabled: boolean) => void;
}

const FAVORITES_STORAGE_KEY = "4kvm_favorites";
const SYNC_CURSOR_STORAGE_KEY = "4kvm_sync_cursor";
const AUTH_TOKEN_STORAGE_KEY = "4kvm_auth_bearer_token";

const AuthSyncContext = createContext<AuthSyncContextValue | null>(null);

function readLocalHistory(includeDeleted = false): WatchHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("watch_history");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return includeDeleted ? parsed : parsed.filter((h: WatchHistoryItem) => !h.deleted);
  } catch {
    return [];
  }
}

function writeLocalHistory(list: WatchHistoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("watch_history", JSON.stringify(list.slice(0, 100)));
    window.dispatchEvent(new Event("4kvm-sync-updated"));
  } catch {
    // Ignore storage quota errors
  }
}

function readLocalFavorites(): WebFavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalFavorites(list: WebFavoriteItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("4kvm-sync-updated"));
  } catch {
    // Ignore
  }
}

export function AuthSyncProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<WebFavoriteItem[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [syncSearchHistory, setSyncSearchHistoryState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("4kvm_sync_search_history") === "1";
  });

  const [autoPlayNext, setAutoPlayNextState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("4kvm_auto_next_ep") !== "0";
  });

  const [autoResume, setAutoResumeState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("4kvm_auto_resume") !== "0";
  });

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }
    return headers;
  }, []);

  const performSync = useCallback(
    async (fullPush = false) => {
      if (typeof window === "undefined") return;
      setSyncing(true);
      try {
        const localHist = readLocalHistory(true);
        const localFavs = readLocalFavorites();
        const savedPin = localStorage.getItem(GATED_CONFIG.storageKey) || "";
        const syncSearch = localStorage.getItem("4kvm_sync_search_history") || "0";
        const autoNext = localStorage.getItem("4kvm_auto_next_ep") || "1";
        const autoResumeVal = localStorage.getItem("4kvm_auto_resume") || "1";
        const searchHistoryRaw = localStorage.getItem("4kvm_search_history") || "[]";

        const pushPayload = {
          history: localHist.map((h) => ({
            vod_id: String(h.vodId),
            vod_name: String(h.vodName || ""),
            vod_pic: String(h.vodPic || ""),
            vod_remarks: "",
            episode_name: String(h.episodeName || ""),
            episode_index: Number(h.episodeIndex || 0),
            source_index: Number(h.sourceIndex || 0),
            current_time: Number(h.currentTime || 0),
            duration: Number(h.duration || 0),
            updated_at: Number(h.timestamp || Date.now()),
            deleted: Boolean(h.deleted),
          })),
          favorites: localFavs.map((f) => ({
            vod_id: f.vodId,
            vod_name: f.vodName,
            vod_pic: f.vodPic,
            vod_remarks: f.vodRemarks || "",
            vod_score: f.vodScore || "",
            type_name: f.typeName || "",
            vod_year: f.vodYear || "",
            updated_at: f.updatedAt,
            deleted: Boolean(f.deleted),
          })),
          settings: [
            savedPin ? { key: "unlocked_pin", value: savedPin, updated_at: Date.now() } : null,
            { key: "sync_search_history", value: syncSearch, updated_at: Date.now() },
            syncSearch === "1" ? { key: "cloud_search_history", value: searchHistoryRaw, updated_at: Date.now() } : null,
            { key: "auto_next_ep", value: autoNext, updated_at: Date.now() },
            { key: "auto_resume", value: autoResumeVal, updated_at: Date.now() },
          ].filter(Boolean),
        };

        await fetch("/api/v1/sync/push", {
          method: "POST",
          credentials: "include",
          headers: getAuthHeaders(),
          body: JSON.stringify(pushPayload),
        });

        const since = fullPush
          ? 0
          : Number(localStorage.getItem(SYNC_CURSOR_STORAGE_KEY) || "0");
        const pullRes = await fetch(`/api/v1/sync/pull?since=${since}`, {
          method: "GET",
          credentials: "include",
          headers: getAuthHeaders(),
        });

        if (pullRes.ok) {
          const pullData = await pullRes.json();
          if (typeof pullData.cursor === "number") {
            localStorage.setItem(
              SYNC_CURSOR_STORAGE_KEY,
              String(pullData.cursor),
            );
          }

          if (Array.isArray(pullData.history) && pullData.history.length > 0) {
            const histMap = new Map<string, WatchHistoryItem>();
            for (const h of readLocalHistory(true)) {
              histMap.set(String(h.vodId), h);
            }
            for (const remote of pullData.history) {
              const id = String(remote.vod_id);
              const remoteUpdated = Number(remote.updated_at || 0);
              const existing = histMap.get(id);
              if (!existing || remoteUpdated >= (existing.timestamp || 0)) {
                histMap.set(id, {
                  vodId: id,
                  vodName: String(remote.vod_name || ""),
                  vodPic: String(remote.vod_pic || ""),
                  episodeIndex: Number(remote.episode_index || 0),
                  episodeName: String(remote.episode_name || ""),
                  sourceIndex: Number(remote.source_index || 0),
                  currentTime: Number(remote.current_time || 0),
                  duration: Number(remote.duration || 0),
                  timestamp: remoteUpdated,
                  deleted: Boolean(remote.deleted),
                });
              }
            }
            const allHist = Array.from(histMap.values());
            writeLocalHistory(allHist);
            setHistory(
              allHist
                .filter((h) => !h.deleted)
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
            );
          }

          if (
            Array.isArray(pullData.favorites) &&
            pullData.favorites.length > 0
          ) {
            const favMap = new Map<string, WebFavoriteItem>();
            for (const f of readLocalFavorites()) {
              favMap.set(f.vodId, f);
            }
            for (const remote of pullData.favorites) {
              const id = String(remote.vod_id);
              const existing = favMap.get(id);
              const remoteUpdated = Number(remote.updated_at || 0);
              if (!existing || remoteUpdated >= existing.updatedAt) {
                favMap.set(id, {
                  vodId: id,
                  vodName: String(remote.vod_name || ""),
                  vodPic: String(remote.vod_pic || ""),
                  vodRemarks: String(remote.vod_remarks || ""),
                  vodScore: String(remote.vod_score || ""),
                  typeName: String(remote.type_name || ""),
                  vodYear: String(remote.vod_year || ""),
                  updatedAt: remoteUpdated,
                  deleted: Boolean(remote.deleted),
                });
              }
            }
            const mergedFavs = Array.from(favMap.values()).sort(
              (a, b) => b.updatedAt - a.updatedAt,
            );
            writeLocalFavorites(mergedFavs);
            setFavorites(mergedFavs.filter((f) => !f.deleted));
          }

          if (Array.isArray(pullData.settings)) {
            for (const s of pullData.settings) {
              if (s.key === "unlocked_pin" && s.value) {
                localStorage.setItem(GATED_CONFIG.storageKey, String(s.value));
              } else if (s.key === "sync_search_history") {
                const val = String(s.value) === "1" ? "1" : "0";
                localStorage.setItem("4kvm_sync_search_history", val);
                setSyncSearchHistoryState(val === "1");
              } else if (s.key === "cloud_search_history") {
                if (localStorage.getItem("4kvm_sync_search_history") === "1" && s.value) {
                  try {
                    const cloudTerms: string[] = JSON.parse(String(s.value));
                    const localTerms: string[] = JSON.parse(localStorage.getItem("4kvm_search_history") || "[]");
                    const merged = Array.from(new Set([...cloudTerms, ...localTerms])).slice(0, 10);
                    localStorage.setItem("4kvm_search_history", JSON.stringify(merged));
                    window.dispatchEvent(new Event("4kvm-search-history-updated"));
                  } catch {}
                }
              } else if (s.key === "auto_next_ep") {
                const val = String(s.value) !== "0";
                localStorage.setItem("4kvm_auto_next_ep", val ? "1" : "0");
                setAutoPlayNextState(val);
              } else if (s.key === "auto_resume") {
                const val = String(s.value) !== "0";
                localStorage.setItem("4kvm_auto_resume", val ? "1" : "0");
                setAutoResumeState(val);
              }
            }
          }

          setLastSyncedAt(Date.now());
        }
      } catch (err) {
        console.error("[Web AuthSync] Sync error:", err);
      } finally {
        setSyncing(false);
      }
    },
    [getAuthHeaders],
  );

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Initial attempt with current auth headers (Bearer token if present + cookie credentials)
      let res = await fetch("/api/v1/auth/get-session", {
        method: "GET",
        credentials: "include",
        headers: getAuthHeaders(),
      });

      let data = res.ok ? await res.json().catch(() => null) : null;

      // 2. Stale token recovery: If get-session returned null user or HTTP failure while a Bearer
      // token was stored in localStorage, the stored token is stale/expired.
      // Better Auth's bearer middleware will overwrite the valid session cookie with this stale token and fail!
      // In that case: remove the stale Bearer token and retry immediately with pure cookie credentials.
      if (
        !data?.user &&
        typeof window !== "undefined" &&
        localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
      ) {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        res = await fetch("/api/v1/auth/get-session", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          data = await res.json().catch(() => null);
        }
      }

      if (data?.user) {
        setUser(data.user);
        // Persist session token to localStorage for subsequent cross-origin / TV sync calls
        if (data?.session?.token && typeof window !== "undefined") {
          localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.session.token);
        }
        updateGuestUser({
          name: data.user.name || data.user.email.split("@")[0],
        });
        await performSync(false);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, performSync]);

  useEffect(() => {
    setFavorites(readLocalFavorites().filter((f) => !f.deleted));
    setHistory(readLocalHistory());
    void refreshSession();

    const onSyncUpdated = (e: Event) => {
      setFavorites(readLocalFavorites().filter((f) => !f.deleted));
      setHistory(readLocalHistory());
      const custom = e as CustomEvent<{ syncRemote?: boolean }>;
      if (custom?.detail?.syncRemote && user) {
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => {
          void performSync(false);
        }, 1500);
      }
    };
    window.addEventListener("4kvm-sync-updated", onSyncUpdated);
    return () => window.removeEventListener("4kvm-sync-updated", onSyncUpdated);
  }, [refreshSession, user, performSync]);

  const loginWithEmail = async (email: string, password: string) => {
    const res = await fetch("/api/v1/auth/sign-in/email", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const token = res.headers.get("set-auth-token");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || "邮箱或密码不正确");
    }
    if (token) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } else if (data?.token) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token);
    }
    if (data?.user) {
      setUser(data.user);
      updateGuestUser({
        name: data.user.name || data.user.email.split("@")[0],
      });
    }
    await performSync(true);
  };

  const sendRegisterCode = async (email: string) => {
    const res = await fetch("/api/v1/auth/send-register-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || "发送验证码失败，请稍后重试");
    }
  };

  const registerWithEmail = async (
    name: string,
    email: string,
    password: string,
    code: string,
  ) => {
    const res = await fetch("/api/v1/auth/sign-up/email", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || email.split("@")[0],
        email: email.trim(),
        password,
        code: code.trim(),
      }),
    });
    const token = res.headers.get("set-auth-token");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || "注册失败，该邮箱可能已被注册");
    }
    if (token) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } else if (data?.token) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token);
    }
    if (data?.user) {
      setUser(data.user);
      updateGuestUser({
        name: data.user.name || data.user.email.split("@")[0],
      });
    }
    await performSync(true);
  };

  const requestPasswordReset = async (email: string) => {
    const res = await fetch("/api/v1/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        redirectTo: `${window.location.origin}/?reset=1`,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || "发送重置邮件失败");
    }
  };

  const loginWithGoogle = async () => {
    // Clear any stale local bearer token before initiating OAuth to prevent conflict upon return
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }

    const callbackURL =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}` || "/"
        : "/";

    const res = await fetch("/api/v1/auth/sign-in/social", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "google",
        callbackURL,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.url) {
      throw new Error(
        data?.message ||
          "服务端尚未配置 Google OAuth 密钥，请先使用邮箱密码登录",
      );
    }
    window.location.href = data.url;
  };

  const updateProfileName = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const res = await fetch("/api/v1/auth/update-user", {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) {
      throw new Error("更新昵称失败");
    }
    setUser((prev) => (prev ? { ...prev, name: trimmed } : prev));
    updateGuestUser({ name: trimmed });
  };

  const logout = async () => {
    await fetch("/api/v1/auth/sign-out", {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    }).catch(() => {});
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(SYNC_CURSOR_STORAGE_KEY);
    setUser(null);
  };

  const deleteAccount = async () => {
    const res = await fetch("/api/v1/auth/delete-user", {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      throw new Error("注销账号失败，请重新登录后再试");
    }
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(SYNC_CURSOR_STORAGE_KEY);
    setUser(null);
  };

  const isFavorite = useCallback(
    (vodId: string) => {
      return favorites.some((f) => f.vodId === String(vodId) && !f.deleted);
    },
    [favorites],
  );

  const toggleFavorite = useCallback(
    (item: {
      id: string;
      name: string;
      pic: string;
      remarks?: string;
      rating?: number;
      type_name?: string;
      year?: string;
    }) => {
      const all = readLocalFavorites();
      const vodId = String(item.id);
      const now = Date.now();
      const idx = all.findIndex((f) => f.vodId === vodId);

      if (idx >= 0) {
        all[idx] = {
          ...all[idx],
          deleted: !all[idx].deleted,
          updatedAt: now,
        };
      } else {
        all.unshift({
          vodId,
          vodName: item.name,
          vodPic: item.pic,
          vodRemarks: item.remarks || "",
          vodScore: item.rating ? String(item.rating) : "",
          typeName: item.type_name || "",
          vodYear: item.year || "",
          updatedAt: now,
          deleted: false,
        });
      }

      writeLocalFavorites(all);
      setFavorites(all.filter((f) => !f.deleted));

      if (user) {
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => {
          void performSync(false);
        }, 1500);
      }
    },
    [user, performSync],
  );

  const deleteHistoryItem = useCallback(
    (vodId: string) => {
      const all = readLocalHistory(true);
      const targetId = String(vodId);
      const now = Date.now();
      const idx = all.findIndex((h) => String(h.vodId) === targetId);
      if (idx >= 0) {
        all[idx] = { ...all[idx], deleted: true, timestamp: now };
      } else {
        all.push({
          vodId: targetId,
          vodName: "",
          vodPic: "",
          episodeName: "",
          episodeIndex: 0,
          sourceIndex: 0,
          currentTime: 0,
          duration: 0,
          timestamp: now,
          deleted: true,
        });
      }
      writeLocalHistory(all);
      setHistory(
        all
          .filter((h) => !h.deleted)
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
      );
      if (user) {
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => {
          void performSync(false);
        }, 800);
      }
    },
    [user, performSync],
  );

  const clearAllHistory = useCallback(() => {
    const all = readLocalHistory(true);
    const now = Date.now();
    const updated = all.map((h) => ({
      ...h,
      deleted: true,
      timestamp: now,
    }));
    writeLocalHistory(updated);
    setHistory([]);
    if (user) {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        void performSync(false);
      }, 800);
    }
  }, [user, performSync]);

  const clearAllFavorites = useCallback(() => {
    const all = readLocalFavorites();
    const now = Date.now();
    const updated = all.map((f) => ({
      ...f,
      deleted: true,
      updatedAt: now,
    }));
    writeLocalFavorites(updated);
    setFavorites([]);
    if (user) {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        void performSync(false);
      }, 800);
    }
  }, [user, performSync]);

  const setSyncSearchHistory = useCallback(
    (enabled: boolean) => {
      setSyncSearchHistoryState(enabled);
      if (typeof window !== "undefined") {
        localStorage.setItem("4kvm_sync_search_history", enabled ? "1" : "0");
      }
      if (user) {
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => {
          void performSync(false);
        }, 500);
      }
    },
    [user, performSync],
  );

  const setAutoPlayNext = useCallback(
    (enabled: boolean) => {
      setAutoPlayNextState(enabled);
      if (typeof window !== "undefined") {
        localStorage.setItem("4kvm_auto_next_ep", enabled ? "1" : "0");
      }
      if (user) {
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => {
          void performSync(false);
        }, 500);
      }
    },
    [user, performSync],
  );

  const setAutoResume = useCallback(
    (enabled: boolean) => {
      setAutoResumeState(enabled);
      if (typeof window !== "undefined") {
        localStorage.setItem("4kvm_auto_resume", enabled ? "1" : "0");
      }
      if (user) {
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => {
          void performSync(false);
        }, 500);
      }
    },
    [user, performSync],
  );

  return (
    <AuthSyncContext.Provider
      value={{
        user,
        loading,
        syncing,
        lastSyncedAt,
        favorites,
        history,
        isAccountModalOpen,
        openAccountModal: () => setIsAccountModalOpen(true),
        closeAccountModal: () => setIsAccountModalOpen(false),
        loginWithEmail,
        sendRegisterCode,
        registerWithEmail,
        requestPasswordReset,
        loginWithGoogle,
        updateProfileName,
        logout,
        deleteAccount,
        syncNow: () => performSync(true),
        isFavorite,
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
      }}
    >
      {children}
    </AuthSyncContext.Provider>
  );
}

export function useAuthSync() {
  const ctx = useContext(AuthSyncContext);
  if (!ctx) {
    throw new Error("useAuthSync must be used within AuthSyncProvider");
  }
  return ctx;
}
