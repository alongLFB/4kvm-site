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
}

const FAVORITES_STORAGE_KEY = "4kvm_favorites";
const SYNC_CURSOR_STORAGE_KEY = "4kvm_sync_cursor";
const AUTH_TOKEN_STORAGE_KEY = "4kvm_auth_bearer_token";

const AuthSyncContext = createContext<AuthSyncContextValue | null>(null);

function readLocalHistory(): WatchHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("watch_history");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
        const localHist = readLocalHistory();
        const localFavs = readLocalFavorites();
        const savedPin = localStorage.getItem(GATED_CONFIG.storageKey) || "";

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
            deleted: false,
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
          settings: savedPin
            ? [
                {
                  key: "unlocked_pin",
                  value: savedPin,
                  updated_at: Date.now(),
                },
              ]
            : [],
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
            for (const h of readLocalHistory()) {
              histMap.set(String(h.vodId), h);
            }
            for (const remote of pullData.history) {
              const id = String(remote.vod_id);
              if (remote.deleted) {
                histMap.delete(id);
                continue;
              }
              const existing = histMap.get(id);
              const remoteUpdated = Number(remote.updated_at || 0);
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
                });
              }
            }
            const mergedHist = Array.from(histMap.values()).sort(
              (a, b) => (b.timestamp || 0) - (a.timestamp || 0),
            );
            writeLocalHistory(mergedHist);
            setHistory(mergedHist);
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
      const res = await fetch("/api/v1/auth/get-session", {
        method: "GET",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          setUser(data.user);
          updateGuestUser({
            name: data.user.name || data.user.email.split("@")[0],
          });
          await performSync(false);
        } else {
          setUser(null);
        }
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
