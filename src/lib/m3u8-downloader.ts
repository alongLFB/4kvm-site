// @ts-ignore
import muxjs from "mux.js";

export interface DownloadProgress {
  phase: "idle" | "parsing" | "downloading" | "remuxing" | "completed" | "error" | "aborted";
  totalSegments: number;
  downloadedSegments: number;
  downloadedBytes: number;
  speed: number; // bytes per second
  percent: number;
  error?: string;
}

export interface ParseResult {
  title: string;
  subPlaylistUrl: string;
  segments: string[];
  totalDuration: number;
}

/**
 * Fetch a resource with automatic CORS proxy fallback
 */
export async function smartFetch(url: string, signal?: AbortSignal): Promise<Response> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res;
  } catch (err: any) {
    if (signal?.aborted) throw err;
    // Fallback to internal proxy if direct fetch fails (e.g. CORS or mixed content)
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal });
    if (!res.ok) {
      throw new Error(`Proxy HTTP ${res.status}`);
    }
    return res;
  }
}

/**
 * Parse an M3U8 URL and resolve its segment list
 */
export async function parseM3U8(m3u8Url: string, signal?: AbortSignal): Promise<ParseResult> {
  const res = await smartFetch(m3u8Url, signal);
  const text = await res.text();

  let targetPlaylistUrl = m3u8Url;
  let playlistContent = text;

  // Check if it's a master playlist containing #EXT-X-STREAM-INF
  if (text.includes("#EXT-X-STREAM-INF")) {
    const lines = text.split(/\r?\n/);
    let subUri = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("#EXT-X-STREAM-INF") && i + 1 < lines.length) {
        // Look for the next non-empty, non-comment line
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine && !nextLine.startsWith("#")) {
            subUri = nextLine;
            break;
          }
        }
        if (subUri) break;
      }
    }

    if (subUri) {
      targetPlaylistUrl = new URL(subUri, m3u8Url).href;
      const subRes = await smartFetch(targetPlaylistUrl, signal);
      playlistContent = await subRes.text();
    }
  }

  // Parse segments from playlistContent
  const lines = playlistContent.split(/\r?\n/);
  const segments: string[] = [];
  let totalDuration = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("#EXTINF:")) {
      const durationMatch = line.match(/#EXTINF:([\d.]+)/);
      if (durationMatch) {
        totalDuration += parseFloat(durationMatch[1]);
      }
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine && !nextLine.startsWith("#")) {
          const resolvedSegUrl = new URL(nextLine, targetPlaylistUrl).href;
          segments.push(resolvedSegUrl);
          i = j;
          break;
        }
      }
    }
  }

  if (segments.length === 0) {
    throw new Error("无法从流媒体播放列表中解析出视频分片，可能该源已失效或需要专属鉴权。");
  }

  return {
    title: "",
    subPlaylistUrl: targetPlaylistUrl,
    segments,
    totalDuration,
  };
}

export interface DownloadOptions {
  m3u8Url: string;
  filename: string;
  format: "mp4" | "ts";
  concurrency?: number;
  onProgress: (progress: DownloadProgress) => void;
  signal: AbortSignal;
}

/**
 * Downloads all segments concurrently and remuxes to MP4 or TS
 */
