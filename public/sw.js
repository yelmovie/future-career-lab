/* global self, caches, fetch, URL, Response, Request, Headers, AbortController, crypto */
// Build fills these declarations from the exact files being shipped. No source pack is downloaded at install.
const RELEASE = /* CLASSROOM_RELEASE */ null;
const SHELL = /* CLASSROOM_SHELL */ [];
const scope = new URL(self.registration.scope);
const prefix = `future-career-lab:${scope.pathname}:`;
const cacheName = `${prefix}${RELEASE?.version ?? 'development'}`;
const assetUrl = (relative) => new URL(relative.replace(/^\//, ''), scope).href;
const files = new Map((RELEASE?.files ?? []).map((file) => [assetUrl(file.url), file]));
let preparing = false;
let cancelled = false;
let preparationAbort = null;
const preparationPorts = new Set();
function sendPreparation(value) {
  for (const port of preparationPorts) {
    try { port.postMessage(value); } catch { preparationPorts.delete(port); }
  }
  if (value.state !== 'preparing') preparationPorts.clear();
}

async function checkedFetch(url, expected, signal, background = false) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = self.setTimeout(abort, 30000);
  try {
    const response = await fetch(new Request(url, { cache: 'reload', credentials: 'same-origin', signal: controller.signal, priority: background ? 'low' : 'auto' }));
    if (!response.ok || response.status !== 200) throw new Error('자료를 내려받지 못했습니다. 연결을 확인하고 다시 준비해 주세요.');
    if (expected) {
      const data = await response.clone().arrayBuffer();
      const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
      if (hash !== expected.sha256) throw new Error('자료 버전이 바뀌었습니다. 탐험을 저장한 뒤 앱을 다시 열고 준비해 주세요.');
    }
    return response;
  } finally {
    self.clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

async function status() {
  const cache = await caches.open(cacheName);
  const keys = new Set((await cache.keys()).map((request) => request.url));
  const downloaded = [...files].filter(([url]) => keys.has(url));
  return {
    version: RELEASE?.version, total: files.size, done: downloaded.length,
    bytes: downloaded.reduce((sum, [, file]) => sum + file.bytes, 0),
    totalBytes: RELEASE?.totalBytes ?? 0,
    state: files.size > 0 && downloaded.length === files.size ? 'ready' : preparing ? 'preparing' : 'idle',
  };
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    if (!RELEASE) return;
    const cache = await caches.open(cacheName);
    for (const relative of SHELL) {
      const url = assetUrl(relative);
      await cache.put(url, await checkedFetch(url, files.get(url)));
    }
    // A new worker waits while a class still uses the previous release.
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(prefix) && key !== cacheName).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const port = event.ports[0];
  const send = (value) => port?.postMessage(value);
  if (event.data?.type === 'CLASSROOM_STATUS') {
    if (preparing && port) preparationPorts.add(port);
    event.waitUntil(status().then(send).catch(() => send({ state: 'error', error: '기기의 저장 공간을 확인해 주세요.' })));
  } else if (event.data?.type === 'CANCEL_CLASSROOM') {
    cancelled = true;
    preparationAbort?.abort();
  } else if (event.data?.type === 'ACTIVATE_CLASSROOM_UPDATE') {
    // Only the teacher's explicit update action activates a waiting worker.
    event.waitUntil(self.skipWaiting());
  } else if (event.data?.type === 'PREPARE_CLASSROOM') {
    if (port) preparationPorts.add(port);
    event.waitUntil((async () => {
      if (preparing) { send({ ...(await status()), state: 'preparing' }); return; }
      preparing = true;
      cancelled = false;
      try {
        const cache = await caches.open(cacheName);
        const snapshot = await status();
        let done = snapshot.done;
        let bytes = snapshot.bytes;
        sendPreparation({ ...snapshot, state: 'preparing' });
        // Page code and illustrations come before optional 3D and long background music.
        // Explicit/manual preparation preserves manifest order for existing integrations.
        const background = event.data.background === true;
        const priority = (url) => /\.(?:js|css|html|woff2)$/.test(url) ? 0 : /\.(?:glb|mp3|wav)$/.test(url) ? 2 : 1;
        const queue = [...files];
        if (background) queue.sort(([a], [b]) => priority(a) - priority(b));
        for (const [url, file] of queue) {
          if (cancelled) break;
          if (await cache.match(url)) continue;
          preparationAbort = new AbortController();
          await cache.put(url, await checkedFetch(url, file, preparationAbort.signal, background));
          preparationAbort = null;
          done += 1;
          bytes += file.bytes;
          sendPreparation({ ...snapshot, done, bytes, state: 'preparing' });
          if (background) await new Promise((resolve) => self.setTimeout(resolve, 100));
        }
        const final = await status();
        sendPreparation({ ...final, state: cancelled && final.state !== 'ready' ? 'cancelled' : final.state });
      } catch (error) {
        const partial = await status().catch(() => ({}));
        sendPreparation({ ...partial, state: cancelled ? 'cancelled' : 'error', error: cancelled ? undefined : error.name === 'AbortError' ? '연결이 오래 걸립니다. Wi-Fi를 확인하고 남은 자료를 다시 준비해 주세요.' : error.message || '기기의 저장 공간과 연결을 확인하고 다시 준비해 주세요.' });
      } finally {
        preparing = false;
        preparationAbort = null;
      }
    })());
  }
});

async function rangedResponse(request, cached) {
  const range = request.headers.get('range');
  if (!range) return cached;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  const data = await cached.arrayBuffer();
  const size = data.byteLength;
  if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  const headers = new Headers(cached.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');
  return new Response(data.slice(start, end + 1), { status: 206, headers });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(cacheName);
      return (await cache.match(assetUrl('/index.html'))) ?? fetch(request);
    })());
    return;
  }
  if (!files.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(url.href);
    if (cached) return rangedResponse(request, cached);
    // A complete 200 response also makes later audio Range requests available offline.
    const response = await checkedFetch(url.href, files.get(url.href));
    await cache.put(url.href, response.clone());
    return rangedResponse(request, response);
  })().catch(() => new Response('인터넷 연결을 확인한 뒤 화면을 다시 불러와 주세요. 받은 자료와 탐험 기록은 남아 있습니다.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })));
});
