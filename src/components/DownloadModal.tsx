"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  X,
  Copy,
  Check,
  Terminal,
  Zap,
  HardDrive,
  FileVideo,
  ListOrdered,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Square,
  Sparkles,
  ExternalLink,
  ChevronLeft,
} from "lucide-react";
import { PlaySource, Episode } from "@/lib/types";
import {
  downloadAndSaveM3U8,
  DownloadProgress,
} from "@/lib/m3u8-downloader";
import { useDownloadManager } from "@/contexts/DownloadContext";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  vodId?: string;
  vodName: string;
  typeName?: string;
  cover?: string;
  sources: PlaySource[];
  currentSourceIndex: number;
  currentEpIndex: number;
  onSelectEpisode?: (epIndex: number) => void;
  onSelectSource?: (srcIndex: number) => void;
}

type TabType = "browser" | "external" | "cmd" | "batch";

function formatBytes(bytes: number) {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function DownloadModal({
  isOpen,
  onClose,
  vodId,
  vodName,
  typeName,
  cover,
  sources,
  currentSourceIndex,
  currentEpIndex,
  onSelectEpisode,
  onSelectSource,
}: DownloadModalProps) {
  const { createAndStartTask, createBatchTasks, openDrawer, settings, updateSettings } = useDownloadManager();
  const [activeTab, setActiveTab] = useState<TabType>("browser");
  const [format, setFormat] = useState<"mp4" | "ts">("mp4");
  const [concurrency, setConcurrency] = useState<number>(settings.concurrency || 8);
  const [maxTasks, setMaxTasks] = useState<number>(settings.maxConcurrentTasks || 2);

  // 打开弹窗时同步全局偏好设置
  useEffect(() => {
    if (isOpen) {
      setConcurrency(settings.concurrency || 8);
      setMaxTasks(settings.maxConcurrentTasks || 2);
    }
  }, [isOpen, settings]);

  // 批量下载模式与选中集数集合
  const [downloadMode, setDownloadMode] = useState<"single" | "batch">("single");
  const [selectedEpIndices, setSelectedEpIndices] = useState<Set<number>>(new Set([currentEpIndex]));

  // 同步选中集数
  useEffect(() => {
    setSelectedEpIndices(new Set([currentEpIndex]));
  }, [currentEpIndex, isOpen]);

  // 复制反馈状态
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [copiedBatch, setCopiedBatch] = useState(false);
  const [copiedSingleEp, setCopiedSingleEp] = useState<number | null>(null);

  // 浏览器下载状态
  const [progress, setProgress] = useState<DownloadProgress>({
    phase: "idle",
    totalSegments: 0,
    downloadedSegments: 0,
    downloadedBytes: 0,
    speed: 0,
    percent: 0,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const isDownloading =
    progress.phase === "parsing" ||
    progress.phase === "downloading" ||
    progress.phase === "remuxing";

  // 取消浏览器端下载
  const handleCancelDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // 监听浏览器/手机手势返回 (popstate) 与 ESC 键
  useEffect(() => {
    if (!isOpen) return;

    // 记录 PWA 弹层历史栈，使得手机边缘侧滑返回或安卓物理返回键能优雅关闭弹窗，而非退出应用
    window.history.pushState({ modal: "download-modal" }, "");

    const handlePopState = () => {
      if (isDownloading) {
        if (!confirm("当前正在下载切片中，关闭将中止任务，确定退出吗？")) {
          window.history.pushState({ modal: "download-modal" }, "");
          return;
        }
        handleCancelDownload();
      }
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (isDownloading) {
          if (!confirm("当前正在下载切片中，关闭将中止任务，确定退出吗？")) return;
          handleCancelDownload();
        }
        onClose();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
      if (window.history.state?.modal === "download-modal") {
        window.history.back();
      }
    };
  }, [isOpen, onClose, isDownloading]);

  const currentSource =
    sources[currentSourceIndex] || sources[0] || { sourceName: "默认线路", episodes: [] };
  const currentEpisode =
    currentSource.episodes[currentEpIndex] || currentSource.episodes[0] || { name: "正片", url: "" };

  const currentM3U8Url = currentEpisode.url || "";
  const currentFileName = `${vodName} - ${currentEpisode.name}`;

  // 批量选集交互
  const handleToggleSelectEp = (index: number) => {
    setSelectedEpIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        if (next.size > 1) next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectAllEps = () => {
    if (!currentSource.episodes) return;
    const all = new Set<number>();
    currentSource.episodes.forEach((_, i) => all.add(i));
    setSelectedEpIndices(all);
  };

  const handleClearSelectEps = () => {
    setSelectedEpIndices(new Set([currentEpIndex]));
  };

  const handleInvertSelectEps = () => {
    if (!currentSource.episodes) return;
    setSelectedEpIndices((prev) => {
      const next = new Set<number>();
      currentSource.episodes.forEach((_, i) => {
        if (!prev.has(i)) next.add(i);
      });
      return next.size > 0 ? next : new Set([currentEpIndex]);
    });
  };

  const handleStartBatchQueue = async () => {
    if (!currentSource.episodes || selectedEpIndices.size === 0) return;
    const itemsToDownload = Array.from(selectedEpIndices)
      .sort((a, b) => a - b)
      .map((idx) => {
        const ep = currentSource.episodes[idx];
        return {
          vodId,
          vodName,
          episodeName: ep.name,
          typeName,
          cover,
          m3u8Url: ep.url,
          format,
          concurrency,
        };
      });

    await createBatchTasks(itemsToDownload, {
      concurrency,
      maxConcurrentTasks: maxTasks,
    });
    onClose();
  };

  // 锁定背景页面滚动，防止上下滚动穿透
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // ESC 键关闭模态框
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 复制当前播放地址
  const handleCopyUrl = () => {
    if (!currentM3U8Url) return;
    navigator.clipboard.writeText(currentM3U8Url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // 复制命令行
  const handleCopyCmd = (type: "ffmpeg" | "ytdlp", text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(type);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  // 批量复制整季所有下载链接
  const handleCopyBatch = () => {
    if (!currentSource.episodes || currentSource.episodes.length === 0) return;
    const batchText = currentSource.episodes
      .map((ep: Episode) => `${ep.url}\t${vodName}_${ep.name}.mp4`)
      .join("\n");
    navigator.clipboard.writeText(batchText);
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 2500);
  };

  // 复制单集链接
  const handleCopySingle = (index: number, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedSingleEp(index);
    setTimeout(() => setCopiedSingleEp(null), 2000);
  };

  // 开始浏览器端下载
  const handleStartDownload = async () => {
    if (!currentM3U8Url) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await downloadAndSaveM3U8({
        m3u8Url: currentM3U8Url,
        filename: currentFileName,
        format,
        concurrency,
        onProgress: (p) => setProgress(p),
        signal: controller.signal,
      });
    } catch (err: any) {
      if (controller.signal.aborted) {
        setProgress({
          phase: "aborted",
          totalSegments: 0,
          downloadedSegments: 0,
          downloadedBytes: 0,
          speed: 0,
          percent: 0,
        });
      } else {
        setProgress((prev) => ({
          ...prev,
          phase: "error",
          error: err.message || "下载异常中断，请检查网络或切换专业工具下载",
        }));
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  // 重置下载状态
  const handleResetDownload = () => {
    handleCancelDownload();
    setProgress({
      phase: "idle",
      totalSegments: 0,
      downloadedSegments: 0,
      downloadedBytes: 0,
      speed: 0,
      percent: 0,
    });
  };

  const ffmpegCmd = `ffmpeg -i "${currentM3U8Url}" -c copy -bsf:a aac_adtstoasc "${currentFileName}.mp4"`;
  const ytdlpCmd = `yt-dlp "${currentM3U8Url}" -o "${currentFileName}.%(ext)s"`;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] overscroll-contain bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-300"
      onClick={() => {
        if (isDownloading) {
          if (!confirm("当前正在下载切片中，关闭将中止任务，确定退出吗？")) return;
          handleCancelDownload();
        }
        onClose();
      }}
    >
      <div
        className="bg-[#0a0d18]/95 backdrop-blur-3xl border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden overscroll-contain animate-in zoom-in-95 duration-200 ease-spring"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient background glow inside modal */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/[0.08] rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/[0.05] rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        {/* 顶部标题区 */}
        <div className="p-4 sm:p-5 pt-[max(1.25rem,env(safe-area-inset-top))] border-b border-white/[0.08] flex items-center justify-between bg-[#06080e]/90 backdrop-blur-2xl gap-3 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* 移动端专享返回按钮 */}
            <button
              onClick={() => {
                if (isDownloading) {
                  if (!confirm("当前正在下载切片中，关闭将中止任务，确定退出吗？")) return;
                  handleCancelDownload();
                }
                onClose();
              }}
              className="p-2 -ml-1 text-gray-300 hover:text-white rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.06] flex items-center gap-1 transition-all duration-200 cursor-pointer shrink-0"
              title="返回观影"
              aria-label="返回或关闭下载窗口"
            >
              <ChevronLeft className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-gray-200 font-sans">返回</span>
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.2)] shrink-0">
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-sm sm:text-lg font-bold text-white flex items-center gap-2 truncate tracking-wide">
                离线视频下载中心
                <span className="text-xs font-mono font-bold text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 shrink-0 shadow-sm">
                  {currentEpisode.name}
                </span>
              </h3>
              <p className="text-xs text-gray-400 truncate max-w-[200px] sm:max-w-md mt-0.5 font-normal">
                {vodName} · 线路：{currentSource.sourceName}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (isDownloading) {
                if (!confirm("当前正在下载切片中，关闭将中止任务，确定退出吗？")) return;
                handleCancelDownload();
              }
              onClose();
            }}
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/[0.08] active:scale-90 transition-all duration-200 cursor-pointer flex items-center gap-1 shrink-0 border border-transparent hover:border-white/10"
            title="关闭窗口"
          >
            <span className="text-xs text-gray-400 hidden sm:inline font-sans">关闭</span>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 选集快速切换条（针对多集连续剧/动漫） */}
        {currentSource.episodes && currentSource.episodes.length > 1 && (
          <div className="px-5 py-2.5 bg-[#06080e]/60 border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto overscroll-contain no-scrollbar relative z-10">
            <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1.5 font-display font-medium">
              <ListOrdered className="w-3.5 h-3.5 text-cyan-400" />
              当前下载集：
            </span>
            <div className="flex items-center gap-1.5 flex-nowrap">
              {currentSource.episodes.map((ep: Episode, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (isDownloading) {
                      if (!confirm("切换集数将中止当前下载中的任务，是否继续？")) return;
                      handleCancelDownload();
                    }
                    onSelectEpisode?.(idx);
                    setProgress({
                      phase: "idle",
                      totalSegments: 0,
                      downloadedSegments: 0,
                      downloadedBytes: 0,
                      speed: 0,
                      percent: 0,
                    });
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 ${
                    idx === currentEpIndex
                      ? "bg-gradient-to-r from-cyan-400 to-teal-400 text-dark-950 font-bold shadow-[0_2px_12px_rgba(34,211,238,0.35)]"
                      : "bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/[0.05]"
                  }`}
                >
                  {ep.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 选项卡导航 */}
        <div className="flex border-b border-white/[0.08] bg-[#06080e]/60 px-5 pt-3 gap-3 overflow-x-auto no-scrollbar relative z-10">
          <button
            onClick={() => setActiveTab("browser")}
            className={`pb-3 px-3 text-xs sm:text-sm font-display font-bold flex items-center gap-2 border-b-2 transition-all duration-200 whitespace-nowrap cursor-pointer relative ${
              activeTab === "browser"
                ? "border-cyan-400 text-cyan-300 shadow-[0_2px_12px_rgba(34,211,238,0.3)]"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Zap className="w-4 h-4 text-cyan-400 fill-current" />
            <span>极速免流直下 (MP4)</span>
          </button>

          <button
            onClick={() => setActiveTab("external")}
            className={`pb-3 px-3 text-xs sm:text-sm font-display font-bold flex items-center gap-2 border-b-2 transition-all duration-200 whitespace-nowrap cursor-pointer relative ${
              activeTab === "external"
                ? "border-cyan-400 text-cyan-300 shadow-[0_2px_12px_rgba(34,211,238,0.3)]"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>迅雷 / IDM / Motrix</span>
          </button>

          <button
            onClick={() => setActiveTab("cmd")}
            className={`pb-3 px-3 text-xs sm:text-sm font-display font-bold flex items-center gap-2 border-b-2 transition-all duration-200 whitespace-nowrap cursor-pointer relative ${
              activeTab === "cmd"
                ? "border-cyan-400 text-cyan-300 shadow-[0_2px_12px_rgba(34,211,238,0.3)]"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Terminal className="w-4 h-4 text-amber-400" />
            <span>FFmpeg 命令行</span>
          </button>

          {currentSource.episodes && currentSource.episodes.length > 1 && (
            <button
              onClick={() => setActiveTab("batch")}
              className={`pb-3 px-3 text-xs sm:text-sm font-display font-bold flex items-center gap-2 border-b-2 transition-all duration-200 whitespace-nowrap cursor-pointer relative ${
                activeTab === "batch"
                  ? "border-cyan-400 text-cyan-300 shadow-[0_2px_12px_rgba(34,211,238,0.3)]"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <FileVideo className="w-4 h-4 text-emerald-400" />
              <span>整季批量复制</span>
            </button>
          )}
        </div>

        {/* 内容主体区 */}
        <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain space-y-5 flex-1 relative z-10">
          {/* TAB 1: 浏览器直接下载 */}
          {activeTab === "browser" && (
            <div className="space-y-4">
              {/* 多集资源展示：单集下载 vs 批量多选切换 */}
              {currentSource.episodes && currentSource.episodes.length > 1 && (
                <div className="flex items-center justify-between p-1 bg-[#06080e]/80 rounded-2xl border border-white/[0.06] gap-1">
                  <button
                    type="button"
                    onClick={() => setDownloadMode("single")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-display font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 ${
                      downloadMode === "single"
                        ? "bg-gradient-to-r from-cyan-400 to-teal-400 text-dark-950 shadow-[0_2px_12px_rgba(34,211,238,0.35)]"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <span>单集下载 ({currentEpisode.name})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDownloadMode("batch")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-display font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 ${
                      downloadMode === "batch"
                        ? "bg-gradient-to-r from-cyan-400 to-teal-400 text-dark-950 shadow-[0_2px_12px_rgba(34,211,238,0.35)]"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>批量多选 / 全选整季 ({selectedEpIndices.size}/{currentSource.episodes.length} 集)</span>
                  </button>
                </div>
              )}

              {downloadMode === "batch" ? (
                <div className="bg-[#0c101c]/80 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
                  {/* 快捷批量选择工具条 */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08] text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllEps}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 active:scale-95 text-cyan-300 font-display font-bold border border-cyan-500/30 transition-all duration-200 cursor-pointer shadow-sm"
                      >
                        全选整季 ({currentSource.episodes.length} 集)
                      </button>
                      <button
                        type="button"
                        onClick={handleInvertSelectEps}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-gray-300 font-medium transition-all duration-200 cursor-pointer border border-white/[0.06]"
                      >
                        反选
                      </button>
                      <button
                        type="button"
                        onClick={handleClearSelectEps}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-gray-400 hover:text-gray-200 transition-all duration-200 cursor-pointer border border-white/[0.06]"
                      >
                        重置选中
                      </button>
                    </div>
                    <div className="text-gray-400 font-mono text-xs">
                      已选择 <strong className="text-cyan-300 font-bold text-sm">{selectedEpIndices.size}</strong> / {currentSource.episodes.length} 集
                    </div>
                  </div>

                  {/* 选集网格列表 */}
                  <div className="max-h-56 overflow-y-auto overscroll-contain grid grid-cols-3 sm:grid-cols-6 gap-2 p-1 pr-1.5 no-scrollbar">
                    {currentSource.episodes.map((ep: Episode, idx: number) => {
                      const isSelected = selectedEpIndices.has(idx);
                      const isCurrent = idx === currentEpIndex;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleSelectEp(idx)}
                          className={`relative p-2.5 rounded-2xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer border active:scale-95 ${
                            isSelected
                              ? "bg-gradient-to-r from-cyan-400 to-teal-400 text-dark-950 font-bold border-cyan-300 shadow-[0_2px_12px_rgba(34,211,238,0.35)]"
                              : "bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border-white/[0.06] hover:border-white/10"
                          }`}
                        >
                          <span className="truncate w-full text-center font-mono">{ep.name}</span>
                          {isCurrent && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold leading-tight ${
                                isSelected ? "bg-dark-950 text-cyan-300" : "bg-cyan-500/20 text-cyan-400"
                              }`}
                            >
                              当前集
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* 格式选择与并发线程配置 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {/* 格式选择 */}
                    <div className="p-3.5 rounded-2xl bg-[#06080e]/60 border border-white/[0.06] space-y-2">
                      <span className="text-gray-300 font-display font-semibold flex items-center gap-1.5">
                        <FileVideo className="w-3.5 h-3.5 text-cyan-400" />
                        批量文件格式：
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormat("mp4")}
                          className={`py-2 px-2 rounded-xl font-bold text-center transition-all duration-200 cursor-pointer active:scale-95 ${
                            format === "mp4"
                              ? "bg-gradient-to-r from-cyan-400 to-teal-400 text-dark-950 shadow-sm font-display"
                              : "bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] border border-white/[0.05]"
                          }`}
                        >
                          MP4 格式
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormat("ts")}
                          className={`py-2 px-2 rounded-xl font-bold text-center transition-all duration-200 cursor-pointer active:scale-95 ${
                            format === "ts"
                              ? "bg-gradient-to-r from-cyan-400 to-teal-400 text-dark-950 shadow-sm font-display"
                              : "bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] border border-white/[0.05]"
                          }`}
                        >
                          TS 原始流
                        </button>
                      </div>
                    </div>

                    {/* 切片拉取线程 */}
                    <div className="p-3.5 rounded-2xl bg-[#06080e]/60 border border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 font-display font-semibold flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
                          分片并发拉取：
                        </span>
                        <span className="text-xs text-amber-300 font-mono font-bold">{concurrency} 线程</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { val: 4, label: "4" },
                          { val: 8, label: "8" },
                          { val: 16, label: "16" },
                          { val: 32, label: "32" },
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => {
                              setConcurrency(item.val);
                              updateSettings({ concurrency: item.val });
                            }}
                            className={`py-2 rounded-xl text-xs font-mono font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
                              concurrency === item.val
                                ? "bg-gradient-to-r from-amber-400 to-amber-300 text-dark-950 shadow-[0_2px_10px_rgba(251,191,36,0.3)]"
                                : "bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/[0.05]"
                            }`}
                            title={`${item.val} 线程并发拉取切片`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 同时排队下载集数 */}
                    <div className="p-3.5 rounded-2xl bg-[#06080e]/60 border border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 font-display font-semibold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          同时排队下载：
                        </span>
                        <span className="text-xs text-cyan-300 font-mono font-bold">{maxTasks} 集</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { val: 1, label: "1 集" },
                          { val: 2, label: "2 集" },
                          { val: 3, label: "3 集" },
                          { val: 4, label: "4 集" },
                        ].map((item) => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => {
                              setMaxTasks(item.val);
                              updateSettings({ maxConcurrentTasks: item.val });
                            }}
                            className={`py-2 rounded-xl text-xs font-mono font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
                              maxTasks === item.val
                                ? "bg-gradient-to-r from-cyan-400 to-teal-400 text-dark-950 shadow-[0_2px_10px_rgba(34,211,238,0.3)]"
                                : "bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/[0.05]"
                            }`}
                            title={`同时排队启动 ${item.val} 集`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 提交批量加入下载中心 */}
                  <button
                    type="button"
                    onClick={handleStartBatchQueue}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-dark-950 font-display font-bold text-sm shadow-[0_4px_30px_rgba(34,211,238,0.35)] transition-all duration-200 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      一键批量加入下载中心 (已选 {selectedEpIndices.size} 集 · {concurrency} 线程 · 同时跑 {maxTasks} 集)
                    </span>
                  </button>
                </div>
              ) : (
                <>
              {/* 参数选择卡片 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#0c101c]/80 backdrop-blur-xl border border-white/[0.08] p-4 rounded-2xl space-y-2.5">
                  <span className="text-xs font-display font-semibold text-gray-300 flex items-center gap-1.5">
                    <FileVideo className="w-3.5 h-3.5 text-cyan-400" />
                    保存文件格式：
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={() => setFormat("mp4")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex flex-col items-center gap-0.5 cursor-pointer active:scale-95 ${
                        format === "mp4"
                          ? "bg-gradient-to-r from-cyan-400 to-teal-400 text-dark-950 font-display shadow-[0_2px_12px_rgba(34,211,238,0.35)]"
                          : "bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/[0.05]"
                      } disabled:opacity-50`}
                    >
                      <span className="font-display">MP4 格式</span>
                      <span className="text-[10px] font-normal opacity-80">全兼容 · 推荐</span>
                    </button>
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={() => setFormat("ts")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex flex-col items-center gap-0.5 cursor-pointer active:scale-95 ${
                        format === "ts"
                          ? "bg-gradient-to-r from-cyan-400 to-teal-400 text-dark-950 font-display shadow-[0_2px_12px_rgba(34,211,238,0.35)]"
                          : "bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/[0.05]"
                      } disabled:opacity-50`}
                    >
                      <span className="font-display">TS 原始流</span>
                      <span className="text-[10px] font-normal opacity-80">极速合并 · 省内存</span>
                    </button>
                  </div>
                </div>

                <div className="bg-[#0c101c]/80 backdrop-blur-xl border border-white/[0.08] p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-display font-semibold text-gray-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      下载并发线程：
                    </span>
                    <span className="text-xs text-amber-300 font-mono font-bold">{concurrency} 线程</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { val: 4, label: "4 线程", tip: "普通" },
                      { val: 8, label: "8 线程", tip: "推荐" },
                      { val: 16, label: "16 线程", tip: "高性能" },
                      { val: 32, label: "32 线程", tip: "狂暴千兆" },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        disabled={isDownloading}
                        onClick={() => {
                          setConcurrency(item.val);
                          updateSettings({ concurrency: item.val });
                        }}
                        className={`px-1.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex flex-col items-center gap-0.5 cursor-pointer active:scale-95 ${
                          concurrency === item.val
                            ? "bg-gradient-to-r from-amber-400 to-amber-300 text-dark-950 font-bold border border-amber-300 shadow-[0_2px_10px_rgba(251,191,36,0.35)]"
                            : "bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/[0.05]"
                        } disabled:opacity-50`}
                        title={item.tip}
                      >
                        <span className="text-xs font-mono">{item.label}</span>
                        <span className="text-[9px] font-normal opacity-80">{item.tip}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 核心状态与进度监控卡片 */}
              <div className="bg-[#0c101c]/80 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-xl">
                {progress.phase === "idle" && (
                  <div className="text-center py-4 space-y-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-400/30 text-cyan-300 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                      <Download className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="font-display text-base font-bold text-white">
                        准备下载【{currentEpisode.name}】
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto leading-relaxed">
                        视频切片将直接在浏览器本地后台并发拉取并自动无损拼接，不占用网站服务器带宽。
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-lg mx-auto">
                      <button
                        type="button"
                        onClick={async () => {
                          await createAndStartTask({
                            vodId,
                            vodName,
                            episodeName: currentEpisode.name,
                            typeName,
                            cover,
                            m3u8Url: currentM3U8Url,
                            format,
                            concurrency,
                          });
                          onClose();
                        }}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-dark-950 font-display font-bold text-xs sm:text-sm shadow-[0_4px_25px_rgba(34,211,238,0.35)] transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                        title="添加到后台下载管理中心，支持切片断点续传，关闭窗口也不受影响"
                      >
                        <Sparkles className="w-4 h-4" />
                        加入后台下载 (支持断点续传 · 推荐)
                      </button>

                      <button
                        type="button"
                        onClick={handleStartDownload}
                        className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 border border-white/[0.08] active:scale-95"
                        title="在此弹窗中执行单次立即下载"
                      >
                        <Download className="w-4 h-4 text-cyan-400" />
                        单次直接下载
                      </button>
                    </div>
                  </div>
                )}

                {progress.phase === "parsing" && (
                  <div className="text-center py-6 space-y-3">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                    <p className="text-xs text-cyan-300 font-medium">
                      正在解析 M3U8 播放列表及视频分片索引...
                    </p>
                  </div>
                )}

                {progress.phase === "downloading" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        正在下载分片 [{progress.downloadedSegments} / {progress.totalSegments}]
                      </span>
                      <span className="text-white font-mono font-bold">
                        {progress.percent}%
                      </span>
                    </div>

                    {/* 动态发光流光进度条 */}
                    <div className="w-full h-3 bg-dark-950 rounded-full overflow-hidden border border-white/10 p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 rounded-full transition-all duration-200 shadow-lg shadow-cyan-500/30"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400 font-mono pt-1">
                      <span>已下载：{formatBytes(progress.downloadedBytes)}</span>
                      <span>实时网速：{(progress.speed / (1024 * 1024)).toFixed(1)} MB/s</span>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleCancelDownload}
                        className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Square className="w-3.5 h-3.5" />
                        中止下载
                      </button>
                    </div>
                  </div>
                )}

                {progress.phase === "remuxing" && (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-10 h-10 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin mx-auto" />
                    <p className="text-xs text-emerald-300 font-bold">
                      切片已全部下载完毕，正在无损封装合成 {format.toUpperCase()} 文件...
                    </p>
                    <p className="text-[11px] text-gray-400">
                      通常只需 2~8 秒，封装完成后浏览器将自动弹出保存文件对话框。
                    </p>
                  </div>
                )}

                {progress.phase === "completed" && (
                  <div className="text-center py-4 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">🎉 视频封装完成并已开始保存！</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        已保存文件：{currentFileName}.{format} ({formatBytes(progress.downloadedBytes)})
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleResetDownload}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition cursor-pointer"
                      >
                        再次下载
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-dark-950 text-xs font-bold transition shadow-md shadow-cyan-500/20 cursor-pointer"
                      >
                        完成退出
                      </button>
                    </div>
                  </div>
                )}

                {progress.phase === "error" && (
                  <div className="text-center py-4 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-rose-400">下载过程中遇到错误</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto break-words">
                        {progress.error}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleStartDownload}
                        className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition cursor-pointer"
                      >
                        重新尝试
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("external")}
                        className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-dark-950 text-xs font-bold transition cursor-pointer shadow-md shadow-cyan-500/20"
                      >
                        改用迅雷/IDM下载
                      </button>
                    </div>
                  </div>
                )}

                {progress.phase === "aborted" && (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-xs text-amber-400 font-semibold">下载已被手动中止</p>
                    <button
                      type="button"
                      onClick={handleResetDownload}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition cursor-pointer"
                    >
                      重新准备下载
                    </button>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-gray-400 space-y-1 bg-dark-950/40 p-3 rounded-xl border border-white/5">
                <p className="flex items-center gap-1 text-cyan-400 font-semibold">
                  <span>💡</span> 下载小贴士：
                </p>
                <p>1. 浏览器直下适合电脑端或剩余内存充裕的手机设备（整部电影一般约需 600MB~1.5GB 内存空间）。</p>
                <p>2. 下载进行中请尽量保持本标签页处于前台，防止部分手机浏览器在后台休眠降低下载速度。</p>
              </div>
            </>
          )}
        </div>
      )}

          {/* TAB 2: 专业工具下载 */}
          {activeTab === "external" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                  <span>本集 M3U8 播放流地址：</span>
                  <span className="text-[10px] text-cyan-400 font-normal">支持直接粘贴至下载器</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentM3U8Url}
                    className="w-full bg-dark-800 text-xs font-mono text-gray-200 px-3.5 py-2.5 rounded-xl border border-white/10 focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                      copiedUrl
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                        : "bg-cyan-500 hover:bg-cyan-400 text-dark-950 shadow-md shadow-cyan-500/20"
                    }`}
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-4 h-4" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        一键复制
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 推荐工具列表 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-dark-800/80 border border-white/5 p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">迅雷 / Thunder</span>
                    <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">多线程</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    打开迅雷点击【+新建】，粘贴上方 M3U8 链接，迅雷会自动并发抓取所有切片并拼为完整 MP4。
                  </p>
                </div>

                <div className="bg-dark-800/80 border border-white/5 p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Motrix / FDM</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">开源无广告</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    跨平台开源下载利器，支持 Windows / macOS / Linux，全速多线程下载无任何限速。
                  </p>
                </div>

                <div className="bg-dark-800/80 border border-white/5 p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">PotPlayer / VLC</span>
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">免下直接播</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    在 PotPlayer 按快捷键 Ctrl+U 粘贴链接，即可当高清网络流秒开播放，还支持录制存为本地文件。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 命令行一键下载 */}
          {activeTab === "cmd" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    FFmpeg 原画无损转封装命令：
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCmd("ffmpeg", ffmpegCmd)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCmd === "ffmpeg" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">已复制命令</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>复制命令</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-dark-950 p-3 rounded-xl border border-white/10 text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre-wrap select-all leading-relaxed">
                  {ffmpegCmd}
                </pre>
                <p className="text-[11px] text-gray-400">
                  说明：该命令使用 <code>-c copy</code> 纯无损合并，不重新编码，几秒内即可在本地生成标准 MP4 文件。
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    yt-dlp 多线程自动下载命令：
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCmd("ytdlp", ytdlpCmd)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCmd === "ytdlp" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">已复制命令</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>复制命令</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-dark-950 p-3 rounded-xl border border-white/10 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap select-all leading-relaxed">
                  {ytdlpCmd}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: 整季批量复制 */}
          {activeTab === "batch" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-dark-850 p-3 rounded-xl border border-white/5">
                <div>
                  <span className="text-xs font-bold text-white">
                    全季共 {currentSource.episodes.length} 集
                  </span>
                  <p className="text-[11px] text-gray-400">
                    一键复制所有剧集地址，支持直接粘贴到迅雷“从剪贴板新建任务”进行整季批量下载。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyBatch}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                    copiedBatch
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                      : "bg-cyan-500 hover:bg-cyan-400 text-dark-950 shadow-md shadow-cyan-500/20"
                  }`}
                >
                  {copiedBatch ? (
                    <>
                      <Check className="w-4 h-4" />
                      已全部复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      一键复制全部集数
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto overscroll-contain pr-1">
                {currentSource.episodes.map((ep: Episode, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-dark-800/60 hover:bg-dark-800 border border-white/5 text-xs transition"
                  >
                    <span className="text-gray-300 font-medium truncate max-w-[200px]">
                      {ep.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-gray-400 truncate max-w-[200px]">
                        {ep.url}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopySingle(idx, ep.url)}
                        className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1 transition cursor-pointer"
                      >
                        {copiedSingleEp === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>已复制</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>复制</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部信息栏 */}
        <div className="p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-white/10 bg-dark-950/90 flex items-center justify-between text-xs text-gray-400 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span className="hidden sm:inline">4KVM 流媒体离线引擎就绪</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                openDrawer();
              }}
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 cursor-pointer flex items-center gap-1 truncate"
            >
              <span>查看离线下载中心</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isDownloading) {
                if (!confirm("当前正在下载切片中，关闭将中止任务，确定退出吗？")) return;
                handleCancelDownload();
              }
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold text-xs transition cursor-pointer shrink-0"
          >
            关闭返回
          </button>
        </div>
      </div>
    </div>
  );
}
