// 심도측정 시스템 서비스워커 (웹 브라우저용)
// - 화면과 라이브러리는 모두 같은 사이트(lib/)에 있어 외부 CDN을 쓰지 않음
// - 화면(HTML)은 네트워크 우선, 나머지 정적 파일은 캐시 우선
// - 카카오 주소 API, 지도 타일 등 외부 요청은 관여하지 않음
// - APK 앱은 화면을 앱 안에 내장하므로 이 서비스워커를 쓰지 않음

const CACHE_NAME = 'depth-app-cache-v1-9';
const APP_SHELL = [
  './',
  './index.html',
  './facility.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './lib/app.css',
  './lib/fontawesome/css/fontawesome.min.css',
  './lib/fontawesome/css/solid.min.css',
  './lib/fontawesome/webfonts/fa-solid-900.woff2',
  './lib/xlsx-style.min.js',
  './lib/leaflet/leaflet.css',
  './lib/leaflet/leaflet.js',
  './lib/vworld.js',
  './lib/tmcoord.js',
  './lib/jszip.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;

  // 페이지(HTML): 네트워크 우선, 오프라인이면 캐시
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

  // 나머지 정적 파일: 캐시 우선
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
});
