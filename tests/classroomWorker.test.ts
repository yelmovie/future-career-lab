import { describe, expect, it } from 'vitest';
import { createClassroomHarness } from '../scripts/classroom-worker-harness.mjs';

describe('classroom preparation and offline delivery', () => {
  it('prepares later screen code before audio when the student is playing', async () => {
    const h = createClassroomHarness();
    await h.dispatch('install');
    h.fetcher.mockClear();
    const prepared = await h.message('PREPARE_CLASSROOM', { background: true });
    expect(h.fetcher.mock.calls.map(([request]: [Request]) => request.url)).toEqual([
      `${h.base}assets/stage.js`, `${h.base}audio/clue.mp3`,
    ]);
    expect(prepared.at(-1)!.state).toBe('ready');
  });

  it('keeps verified files when background preparation is interrupted, then resumes', async () => {
    const h = createClassroomHarness();
    await h.dispatch('install');
    const fetchNormally = h.fetcher.getMockImplementation()!;
    h.fetcher.mockImplementation(async (request) => {
      if (request.url.endsWith('audio/clue.mp3')) {
        await h.message('CANCEL_CLASSROOM');
        throw new Error('interrupted');
      }
      return fetchNormally(request);
    });
    const interrupted = await h.message('PREPARE_CLASSROOM', { background: true });
    expect(interrupted.at(-1)!.state).toBe('cancelled');
    expect(interrupted.at(-1)!.done).toBe(2);
    h.fetcher.mockImplementation(fetchNormally);
    h.fetcher.mockClear();
    const resumed = await h.message('PREPARE_CLASSROOM', { background: true });
    expect(resumed.at(-1)!.state).toBe('ready');
    expect(h.fetcher.mock.calls.map(([request]: [Request]) => request.url)).toEqual([`${h.base}audio/clue.mp3`]);
  });

  it('installs just the shell, preserves other applications, and waits for an explicit update', async () => {
    const h = createClassroomHarness();
    h.stores.set('other-app-cache', new Map());
    h.stores.set('future-career-lab:/lab/:old', new Map());
    await h.dispatch('install');
    expect(h.fetcher.mock.calls.map(([request]: [Request]) => request.url)).toEqual([`${h.base}index.html`]);
    expect(h.skipWaiting).not.toHaveBeenCalled();
    await h.dispatch('activate');
    expect(h.stores.has('other-app-cache')).toBe(true);
    expect(h.stores.has('future-career-lab:/lab/:old')).toBe(false);
    await h.message('ACTIVATE_CLASSROOM_UPDATE');
    expect(h.skipWaiting).toHaveBeenCalledOnce();
  });

  it('never marks a partial or incorrect release ready, and retries only missing material', async () => {
    const h = createClassroomHarness();
    await h.dispatch('install');
    h.contents.set('audio/clue.mp3', 'wrong release');
    const failure = await h.message('PREPARE_CLASSROOM');
    expect(failure.at(-1)!.state).toBe('error');
    expect(failure.at(-1)!.done).toBe(1);
    expect(failure.at(-1)!.error).toContain('버전');
    h.contents.set('audio/clue.mp3', 'abcdefgh');
    h.fetcher.mockClear();
    const retried = await h.message('PREPARE_CLASSROOM');
    expect(retried.at(-1)!.state).toBe('ready');
    expect(retried.at(-1)!.done).toBe(3);
    expect(h.fetcher.mock.calls.some(([request]: [Request]) => request.url.endsWith('index.html'))).toBe(false);
  });

  it('serves an unvisited audio range offline and detects cache eviction on the next status check', async () => {
    const h = createClassroomHarness();
    await h.dispatch('install');
    await h.message('PREPARE_CLASSROOM');
    h.fetcher.mockRejectedValue(new Error('offline'));
    const response = await h.dispatch('fetch', { request: new Request(`${h.base}audio/clue.mp3`, { headers: { Range: 'bytes=2-5' } }) });
    expect(response?.status).toBe(206);
    expect(response?.headers.get('content-range')).toBe('bytes 2-5/8');
    expect(await response?.text()).toBe('cdef');
    h.stores.get('future-career-lab:/lab/:unit-release')!.delete(`${h.base}assets/stage.js`);
    expect((await h.message('CLASSROOM_STATUS')).at(-1)!.state).toBe('idle');
  });

  it('reconnects a reloaded settings screen to the preparation already in progress', async () => {
    const h = createClassroomHarness();
    await h.dispatch('install');
    const fetchNormally = h.fetcher.getMockImplementation()!;
    let resumeDownload!: (response: Response) => void;
    let announceDownload!: () => void;
    const downloading = new Promise<void>((resolve) => { announceDownload = resolve; });
    const heldDownload = new Promise<Response>((resolve) => { resumeDownload = resolve; });
    h.fetcher.mockImplementation((request) => {
      if (!request.url.endsWith('audio/clue.mp3')) return fetchNormally(request);
      announceDownload();
      return heldDownload;
    });

    const preparing = h.message('PREPARE_CLASSROOM');
    await downloading;
    const reconnected = await h.message('CLASSROOM_STATUS');
    expect(reconnected.at(-1)!.state).toBe('preparing');
    resumeDownload(new Response('abcdefgh'));
    await preparing;
    expect(reconnected.at(-1)!.state).toBe('ready');
    expect(reconnected.at(-1)!.done).toBe(3);
  });
});
