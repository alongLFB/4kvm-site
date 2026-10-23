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
  getDownloadedSegmentIndices,
  deleteSegmentsForTask,
  saveCompletedVideo,
  getCompletedVideo,
  deleteCompletedVideo,
  DownloadTaskRecord,
} from "./download-store";

export type DownloadListener = (tasks: DownloadTaskRecord[]) => void;

class DownloadManager {
  private tasks: Map<string, DownloadTaskRecord> = new Map();
  private activeControllers: Map<string, AbortController> = new Map();
  private listeners: Set<DownloadListener> = new Set();
  private wakeLockSentinel: any = null;
  private initialized = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.init();
    }
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
    cover?: string;
    m3u8Url: string;
    format?: "mp4" | "ts";
  }): Promise<DownloadTaskRecord> {
    await this.init();

    // Deterministic ID so duplicate adds reuse the same task
    const safeVodName = params.vodName.replace(/[^\w\u4e00-\u9fa5]/g, "_");
    const safeEpName = params.episodeName.replace(/[^\w\u4e00-\u9fa5]/g, "_");
    const taskId = `${safeVodName}_${safeEpName}_${params.format || "mp4"}`;

    const existing = this.tasks.get(taskId);
    if (existing) {
      return existing;
    }

    const newTask: DownloadTaskRecord = {
      id: taskId,
      vodId: params.vodId,
      vodName: params.vodName,
      episodeName: params.episodeName,
      cover: params.cover,
      m3u8Url: params.m3u8Url,
      format: params.format || "mp4",
      status: "idle",
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

      // 3. Download missing segments concurrently
      let lastBytes = 0;
      let lastTime = Date.now();
      let totalBytes = task.downloadedBytes;
      let queuePointer = 0;
      const concurrency = 4;

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

      // 4. Remux or assemble to MP4 / TS
      task.status = "remuxing";
      task.speed = 0;
      task.percent = 99;
      await saveTask(task);
      this.notify();

      let outputBlob: Blob;

      if (task.format === "mp4") {
        let initSegment: Uint8Array | null = null;
        const mp4Chunks: Uint8Array[] = [];

        // Set keepOriginalTimestamps: false to normalize PTS to 0
        const transmuxer = new muxjs.mp4.Transmuxer({
          remux: true,
          keepOriginalTimestamps: false,
        });

        transmuxer.on("data", (segment: any) => {
          if (segment.initSegment && !initSegment) {
            initSegment = segment.initSegment;
          }
          if (segment.data && segment.data.byteLength > 0) {
            mp4Chunks.push(segment.data);
          }
        });

        // Read all segments sequentially from IndexedDB to avoid holding all in memory
        for (let i = 0; i < total; i++) {
          const buf = await getSegment(taskId, i);
          if (buf) {
            transmuxer.push(buf);
            transmuxer.flush();
          }
        }

        if (initSegment && mp4Chunks.length > 0) {
          const patchedInit = patchMp4InitSegment(initSegment, task.totalDuration);
          outputBlob = new Blob([patchedInit as unknown as BlobPart, ...mp4Chunks as unknown as BlobPart[]], {
            type: "video/mp4",
          });
        } else {
          // Fallback to MPEG-TS
          const rawChunks: Uint8Array[] = [];
          for (let i = 0; i < total; i++) {
            const buf = await getSegment(taskId, i);
            if (buf) rawChunks.push(buf);
          }
          outputBlob = new Blob(rawChunks as unknown as BlobPart[], { type: "video/mp2t" });
        }
      } else {
        const rawChunks: Uint8Array[] = [];
        for (let i = 0; i < total; i++) {
          const buf = await getSegment(taskId, i);
          if (buf) rawChunks.push(buf);
        }
        outputBlob = new Blob(rawChunks as unknown as BlobPart[], { type: "video/mp2t" });
      }

      // 5. Save the finished video into IndexedDB for in-app offline playback
      const ext = task.format === "mp4" ? ".mp4" : ".ts";
      const filename = `${task.vodName} - ${task.episodeName}${ext}`;
      await saveCompletedVideo(taskId, outputBlob, filename, outputBlob.type, task.totalDuration);

      // Clean up intermediate raw chunk segments to save disk space
      await deleteSegmentsForTask(taskId);

      task.status = "completed";
      task.percent = 100;
      task.speed = 0;
      task.completedSize = outputBlob.size;
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
    }
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
  }

  /**
   * Export the completed video to user's device Downloads folder
   */
  public async exportVideo(taskId: string): Promise<void> {
    const record = await getCompletedVideo(taskId);
    if (!record) {
      throw new Error("本地未找到已完成的视频文件");
    }

    const blobUrl = URL.createObjectURL(record.blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = record.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 30000);
  }

  /**
   * Retrieve Blob URL for in-app offline video playback
   */
  public async getOfflinePlaybackUrl(taskId: string): Promise<string> {
    const record = await getCompletedVideo(taskId);
    if (!record) {
      throw new Error("本地未找到可离线播放的视频");
    }
    return URL.createObjectURL(record.blob);
  }
}

// Global Singleton
export const downloadManager = new DownloadManager();
