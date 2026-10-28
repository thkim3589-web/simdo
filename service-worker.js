// 심도측정 시스템 서비스워커
// - 앱 셸(정적 파일)을 캐싱해 오프라인에서도 화면이 열리도록 함
// - 카카오 주소 API 등 외부 네트워크 요청은 캐싱하지 않고 그대로 통과시킴

const CACHE_NAME = 'depth-app-cache-v0-4';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 화면·엑셀에 필요한 외부 라이브러리 (현장에서 신호가 약해도 동작하도록 미리 저장)
const CDN_FILES = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];
const CDN_HOSTS = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_SHELL);
      // 외부 파일은 하나가 실패해도 설치가 막히지 않도록 개별 저장
      await Promise.all(CDN_FILES.map((u) =>
        fetch(u, { mode: 'no-cors' }).then((r) => cache.put(u, r)).catch(() => {})
      ));
    })
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

  // 외부 라이브러리(CDN): 캐시 우선, 없으면 받아서 저장
  if (CDN_HOSTS.includes(url.hostname)) {
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
    return;
  }

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
