/**
 * 4KVM PWA Offline Download Store (IndexedDB Layer)
 * 
 * Provides persistent storage for:
 * 1. Download task records and progress metadata ('tasks')
 * 2. Downloaded M3U8 video chunks ('segments') for resumable downloads (断点续传)
 * 3. Final remuxed offline videos ('completed_videos' metadata & 'completed_chunks' sliced binary parts)
 *    Specially optimized for iOS WebKit & Mobile PWA to prevent memory overflow (OOM) and IDB daemon crashes.
 */

export interface DownloadTaskRecord {
  id: string; // unique task ID (e.g. vodId_epIndex)
  vodId?: string;
  vodName: string;
  episodeName: string;
  typeName?: string; // e.g. "电影" | "电视剧" | "动漫" | "综艺"
  cover?: string;
  m3u8Url: string;
  format: "mp4" | "ts";
  status: "idle" | "queued" | "parsing" | "downloading" | "paused" | "remuxing" | "completed" | "error";
  totalSegments: number;
  downloadedCount: number;
  downloadedBytes: number;
  totalDuration: number;
  speed: number; // bytes / sec
  percent: number;
  error?: string;
  concurrency?: number; // 4 | 8 | 16 | 32
  createdAt: number;
  updatedAt: number;
  completedSize?: number; // bytes
}

export interface DownloadSettings {
  concurrency: number; // 切片并发拉取线程 (4, 8, 16, 32)
  maxConcurrentTasks: number; // 同时下载的任务数 (1, 2, 3, 4)
  storageLimitGB: number | null; // 自定义离线存储上限(GB), null 或 0 表示跟随系统
}

const SETTINGS_KEY = "4kvm_download_settings_v1";

export function loadDownloadSettings(): DownloadSettings {
  if (typeof window === "undefined") {
    return { concurrency: 8, maxConcurrentTasks: 2, storageLimitGB: null };
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        concurrency: parsed.concurrency || 8,
        maxConcurrentTasks: parsed.maxConcurrentTasks || 2,
        storageLimitGB:
          typeof parsed.storageLimitGB === "number" && parsed.storageLimitGB > 0
            ? parsed.storageLimitGB
            : null,
      };
    }
  } catch {}
  return { concurrency: 8, maxConcurrentTasks: 2, storageLimitGB: null };
}

export function saveDownloadSettings(settings: DownloadSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

export interface SegmentRecord {
  id: string; // `${taskId}_${index}`
  taskId: string;
  index: number;
  data: Uint8Array;
  size: number;
}

export interface CompletedChunkRecord {
  id: string; // `${taskId}_${chunkIndex}`
  taskId: string;
  chunkIndex: number;
  data: Uint8Array;
  size: number;
}

export interface CompletedVideoRecord {
  taskId: string;
  blob?: Blob;
  filename: string;
  mimeType: string;
  duration: number;
  size: number;
  savedAt: number;
  isChunked?: boolean;
  chunkCount?: number;
  chunkSizes?: number[];
}

export interface StorageQuotaInfo {
  usedBytes: number;
  quotaBytes: number;
  usedPercent: number;
}

const DB_NAME = "4kvm_pwa_downloads_v1";
const DB_VERSION = 2; // Bumped to 2 for resilient chunked storage on iOS

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available on server-side"));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // 1. Tasks store
      if (!db.objectStoreNames.contains("tasks")) {
        const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
        taskStore.createIndex("status", "status", { unique: false });
        taskStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      // 2. Segments store (holds raw TS chunks before remux)
      if (!db.objectStoreNames.contains("segments")) {
        const segStore = db.createObjectStore("segments", { keyPath: "id" });
        segStore.createIndex("taskId", "taskId", { unique: false });
      }

      // 3. Completed videos metadata store
      if (!db.objectStoreNames.contains("completed_videos")) {
        db.createObjectStore("completed_videos", { keyPath: "taskId" });
      }

      // 4. Completed chunks store (holds 8-16MB binary chunks for iOS / WebKit reliability)
      if (!db.objectStoreNames.contains("completed_chunks")) {
        const chunkStore = db.createObjectStore("completed_chunks", { keyPath: "id" });
        chunkStore.createIndex("taskId", "taskId", { unique: false });
        chunkStore.createIndex("chunkIndex", "chunkIndex", { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      db.onclose = () => {
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error("Failed to open IndexedDB"));
    };
  });

  return dbPromise;
}

/**
 * Safely executes an IndexedDB operation with automatic reconnection on iOS Safari/PWA
 * if the database daemon connection is dropped.
 */
export async function safeIdbOperation<T>(operation: (db: IDBDatabase) => Promise<T>): Promise<T> {
  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      const db = await getDB();
      return await operation(db);
    } catch (err: any) {
      const msg = String(err?.message || err?.name || err || "");
      const isConnectionLost =
        err?.name === "DatabaseClosedError" ||
        err?.name === "UnknownError" ||
        err?.name === "InvalidStateError" ||
        msg.includes("Connection to Indexed Database server lost") ||
        msg.includes("database connection is closing") ||
        msg.includes("closed");

      if (isConnectionLost && attempts < 3) {
        console.warn(`[DownloadStore] IndexedDB connection lost (${msg}), reconnecting (attempt ${attempts})...`);
        dbPromise = null;
        await new Promise((r) => setTimeout(r, 200 * attempts));
        continue;
      }
      throw err;
    }
  }
  throw new Error("IndexedDB 操作失败：底层数据库连接重试超时");
}