export async function downloadAndSaveM3U8({
  m3u8Url,
  filename,
  format,
  concurrency = 4,
  onProgress,
  signal,
}: DownloadOptions): Promise<void> {
  onProgress({
    phase: "parsing",
    totalSegments: 0,
    downloadedSegments: 0,
    downloadedBytes: 0,
    speed: 0,
    percent: 0,
  });

  const parsed = await parseM3U8(m3u8Url, signal);
  const { segments } = parsed;
  const total = segments.length;

  let downloadedCount = 0;
  let totalBytes = 0;
  let lastBytes = 0;
  let lastTime = Date.now();
  let currentSpeed = 0;

  // Pre-allocated array to preserve segment order
  const segmentBuffers: (Uint8Array | null)[] = new Array(total).fill(null);

  // Speed calculation interval
  const speedInterval = setInterval(() => {
    const now = Date.now();
    const timeDiff = (now - lastTime) / 1000;
    if (timeDiff > 0.5) {
      const bytesDiff = totalBytes - lastBytes;
      currentSpeed = bytesDiff / timeDiff;
      lastBytes = totalBytes;
      lastTime = now;
    }
  }, 500);

  // Concurrency queue
  let currentIndex = 0;

  const worker = async () => {
    while (currentIndex < total) {
      if (signal.aborted) {
        throw new Error("下载已被取消");
      }

      const idx = currentIndex++;
      const segUrl = segments[idx];

      // Retry up to 3 times for flaky networks
      let retries = 3;
      let buf: Uint8Array | null = null;

      while (retries > 0) {
        try {
          if (signal.aborted) throw new Error("下载已被取消");
          const res = await smartFetch(segUrl, signal);
          const arrayBuf = await res.arrayBuffer();
          buf = new Uint8Array(arrayBuf);
          break;
        } catch (err: any) {
          if (signal.aborted) throw err;
          retries--;
          if (retries === 0) {
            throw new Error(`切片分段 [${idx + 1}/${total}] 下载失败: ${err.message}`);
          }
          await new Promise((r) => setTimeout(r, 800));
        }
      }

      if (buf) {
        segmentBuffers[idx] = buf;
        downloadedCount++;
        totalBytes += buf.byteLength;

        const percent = Math.min(Math.round((downloadedCount / total) * 98), 98);
        onProgress({
          phase: "downloading",
          totalSegments: total,
          downloadedSegments: downloadedCount,
          downloadedBytes: totalBytes,
          speed: currentSpeed,
          percent,
        });
      }
    }
  };

  try {
    const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
    await Promise.all(workers);
  } finally {
    clearInterval(speedInterval);
  }

  if (signal.aborted) {
    throw new Error("下载已中止");
  }

  // Remux or assemble
  onProgress({
    phase: "remuxing",
    totalSegments: total,
    downloadedSegments: total,
    downloadedBytes: totalBytes,
    speed: 0,
    percent: 99,
  });

  let outputBlob: Blob;

  if (format === "mp4") {
    // Transmux TS segments to fragmented MP4 using mux.js
    let initSegment: Uint8Array | null = null;
    const mp4Chunks: Uint8Array[] = [];

    const transmuxer = new muxjs.mp4.Transmuxer({
      remux: true,
      keepOriginalTimestamps: true,
    });

    transmuxer.on("data", (segment: any) => {
      if (segment.initSegment && !initSegment) {
        initSegment = segment.initSegment;
      }
      if (segment.data && segment.data.byteLength > 0) {
        mp4Chunks.push(segment.data);
      }
    });

    for (let i = 0; i < segmentBuffers.length; i++) {
      const buf = segmentBuffers[i];
      if (buf) {
        transmuxer.push(buf);
        transmuxer.flush();
      }
    }

    if (initSegment && mp4Chunks.length > 0) {
      outputBlob = new Blob([initSegment as unknown as BlobPart, ...mp4Chunks as unknown as BlobPart[]], { type: "video/mp4" });
    } else {
      // Fallback: if transmux produced empty output, fallback to valid MPEG-TS
      console.warn("Remux produced no MP4 tracks, falling back to MPEG-TS blob");
      outputBlob = new Blob(segmentBuffers as unknown as BlobPart[], { type: "video/mp2t" });
    }
  } else {
    // Pure MPEG-TS concatenation
    outputBlob = new Blob(segmentBuffers as unknown as BlobPart[], { type: "video/mp2t" });
  }

  // Trigger browser file download
  const blobUrl = URL.createObjectURL(outputBlob);
  const a = document.createElement("a");
  a.href = blobUrl;
  const ext = format === "mp4" ? ".mp4" : ".ts";
  const safeTitle = filename.replace(/[/\\?%*:|"<>]/g, "_").trim() || "video";
  a.download = safeTitle.endsWith(ext) ? safeTitle : `${safeTitle}${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Revoke object URL after delay
  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
  }, 30000);

  onProgress({
    phase: "completed",
    totalSegments: total,
    downloadedSegments: total,
    downloadedBytes: totalBytes,
    speed: 0,
    percent: 100,
  });
}
