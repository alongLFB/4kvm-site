/**
 * 4KVM PWA Offline Download Store (IndexedDB Layer)
 * 
 * Provides persistent storage for:
 * 1. Download task records and progress metadata ('tasks')
 * 2. Downloaded M3U8 video chunks ('segments') for resumable downloads (断点续传)
 * 3. Final remuxed offline videos ('completed_videos') for zero-traffic offline playback
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
  createdAt: number;
  updatedAt: number;
  completedSize?: number; // bytes
}

export interface SegmentRecord {
  id: string; // `${taskId}_${index}`
  taskId: string;
  index: number;
  data: Uint8Array;
  size: number;
}

export interface CompletedVideoRecord {
  taskId: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  duration: number;
  size: number;
  savedAt: number;
}

export interface StorageQuotaInfo {
  usedBytes: number;
  quotaBytes: number;
  usedPercent: number;
}

const DB_NAME = "4kvm_pwa_downloads_v1";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
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

      // 3. Completed videos store (holds final MP4 Blobs)
      if (!db.objectStoreNames.contains("completed_videos")) {
        db.createObjectStore("completed_videos", { keyPath: "taskId" });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
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

// ----------------- Task Operations -----------------

export async function saveTask(task: DownloadTaskRecord): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tasks", "readwrite");
    const store = tx.objectStore("tasks");
    const req = store.put({ ...task, updatedAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getTask(id: string): Promise<DownloadTaskRecord | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tasks", "readonly");
    const store = tx.objectStore("tasks");
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllTasks(): Promise<DownloadTaskRecord[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
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
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDB();
  await Promise.all([
    new Promise<void>((resolve, reject) => {
      const tx = db.transaction("tasks", "readwrite");
      const store = tx.objectStore("tasks");
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }),
    deleteSegmentsForTask(id),
    deleteCompletedVideo(id),
  ]);
}

// ----------------- Segment Operations (Resumable Download) -----------------

export async function saveSegment(taskId: string, index: number, data: Uint8Array): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
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
}

/**
 * Fast lookup of already downloaded segment indices for a task without loading binary data
 */
export async function getDownloadedSegmentIndices(taskId: string): Promise<Set<number>> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
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
}

export async function getSegment(taskId: string, index: number): Promise<Uint8Array | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("segments", "readonly");
    const store = tx.objectStore("segments");
    const req = store.get(`${taskId}_${index}`);
    req.onsuccess = () => {
      const res = req.result as SegmentRecord | undefined;
      resolve(res ? res.data : null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSegmentsForTask(taskId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
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
}

// ----------------- Completed Video Operations (Offline Playback) -----------------

export async function saveCompletedVideo(
  taskId: string,
  blob: Blob,
  filename: string,
  mimeType: string,
  duration: number
): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("completed_videos", "readwrite");
    const store = tx.objectStore("completed_videos");
    const record: CompletedVideoRecord = {
      taskId,
      blob,
      filename,
      mimeType,
      duration,
      size: blob.size,
      savedAt: Date.now(),
    };
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getCompletedVideo(taskId: string): Promise<CompletedVideoRecord | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("completed_videos", "readonly");
    const store = tx.objectStore("completed_videos");
    const req = store.get(taskId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCompletedVideo(taskId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("completed_videos", "readwrite");
    const store = tx.objectStore("completed_videos");
    const req = store.delete(taskId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
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
