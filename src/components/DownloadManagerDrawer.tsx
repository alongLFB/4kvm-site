"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  Play,
  Pause,
  Trash2,
  HardDrive,
  FileVideo,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowDownToLine,
  ExternalLink,
  Film,
  Sparkles,
} from "lucide-react";
import { useDownloadManager } from "@/contexts/DownloadContext";
import { DownloadTaskRecord } from "@/lib/download-store";
import { OfflinePlayerModal } from "@/components/OfflinePlayerModal";

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDuration(sec?: number) {
  if (!sec || sec <= 0) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

export function DownloadManagerDrawer() {
  const {
    isDrawerOpen,
    closeDrawer,
    activeTasks,
    completedTasks,
    activeCount,
    completedCount,
    pauseTask,
    resumeTask,
    deleteTask,
    exportVideo,
    playOfflineVideo,
    storageQuota,
  } = useDownloadManager();

  const [activeTab, setActiveTab] = useState<"downloading" | "completed">("downloading");

  // If there are no downloading tasks but there are completed tasks, auto-switch to completed tab
  useEffect(() => {
    if (activeTasks.length === 0 && completedTasks.length > 0) {
      setActiveTab("completed");
    } else if (activeTasks.length > 0 && completedTasks.length === 0) {
      setActiveTab("downloading");
    }
  }, [activeTasks.length, completedTasks.length]);

  // Lock body scroll
  useEffect(() => {
    if (!isDrawerOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [isDrawerOpen]);

  // ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] overscroll-contain bg-black/80 backdrop-blur-md flex items-center justify-end animate-in fade-in duration-200"
      onClick={closeDrawer}
    >
      <div
        className="bg-dark-900 border-l border-white/10 w-full max-w-lg h-full flex flex-col shadow-2xl relative overflow-hidden overscroll-contain animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-dark-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                PWA 离线下载中心
                {activeCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                )}
              </h2>
              <p className="text-[11px] text-gray-400">
                支持切片断点续传 · 离线免流直接起播
              </p>
            </div>
          </div>

          <button
            onClick={closeDrawer}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition cursor-pointer"
            title="关闭窗口"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-dark-950/40 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab("downloading")}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === "downloading"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Loader2 className={`w-3.5 h-3.5 ${activeCount > 0 ? "animate-spin text-cyan-400" : ""}`} />
            正在下载
            {activeTasks.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">
                {activeTasks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("completed")}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === "completed"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            离线已下载
            {completedCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                {completedCount}
              </span>
            )}
          </button>
        </div>

        {/* Task List Content Area */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
          {activeTab === "downloading" && (
            <>
              {activeTasks.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3 text-center text-gray-400">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
                    <ArrowDownToLine className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-gray-300 font-medium">当前无正在下载的任务</p>
                  <p className="text-[11px] text-gray-500 max-w-xs">
                    在任意视频播放详情页，点击【下载】按钮并选择【加入后台下载管理】即可开启后台断点续传。
                  </p>
                </div>
              ) : (
                activeTasks.map((task) => (
                  <DownloadingTaskItem
                    key={task.id}
                    task={task}
                    onPause={() => pauseTask(task.id)}
                    onResume={() => resumeTask(task.id)}
                    onDelete={() => {
                      if (confirm(`确定取消并删除【${task.vodName} - ${task.episodeName}】的任务吗？`)) {
                        deleteTask(task.id);
                      }
                    }}
                  />
                ))
              )}
            </>
          )}

          {activeTab === "completed" && (
            <>
              {completedTasks.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3 text-center text-gray-400">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
                    <Film className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-gray-300 font-medium">暂无离线保存的视频</p>
                  <p className="text-[11px] text-gray-500 max-w-xs">
                    下载完成后的视频会自动安全存放在 PWA 本地沙盒中，即使离线断网也能直接免流播放。
                  </p>
                </div>
              ) : (
                completedTasks.map((task) => (
                  <CompletedTaskItem
                    key={task.id}
                    task={task}
                    onPlay={() => playOfflineVideo(task.id)}
                    onExport={() => exportVideo(task.id)}
                    onDelete={() => {
                      if (confirm(`确定从本地删除离线视频【${task.vodName} - ${task.episodeName}】吗？将释放本地存储空间。`)) {
                        deleteTask(task.id);
                      }
                    }}
                  />
                ))
              )}
            </>
          )}
        </div>

        {/* Footer Storage Quota Bar */}
        <div className="p-4 border-t border-white/10 bg-dark-950/90 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              PWA 离线存储空间：
            </span>
            <span className="font-mono text-gray-300">
              已用 <strong className="text-cyan-400">{formatBytes(storageQuota.usedBytes)}</strong> / 剩余可分配{" "}
              {formatBytes(storageQuota.quotaBytes)}
            </span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(storageQuota.usedPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DownloadingTaskItem({
  task,
  onPause,
  onResume,
  onDelete,
}: {
  task: DownloadTaskRecord;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
}) {
  const isWorking = task.status === "downloading" || task.status === "parsing" || task.status === "remuxing";
  const isPaused = task.status === "paused" || task.status === "idle";
  const isError = task.status === "error";

  return (
    <div className="p-3.5 rounded-2xl bg-dark-800/80 border border-white/10 space-y-2.5 shadow-sm">
      {/* Title & Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-white truncate">{task.vodName}</h4>
            <span className="text-[10px] font-semibold text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10 shrink-0">
              {task.episodeName}
            </span>
            <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-white/5 text-gray-400 shrink-0">
              {task.format}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400 font-mono">
            {task.status === "parsing" && (
              <span className="text-amber-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> 解析切片列表中...
              </span>
            )}
            {task.status === "downloading" && (
              <>
                <span className="text-cyan-400 font-bold">{task.percent}%</span>
                <span>·</span>
                <span>
                  {task.downloadedCount} / {task.totalSegments} 切片
                </span>
                <span>·</span>
                <span className="text-emerald-400 font-bold">{formatBytes(task.speed)}/s</span>
              </>
            )}
            {task.status === "remuxing" && (
              <span className="text-cyan-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> 正在本地无损合成 MP4...
              </span>
            )}
            {isPaused && (
              <span className="text-amber-300">已暂停 ({task.percent}% · 可断点续传)</span>
            )}
            {isError && (
              <span className="text-rose-400 flex items-center gap-1 truncate max-w-[240px]">
                <AlertCircle className="w-3 h-3 shrink-0" /> {task.error || "网络中断，可点击重试续传"}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isWorking && (
            <button
              onClick={onPause}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-400 hover:text-amber-300 transition cursor-pointer"
              title="暂停下载"
            >
              <Pause className="w-4 h-4 fill-current" />
            </button>
          )}

          {(isPaused || isError) && (
            <button
              onClick={onResume}
              className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
              title="继续断点续传"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          )}

          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition cursor-pointer"
            title="取消并删除任务"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-dark-950 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ${
            isError
              ? "bg-rose-500"
              : isPaused
              ? "bg-amber-400"
              : "bg-gradient-to-r from-cyan-500 to-emerald-400"
          }`}
          style={{ width: `${Math.max(task.percent, 2)}%` }}
        />
      </div>
    </div>
  );
}

function CompletedTaskItem({
  task,
  onPlay,
  onExport,
  onDelete,
}: {
  task: DownloadTaskRecord;
  onPlay: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-3.5 rounded-2xl bg-dark-800/80 border border-white/10 flex items-center justify-between gap-3 shadow-sm hover:border-cyan-500/30 transition">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-xs sm:text-sm font-bold text-white truncate">{task.vodName}</h4>
          <span className="text-[10px] font-semibold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 shrink-0">
            {task.episodeName}
          </span>
          <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-white/5 text-gray-400 shrink-0">
            {task.format}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> 本地已就绪
          </span>
          <span>·</span>
          <span>大小：{formatBytes(task.completedSize || task.downloadedBytes)}</span>
          {task.totalDuration > 0 && (
            <>
              <span>·</span>
              <span>时长：{formatDuration(task.totalDuration)}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onPlay}
          className="px-2.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-dark-950 font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-md shadow-cyan-500/20 active:scale-95"
          title="无需网络，直接在本地播放"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>离线播</span>
        </button>

        <button
          onClick={onExport}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition cursor-pointer"
          title="导出保存为本地文件"
        >
          <ArrowDownToLine className="w-4 h-4" />
        </button>

        <button
          onClick={onDelete}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition cursor-pointer"
          title="删除本地缓存释放空间"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function GlobalDownloadCenter() {
  const { currentOfflineVideo, closeOfflinePlayer } = useDownloadManager();

  return (
    <>
      <DownloadManagerDrawer />
      <OfflinePlayerModal
        isOpen={!!currentOfflineVideo}
        onClose={closeOfflinePlayer}
        vodName={currentOfflineVideo?.vodName || ""}
        episodeName={currentOfflineVideo?.episodeName || ""}
        videoUrl={currentOfflineVideo?.blobUrl || ""}
      />
    </>
  );
}

