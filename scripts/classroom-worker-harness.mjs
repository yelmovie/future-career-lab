import { vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';
const sha = (text) => createHash('sha256').update(text).digest('hex');
const source = fs.readFileSync('public/sw.js', 'utf8');
export function createClassroomHarness() {
    const base = 'https://school.test/lab/';
    const contents = new Map([['index.html', '<html>this release</html>'], ['audio/clue.mp3', 'abcdefgh'], ['assets/stage.js', 'ready()']]);
    const files = [...contents].map(([url, value]) => ({ url: `/${url}`, bytes: value.length, sha256: sha(value) }));
    const release = { version: 'unit-release', totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), files };
    const handlers = new Map();
    const stores = new Map();
    const key = (request) => typeof request === 'string' ? request : request.url;
    const caches = {
        keys: async () => [...stores.keys()],
        delete: async (name) => stores.delete(name),
        open: async (name) => {
            if (!stores.has(name))
                stores.set(name, new Map());
            const map = stores.get(name);
            return {
                keys: async () => [...map.keys()].map((url) => new Request(url)),
                match: async (request) => map.get(key(request))?.clone(),
                put: async (request, response) => { map.set(key(request), response.clone()); },
            };
        },
    };
    const fetcher = vi.fn(async (request) => {
        const relative = request.url.slice(base.length);
        return new Response(contents.get(relative) ?? 'missing', { status: contents.has(relative) ? 200 : 404 });
    });
    const skipWaiting = vi.fn(async () => undefined);
    vm.runInNewContext(source.replace('/* CLASSROOM_RELEASE */ null', JSON.stringify(release))
        .replace('/* CLASSROOM_SHELL */ []', JSON.stringify(['/index.html'])), {
        self: { registration: { scope: base }, clients: { claim: vi.fn() }, skipWaiting, setTimeout, clearTimeout, addEventListener: (type, listener) => handlers.set(type, listener) },
        caches, fetch: fetcher, URL, Request, Response, Headers, AbortController, Uint8Array, crypto: webcrypto,
    });
    const dispatch = async (type, extra = {}) => {
        let work;
        let response;
        handlers.get(type)({ waitUntil: (promise) => { work = promise; }, respondWith: (promise) => { response = promise; }, ...extra });
        await work;
        return response ? await response : undefined;
    };
    const message = async (type) => {
        const updates = [];
        await dispatch('message', { data: { type }, ports: [{ postMessage: (value) => updates.push(value) }] });
        return updates;
    };
    return { base, stores, contents, fetcher, skipWaiting, dispatch, message };
}
