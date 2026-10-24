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
  ChevronLeft,
  Tv,
  Clapperboard,
  Settings,
  Zap,
  Check,
} from "lucide-react";
import { useDownloadManager } from "@/contexts/DownloadContext";
import { DownloadTaskRecord, StorageQuotaInfo } from "@/lib/download-store";
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
    settings,
    updateSettings,
  } = useDownloadManager();

  const [activeTab, setActiveTab] = useState<"downloading" | "completed">("downloading");
  const [categoryFilter, setCategoryFilter] = useState<CategoryType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  // 监听浏览器/手机手势返回 (popstate) 与 ESC 键
  useEffect(() => {
    if (!isDrawerOpen) return;

    // 记录 PWA 弹层历史栈，使得手机边缘侧滑返回或安卓物理返回键能优雅关闭抽屉，而非退出应用
    window.history.pushState({ modal: "download-drawer" }, "");

    const handlePopState = () => {
      closeDrawer();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawerOpen) {
        closeDrawer();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
      // 如果是通过点击按钮主动关闭，且当前历史记录栈顶仍是本弹层，自动后退一步保持历史栈干净
      if (window.history.state?.modal === "download-drawer") {
        window.history.back();
      }
    };
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
      className="fixed inset-0 z-[99999] overscroll-contain bg-black/80 backdrop-blur-xl flex items-center justify-end animate-in fade-in duration-300"
      onClick={closeDrawer}
    >
      <div
        className="bg-[#080b14]/95 backdrop-blur-3xl border-l border-white/10 w-full max-w-xl h-full flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden overscroll-contain animate-in slide-in-from-right duration-300 ease-spring"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient background glow inside drawer */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/[0.07] rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-1/3 left-0 w-80 h-80 bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none -ml-20" />

        {/* Drawer Header */}
        <div className="p-4 sm:p-5 pt-[max(1.25rem,env(safe-area-inset-top))] border-b border-white/[0.08] flex items-center justify-between bg-[#06080e]/90 backdrop-blur-2xl gap-3 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* 移动端专享返回按钮 */}
            <button
              onClick={closeDrawer}
              className="p-2 -ml-1 text-gray-300 hover:text-white rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.06] flex items-center gap-1 transition-all duration-200 cursor-pointer shrink-0"
              title="返回观影"
              aria-label="返回或关闭下载中心"
            >
              <ChevronLeft className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-gray-200 font-sans">返回</span>
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.2)] shrink-0">
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-sm sm:text-base font-bold text-white flex items-center gap-2.5 truncate tracking-wide">
                PWA 离线下载中心
                {activeCount > 0 && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-gray-400 truncate hidden xs:block font-sans font-normal mt-0.5">
                极速断点续传 · 智能剧集聚合 · 离线免流起播
              </p>
            </div>
          </div>

          <button
            onClick={closeDrawer}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/[0.08] active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-1 shrink-0 border border-transparent hover:border-white/10"
            title="关闭窗口"
          >
            <span className="text-xs text-gray-400 hidden sm:inline font-sans">关闭</span>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (正在下载 vs 离线已下载) */}
        <div className="flex border-b border-white/[0.08] bg-[#06080e]/60 px-5 pt-3 gap-3 relative z-10">
          <button
            onClick={() => setActiveTab("downloading")}
            className={`pb-3 px-3 text-xs sm:text-sm font-display font-bold flex items-center gap-2 border-b-2 transition-all duration-200 cursor-pointer relative ${
              activeTab === "downloading"
                ? "border-cyan-400 text-cyan-300 shadow-[0_2px_12px_rgba(34,211,238,0.3)]"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Loader2 className={`w-3.5 h-3.5 ${activeCount > 0 ? "animate-spin text-cyan-400" : ""}`} />
            <span>正在下载</span>
            {activeTasks.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-mono font-bold shadow-sm">
                {activeTasks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("completed")}
            className={`pb-3 px-3 text-xs sm:text-sm font-display font-bold flex items-center gap-2 border-b-2 transition-all duration-200 cursor-pointer relative ${
              activeTab === "completed"
                ? "border-emerald-400 text-emerald-300 shadow-[0_2px_12px_rgba(16,185,129,0.3)]"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>离线已下载</span>
            {completedCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 font-mono font-bold shadow-sm">
                {completedCount}
              </span>
            )}
          </button>
        </div>

        {/* 快捷分类过滤器与视图模式切换栏 */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#06080e]/40 border-b border-white/[0.05] text-xs relative z-10">
          {/* 分类筛选胶囊按钮 */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                categoryFilter === "all"
                  ? "bg-gradient-to-r from-cyan-500 to-cyan-400 text-dark-950 font-bold shadow-[0_2px_10px_rgba(34,211,238,0.3)]"
                  : "bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-gray-200 border border-white/[0.05]"
              }`}
            >
              <span>全部</span>
              <span className="text-[10px] opacity-80 font-mono">({counts.all})</span>
            </button>

            <button
              onClick={() => setCategoryFilter("movie")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                categoryFilter === "movie"
                  ? "bg-gradient-to-r from-cyan-500 to-cyan-400 text-dark-950 font-bold shadow-[0_2px_10px_rgba(34,211,238,0.3)]"
                  : "bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-gray-200 border border-white/[0.05]"
              }`}
            >
              <Clapperboard className="w-3 h-3" />
              <span>电影</span>
              <span className="text-[10px] opacity-80 font-mono">({counts.movie})</span>
            </button>

            <button
              onClick={() => setCategoryFilter("series")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                categoryFilter === "series"
                  ? "bg-gradient-to-r from-cyan-500 to-cyan-400 text-dark-950 font-bold shadow-[0_2px_10px_rgba(34,211,238,0.3)]"
                  : "bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-gray-200 border border-white/[0.05]"
              }`}
            >
              <Tv className="w-3 h-3" />
              <span>剧集 / 动漫</span>
              <span className="text-[10px] opacity-80 font-mono">({counts.series})</span>
            </button>
          </div>

          {/* 视图切换：按剧集聚合卡片 vs 平铺明细 */}
          <div className="flex items-center gap-1 bg-[#06080e]/80 p-1 rounded-xl border border-white/[0.06]">
            <button
              onClick={() => setViewMode("grouped")}
              className={`px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                viewMode === "grouped"
                  ? "bg-white/[0.12] text-cyan-300 shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              title="按影视剧集智能聚合归类 (推荐)"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] hidden sm:inline">剧集聚合</span>
            </button>
            <button
              onClick={() => setViewMode("flat")}
              className={`px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                viewMode === "flat"
                  ? "bg-white/[0.12] text-cyan-300 shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              title="按单集平铺展示"
            >
              <List className="w-3.5 h-3.5 text-gray-400" />
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
        {(() => {
          const isCustomLimit = typeof settings.storageLimitGB === "number" && settings.storageLimitGB > 0;
          const limitBytes = isCustomLimit ? settings.storageLimitGB! * 1024 * 1024 * 1024 : storageQuota.quotaBytes;
          const percent = limitBytes > 0 ? Math.min(Math.round((storageQuota.usedBytes / limitBytes) * 100), 100) : 0;
          const isFull = isCustomLimit && storageQuota.usedBytes >= limitBytes;
          const isNearFull = isCustomLimit && percent >= 85;

          return (
            <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-[#06080e]/95 backdrop-blur-2xl space-y-2.5 relative z-10">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-2 font-display font-semibold text-gray-200">
                  <div className="w-5 h-5 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                    <HardDrive className="w-3 h-3" />
                  </div>
                  <span>离线存储配额</span>
                  {isCustomLimit && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 font-mono font-bold">
                      限额 {settings.storageLimitGB} GB
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-bold transition-all duration-200 cursor-pointer hover:underline"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>偏好设置</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-gray-300">
                <span>
                  已用 <strong className="text-cyan-300 font-bold">{formatBytes(storageQuota.usedBytes)}</strong> /{" "}
                  {isCustomLimit ? (
                    <>
                      上限 <strong className="text-amber-300 font-bold">{settings.storageLimitGB} GB</strong>
                    </>
                  ) : (
                    <>系统分配 {formatBytes(storageQuota.quotaBytes)}</>
                  )}
                </span>
                <span className={isFull ? "text-rose-400 font-bold" : isNearFull ? "text-amber-400 font-bold" : "text-cyan-400 font-bold"}>
                  {percent}%
                </span>
              </div>

              <div className="w-full bg-[#05070e] rounded-full h-2 overflow-hidden border border-white/[0.05]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isFull
                      ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                      : isNearFull
                      ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                      : "bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              {isFull ? (
                <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1.5 bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  已达 {settings.storageLimitGB} GB 设定上限，已自动暂停新任务。点击上方偏好设置调整。
                </p>
              ) : isNearFull ? (
                <p className="text-[11px] text-amber-300 font-medium flex items-center gap-1.5 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                  ⚠️ 存储空间已使用超过 85%，接近自设上限。
                </p>
              ) : null}
            </div>
          );
        })()}

        {/* 移动端底部常驻快捷退出/返回条 */}
        <div className="p-3 sm:p-4 border-t border-white/[0.08] bg-[#06080e] pb-[max(1rem,env(safe-area-inset-bottom))] relative z-10">
          <button
            type="button"
            onClick={closeDrawer}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-dark-950 font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-98 shadow-[0_4px_25px_rgba(34,211,238,0.3)] cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>返回继续观影 / 关闭下载中心</span>
          </button>
        </div>

        {/* 下载与存储偏好设置模态框 */}
        {isSettingsOpen && (
          <DownloadSettingsModal
            settings={settings}
            onUpdateSettings={updateSettings}
            onClose={() => setIsSettingsOpen(false)}
            storageQuota={storageQuota}
          />
        )}
      </div>
    </div>
  );
}

/**
 * 下载并发与离线存储上限偏好设置模态框
 */
function DownloadSettingsModal({
  settings,
  onUpdateSettings,
  onClose,
  storageQuota,
}: {
  settings: any;
  onUpdateSettings: (newSettings: any) => void;
  onClose: () => void;
  storageQuota: StorageQuotaInfo;
}) {
  const [customInput, setCustomInput] = useState<string>(
    settings.storageLimitGB ? String(settings.storageLimitGB) : ""
  );

  const presetLimits = [
    { label: "跟随系统 (不限)", val: null },
    { label: "5 GB", val: 5 },
    { label: "10 GB", val: 10 },
    { label: "20 GB", val: 20 },
    { label: "50 GB", val: 50 },
    { label: "100 GB", val: 100 },
  ];

  const handleApplyCustom = (valStr: string) => {
    const num = parseInt(valStr.trim(), 10);
    if (!isNaN(num) && num > 0) {
      onUpdateSettings({ storageLimitGB: num });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0c101c]/95 border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-[0_0_60px_rgba(0,0,0,0.9)] space-y-6 animate-in zoom-in-95 duration-200 ease-spring"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white tracking-wide">下载与存储设置</h3>
              <p className="text-xs text-gray-400 mt-0.5">自定义本地沙盒磁盘占用与多线程性能</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 active:scale-90 transition-all duration-150 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. 离线存储空间上限设置 */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              离线存储空间上限：
            </span>
            <span className="text-[11px] text-amber-400 font-mono font-semibold">
              {settings.storageLimitGB ? `${settings.storageLimitGB} GB` : "跟随系统无限制"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {presetLimits.map((item, idx) => {
              const isSelected = settings.storageLimitGB === item.val;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ storageLimitGB: item.val });
                    setCustomInput(item.val ? String(item.val) : "");
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer text-center border active:scale-95 ${
                    isSelected
                      ? "bg-gradient-to-r from-cyan-400 to-teal-400 text-dark-950 font-bold border-cyan-300 shadow-[0_2px_12px_rgba(34,211,238,0.3)]"
                      : "bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border-white/[0.06]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* 自定义 GB 输入 */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-gray-400 shrink-0 font-sans">自定义上限：</span>
            <div className="flex items-center gap-2 flex-1">
              <input
                type="number"
                min="1"
                max="2048"
                placeholder="例如: 30"
                value={customInput}
                onChange={(e) => {
                  setCustomInput(e.target.value);
                  handleApplyCustom(e.target.value);
                }}
                className="w-full bg-[#05070e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(34,211,238,0.25)] focus:outline-none transition-all duration-200"
              />
              <span className="text-xs text-gray-400 font-mono shrink-0">GB</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed bg-[#05070e]/80 p-3 rounded-2xl border border-white/[0.05]">
            💡 达到上限后下载任务将自动暂停保护磁盘空间。当前系统底层最多可分配{" "}
            <span className="text-cyan-400 font-bold font-mono">{formatBytes(storageQuota.quotaBytes)}</span>。
          </p>
        </div>

        {/* 2. 切片并发拉取线程 */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5 font-display">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
              单集分片并发线程：
            </span>
            <span className="text-xs text-amber-300 font-mono font-bold">
              {settings.concurrency} 线程
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { val: 4, label: "4 线程", tip: "普通" },
              { val: 8, label: "8 线程", tip: "极速推荐" },
              { val: 16, label: "16 线程", tip: "超高性能" },
              { val: 32, label: "32 线程", tip: "狂暴千兆" },
            ].map((item) => {
              const isSelected = settings.concurrency === item.val;
              return (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => onUpdateSettings({ concurrency: item.val })}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer border active:scale-95 ${
                    isSelected
                      ? "bg-gradient-to-r from-amber-400 to-amber-300 text-dark-950 font-bold border-amber-300 shadow-[0_2px_12px_rgba(251,191,36,0.35)]"
                      : "bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border-white/[0.06]"
                  }`}
                >
                  <span className="font-mono">{item.label}</span>
                  <span className="text-[9px] font-normal opacity-80">{item.tip}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 同时并发排队任务数 */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5 font-display">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              同时并发下载集数：
            </span>
            <span className="text-xs text-cyan-300 font-mono font-bold">
              {settings.maxConcurrentTasks} 集
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { val: 1, label: "1 集独占" },
              { val: 2, label: "2 集并发" },
              { val: 3, label: "3 集并发" },
              { val: 4, label: "4 集并发" },
            ].map((item) => {
              const isSelected = settings.maxConcurrentTasks === item.val;
              return (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => onUpdateSettings({ maxConcurrentTasks: item.val })}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer text-center border active:scale-95 ${
                    isSelected
                      ? "bg-gradient-to-r from-cyan-400 to-teal-400 text-dark-950 font-bold border-cyan-300 shadow-[0_2px_12px_rgba(34,211,238,0.35)]"
                      : "bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border-white/[0.06]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-dark-950 font-display font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer shadow-[0_4px_25px_rgba(34,211,238,0.35)] active:scale-98"
          >
            完成并保存设置
          </button>
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
    <div className="rounded-2xl bg-[#0c101c]/80 backdrop-blur-xl border border-white/[0.08] overflow-hidden shadow-lg transition-all duration-300 ease-spring hover:border-cyan-500/40 hover:shadow-[0_4px_30px_rgba(34,211,238,0.12)]">
      {/* Group Header */}
      <div
        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] select-none transition-colors duration-200"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* 影视封面或分类图标 */}
          <div className="w-12 h-16 rounded-xl bg-dark-950 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative shadow-md">
            {group.cover ? (
              <img src={group.cover} alt={group.vodName} className="w-full h-full object-cover" />
            ) : group.category === "movie" ? (
              <Film className="w-6 h-6 text-gray-500" />
            ) : (
              <Tv className="w-6 h-6 text-gray-500" />
            )}
            <span className="absolute bottom-0 inset-x-0 bg-black/85 backdrop-blur-xs text-[9px] text-cyan-300 text-center py-0.5 font-bold font-mono">
              {group.typeName || (group.category === "movie" ? "电影" : "剧集")}
            </span>
          </div>

          {/* 剧集信息与聚合进度 */}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <h4 className="font-display text-sm sm:text-base font-bold text-white truncate">{group.vodName}</h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 font-bold shrink-0 font-mono">
                共 {group.tasks.length} 集
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-gray-400 font-mono">
              {isWorking && (
                <span className="text-cyan-300 font-semibold flex items-center gap-1.5 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                  <Loader2 className="w-3 h-3 animate-spin text-cyan-400" /> {group.workingCount} 集下载中
                </span>
              )}
              {group.queuedCount > 0 && (
                <span className="text-amber-300/90 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  <Clock className="w-3 h-3 text-amber-400" /> {group.queuedCount} 集排队
                </span>
              )}
              {isAllPaused && (
                <span className="text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">全剧已暂停</span>
              )}
              {group.speed > 0 && (
                <span className="text-emerald-300 font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400 fill-current" />
                  {formatBytes(group.speed)}/s
                </span>
              )}
            </div>

            {/* 聚合总进度条 */}
            <div className="w-full bg-[#05070e] rounded-full h-1.5 overflow-hidden border border-white/[0.05] mt-1">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                style={{ width: `${Math.max(group.avgPercent, 2)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 剧集快速控制按钮 */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isWorking || group.queuedCount > 0 ? (
            <button
              onClick={onPauseGroup}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-90 text-amber-400 hover:text-amber-300 transition-all duration-150 cursor-pointer border border-white/[0.06]"
              title="暂停该剧全部下载"
            >
              <Pause className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={onResumeGroup}
              className="p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 active:scale-90 text-cyan-300 hover:text-cyan-200 transition-all duration-150 cursor-pointer border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
              title="继续该剧全部下载"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          )}

          <button
            onClick={onDeleteGroup}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 active:scale-90 text-gray-400 hover:text-rose-400 transition-all duration-150 cursor-pointer border border-white/[0.06]"
            title="取消并删除整部剧"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleExpand}
            className="p-2 rounded-xl text-gray-400 hover:text-white active:scale-90 transition-all duration-150 cursor-pointer"
            title={isExpanded ? "收起剧集明细" : "展开剧集明细"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 展开的单集子列表 */}
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-2 border-t border-white/[0.06] bg-[#05070e]/60 space-y-2">
          <div className="text-[11px] text-gray-400 font-medium px-1 flex items-center justify-between font-mono">
            <span>剧集明细 ({group.tasks.length} 集)</span>
            <span>已下载：{formatBytes(group.downloadedBytes)}</span>
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
    <div className="rounded-2xl bg-[#0c101c]/80 backdrop-blur-xl border border-white/[0.08] overflow-hidden shadow-lg transition-all duration-300 ease-spring hover:border-emerald-500/40 hover:shadow-[0_4px_30px_rgba(16,185,129,0.12)]">
      {/* Group Header */}
      <div
        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] select-none transition-colors duration-200"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-12 h-16 rounded-xl bg-dark-950 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative shadow-md">
            {group.cover ? (
              <img src={group.cover} alt={group.vodName} className="w-full h-full object-cover" />
            ) : group.category === "movie" ? (
              <Film className="w-6 h-6 text-gray-500" />
            ) : (
              <Tv className="w-6 h-6 text-gray-500" />
            )}
            <span className="absolute bottom-0 inset-x-0 bg-emerald-500/95 backdrop-blur-xs text-dark-950 text-[9px] text-center py-0.5 font-bold font-mono">
              全量就绪
            </span>
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <h4 className="font-display text-sm sm:text-base font-bold text-white truncate">{group.vodName}</h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold shrink-0 font-mono">
                离线 {group.tasks.length} 集
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 免流秒播
              </span>
              <span>·</span>
              <span>占用空间：{formatBytes(group.totalSize)}</span>
            </div>
          </div>
        </div>

        {/* 快速播放首集与折叠按钮 */}
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onPlayTask(group.tasks[0].id)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-dark-950 font-bold text-xs flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-[0_2px_15px_rgba(34,211,238,0.35)] active:scale-95"
            title="播放第 1 集"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>离线播</span>
          </button>

          <button
            onClick={onDeleteGroup}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 active:scale-90 text-gray-400 hover:text-rose-400 transition-all duration-150 cursor-pointer border border-white/[0.06]"
            title="删除整部剧的离线缓存"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleExpand}
            className="p-2 rounded-xl text-gray-400 hover:text-white active:scale-90 transition-all duration-150 cursor-pointer"
            title={isExpanded ? "收起剧集明细" : "展开剧集明细"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 展开的单集子列表 */}
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-2 border-t border-white/[0.06] bg-[#05070e]/60 space-y-2">
          <div className="text-[11px] text-gray-400 font-medium px-1 flex items-center justify-between font-mono">
            <span>选集列表 (点击任意集离线播)</span>
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
      className={`rounded-2xl border transition-all duration-200 space-y-2.5 ${
        compact
          ? "p-3 bg-[#080b16]/70 border-white/[0.06] hover:border-cyan-500/30"
          : "p-4 bg-[#0c101c]/80 backdrop-blur-xl border-white/[0.08] hover:border-cyan-500/40 shadow-lg"
      }`}
    >
      {/* Title & Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {!compact && (
              <h4 className="font-display text-xs sm:text-sm font-bold text-white truncate">{task.vodName}</h4>
            )}
            <span
              className={`font-mono font-bold text-cyan-300 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/25 shrink-0 ${
                compact ? "text-xs text-white" : "text-[11px]"
              }`}
            >
              {task.episodeName}
            </span>
            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-400 shrink-0 border border-white/[0.06]">
              {task.format}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-gray-400 font-mono">
            {task.status === "parsing" && (
              <span className="text-amber-400 flex items-center gap-1.5 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> 解析切片列表中...
              </span>
            )}
            {task.status === "queued" && (
              <span className="text-amber-300/90 flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> 排队等待中 (空闲后自动开始)
              </span>
            )}
            {task.status === "downloading" && (
              <>
                <span className="text-cyan-300 font-bold">{task.percent}%</span>
                <span>·</span>
                <span>
                  {task.downloadedCount} / {task.totalSegments} 片
                </span>
                <span>·</span>
                <span className="text-emerald-400 font-bold">{formatBytes(task.speed)}/s</span>
              </>
            )}
            {task.status === "remuxing" && (
              <span className="text-cyan-400 flex items-center gap-1.5 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> 本地无损合成 MP4...
              </span>
            )}
            {isPaused && (
              <span className="text-amber-300 font-medium">已暂停 ({task.percent}% · 可断点续传)</span>
            )}
            {isError && (
              <span className="text-rose-400 flex items-center gap-1 truncate max-w-[240px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {task.error || "网络中断，可点击重试续传"}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {(isWorking || isQueued) && (
            <button
              onClick={onPause}
              className="p-1.5 sm:p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-90 text-amber-400 hover:text-amber-300 transition-all duration-150 cursor-pointer border border-white/[0.06]"
              title={isQueued ? "取消排队" : "暂停下载"}
            >
              <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
            </button>
          )}

          {(isPaused || isError) && (
            <button
              onClick={onResume}
              className="p-1.5 sm:p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 active:scale-90 text-cyan-300 hover:text-cyan-200 transition-all duration-150 cursor-pointer border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
              title="继续断点续传"
            >
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
            </button>
          )}

          <button
            onClick={onDelete}
            className="p-1.5 sm:p-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 active:scale-90 text-gray-400 hover:text-rose-400 transition-all duration-150 cursor-pointer border border-white/[0.06]"
            title="取消并删除任务"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#05070e] rounded-full h-1.5 overflow-hidden border border-white/[0.04]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isError
              ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
              : isPaused
              ? "bg-amber-400"
              : "bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
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
      className={`rounded-2xl border flex items-center justify-between gap-3 transition-all duration-200 ${
        compact
          ? "p-3 bg-[#080b16]/70 border-white/[0.06] hover:border-emerald-500/30"
          : "p-4 bg-[#0c101c]/80 backdrop-blur-xl border-white/[0.08] hover:border-emerald-500/40 shadow-lg"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {!compact && (
            <h4 className="font-display text-xs sm:text-sm font-bold text-white truncate">{task.vodName}</h4>
          )}
          <span
            className={`font-mono font-bold text-emerald-300 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 shrink-0 ${
              compact ? "text-xs text-white" : "text-[11px]"
            }`}
          >
            {task.episodeName}
          </span>
          <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-400 shrink-0 border border-white/[0.06]">
            {task.format}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-gray-400 font-mono">
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 已就绪
          </span>
          <span>·</span>
          <span>{formatBytes(task.completedSize || task.downloadedBytes)}</span>
          {task.totalDuration > 0 && (
            <>
              <span>·</span>
              <span>{formatDuration(task.totalDuration)}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onPlay}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-dark-950 font-bold text-xs flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-[0_2px_12px_rgba(34,211,238,0.3)] active:scale-95"
          title="无需网络，直接在本地播放"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>离线播</span>
        </button>

        <button
          onClick={onExport}
          className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-90 text-gray-300 hover:text-white transition-all duration-150 cursor-pointer border border-white/[0.06]"
          title="导出保存为本地相册/文件"
        >
          <ArrowDownToLine className="w-4 h-4" />
        </button>

        <button
          onClick={onDelete}
          className="p-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 active:scale-90 text-gray-400 hover:text-rose-400 transition-all duration-150 cursor-pointer border border-white/[0.06]"
          title="删除本地缓存释放空间"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function GlobalDownloadCenter() {
  const { currentOfflineVideo, closeOfflinePlayer, exportVideo } = useDownloadManager();

  return (
    <>
      <DownloadManagerDrawer />
      <OfflinePlayerModal
        isOpen={!!currentOfflineVideo}
        onClose={closeOfflinePlayer}
        taskId={currentOfflineVideo?.taskId}
        vodName={currentOfflineVideo?.vodName || ""}
        episodeName={currentOfflineVideo?.episodeName || ""}
        videoUrl={currentOfflineVideo?.blobUrl || ""}
        onExport={currentOfflineVideo?.taskId ? () => exportVideo(currentOfflineVideo.taskId) : undefined}
      />
    </>
  );
}
