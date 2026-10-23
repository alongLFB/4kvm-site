"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Film,
  Sparkles,
  Clock,
  Layers,
  List,
  ChevronDown,
  ChevronUp,
  Tv,
  Clapperboard,
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

type CategoryType = "all" | "movie" | "series";
type ViewMode = "grouped" | "flat";

/**
 * 智能判断任务属于电影还是剧集（电视剧/动漫/综艺）
 */
function getTaskCategory(task: DownloadTaskRecord): "movie" | "series" {
  if (task.typeName) {
    if (task.typeName.includes("电影")) return "movie";
    if (
      task.typeName.includes("电视剧") ||
      task.typeName.includes("动漫") ||
      task.typeName.includes("综艺") ||
      task.typeName.includes("剧")
    ) {
      return "series";
    }
  }

  const ep = (task.episodeName || "").trim();
  if (
    /第\s*\d+\s*[集话期]/i.test(ep) ||
    /EP\s*\d+/i.test(ep) ||
    /\bE\d+\b/i.test(ep) ||
    /^(上|中|下|前篇|后篇)$/i.test(ep)
  ) {
    return "series";
  }

  if (ep === "正片" || ep === "HD" || ep === "BD" || ep === "全集" || ep === "国语" || ep === "粤语") {
    return "movie";
  }

  return "series";
}

interface VodTaskGroup {
  key: string;
  vodId?: string;
  vodName: string;
  cover?: string;
  typeName?: string;
  category: "movie" | "series";
  tasks: DownloadTaskRecord[];
  totalSize: number;
  totalSegments: number;
  downloadedSegments: number;
  downloadedBytes: number;
  speed: number;
  avgPercent: number;
  workingCount: number;
  queuedCount: number;
  pausedCount: number;
  errorCount: number;
  completedCount: number;
}

