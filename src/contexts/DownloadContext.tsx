"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { downloadManager } from "@/lib/download-manager";
import {
  DownloadTaskRecord,
  StorageQuotaInfo,
  getStorageQuota,
  DownloadSettings,
} from "@/lib/download-store";

interface OfflinePlaybackState {
  taskId: string;
  vodName: string;
  episodeName: string;
  blobUrl: string;
}

interface DownloadContextType {
  tasks: DownloadTaskRecord[];
  activeTasks: DownloadTaskRecord[];
  completedTasks: DownloadTaskRecord[];
  activeCount: number;
  completedCount: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  settings: DownloadSettings;
  updateSettings: (newSettings: Partial<DownloadSettings>) => void;
  createAndStartTask: (params: {
    vodId?: string;
    vodName: string;
    episodeName: string;
    typeName?: string;
    cover?: string;
    m3u8Url: string;
    format?: "mp4" | "ts";
    concurrency?: number;
  }) => Promise<DownloadTaskRecord>;
  createBatchTasks: (
    taskList: Array<{
      vodId?: string;
      vodName: string;
      episodeName: string;
      typeName?: string;
      cover?: string;
      m3u8Url: string;
      format?: "mp4" | "ts";
      concurrency?: number;
    }>,
    batchOptions?: {
      concurrency?: number;
      maxConcurrentTasks?: number;
    }
  ) => Promise<DownloadTaskRecord[]>;
  pauseTask: (taskId: string) => Promise<void>;
  resumeTask: (taskId: string) => Promise<void>;
  pauseAll: () => Promise<void>;
  resumeAll: () => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  exportVideo: (taskId: string) => Promise<void>;
  playOfflineVideo: (taskId: string) => Promise<void>;
  currentOfflineVideo: OfflinePlaybackState | null;
  closeOfflinePlayer: () => void;
  storageQuota: StorageQuotaInfo;
  refreshStorageQuota: () => Promise<void>;
}

const DownloadContext = createContext<DownloadContextType | null>(null);

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<DownloadTaskRecord[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentOfflineVideo, setCurrentOfflineVideo] = useState<OfflinePlaybackState | null>(null);
  const [settings, setSettings] = useState<DownloadSettings>(downloadManager.getSettings());
  const [storageQuota, setStorageQuota] = useState<StorageQuotaInfo>({
    usedBytes: 0,
    quotaBytes: 1024 * 1024 * 1024 * 10,
    usedPercent: 0,
  });

  const updateSettings = useCallback((newSettings: Partial<DownloadSettings>) => {
    downloadManager.updateSettings(newSettings);
    setSettings(downloadManager.getSettings());
  }, []);

  const refreshStorageQuota = useCallback(async () => {
    try {
      const q = await getStorageQuota();
      setStorageQuota(q);
    } catch {}
  }, []);

  useEffect(() => {
    const unsub = downloadManager.subscribe((updatedTasks) => {
      setTasks([...updatedTasks]);
      setSettings(downloadManager.getSettings());
    });
    refreshStorageQuota();
    return () => unsub();
  }, [refreshStorageQuota]);

  const activeTasks = useMemo(() => {
    return tasks.filter((t) => t.status !== "completed");
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks.filter((t) => t.status === "completed");
  }, [tasks]);

  const activeCount = useMemo(() => {
    return activeTasks.filter((t) => t.status === "downloading" || t.status === "remuxing" || t.status === "parsing").length;
  }, [activeTasks]);

  const completedCount = completedTasks.length;

  const pauseActivePagePlayers = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        const art = (window as any).__4kvm_player__;
        if (art && typeof art.pause === "function") {
          art.pause();
        }
        document.querySelectorAll("video").forEach((v) => {
          if (!v.paused) {
            v.pause();
          }
        });
      } catch (e) {}
    }
  }, []);

  const openDrawer = useCallback(() => {
    pauseActivePagePlayers();
    setIsDrawerOpen(true);
    refreshStorageQuota();
  }, [pauseActivePagePlayers, refreshStorageQuota]);

  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => {
      if (!prev) pauseActivePagePlayers();
      return !prev;
    });
    refreshStorageQuota();
  }, [pauseActivePagePlayers, refreshStorageQuota]);

  const createAndStartTask = useCallback(
    async (params: {
      vodId?: string;
      vodName: string;
      episodeName: string;
      typeName?: string;
      cover?: string;
      m3u8Url: string;
      format?: "mp4" | "ts";
      concurrency?: number;
    }) => {
      const task = await downloadManager.createTask(params);
      downloadManager.startTask(task.id);
      setIsDrawerOpen(true);
      return task;
    },
    []
  );

  const createBatchTasks = useCallback(
    async (
      taskList: Array<{
        vodId?: string;
        vodName: string;
        episodeName: string;
        typeName?: string;
        cover?: string;
        m3u8Url: string;
        format?: "mp4" | "ts";
        concurrency?: number;
      }>,
      batchOptions?: {
        concurrency?: number;
        maxConcurrentTasks?: number;
      }
    ) => {
      const created = await downloadManager.createBatchTasks(taskList, batchOptions);
      setIsDrawerOpen(true);
      return created;
    },
    []
  );

  const pauseTask = useCallback(async (taskId: string) => {
    await downloadManager.pauseTask(taskId);
  }, []);

  const resumeTask = useCallback(async (taskId: string) => {
    await downloadManager.resumeTask(taskId);
  }, []);

  const pauseAll = useCallback(async () => {
    await downloadManager.pauseAll();
  }, []);

  const resumeAll = useCallback(async () => {
    await downloadManager.resumeAll();
  }, []);

  const deleteTask = useCallback(
    async (taskId: string) => {
      await downloadManager.deleteTask(taskId);
      refreshStorageQuota();
    },
    [refreshStorageQuota]
  );

  const exportVideo = useCallback(async (taskId: string) => {
    await downloadManager.exportVideo(taskId);
  }, []);

  const playOfflineVideo = useCallback(
    async (taskId: string) => {
      pauseActivePagePlayers();
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const blobUrl = await downloadManager.getOfflinePlaybackUrl(taskId);
      setCurrentOfflineVideo({
        taskId,
        vodName: task.vodName,
        episodeName: task.episodeName,
        blobUrl,
      });
    },
    [pauseActivePagePlayers, tasks]
  );

  const closeOfflinePlayer = useCallback(() => {
    if (currentOfflineVideo?.blobUrl) {
      URL.revokeObjectURL(currentOfflineVideo.blobUrl);
    }
    setCurrentOfflineVideo(null);
  }, [currentOfflineVideo]);

  const value = {
    tasks,
    activeTasks,
    completedTasks,
    activeCount,
    completedCount,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    settings,
    updateSettings,
    createAndStartTask,
    createBatchTasks,
    pauseTask,
    resumeTask,
    pauseAll,
    resumeAll,
    deleteTask,
    exportVideo,
    playOfflineVideo,
    currentOfflineVideo,
    closeOfflinePlayer,
    storageQuota,
    refreshStorageQuota,
  };

  return <DownloadContext.Provider value={value}>{children}</DownloadContext.Provider>;
}

export function useDownloadManager() {
  const ctx = useContext(DownloadContext);
  if (!ctx) {
    throw new Error("useDownloadManager must be used within a DownloadProvider");
  }
  return ctx;
}
