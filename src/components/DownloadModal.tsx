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
} from "lucide-react";
import { PlaySource, Episode } from "@/lib/types";
import {
  downloadAndSaveM3U8,
  DownloadProgress,
} from "@/lib/m3u8-downloader";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  vodName: string;
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
  vodName,
  sources,
  currentSourceIndex,
  currentEpIndex,
  onSelectEpisode,
  onSelectSource,
}: DownloadModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("browser");
  const [format, setFormat] = useState<"mp4" | "ts">("mp4");
  const [concurrency, setConcurrency] = useState<number>(4);

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

  const currentSource =
    sources[currentSourceIndex] || sources[0] || { sourceName: "默认线路", episodes: [] };
  const currentEpisode =
    currentSource.episodes[currentEpIndex] || currentSource.episodes[0] || { name: "正片", url: "" };

  const currentM3U8Url = currentEpisode.url || "";
  const currentFileName = `${vodName} - ${currentEpisode.name}`;

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

  // 取消浏览器端下载
  const handleCancelDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
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

  const isDownloading =
    progress.phase === "parsing" ||
    progress.phase === "downloading" ||
    progress.phase === "remuxing";

  return (
    <div
      className="fixed inset-0 z-[99999] overscroll-contain bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={() => {
        if (isDownloading) {
          if (!confirm("当前正在下载切片中，关闭将中止任务，确定退出吗？")) return;
          handleCancelDownload();
        }
        onClose();
      }}
    >
      <div
        className="bg-dark-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题区 */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-dark-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                离线视频下载中心
                <span className="text-xs font-normal text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                  {currentEpisode.name}
                </span>
              </h3>
              <p className="text-xs text-gray-400 truncate max-w-[280px] sm:max-w-md mt-0.5">
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
            className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition cursor-pointer"
            title="关闭窗口"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 选集快速切换条（针对多集连续剧/动漫） */}
        {currentSource.episodes && currentSource.episodes.length > 1 && (
          <div className="px-5 py-2.5 bg-dark-850/80 border-b border-white/5 flex items-center gap-2 overflow-x-auto overscroll-contain no-scrollbar">
            <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1">
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    idx === currentEpIndex
                      ? "bg-cyan-500 text-dark-950 font-bold shadow-md shadow-cyan-500/20"
                      : "bg-white/5 hover:bg-white/10 text-gray-300"
                  }`}
                >
                  {ep.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 选项卡导航 */}
        <div className="flex border-b border-white/10 bg-dark-950/40 px-5 pt-3 gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("browser")}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "browser"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Zap className="w-4 h-4" />
            浏览器直下 (MP4)
          </button>

          <button
            onClick={() => setActiveTab("external")}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "external"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <HardDrive className="w-4 h-4" />
            迅雷 / IDM / Motrix
          </button>

          <button
            onClick={() => setActiveTab("cmd")}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "cmd"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Terminal className="w-4 h-4" />
            FFmpeg 命令行
          </button>

          {currentSource.episodes && currentSource.episodes.length > 1 && (
            <button
              onClick={() => setActiveTab("batch")}
              className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === "batch"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <FileVideo className="w-4 h-4" />
              整季批量复制
            </button>
          )}
        </div>

        {/* 内容主体区 */}
        <div className="p-5 overflow-y-auto overscroll-contain space-y-5 flex-1">
          {/* TAB 1: 浏览器直接下载 */}
          {activeTab === "browser" && (
            <div className="space-y-4">
              {/* 参数选择卡片 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-dark-800/80 border border-white/5 p-3.5 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <FileVideo className="w-3.5 h-3.5 text-cyan-400" />
                    保存文件格式：
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={() => setFormat("mp4")}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                        format === "mp4"
                          ? "bg-cyan-500 text-dark-950 shadow-md shadow-cyan-500/20"
                          : "bg-white/5 hover:bg-white/10 text-gray-300"
                      } disabled:opacity-50`}
                    >
                      <span>MP4 格式</span>
                      <span className="text-[10px] font-normal opacity-80">全兼容 · 推荐</span>
                    </button>
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={() => setFormat("ts")}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                        format === "ts"
                          ? "bg-cyan-500 text-dark-950 shadow-md shadow-cyan-500/20"
                          : "bg-white/5 hover:bg-white/10 text-gray-300"
                      } disabled:opacity-50`}
                    >
                      <span>TS 原始流</span>
                      <span className="text-[10px] font-normal opacity-80">极速合并 · 省内存</span>
                    </button>
                  </div>
                </div>

                <div className="bg-dark-800/80 border border-white/5 p-3.5 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    下载并发线程：
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: 4, label: "4 线程 (均衡)" },
                      { val: 8, label: "8 线程 (极速)" },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        disabled={isDownloading}
                        onClick={() => setConcurrency(item.val)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition flex flex-col items-center gap-0.5 cursor-pointer ${
                          concurrency === item.val
                            ? "bg-amber-400 text-dark-950 shadow-md shadow-amber-400/20"
                            : "bg-white/5 hover:bg-white/10 text-gray-300"
                        } disabled:opacity-50`}
                      >
                        <span>{item.val} 线程</span>
                        <span className="text-[10px] font-normal opacity-80">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 核心状态与进度监控卡片 */}
              <div className="bg-dark-800/90 border border-white/10 rounded-2xl p-5 space-y-4 shadow-inner">
                {progress.phase === "idle" && (
                  <div className="text-center py-4 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/5">
                      <Download className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        准备下载【{currentEpisode.name}】
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                        视频切片将直接在浏览器本地后台并发拉取并自动无损拼接，不占用网站服务器带宽。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartDownload}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-dark-950 font-bold text-sm shadow-xl shadow-cyan-500/25 transition active:scale-95 cursor-pointer flex items-center gap-2 mx-auto"
                    >
                      <Sparkles className="w-4 h-4" />
                      开始下载此集 ({format.toUpperCase()})
                    </button>
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
        <div className="p-4 border-t border-white/10 bg-dark-950/80 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>4KVM 流媒体离线引擎就绪</span>
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
            className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
