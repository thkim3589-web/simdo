// 심도측정 시스템 서비스워커
// - 앱 셸(정적 파일)을 캐싱해 오프라인에서도 화면이 열리도록 함
// - 카카오 주소 API 등 외부 네트워크 요청은 캐싱하지 않고 그대로 통과시킴

const CACHE_NAME = 'depth-app-cache-v0-0';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  // 페이지(HTML)는 네트워크 우선: 업데이트가 바로 반영되고, 오프라인일 때만 캐시 사용
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // 아이콘 등 나머지 정적 파일은 캐시 우선
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached ||
      fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
    )
  );
  // 카카오 API 등 외부 요청은 서비스워커가 관여하지 않고 그대로 네트워크로 보냄
});