// ----------------- Task Operations -----------------

export async function saveTask(task: DownloadTaskRecord): Promise<void> {
  return safeIdbOperation(async (db) => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction("tasks", "readwrite");
      const store = tx.objectStore("tasks");
      const req = store.put({ ...task, updatedAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getTask(id: string): Promise<DownloadTaskRecord | null> {
  return safeIdbOperation(async (db) => {
    return new Promise<DownloadTaskRecord | null>((resolve, reject) => {
      const tx = db.transaction("tasks", "readonly");
      const store = tx.objectStore("tasks");
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getAllTasks(): Promise<DownloadTaskRecord[]> {
  return safeIdbOperation(async (db) => {
    return new Promise<DownloadTaskRecord[]>((resolve, reject) => {
      const tx = db.transaction("tasks", "readonly");
      const store = tx.objectStore("tasks");
      const req = store.getAll();
      req.onsuccess = () => {
        const list: DownloadTaskRecord[] = req.result || [];
        list.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

export async function deleteTask(id: string): Promise<void> {
  await Promise.all([
    safeIdbOperation(async (db) => {
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction("tasks", "readwrite");
        const store = tx.objectStore("tasks");
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }),
    deleteSegmentsForTask(id),
    deleteCompletedVideo(id),
  ]);
}

// ----------------- Segment Operations (Resumable Download) -----------------

export async function saveSegment(taskId: string, index: number, data: Uint8Array): Promise<void> {
  return safeIdbOperation(async (db) => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction("segments", "readwrite");
      const store = tx.objectStore("segments");
      const record: SegmentRecord = {
        id: `${taskId}_${index}`,
        taskId,
        index,
        data,
        size: data.byteLength,
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

/**
 * Fast lookup of already downloaded segment indices for a task without loading binary data
 */
export async function getDownloadedSegmentIndices(taskId: string): Promise<Set<number>> {
  return safeIdbOperation(async (db) => {
    return new Promise<Set<number>>((resolve, reject) => {
      const tx = db.transaction("segments", "readonly");
      const store = tx.objectStore("segments");
      const index = store.index("taskId");
      const req = index.getAllKeys(IDBKeyRange.only(taskId));

      req.onsuccess = () => {
        const keys = (req.result as string[]) || [];
        const set = new Set<number>();
        for (const k of keys) {
          const lastUnderscore = k.lastIndexOf("_");
          if (lastUnderscore !== -1) {
            const idx = parseInt(k.substring(lastUnderscore + 1), 10);
            if (!isNaN(idx)) set.add(idx);
          }
        }
        resolve(set);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getSegment(taskId: string, index: number): Promise<Uint8Array | null> {
  return safeIdbOperation(async (db) => {
    return new Promise<Uint8Array | null>((resolve, reject) => {
      const tx = db.transaction("segments", "readonly");
      const store = tx.objectStore("segments");
      const req = store.get(`${taskId}_${index}`);
      req.onsuccess = () => {
        const res = req.result as SegmentRecord | undefined;
        resolve(res ? res.data : null);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

/**
 * Batch read multiple segments in a single transaction to prevent WebKit IPC pipe exhaustion
 */
export async function getSegmentBatch(
  taskId: string,
  startIndex: number,
  count: number
): Promise<(Uint8Array | null)[]> {
  return safeIdbOperation(async (db) => {
    return new Promise<(Uint8Array | null)[]>((resolve, reject) => {
      const tx = db.transaction("segments", "readonly");
      const store = tx.objectStore("segments");
      const results: (Uint8Array | null)[] = new Array(count).fill(null);
      let pending = count;

      if (count === 0) {
        resolve(results);
        return;
      }

      for (let i = 0; i < count; i++) {
        const idx = startIndex + i;
        const req = store.get(`${taskId}_${idx}`);
        const slot = i;
        req.onsuccess = () => {
          const rec = req.result as SegmentRecord | undefined;
          results[slot] = rec ? rec.data : null;
          pending--;
          if (pending === 0) resolve(results);
        };
        req.onerror = () => {
          pending--;
          if (pending === 0) resolve(results);
        };
      }
    });
  });
}

export async function deleteSegmentsForTask(taskId: string): Promise<void> {
  return safeIdbOperation(async (db) => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction("segments", "readwrite");
      const store = tx.objectStore("segments");
      const index = store.index("taskId");
      const req = index.getAllKeys(IDBKeyRange.only(taskId));

      req.onsuccess = () => {
        const keys = (req.result as string[]) || [];
        if (keys.length === 0) {
          resolve();
          return;
        }
        let count = 0;
        for (const k of keys) {
          store.delete(k);
          count++;
          if (count === keys.length) resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  });
}

// ----------------- Completed Chunk Operations (Low-Memory iOS Architecture) -----------------

export async function saveCompletedChunk(
  taskId: string,
  chunkIndex: number,
  data: Uint8Array
): Promise<void> {
  return safeIdbOperation(async (db) => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction("completed_chunks", "readwrite");
      const store = tx.objectStore("completed_chunks");
      const record: CompletedChunkRecord = {
        id: `${taskId}_${chunkIndex}`,
        taskId,
        chunkIndex,
        data,
        size: data.byteLength,
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getCompletedChunks(taskId: string): Promise<Uint8Array[]> {
  return safeIdbOperation(async (db) => {
    return new Promise<Uint8Array[]>((resolve, reject) => {
      const tx = db.transaction("completed_chunks", "readonly");
      const store = tx.objectStore("completed_chunks");
      const index = store.index("taskId");
      const req = index.getAll(IDBKeyRange.only(taskId));
      req.onsuccess = () => {
        const records = (req.result as CompletedChunkRecord[]) || [];
        records.sort((a, b) => a.chunkIndex - b.chunkIndex);
        resolve(records.map((r) => r.data));
      };
      req.onerror = () => reject(req.error);
    });
  });
}

export async function deleteCompletedChunksForTask(taskId: string): Promise<void> {
  return safeIdbOperation(async (db) => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction("completed_chunks", "readwrite");
      const store = tx.objectStore("completed_chunks");
      const index = store.index("taskId");
      const req = index.getAllKeys(IDBKeyRange.only(taskId));

      req.onsuccess = () => {
        const keys = (req.result as string[]) || [];
        if (keys.length === 0) {
          resolve();
          return;
        }
        let count = 0;
        for (const k of keys) {
          store.delete(k);
          count++;
          if (count === keys.length) resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  });
}

// ----------------- Completed Video Operations (Offline Playback) -----------------

export type SaveCompletedVideoInput =
  | Blob
  | {
      filename: string;
      mimeType: string;
      duration: number;
      size: number;
      isChunked: boolean;
      chunkCount: number;
      chunkSizes?: number[];
      blob?: Blob;
    };

export async function saveCompletedVideo(
  taskId: string,
  blobOrMeta: SaveCompletedVideoInput,
  filename?: string,
  mimeType?: string,
  duration?: number
): Promise<void> {
  return safeIdbOperation(async (db) => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction("completed_videos", "readwrite");
      const store = tx.objectStore("completed_videos");

      let record: CompletedVideoRecord;

      if (blobOrMeta instanceof Blob) {
        record = {
          taskId,
          blob: blobOrMeta,
          filename: filename || "video.mp4",
          mimeType: mimeType || blobOrMeta.type || "video/mp4",
          duration: duration || 0,
          size: blobOrMeta.size,
          savedAt: Date.now(),
          isChunked: false,
          chunkCount: 0,
        };
      } else {
        record = {
          taskId,
          filename: blobOrMeta.filename,
          mimeType: blobOrMeta.mimeType,
          duration: blobOrMeta.duration,
          size: blobOrMeta.size,
          savedAt: Date.now(),
          isChunked: blobOrMeta.isChunked,
          chunkCount: blobOrMeta.chunkCount,
          chunkSizes: blobOrMeta.chunkSizes,
          blob: !blobOrMeta.isChunked && blobOrMeta.blob ? blobOrMeta.blob : undefined,
        };
      }

      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

/**
 * Retrieve ONLY the metadata record of a completed video from IndexedDB (instant, zero memory allocation).
 * Use this for checking stream URLs, task info, and exports without loading gigabytes of binary chunks into RAM.
 */
export async function getCompletedVideoMeta(taskId: string): Promise<CompletedVideoRecord | null> {
  return safeIdbOperation(async (db) => {
    return new Promise<CompletedVideoRecord | null>((resolve, reject) => {
      const tx = db.transaction("completed_videos", "readonly");
      const store = tx.objectStore("completed_videos");
      const req = store.get(taskId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getCompletedVideo(taskId: string): Promise<CompletedVideoRecord | null> {
  const meta = await getCompletedVideoMeta(taskId);

  if (!meta) return null;

  // If already has a legacy monolithic Blob, return it
  if (meta.blob) {
    return meta;
  }

  // If stored in chunked format, assemble Blob on-demand from completed_chunks
  if (meta.isChunked || (meta.chunkCount && meta.chunkCount > 0)) {
    const chunks = await getCompletedChunks(taskId);
    if (chunks.length > 0) {
      // Blob creation from parts does not replicate data across JS Heap
      const assembledBlob = new Blob(chunks as unknown as BlobPart[], {
        type: meta.mimeType || "video/mp4",
      });
      return {
        ...meta,
        blob: assembledBlob,
      };
    }
  }

  return meta;
}

export async function deleteCompletedVideo(taskId: string): Promise<void> {
  await Promise.all([
    safeIdbOperation(async (db) => {
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction("completed_videos", "readwrite");
        const store = tx.objectStore("completed_videos");
        const req = store.delete(taskId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }),
    deleteCompletedChunksForTask(taskId),
  ]);
}

// ----------------- Storage Quota -----------------

export async function getStorageQuota(): Promise<StorageQuotaInfo> {
  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usedBytes = estimate.usage || 0;
      const quotaBytes = estimate.quota || 1024 * 1024 * 1024 * 10; // fallback 10GB
      const usedPercent = quotaBytes > 0 ? Math.round((usedBytes / quotaBytes) * 100) : 0;
      return { usedBytes, quotaBytes, usedPercent };
    } catch {}
  }
  return { usedBytes: 0, quotaBytes: 1024 * 1024 * 1024 * 10, usedPercent: 0 };
}

/**
 * 申请浏览器持久化存储权限 (防止系统在空间紧张时自动清理离线视频)
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        return await navigator.storage.persist();
      }
      return true;
    } catch {}
  }
  return false;
}
