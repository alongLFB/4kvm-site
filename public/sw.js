const CACHE_NAME = '4kvm-pwa-v3';
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

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
        // Next.js 客户端路由即可接管渲染，避免 Safari / PWA 报原生的 "This page couldn’t load" 崩溃
        if (event.request.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) {
            return shell;
          }
        }

        // 兜底返回结构完备的友好提示，决不返回 undefined 导致浏览器抛出致命 NetworkError
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