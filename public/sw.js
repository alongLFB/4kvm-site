const CACHE_NAME = '4kvm-pwa-v4';
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// IndexedDB Helper for Offline Media
const OFFLINE_DB_NAME = '4kvm_pwa_downloads_v1';
const OFFLINE_DB_VERSION = 2;

function openDownloadsDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getStoredVideoMeta(db, taskId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('completed_videos', 'readonly');
    const store = tx.objectStore('completed_videos');
    const req = store.get(taskId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

function getStoredChunks(db, taskId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('completed_chunks', 'readonly');
    const store = tx.objectStore('completed_chunks');
    const index = store.index('taskId');
    const req = index.getAll(IDBKeyRange.only(taskId));
    req.onsuccess = () => {
      const records = req.result || [];
      records.sort((a, b) => a.chunkIndex - b.chunkIndex);
      resolve(records);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Handle /offline-media/:taskId/:filename
 * Supports:
 * 1. Virtual HLS playlist: playlist.m3u8 & segment_:idx.(ts|mp4)
 * 2. Virtual MP4/TS with HTTP 206 Partial Content (Range Requests) for iOS AVPlayer
 */
async function handleOfflineMedia(event, url) {
  const match = url.pathname.match(/^\/offline-media\/([^/]+)\/(.+)$/);
  if (!match) {
    return new Response('Invalid offline media URL', { status: 400 });
  }

  const taskId = decodeURIComponent(match[1]);
  const filename = match[2];

  let db;
  try {
    db = await openDownloadsDB();
  } catch (err) {
    return new Response('IndexedDB open error: ' + (err ? err.message : 'Unknown'), { status: 500 });
  }

  const meta = await getStoredVideoMeta(db, taskId);
  if (!meta) {
    return new Response('Offline video not found in storage', { status: 404 });
  }

  // 1. Virtual HLS playlist (/offline-media/:taskId/playlist.m3u8)
  if (filename === 'playlist.m3u8') {
    const chunks = await getStoredChunks(db, taskId);
    if (!chunks || chunks.length === 0) {
      return new Response('No offline video chunks found', { status: 404 });
    }

    const duration = meta.duration || 0;
    const avgChunkDur = chunks.length > 0 && duration > 0
      ? (duration / chunks.length).toFixed(3)
      : '5.000';
    const targetDur = Math.ceil(parseFloat(avgChunkDur) || 6);
    const isTs = meta.mimeType === 'video/mp2t' || meta.filename.endsWith('.ts');
    const ext = isTs ? 'ts' : 'mp4';

    let manifest =
      '#EXTM3U\n' +
      '#EXT-X-VERSION:3\n' +
      `#EXT-X-TARGETDURATION:${targetDur}\n` +
      '#EXT-X-MEDIA-SEQUENCE:0\n' +
      '#EXT-X-PLAYLIST-TYPE:VOD\n';

    for (let i = 0; i < chunks.length; i++) {
      manifest += `#EXTINF:${avgChunkDur},\nsegment_${i}.${ext}\n`;
    }
    manifest += '#EXT-X-ENDLIST\n';

    return new Response(manifest, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // 2. Individual chunk segment (/offline-media/:taskId/segment_:idx.(ts|mp4))
  const segMatch = filename.match(/^segment_(\d+)\.(ts|mp4|m4s)$/);
  if (segMatch) {
    const chunkIdx = parseInt(segMatch[1], 10);
    const chunks = await getStoredChunks(db, taskId);
    const chunk = chunks.find((c) => c.chunkIndex === chunkIdx);
    if (!chunk || !chunk.data) {
      return new Response('Segment not found', { status: 404 });
    }

    const isTs = segMatch[2] === 'ts' || meta.mimeType === 'video/mp2t';
    const mime = isTs ? 'video/mp2t' : 'video/mp4';

    return new Response(chunk.data, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Length': `${chunk.data.byteLength}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // 3. Regular Video File request (e.g. video.mp4) with HTTP 206 Range Request handling
  let fullBlob = meta.blob;
  if (!fullBlob) {
    const chunks = await getStoredChunks(db, taskId);
    if (!chunks || chunks.length === 0) {
      return new Response('No video content available', { status: 404 });
    }
    fullBlob = new Blob(chunks.map((c) => c.data), {
      type: meta.mimeType || 'video/mp4',
    });
  }

  const totalSize = fullBlob.size || meta.size || 0;
  const rangeHeader = event.request.headers.get('range');

  if (!rangeHeader) {
    return new Response(fullBlob, {
      status: 200,
      headers: {
        'Content-Type': meta.mimeType || 'video/mp4',
        'Content-Length': `${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!rangeMatch) {
    return new Response('Malformed Range Header', { status: 400 });
  }

  const start = parseInt(rangeMatch[1], 10);
  const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : totalSize - 1;

  if (isNaN(start) || start >= totalSize || end < start) {
    return new Response('Range Not Satisfiable', {
      status: 416,
      headers: {
        'Content-Range': `bytes */${totalSize}`,
      },
    });
  }

  const boundedEnd = Math.min(end, totalSize - 1);
  const chunkLength = boundedEnd - start + 1;
  const slicedBlob = fullBlob.slice(start, boundedEnd + 1);

  return new Response(slicedBlob, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': meta.mimeType || 'video/mp4',
      'Content-Range': `bytes ${start}-${boundedEnd}/${totalSize}`,
      'Content-Length': `${chunkLength}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // 1. 严格只处理 http 与 https 请求，彻底忽略 chrome-extension:// 等浏览器扩展协议
  if (!event.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(event.request.url);

  // 1.5 拦截 /offline-media/ 虚拟流媒体请求（服务于 iOS/移动端 离线播放，支持 HTTP 206 Range 与虚拟 HLS）
  if (url.origin === self.location.origin && url.pathname.startsWith('/offline-media/')) {
    event.respondWith(handleOfflineMedia(event, url));
    return;
  }

  // 2. 仅拦截本站同源资源，排除 API、Next.js 内部代码块与视频切片流
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.endsWith('.m3u8') ||
    url.pathname.endsWith('.ts')
  ) {
    return;
  }

  // 3. 网络优先（Network-first），并在成功时写入同源缓存
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache).catch(() => {});
            })
            .catch(() => {});
        }
        return networkResponse;
      })
      .catch(async () => {
        // 先检查是否有当前请求的具体离线缓存
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }

        // 如果是 HTML 页面导航 (用户点击页面链接或刷新)，降级回退到 precache 的根页面 SPA 壳
        if (event.request.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) {
            return shell;
          }
        }

        // 兜底返回结构完备的友好提示
        return new Response(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>网络连接不稳定 - 4KVM</title><style>body{background:#050811;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;padding:24px;text-align:center;}h2{color:#22d3ee;font-size:18px;margin-bottom:8px;}p{color:#94a3b8;font-size:13px;max-width:320px;line-height:1.5;margin-bottom:24px;}button{background:#06b6d4;color:#050811;font-weight:bold;border:none;padding:10px 22px;border-radius:12px;font-size:14px;cursor:pointer;box-shadow:0 4px 12px rgba(6,182,212,0.3);}</style></head><body><h2>网络连接暂时中断</h2><p>当前页面未能成功载入，请检查手机网络连接后点击重试。</p><button onclick="location.reload()">重新加载页面</button></body></html>',
          {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        );
      })
  );
});