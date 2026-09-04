/* global self, caches, fetch, URL */
/* 교실 와이파이 대비 오프라인 캐시. 같은 출처의 정적 자원을 캐시 우선으로 제공하고,
   HTML 은 네트워크 우선(새 배포 반영) → 실패 시 캐시. */
const VERSION = 'fcl-v3-2026.09.05';
const SHELL = [
  '/', '/index.html', '/manifest.webmanifest', '/og.png',
  '/assets/backgrounds/page-01.webp',
  '/assets/page-01/logo.webp', '/assets/page-01/badge.webp',
  '/assets/page-01/keyart.webp',
  // 홈·브리핑 BGM 은 설치 때 통째로 보관한다(오프라인 첫 화면에서 소리가 끊기지 않게). 나머지 트랙은 재생 시 보관.
  '/audio/bgm/main.mp3',
];

async function precacheEntryAssets(cache) {
  const response = await fetch('/index.html', { cache: 'no-store' });
  if (!response.ok) return;
  const html = await response.text();
  const entryAssets = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
    .map((match) => new URL(match[1], self.location.origin))
    .filter((url) => url.origin === self.location.origin)
    .map((url) => url.pathname);
  await cache.addAll([...new Set(entryAssets)]);

  // Vite의 지연 로딩 청크 이름은 진입 JS 안에 들어 있다. 화면을 아직 열지 않았어도
  // 코드와 CSS는 미리 보관해 두어 오프라인 새로고침에서 복구 화면으로 빠지지 않게 한다.
  const scriptPaths = entryAssets.filter((asset) => asset.endsWith('.js'));
  const chunkPaths = [];
  for (const scriptPath of scriptPaths) {
    const scriptResponse = await cache.match(scriptPath, { ignoreVary: true });
    if (!scriptResponse) continue;
    const script = await scriptResponse.text();
    for (const match of script.matchAll(/assets\/[A-Za-z0-9_.-]+\.(?:js|css)/g)) {
      chunkPaths.push(`/${match[0]}`);
    }
  }
  if (chunkPaths.length) await cache.addAll([...new Set(chunkPaths)]);

  // 첫 HTML보다 먼저 읽힌 CSS의 자체 글꼴도 함께 보관한다.
  const cssPaths = [...entryAssets, ...chunkPaths].filter((asset) => asset.endsWith('.css'));
  const fontPaths = [];
  for (const cssPath of cssPaths) {
    const cssResponse = await cache.match(cssPath);
    if (!cssResponse) continue;
    const css = await cssResponse.text();
    for (const match of css.matchAll(/url\((['"]?)([^)'"?#]+)\1\)/g)) {
      const url = new URL(match[2], new URL(cssPath, self.location.origin));
      if (url.origin === self.location.origin) fontPaths.push(url.pathname);
    }
  }
  if (fontPaths.length) await cache.addAll([...new Set(fontPaths)]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION)
    .then(async (cache) => {
      await cache.addAll(SHELL);
      await precacheEntryAssets(cache);
    })
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => {
        const network = fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put('/index.html', copy));
          return response;
        });
        // 버전이 바뀌면 install 단계에서 최신 HTML을 다시 넣으므로, 수업 중에는
        // 캐시를 먼저 보여 주고 네트워크 갱신은 뒤에서 처리한다.
        return cached ?? network;
      }),
    );
    return;
  }

  // 오디오는 range 요청이 섞여 캐시 응답이 깨질 수 있어 네트워크 우선.
  // 온전한(200) 응답만 보관해 두면 다음 수업에서 와이파이가 끊겨도 BGM 이 나온다.
  if (url.pathname.startsWith('/audio/')) {
    event.respondWith(fetch(request).then((response) => {
      if (response.status === 200) {
        const copy = response.clone();
        caches.open(VERSION).then((cache) => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match(request, { ignoreVary: true })));
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && (response.type === 'basic' || response.type === 'default')) {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
