// @ts-ignore
import muxjs from "mux.js";
import { smartFetch, parseM3U8, patchMp4InitSegment } from "./m3u8-downloader";
import {
  saveTask,
  getTask,
  getAllTasks,
  deleteTask as dbDeleteTask,
  saveSegment,
  getSegment,
  getSegmentBatch,
  getDownloadedSegmentIndices,
  deleteSegmentsForTask,
  saveCompletedChunk,
  saveCompletedVideo,
  getCompletedVideo,
  deleteCompletedVideo,
  requestPersistentStorage,
  getStorageQuota,
  loadDownloadSettings,
  saveDownloadSettings,
  DownloadSettings,
  DownloadTaskRecord,
} from "./download-store";

export type DownloadListener = (tasks: DownloadTaskRecord[]) => void;

class DownloadManager {
  private tasks: Map<string, DownloadTaskRecord> = new Map();
  private activeControllers: Map<string, AbortController> = new Map();
  private listeners: Set<DownloadListener> = new Set();
  private wakeLockSentinel: any = null;
  private initialized = false;
  private settings: DownloadSettings = loadDownloadSettings();

  constructor() {
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  public getSettings(): DownloadSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<DownloadSettings>): void {
    this.settings = { ...this.settings, ...partial };
    saveDownloadSettings(this.settings);
    this.notify();
    this.processQueue();
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const records = await getAllTasks();
      for (const t of records) {
        // If a task was in a working state when the app closed, revert to paused so it can be resumed cleanly
        if (t.status === "downloading" || t.status === "remuxing" || t.status === "parsing") {
          t.status = "paused";
          t.speed = 0;
          await saveTask(t);
        }
        this.tasks.set(t.id, t);
      }
      this.initialized = true;
      this.notify();
      requestPersistentStorage().catch(() => {});
    } catch (err) {
      console.error("[DownloadManager] init failed:", err);
    }
  }

  public subscribe(listener: DownloadListener): () => void {
    this.listeners.add(listener);
    listener(this.getTaskList());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = this.getTaskList();
    this.listeners.forEach((fn) => {
      try {
        fn(list);
      } catch (err) {
        console.error("[DownloadManager] notify error:", err);
      }
    });
  }

  public getTaskList(): DownloadTaskRecord[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public getTask(id: string): DownloadTaskRecord | undefined {
    return this.tasks.get(id);
  }

  // Request screen wake lock while downloading to avoid mobile sleep
  private async acquireWakeLock() {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator && !this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
        this.wakeLockSentinel.addEventListener("release", () => {
          this.wakeLockSentinel = null;
        });
      } catch (err) {
        // WakeLock request failed (e.g. low battery), non-fatal
      }
    }
  }

  private releaseWakeLock() {
    if (this.activeControllers.size === 0 && this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch {}
      this.wakeLockSentinel = null;
    }
  }

  /**
   * Create or fetch an existing download task
   */
  public async createTask(params: {
    vodId?: string;
    vodName: string;
    episodeName: string;
    typeName?: string;
    cover?: string;
    m3u8Url: string;
    format?: "mp4" | "ts";
    concurrency?: number;
  }): Promise<DownloadTaskRecord> {
    await this.init();

    // Deterministic ID so duplicate adds reuse the same task
    const safeVodName = params.vodName.replace(/[^\w\u4e00-\u9fa5]/g, "_");
    const safeEpName = params.episodeName.replace(/[^\w\u4e00-\u9fa5]/g, "_");
    const taskId = `${safeVodName}_${safeEpName}_${params.format || "mp4"}`;

    const existing = this.tasks.get(taskId);
    if (existing) {
      // If typeName was missing before, backfill it
      if (params.typeName && !existing.typeName) {
        existing.typeName = params.typeName;
        saveTask(existing).catch(console.error);
      }
      if (params.concurrency) {
        existing.concurrency = params.concurrency;
        saveTask(existing).catch(console.error);
      }
      return existing;
    }

    const newTask: DownloadTaskRecord = {
      id: taskId,
      vodId: params.vodId,
      vodName: params.vodName,
      episodeName: params.episodeName,
      typeName: params.typeName,
      cover: params.cover,
      m3u8Url: params.m3u8Url,
      format: params.format || "mp4",
      status: "idle",
      concurrency: params.concurrency || this.settings.concurrency || 8,
      totalSegments: 0,
      downloadedCount: 0,
      downloadedBytes: 0,
      totalDuration: 0,
      speed: 0,
      percent: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.tasks.set(taskId, newTask);
    await saveTask(newTask);
    this.notify();
    return newTask;
  }

  /**
   * Start or resume downloading a task (supports 断点续传)
   */
  public async startTask(taskId: string): Promise<void> {
    await this.init();
    const task = this.tasks.get(taskId);
    if (!task) throw new Error("任务不存在");

    if (task.status === "downloading" || task.status === "remuxing") {
      return;
    }

    // 检查是否达到用户自定义的离线存储上限
    if (this.settings.storageLimitGB && this.settings.storageLimitGB > 0) {
      try {
        const quota = await getStorageQuota();
        const limitBytes = this.settings.storageLimitGB * 1024 * 1024 * 1024;
        if (quota.usedBytes >= limitBytes) {
          task.status = "paused";
          task.error = `已达到您设置的离线存储上限 (${this.settings.storageLimitGB} GB)，已自动暂停下载以保护设备空间`;
          await saveTask(task);
          this.notify();
          return;
        }
      } catch (err) {
        console.warn("[DownloadManager] storage limit check error:", err);
      }
    }

    const controller = new AbortController();
    this.activeControllers.set(taskId, controller);
    await this.acquireWakeLock();

    try {
      task.status = "parsing";
      task.error = undefined;
      task.speed = 0;
      await saveTask(task);
      this.notify();

      // 1. Parse M3U8 to retrieve segment list
      const parsed = await parseM3U8(task.m3u8Url, controller.signal);
      const { segments, totalDuration } = parsed;
      const total = segments.length;

      task.totalSegments = total;
      task.totalDuration = totalDuration;

      // 2. Query IndexedDB for segments that are ALREADY downloaded (断点续传检测)
      const downloadedIndices = await getDownloadedSegmentIndices(taskId);
      let downloadedCount = downloadedIndices.size;

      task.downloadedCount = downloadedCount;
      task.percent = total > 0 ? Math.min(Math.round((downloadedCount / total) * 98), 98) : 0;
      task.status = "downloading";
      await saveTask(task);
      this.notify();

      // Find all missing segments
      const missingIndices: number[] = [];
      for (let i = 0; i < total; i++) {
        if (!downloadedIndices.has(i)) {
          missingIndices.push(i);
        }
      }

      // 3. Download missing segments concurrently (使用多档位并发线程)
      let lastBytes = 0;
      let lastTime = Date.now();
      let totalBytes = task.downloadedBytes;
      let queuePointer = 0;
      const concurrency = Math.min(Math.max(task.concurrency || this.settings.concurrency || 8, 2), 64);

      const speedInterval = setInterval(() => {
        const now = Date.now();
        const diff = (now - lastTime) / 1000;
        if (diff > 0.5) {
          task.speed = Math.max(0, (totalBytes - lastBytes) / diff);
          lastBytes = totalBytes;
          lastTime = now;
          this.notify();
        }
      }, 500);

      const worker = async () => {
        while (queuePointer < missingIndices.length) {
          if (controller.signal.aborted) {
            throw new Error("任务已暂停");
          }

          const currentPtr = queuePointer++;
          const idx = missingIndices[currentPtr];
          const segUrl = segments[idx];

          let retries = 3;
          let buf: Uint8Array | null = null;

          while (retries > 0) {
            try {
              if (controller.signal.aborted) throw new Error("任务已暂停");
              const res = await smartFetch(segUrl, controller.signal);
              const arrayBuf = await res.arrayBuffer();
              buf = new Uint8Array(arrayBuf);
              break;
            } catch (err: any) {
              if (controller.signal.aborted) throw err;
              retries--;
              if (retries === 0) {
                throw new Error(`切片 [${idx + 1}/${total}] 下载失败: ${err.message}`);
              }
              await new Promise((r) => setTimeout(r, 600));
            }
          }

          if (buf) {
            // Write directly into IndexedDB for persistent storage
            await saveSegment(taskId, idx, buf);
            downloadedCount++;
            totalBytes += buf.byteLength;

            task.downloadedCount = downloadedCount;
            task.downloadedBytes = totalBytes;
            task.percent = Math.min(Math.round((downloadedCount / total) * 98), 98);

            // Throttle database task metadata writes
            if (downloadedCount % 5 === 0 || downloadedCount === total) {
              await saveTask(task);
            }
            this.notify();
          }
        }
      };

      try {
        const workers = Array.from({ length: Math.min(concurrency, missingIndices.length || 1) }, () => worker());
        await Promise.all(workers);
      } finally {
        clearInterval(speedInterval);
      }

      if (controller.signal.aborted) {
        task.status = "paused";
        task.speed = 0;
        await saveTask(task);
        this.notify();
        return;
      }

      // 4. Remux or assemble to MP4 / TS with Low-Memory Chunked Streaming (iOS PWA optimized)
      task.status = "remuxing";
      task.speed = 0;
      task.percent = 95;
      await saveTask(task);
      this.notify();

      let finalExt = task.format === "mp4" ? ".mp4" : ".ts";
      const filename = `${task.vodName} - ${task.episodeName}${finalExt}`;
      const CHUNK_FLUSH_THRESHOLD = 8 * 1024 * 1024; // 8MB per chunk in IndexedDB (prevents iOS OOM & WebKit IPC crashes)

      let totalOutputBytes = 0;
      let chunkCounter = 0;
      let currentChunkBuffer: Uint8Array[] = [];
      let currentChunkSize = 0;

      const flushBuffer = async (prependBytes?: Uint8Array | null) => {
        if (currentChunkBuffer.length === 0 && !prependBytes) return;

        let totalLen = currentChunkSize;
        if (prependBytes) totalLen += prependBytes.byteLength;

        const combined = new Uint8Array(totalLen);
        let offset = 0;
        if (prependBytes) {
          combined.set(prependBytes, 0);
          offset += prependBytes.byteLength;
        }

        for (let b = 0; b < currentChunkBuffer.length; b++) {
          combined.set(currentChunkBuffer[b], offset);
          offset += currentChunkBuffer[b].byteLength;
        }

        await saveCompletedChunk(taskId, chunkCounter++, combined);
        totalOutputBytes += combined.byteLength;

        // Reset buffer and allow immediate garbage collection
        currentChunkBuffer = [];
        currentChunkSize = 0;
      };

      if (task.format === "mp4") {
        let initSegment: Uint8Array | null = null;
        let isInitDispatched = false;

        try {
          const transmuxer = new muxjs.mp4.Transmuxer({
            remux: true,
            keepOriginalTimestamps: false,
          });

          transmuxer.on("data", (segment: any) => {
            if (segment.initSegment && !initSegment) {
              initSegment = segment.initSegment;
            }
            if (segment.data && segment.data.byteLength > 0) {
              currentChunkBuffer.push(segment.data);
              currentChunkSize += segment.data.byteLength;
            }
          });

          const BATCH_SIZE = 16;
          for (let batchStart = 0; batchStart < total; batchStart += BATCH_SIZE) {
            if (controller.signal.aborted) throw new Error("任务已暂停");

            const count = Math.min(BATCH_SIZE, total - batchStart);
            const batch = await getSegmentBatch(taskId, batchStart, count);

            for (let j = 0; j < count; j++) {
              const buf = batch[j];
              if (buf) {
                try {
                  transmuxer.push(buf);
                  transmuxer.flush();
                } catch (segErr) {
                  console.warn(`[DownloadManager] 切片 #${batchStart + j} 转封装跳过:`, segErr);
                }
              }
            }

            // Flush chunk if threshold reached and initSegment is ready
            if (currentChunkSize >= CHUNK_FLUSH_THRESHOLD) {
              if (!isInitDispatched && initSegment) {
                const patchedInit = patchMp4InitSegment(initSegment, task.totalDuration);
                await flushBuffer(patchedInit);
                isInitDispatched = true;
              } else if (isInitDispatched) {
                await flushBuffer();
              }
            }

            // Yield to browser event loop (15ms sleep on iOS ensures GC runs and UI stays 60fps responsive)
            await new Promise((r) => setTimeout(r, 15));
            task.percent = Math.min(99, Math.floor(95 + ((batchStart + count) / total) * 4));
            this.notify();
          }

          // Final flush of remaining buffer
          if (initSegment && !isInitDispatched) {
            const patchedInit = patchMp4InitSegment(initSegment, task.totalDuration);
            await flushBuffer(patchedInit);
            isInitDispatched = true;
          } else if (currentChunkSize > 0) {
            await flushBuffer();
          }

          if (!isInitDispatched || chunkCounter === 0) {
            throw new Error("转封装未产生有效 MP4 音视频轨道");
          }

          // Save completed video metadata
          await saveCompletedVideo(taskId, {
            filename,
            mimeType: "video/mp4",
            duration: task.totalDuration,
            size: totalOutputBytes,
            isChunked: true,
            chunkCount: chunkCounter,
          });
          finalExt = ".mp4";
        } catch (remuxErr: any) {
          console.warn("[DownloadManager] MP4 封装降级或遇到异常，执行低内存 TS 兼容打包:", remuxErr);
          // Fallback to low-memory TS chunking
          chunkCounter = 0;
          totalOutputBytes = 0;
          currentChunkBuffer = [];
          currentChunkSize = 0;

          const TS_BATCH_SIZE = 16;
          for (let batchStart = 0; batchStart < total; batchStart += TS_BATCH_SIZE) {
            if (controller.signal.aborted) throw new Error("任务已暂停");
            const count = Math.min(TS_BATCH_SIZE, total - batchStart);
            const batch = await getSegmentBatch(taskId, batchStart, count);

            for (let j = 0; j < count; j++) {
              const buf = batch[j];
              if (buf) {
                currentChunkBuffer.push(buf);
                currentChunkSize += buf.byteLength;
              }
            }

            if (currentChunkSize >= CHUNK_FLUSH_THRESHOLD) {
              await flushBuffer();
            }

            await new Promise((r) => setTimeout(r, 10));
          }

          if (currentChunkSize > 0) {
            await flushBuffer();
          }

          task.format = "ts";
          finalExt = ".ts";
          const fallbackFilename = `${task.vodName} - ${task.episodeName}.ts`;

          await saveCompletedVideo(taskId, {
            filename: fallbackFilename,
            mimeType: "video/mp2t",
            duration: task.totalDuration,
            size: totalOutputBytes,
            isChunked: true,
            chunkCount: chunkCounter,
          });
        }
      } else {
        // Pure TS format requested
        const TS_BATCH_SIZE = 16;
        for (let batchStart = 0; batchStart < total; batchStart += TS_BATCH_SIZE) {
          if (controller.signal.aborted) throw new Error("任务已暂停");
          const count = Math.min(TS_BATCH_SIZE, total - batchStart);
          const batch = await getSegmentBatch(taskId, batchStart, count);

          for (let j = 0; j < count; j++) {
            const buf = batch[j];
            if (buf) {
              currentChunkBuffer.push(buf);
              currentChunkSize += buf.byteLength;
            }
          }

          if (currentChunkSize >= CHUNK_FLUSH_THRESHOLD) {
            await flushBuffer();
          }

          await new Promise((r) => setTimeout(r, 10));
        }

        if (currentChunkSize > 0) {
          await flushBuffer();
        }

        finalExt = ".ts";
        await saveCompletedVideo(taskId, {
          filename,
          mimeType: "video/mp2t",
          duration: task.totalDuration,
          size: totalOutputBytes,
          isChunked: true,
          chunkCount: chunkCounter,
        });
      }

      // 5. Clean up intermediate raw chunk segments to save disk space
      await deleteSegmentsForTask(taskId);

      task.status = "completed";
      task.percent = 100;
      task.speed = 0;
      task.completedSize = totalOutputBytes;
      await saveTask(task);
      this.notify();
    } catch (err: any) {
      if (controller.signal.aborted) {
        task.status = "paused";
        task.speed = 0;
      } else {
        task.status = "error";
        task.error = err.message || "下载异常中断";
        task.speed = 0;
      }
      await saveTask(task);
      this.notify();
    } finally {
      this.activeControllers.delete(taskId);
      this.releaseWakeLock();
      this.processQueue();
    }
  }

  /**
   * Automatically process queued download tasks
   */
  public async processQueue(): Promise<void> {
    await this.init();
    const runningCount = Array.from(this.tasks.values()).filter(
      (t) => t.status === "downloading" || t.status === "remuxing" || t.status === "parsing"
    ).length;

    const maxTasks = this.settings.maxConcurrentTasks || 2;
    const availableSlots = maxTasks - runningCount;
    if (availableSlots <= 0) return;

    const queuedTasks = Array.from(this.tasks.values())
      .filter((t) => t.status === "queued" || t.status === "idle")
      .sort((a, b) => a.createdAt - b.createdAt);

    for (let i = 0; i < Math.min(availableSlots, queuedTasks.length); i++) {
      const nextTask = queuedTasks[i];
      this.startTask(nextTask.id).catch(console.error);
    }
  }

  /**
   * Batch create multiple episode download tasks and queue them
   */
  public async createBatchTasks(
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
  ): Promise<DownloadTaskRecord[]> {
    await this.init();
    if (batchOptions?.concurrency) {
      this.updateSettings({ concurrency: batchOptions.concurrency });
    }
    if (batchOptions?.maxConcurrentTasks) {
      this.updateSettings({ maxConcurrentTasks: batchOptions.maxConcurrentTasks });
    }

    const created: DownloadTaskRecord[] = [];
    for (const item of taskList) {
      const task = await this.createTask({
        ...item,
        concurrency: item.concurrency || batchOptions?.concurrency || this.settings.concurrency,
      });
      if (task.status === "idle" || task.status === "paused") {
        task.status = "queued";
        await saveTask(task);
      }
      created.push(task);
    }
    this.notify();
    this.processQueue();
    return created;
  }

  /**
   * Pause all active and queued tasks
   */
  public async pauseAll(): Promise<void> {
    for (const [taskId] of this.activeControllers) {
      await this.pauseTask(taskId);
    }
    for (const [, task] of this.tasks) {
      if (task.status === "queued" || task.status === "downloading" || task.status === "parsing") {
        task.status = "paused";
        task.speed = 0;
        await saveTask(task);
      }
    }
    this.notify();
  }

  /**
   * Resume all paused or queued tasks
   */
  public async resumeAll(): Promise<void> {
    for (const [, task] of this.tasks) {
      if (task.status === "paused" || task.status === "error" || task.status === "idle") {
        task.status = "queued";
        await saveTask(task);
      }
    }
    this.notify();
    this.processQueue();
  }

  /**
   * Pause a downloading task without losing progress
   */
  public async pauseTask(taskId: string): Promise<void> {
    const controller = this.activeControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(taskId);
    }
    const task = this.tasks.get(taskId);
    if (task && task.status !== "completed") {
      task.status = "paused";
      task.speed = 0;
      await saveTask(task);
      this.notify();
    }
    this.releaseWakeLock();
    this.processQueue();
  }

  /**
   * Resume an existing task
   */
  public async resumeTask(taskId: string): Promise<void> {
    await this.startTask(taskId);
  }

  /**
   * Cancel and delete a task entirely
   */
  public async deleteTask(taskId: string): Promise<void> {
    const controller = this.activeControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(taskId);
    }
    this.tasks.delete(taskId);
    await dbDeleteTask(taskId);
    this.releaseWakeLock();
    this.notify();
    this.processQueue();
  }

  /**
   * Export the completed video to user's device Downloads folder or iOS Photos/Files
   */
  public async exportVideo(taskId: string): Promise<void> {
    const record = await getCompletedVideo(taskId);
    if (!record || !record.blob) {
      throw new Error("本地未找到已完成的视频文件");
    }

    const mime = record.mimeType || "video/mp4";
    const filename = record.filename || "video.mp4";

    // 优先尝试 Web Share API (在 iOS Safari / PWA 上可直接唤起原生面板“存储视频到相册”或“存储到文件”)
    if (typeof navigator !== "undefined" && typeof (navigator as any).share === "function") {
      try {
        const file = new File([record.blob], filename, { type: mime });
        if (
          typeof (navigator as any).canShare === "function" &&
          (navigator as any).canShare({ files: [file] })
        ) {
          await (navigator as any).share({
            files: [file],
            title: filename,
            text: `离线视频导出: ${filename}`,
          });
          return;
        }
      } catch (shareErr: any) {
        // 用户主动取消分享则无需再弹窗报错
        if (shareErr.name === "AbortError") {
          return;
        }
        console.warn("[DownloadManager] Web Share 导出异常，降级至标准下载链接:", shareErr);
      }
    }

    // 桌面端及不支持 Web Share 的浏览器降级走标准 a 标签下载
    const blobUrl = URL.createObjectURL(record.blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 30000);
  }

  /**
   * Retrieve URL for in-app offline video playback.
   * Prefers Service Worker virtual stream endpoint (/offline-media/:taskId/video.mp4 or playlist.m3u8),
   * providing native HTTP 206 Partial Content (Range Requests) essential for iOS AVPlayer.
   * Falls back to Blob URL if Service Worker is not available.
   */
  public async getOfflinePlaybackUrl(taskId: string): Promise<string> {
    const record = await getCompletedVideo(taskId);
    if (!record) {
      throw new Error("本地未找到可离线播放的视频");
    }

    // 检查 Service Worker 是否已就绪或处于安全上下文控制中
    const hasServiceWorker =
      typeof navigator !== "undefined" &&
      navigator.serviceWorker &&
      (navigator.serviceWorker.controller || window.isSecureContext);

    if (hasServiceWorker) {
      const isTs = record.mimeType === "video/mp2t" || record.filename.endsWith(".ts");
      const streamFilename = isTs ? "playlist.m3u8" : "video.mp4";
      return `/offline-media/${encodeURIComponent(taskId)}/${streamFilename}`;
    }

    if (!record.blob) {
      throw new Error("本地未找到可离线播放的视频数据");
    }
    return URL.createObjectURL(record.blob);
  }
}

// Global Singleton
export const downloadManager = new DownloadManager();