function groupTasksByVod(tasks: DownloadTaskRecord[]): VodTaskGroup[] {
  const map = new Map<string, VodTaskGroup>();

  for (const t of tasks) {
    const key = t.vodName || "未知视频";
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        vodId: t.vodId,
        vodName: t.vodName,
        cover: t.cover,
        typeName: t.typeName,
        category: getTaskCategory(t),
        tasks: [],
        totalSize: 0,
        totalSegments: 0,
        downloadedSegments: 0,
        downloadedBytes: 0,
        speed: 0,
        avgPercent: 0,
        workingCount: 0,
        queuedCount: 0,
        pausedCount: 0,
        errorCount: 0,
        completedCount: 0,
      };
      map.set(key, group);
    }

    if (!group.cover && t.cover) group.cover = t.cover;
    if (!group.typeName && t.typeName) {
      group.typeName = t.typeName;
      group.category = getTaskCategory(t);
    }

    group.tasks.push(t);
    group.totalSize += t.completedSize || t.downloadedBytes || 0;
    group.totalSegments += t.totalSegments;
    group.downloadedSegments += t.downloadedCount;
    group.downloadedBytes += t.downloadedBytes;
    group.speed += t.speed || 0;

    if (t.status === "downloading" || t.status === "parsing" || t.status === "remuxing") {
      group.workingCount++;
    } else if (t.status === "queued") {
      group.queuedCount++;
    } else if (t.status === "paused" || t.status === "idle") {
      group.pausedCount++;
    } else if (t.status === "error") {
      group.errorCount++;
    } else if (t.status === "completed") {
      group.completedCount++;
    }
  }

  return Array.from(map.values()).map((g) => {
    // 按集数自然排序
    g.tasks.sort((a, b) =>
      a.episodeName.localeCompare(b.episodeName, undefined, { numeric: true, sensitivity: "base" })
    );
    const sumPercent = g.tasks.reduce((sum, item) => sum + (item.percent || 0), 0);
    g.avgPercent = g.tasks.length > 0 ? Math.round(sumPercent / g.tasks.length) : 0;
    return g;
  });
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
    pauseAll,
    resumeAll,
    deleteTask,
    exportVideo,
    playOfflineVideo,
    storageQuota,
  } = useDownloadManager();

  const [activeTab, setActiveTab] = useState<"downloading" | "completed">("downloading");
  const [categoryFilter, setCategoryFilter] = useState<CategoryType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // 智能切换默认 Tab
  useEffect(() => {
    if (activeTasks.length === 0 && completedTasks.length > 0) {
      setActiveTab("completed");
    } else if (activeTasks.length > 0 && completedTasks.length === 0) {
      setActiveTab("downloading");
    }
  }, [activeTasks.length, completedTasks.length]);

  // 锁定背景页面滚动
  useEffect(() => {
    if (!isDrawerOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [isDrawerOpen]);

  // ESC 键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  const currentList = activeTab === "downloading" ? activeTasks : completedTasks;

  // 统计分类数量
  const counts = useMemo(() => {
    let movie = 0;
    let series = 0;
    for (const t of currentList) {
      if (getTaskCategory(t) === "movie") movie++;
      else series++;
    }
    return { all: currentList.length, movie, series };
  }, [currentList]);

  // 分类过滤
  const filteredTasks = useMemo(() => {
    if (categoryFilter === "all") return currentList;
    return currentList.filter((t) => getTaskCategory(t) === categoryFilter);
  }, [currentList, categoryFilter]);

  // 聚合分组
  const groupedList = useMemo(() => {
    return groupTasksByVod(filteredTasks);
  }, [filteredTasks]);

  // 如果只有一个剧集组，默认自动展开
  useEffect(() => {
    if (groupedList.length === 1 && !expandedGroups.has(groupedList[0].key)) {
      setExpandedGroups(new Set([groupedList[0].key]));
    }
  }, [groupedList.length]);

  const toggleGroupExpand = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // 批量暂停某个剧集
  const handlePauseGroup = async (group: VodTaskGroup) => {
    for (const t of group.tasks) {
      if (
        t.status === "downloading" ||
        t.status === "parsing" ||
        t.status === "remuxing" ||
        t.status === "queued"
      ) {
        await pauseTask(t.id);
      }
    }
  };

  // 批量继续某个剧集
  const handleResumeGroup = async (group: VodTaskGroup) => {
    for (const t of group.tasks) {
      if (t.status === "paused" || t.status === "idle" || t.status === "error") {
        await resumeTask(t.id);
      }
    }
  };

  // 批量删除某个剧集的所有下载/离线视频
  const handleDeleteGroup = async (group: VodTaskGroup) => {
    const text =
      activeTab === "downloading"
        ? `确定取消并删除《${group.vodName}》的全部 ${group.tasks.length} 集下载任务吗？`
        : `确定从本地彻底删除《${group.vodName}》的全部 ${group.tasks.length} 集离线缓存吗？将释放本地存储空间。`;
    if (!confirm(text)) return;
    for (const t of group.tasks) {
      await deleteTask(t.id);
    }
  };

  if (!isDrawerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] overscroll-contain bg-black/80 backdrop-blur-md flex items-center justify-end animate-in fade-in duration-200"
      onClick={closeDrawer}
    >
      <div
        className="bg-dark-900 border-l border-white/10 w-full max-w-xl h-full flex flex-col shadow-2xl relative overflow-hidden overscroll-contain animate-in slide-in-from-right duration-200"
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
                支持断点续传 · 剧集智能聚合分类 · 离线免流起播
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

        {/* Tab Navigation (正在下载 vs 离线已下载) */}
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

        {/* 快捷分类过滤器与视图模式切换栏 */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-dark-950/60 border-b border-white/5 text-xs">
          {/* 分类筛选胶囊按钮 */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                categoryFilter === "all"
                  ? "bg-cyan-500 text-dark-950 font-bold shadow-sm"
                  : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200"
              }`}
            >
              <span>全部</span>
              <span className="text-[10px] opacity-80">({counts.all})</span>
            </button>

            <button
              onClick={() => setCategoryFilter("movie")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                categoryFilter === "movie"
                  ? "bg-cyan-500 text-dark-950 font-bold shadow-sm"
                  : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200"
              }`}
            >
              <Clapperboard className="w-3 h-3" />
              <span>电影</span>
              <span className="text-[10px] opacity-80">({counts.movie})</span>
            </button>

            <button
              onClick={() => setCategoryFilter("series")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                categoryFilter === "series"
                  ? "bg-cyan-500 text-dark-950 font-bold shadow-sm"
                  : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200"
              }`}
            >
              <Tv className="w-3 h-3" />
              <span>剧集 / 动漫</span>
              <span className="text-[10px] opacity-80">({counts.series})</span>
            </button>
          </div>

          {/* 视图切换：按剧集聚合卡片 vs 平铺明细 */}
          <div className="flex items-center gap-1 bg-dark-900 p-0.5 rounded-lg border border-white/5">
            <button
              onClick={() => setViewMode("grouped")}
              className={`p-1.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                viewMode === "grouped"
                  ? "bg-white/10 text-cyan-400 font-semibold"
                  : "text-gray-500 hover:text-gray-300"
              }`}
              title="按影视剧集智能聚合归类 (推荐)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">剧集聚合</span>
            </button>
            <button
              onClick={() => setViewMode("flat")}
              className={`p-1.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                viewMode === "flat"
                  ? "bg-white/10 text-cyan-400 font-semibold"
                  : "text-gray-500 hover:text-gray-300"
              }`}
              title="按单集平铺展示"
            >
              <List className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">平铺列表</span>
            </button>
          </div>
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
                    在任意视频播放详情页，点击【下载】并支持一键多选整季，加入后台即可自动智能并发断点续传。
                  </p>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center gap-2 text-center text-gray-400">
                  <p className="text-xs text-gray-400">当前分类下暂无下载任务</p>
                  <button
                    onClick={() => setCategoryFilter("all")}
                    className="text-xs text-cyan-400 hover:underline"
                  >
                    查看全部任务
                  </button>
                </div>
              ) : (
                <>
                  {/* 全局队列状态与批量操作栏 */}
                  <div className="flex items-center justify-between pb-1 px-1 text-xs text-gray-400">
                    <span className="font-medium text-gray-300">
                      共 {filteredTasks.length} 个任务在队列中
                      {viewMode === "grouped" && ` (归纳为 ${groupedList.length} 部作品)`}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={resumeAll}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                      >
                        全部继续
                      </button>
                      <span className="text-white/20">|</span>
                      <button
                        onClick={pauseAll}
                        className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                      >
                        全部暂停
                      </button>
                    </div>
                  </div>

                  {/* 聚合视图模式 */}
                  {viewMode === "grouped" ? (
                    groupedList.map((group) => {
                      // 单部电影或只有一集时直接渲染单条卡片
                      if (group.tasks.length === 1 && group.category === "movie") {
                        const task = group.tasks[0];
                        return (
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
                        );
                      }

                      // 多集电视剧/动漫渲染为剧集聚合折叠卡片
                      const isExpanded = expandedGroups.has(group.key);
                      return (
                        <DownloadingVodGroupCard
                          key={group.key}
                          group={group}
                          isExpanded={isExpanded}
                          onToggleExpand={() => toggleGroupExpand(group.key)}
                          onPauseGroup={() => handlePauseGroup(group)}
                          onResumeGroup={() => handleResumeGroup(group)}
                          onDeleteGroup={() => handleDeleteGroup(group)}
                          onPauseTask={pauseTask}
                          onResumeTask={resumeTask}
                          onDeleteTask={deleteTask}
                        />
                      );
                    })
                  ) : (
                    // 平铺明细模式
                    filteredTasks.map((task) => (
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
              ) : filteredTasks.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center gap-2 text-center text-gray-400">
                  <p className="text-xs text-gray-400">当前分类下暂无已下载视频</p>
                  <button
                    onClick={() => setCategoryFilter("all")}
                    className="text-xs text-cyan-400 hover:underline"
                  >
                    查看全部离线视频
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-1 px-1 text-xs text-gray-400">
                    <span className="font-medium text-gray-300">
                      共 {filteredTasks.length} 个离线视频
                      {viewMode === "grouped" && ` (归纳为 ${groupedList.length} 部作品)`}
                    </span>
                    <span className="text-[11px] font-mono text-cyan-400">
                      占用本地空间：{formatBytes(groupedList.reduce((acc, g) => acc + g.totalSize, 0))}
                    </span>
                  </div>

                  {/* 离线聚合视图模式 */}
                  {viewMode === "grouped" ? (
                    groupedList.map((group) => {
                      if (group.tasks.length === 1 && group.category === "movie") {
                        const task = group.tasks[0];
                        return (
                          <CompletedTaskItem
                            key={task.id}
                            task={task}
                            onPlay={() => playOfflineVideo(task.id)}
                            onExport={() => exportVideo(task.id)}
                            onDelete={() => {
                              if (confirm(`确定从本地删除离线视频【${task.vodName} - ${task.episodeName}】吗？`)) {
                                deleteTask(task.id);
                              }
                            }}
                          />
                        );
                      }

                      const isExpanded = expandedGroups.has(group.key);
                      return (
                        <CompletedVodGroupCard
                          key={group.key}
                          group={group}
                          isExpanded={isExpanded}
                          onToggleExpand={() => toggleGroupExpand(group.key)}
                          onDeleteGroup={() => handleDeleteGroup(group)}
                          onPlayTask={playOfflineVideo}
                          onExportTask={exportVideo}
                          onDeleteTask={deleteTask}
                        />
                      );
                    })
                  ) : (
                    // 平铺明细模式
                    filteredTasks.map((task) => (
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

/**
 * 正在下载 - 剧集聚合折叠卡片组件 (Group Card)
 */
function DownloadingVodGroupCard({
  group,
  isExpanded,
  onToggleExpand,
  onPauseGroup,
  onResumeGroup,
  onDeleteGroup,
  onPauseTask,
  onResumeTask,
  onDeleteTask,
}: {
  group: VodTaskGroup;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPauseGroup: () => void;
  onResumeGroup: () => void;
  onDeleteGroup: () => void;
  onPauseTask: (id: string) => void;
  onResumeTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}) {
  const isWorking = group.workingCount > 0;
  const isAllPaused = group.workingCount === 0 && group.queuedCount === 0 && group.pausedCount > 0;

  return (
    <div className="rounded-2xl bg-dark-800/90 border border-white/10 overflow-hidden shadow-md transition hover:border-cyan-500/30">
      {/* Group Header */}
      <div
        className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] select-none"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* 影视封面或分类图标 */}
          <div className="w-11 h-14 rounded-lg bg-dark-950 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative">
            {group.cover ? (
              <img src={group.cover} alt={group.vodName} className="w-full h-full object-cover" />
            ) : group.category === "movie" ? (
              <Film className="w-5 h-5 text-gray-500" />
            ) : (
              <Tv className="w-5 h-5 text-gray-500" />
            )}
            <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] text-cyan-300 text-center py-0.5 font-bold">
              {group.typeName || (group.category === "movie" ? "电影" : "剧集")}
            </span>
          </div>

          {/* 剧集信息与聚合进度 */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white truncate">{group.vodName}</h4>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-bold shrink-0">
                共 {group.tasks.length} 集
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-400 font-mono">
              {isWorking && (
                <span className="text-cyan-400 font-semibold flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> {group.workingCount} 集下载中
                </span>
              )}
              {group.queuedCount > 0 && (
                <span className="text-amber-300/90 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" /> {group.queuedCount} 集排队中
                </span>
              )}
              {isAllPaused && (
                <span className="text-amber-400 font-medium">全剧已暂停</span>
              )}
              {group.speed > 0 && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="text-emerald-400 font-bold">{formatBytes(group.speed)}/s</span>
                </>
              )}
            </div>

            {/* 聚合总进度条 */}
            <div className="w-full bg-dark-950 rounded-full h-1.5 overflow-hidden border border-white/5 mt-1">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(group.avgPercent, 2)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 剧集快速控制按钮 */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isWorking || group.queuedCount > 0 ? (
            <button
              onClick={onPauseGroup}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-400 hover:text-amber-300 transition cursor-pointer"
              title="暂停该剧全部下载"
            >
              <Pause className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={onResumeGroup}
              className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
              title="继续该剧全部下载"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          )}

          <button
            onClick={onDeleteGroup}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition cursor-pointer"
            title="取消并删除整部剧"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleExpand}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white transition cursor-pointer"
            title={isExpanded ? "收起剧集明细" : "展开剧集明细"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 展开的单集子列表 */}
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-white/5 bg-dark-950/40 space-y-2">
          <div className="text-[11px] text-gray-400 font-medium px-1 flex items-center justify-between">
            <span>剧集列表 ({group.tasks.length} 集)</span>
            <span>总已下载：{formatBytes(group.downloadedBytes)}</span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto overscroll-contain pr-1">
            {group.tasks.map((task) => (
              <DownloadingTaskItem
                key={task.id}
                task={task}
                compact
                onPause={() => onPauseTask(task.id)}
                onResume={() => onResumeTask(task.id)}
                onDelete={() => {
                  if (confirm(`确定取消并删除【${task.vodName} - ${task.episodeName}】吗？`)) {
                    onDeleteTask(task.id);
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 离线已下载 - 剧集聚合折叠卡片组件 (Group Card)
 */
function CompletedVodGroupCard({
  group,
  isExpanded,
  onToggleExpand,
  onDeleteGroup,
  onPlayTask,
  onExportTask,
  onDeleteTask,
}: {
  group: VodTaskGroup;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDeleteGroup: () => void;
  onPlayTask: (id: string) => void;
  onExportTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl bg-dark-800/90 border border-white/10 overflow-hidden shadow-md transition hover:border-cyan-500/30">
      {/* Group Header */}
      <div
        className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] select-none"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-11 h-14 rounded-lg bg-dark-950 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative">
            {group.cover ? (
              <img src={group.cover} alt={group.vodName} className="w-full h-full object-cover" />
            ) : group.category === "movie" ? (
              <Film className="w-5 h-5 text-gray-500" />
            ) : (
              <Tv className="w-5 h-5 text-gray-500" />
            )}
            <span className="absolute bottom-0 inset-x-0 bg-emerald-500/90 text-dark-950 text-[9px] text-center py-0.5 font-bold">
              已就绪
            </span>
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white truncate">{group.vodName}</h4>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold shrink-0">
                已离线 {group.tasks.length} 集
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 本地全量就绪
              </span>
              <span>·</span>
              <span>占用空间：{formatBytes(group.totalSize)}</span>
            </div>
          </div>
        </div>

        {/* 快速播放首集与折叠按钮 */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onPlayTask(group.tasks[0].id)}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-dark-950 font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-md shadow-cyan-500/20 active:scale-95"
            title="播放第 1 集"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>播放</span>
          </button>

          <button
            onClick={onDeleteGroup}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition cursor-pointer"
            title="删除整部剧的离线缓存"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleExpand}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white transition cursor-pointer"
            title={isExpanded ? "收起剧集明细" : "展开剧集明细"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 展开的单集子列表 */}
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-white/5 bg-dark-950/40 space-y-2">
          <div className="text-[11px] text-gray-400 font-medium px-1 flex items-center justify-between">
            <span>选集列表 (点击任意集播放)</span>
            <span>共 {group.tasks.length} 集</span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto overscroll-contain pr-1">
            {group.tasks.map((task) => (
              <CompletedTaskItem
                key={task.id}
                task={task}
                compact
                onPlay={() => onPlayTask(task.id)}
                onExport={() => onExportTask(task.id)}
                onDelete={() => {
                  if (confirm(`确定从本地删除离线视频【${task.vodName} - ${task.episodeName}】吗？`)) {
                    onDeleteTask(task.id);
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 单集下载中条目 (支持普通模式和 compact 紧凑子集模式)
 */
function DownloadingTaskItem({
  task,
  compact = false,
  onPause,
  onResume,
  onDelete,
}: {
  task: DownloadTaskRecord;
  compact?: boolean;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
}) {
  const isWorking = task.status === "downloading" || task.status === "parsing" || task.status === "remuxing";
  const isQueued = task.status === "queued";
  const isPaused = task.status === "paused" || task.status === "idle";
  const isError = task.status === "error";

  return (
    <div
      className={`rounded-2xl bg-dark-800/80 border border-white/10 space-y-2 shadow-sm ${
        compact ? "p-2.5 bg-dark-900/60" : "p-3.5"
      }`}
    >
      {/* Title & Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {!compact && (
              <h4 className="text-xs sm:text-sm font-bold text-white truncate">{task.vodName}</h4>
            )}
            <span
              className={`font-semibold text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10 shrink-0 ${
                compact ? "text-xs font-bold text-white" : "text-[10px]"
              }`}
            >
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
            {task.status === "queued" && (
              <span className="text-amber-300/90 flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3 text-amber-400" /> 排队等待中 (空闲后自动开始)
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
                <Loader2 className="w-3 h-3 animate-spin" /> 本地无损合成 MP4...
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
          {(isWorking || isQueued) && (
            <button
              onClick={onPause}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-400 hover:text-amber-300 transition cursor-pointer"
              title={isQueued ? "取消排队" : "暂停下载"}
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

/**
 * 单集离线已就绪条目 (支持普通模式和 compact 紧凑子集模式)
 */
function CompletedTaskItem({
  task,
  compact = false,
  onPlay,
  onExport,
  onDelete,
}: {
  task: DownloadTaskRecord;
  compact?: boolean;
  onPlay: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`rounded-2xl bg-dark-800/80 border border-white/10 flex items-center justify-between gap-3 shadow-sm hover:border-cyan-500/30 transition ${
        compact ? "p-2.5 bg-dark-900/60" : "p-3.5"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {!compact && (
            <h4 className="text-xs sm:text-sm font-bold text-white truncate">{task.vodName}</h4>
          )}
          <span
            className={`font-semibold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 shrink-0 ${
              compact ? "text-xs font-bold text-white" : "text-[10px]"
            }`}
          >
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
