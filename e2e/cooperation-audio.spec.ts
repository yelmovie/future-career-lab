import { expect, test, type Page } from '@playwright/test';
import { createDefaultSave } from '../src/state/defaultSave';

const KEY = 'future-career-lab.save.v1';
const CONSTRUCTION_AUDIO = '/audio/v9/construction-site-loop.wav';

async function openQuietWork(page: Page, muted = false) {
  const save = createDefaultSave();
  save.audio = { muted, bgmVolume: 0, sfxVolume: 0.65 };
  save.stageProgress.completedPages = [3, 4, 5, 6, 7, 8];
  save.artifacts.clip = { trust: 100, corrections: 0 };
  save.pageData.p9Cooperation = {
    version: 1, phase: 'work', current: 'quiet', completed: [], planted: [],
    waterMarked: false, noiseLevel: 80, noiseTouched: false, actions: 0,
  };
  // Every test owns a fresh context; this fixture never changes an open user's save.
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: KEY, value: save });
  await page.goto('/#/page/9');
  await expect(page.getByRole('slider', { name: '공사 소리 줄이기' })).toHaveValue('80');
}

/** Read the real media/Web Audio graph without replacing Audio, play(), or timers. */
async function audioSnapshot(page: Page) {
  return page.evaluate(async () => {
    const moduleUrl = '/src/services/audioService.ts';
    const { audioService } = await import(moduleUrl);
    const { demo } = audioService as {
      demo: null | { element: HTMLAudioElement; gain: GainNode | null; context: AudioContext | null; level: number };
    };
    const probe = window as typeof window & { __cooperationAudio?: HTMLAudioElement };
    // Keep the last element so cleanup assertions also catch a detached audio leak.
    if (demo) probe.__cooperationAudio = demo.element;
    return {
      active: Boolean(demo),
      source: demo?.element.getAttribute('src') ?? null,
      paused: demo?.element.paused ?? null,
      currentTime: demo?.element.currentTime ?? null,
      duration: demo && Number.isFinite(demo.element.duration) ? demo.element.duration : null,
      loop: demo?.element.loop ?? false,
      level: demo?.level ?? null,
      gain: demo ? demo.gain?.gain.value ?? demo.element.volume : null,
      contextState: demo?.context?.state ?? null,
      mediaError: demo?.element.error?.code ?? null,
      lastPaused: probe.__cooperationAudio?.paused ?? null,
      lastSource: probe.__cooperationAudio?.getAttribute('src') ?? null,
    };
  });
}

async function expectPlaying(page: Page) {
  await expect.poll(async () => (await audioSnapshot(page)).source).toBe(CONSTRUCTION_AUDIO);
  await expect.poll(async () => (await audioSnapshot(page)).paused).toBe(false);
  await expect.poll(async () => (await audioSnapshot(page)).duration ?? 0).toBeGreaterThan(0);
  const initialTime = (await audioSnapshot(page)).currentTime ?? 0;
  await expect.poll(async () => (await audioSnapshot(page)).currentTime ?? 0).toBeGreaterThan(initialTime + 0.15);
  const snapshot = await audioSnapshot(page);
  expect(snapshot.loop).toBe(true);
  expect(snapshot.mediaError).toBeNull();
}

async function expectStopped(page: Page) {
  await expect.poll(async () => (await audioSnapshot(page)).active).toBe(false);
  const snapshot = await audioSnapshot(page);
  expect(snapshot.lastPaused).toBe(true);
  expect(snapshot.lastSource).toBeNull();
}

test('construction recording loops, follows the sound slider, and stops on demand or map return', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1024, height: 768 });
  await openQuietWork(page);
  const slider = page.getByRole('slider', { name: '공사 소리 줄이기' });
  const next = page.getByRole('button', { name: '공사팀에 약속 전하기' });
  const listen = page.getByRole('button', { name: '공사 소리 듣기', exact: true });
  await expect(listen).toBeEnabled();
  expect((await audioSnapshot(page)).active).toBe(false);
  await expect(next).toBeDisabled();

  await listen.click();
  await expectPlaying(page);
  await expect(next).toBeDisabled();
  await expect.poll(async () => (await audioSnapshot(page)).gain ?? 0).toBeGreaterThan(0.1);
  const loudGain = (await audioSnapshot(page)).gain!;
  await slider.fill('20');
  await expect(next).toBeEnabled();
  await expect.poll(async () => (await audioSnapshot(page)).level).toBe(20);
  await expect.poll(async () => (await audioSnapshot(page)).gain ?? 1).toBeLessThan(loudGain * 0.4);
  expect((await audioSnapshot(page)).gain).toBeGreaterThan(0);
  await slider.fill('0');
  await expect.poll(async () => Math.abs((await audioSnapshot(page)).gain ?? 1)).toBeLessThan(0.0001);
  await expect(next).toBeEnabled();

  await page.getByRole('button', { name: '공사 소리 멈추기', exact: true }).click();
  await expectStopped(page);
  await expect(next).toBeEnabled();
  await slider.fill('80');
  await expect(next).toBeDisabled();
  await page.getByRole('button', { name: '공사 소리 듣기', exact: true }).click();
  await expectPlaying(page);
  await page.getByRole('button', { name: '지도로', exact: true }).click();
  await expect(page.locator('.coop-hub')).toBeVisible();
  await expectStopped(page);
  expect(errors).toEqual([]);
});

test('muted classrooms can complete quiet work without listening', async ({ page }) => {
  await openQuietWork(page, true);
  await expect(page.getByRole('button', { name: '공사 소리 듣기', exact: true })).toBeDisabled();
  await expect(page.locator('.coop-quiet')).toContainText(/음소거|소리가 꺼|소리.*켜/);
  expect((await audioSnapshot(page)).active).toBe(false);
  await page.getByRole('slider', { name: '공사 소리 줄이기' }).fill('20');
  await expect(page.getByRole('button', { name: '공사팀에 약속 전하기' })).toBeEnabled();
  expect((await audioSnapshot(page)).active).toBe(false);
  await page.getByRole('button', { name: '공사팀에 약속 전하기' }).click();
  await expect(page.locator('.coop-result')).toContainText('공사팀도 새들을 위해 힘을 보탰어');
  await expect.poll(async () => page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key) ?? '{}');
    return saved.pageData?.p9Cooperation?.completed ?? [];
  }, KEY)).toContain('quiet');
});

test('listening remains optional when sound is enabled', async ({ page }) => {
  await openQuietWork(page);
  await page.getByRole('slider', { name: '공사 소리 줄이기' }).fill('20');
  await expect(page.getByRole('button', { name: '공사 소리 듣기', exact: true })).toBeEnabled();
  expect((await audioSnapshot(page)).active).toBe(false);
  await page.getByRole('button', { name: '공사팀에 약속 전하기' }).click();
  await expect(page.locator('.coop-result')).toBeVisible();
  expect((await audioSnapshot(page)).active).toBe(false);
});

test('global mute interrupts an active construction recording without blocking the mission', async ({ page }) => {
  await openQuietWork(page);
  await page.getByRole('button', { name: '공사 소리 듣기', exact: true }).click();
  await expectPlaying(page);
  await page.getByRole('button', { name: '소리 끄기', exact: true }).click();
  await expect(page.getByRole('button', { name: '공사 소리 듣기', exact: true })).toBeDisabled();
  await expect.poll(async () => (await audioSnapshot(page)).lastPaused).toBe(true);
  // Mute may either release the graph or retain it at zero gain; both must be silent.
  await expect.poll(async () => {
    const snapshot = await audioSnapshot(page);
    return !snapshot.active || Math.abs(snapshot.gain ?? 1) < 0.0001;
  }).toBe(true);
  await page.getByRole('button', { name: '소리 켜기', exact: true }).click();
  await expect(page.getByRole('button', { name: '공사 소리 듣기', exact: true })).toBeEnabled();
  expect((await audioSnapshot(page)).active).toBe(false);
  await page.getByRole('slider', { name: '공사 소리 줄이기' }).fill('20');
  await expect(page.getByRole('button', { name: '공사팀에 약속 전하기' })).toBeEnabled();
  await page.getByRole('button', { name: '공사팀에 약속 전하기' }).click();
  await expect(page.locator('.coop-result')).toBeVisible();
  await expectStopped(page);
});

test('tablet taps start real construction audio and adjust it without blocking the next step', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 1024, height: 768 }, hasTouch: true });
  try {
    const page = await context.newPage();
    await openQuietWork(page);
    const listen = page.getByRole('button', { name: '공사 소리 듣기', exact: true });
    const buttonRect = (await listen.boundingBox())!;
    expect(buttonRect.width).toBeGreaterThanOrEqual(48);
    expect(buttonRect.height).toBeGreaterThanOrEqual(48);
    await listen.tap();
    await expectPlaying(page);
    await expect.poll(async () => (await audioSnapshot(page)).gain ?? 0).toBeGreaterThan(0.1);
    const loudGain = (await audioSnapshot(page)).gain!;
    const slider = page.getByRole('slider', { name: '공사 소리 줄이기' });
    const sliderRect = (await slider.boundingBox())!;
    await slider.tap({ position: { x: sliderRect.width * 0.2, y: sliderRect.height / 2 } });
    await expect.poll(async () => Number(await slider.inputValue())).toBeLessThanOrEqual(35);
    await expect.poll(async () => (await audioSnapshot(page)).gain ?? 1).toBeLessThan(loudGain * 0.5);
    await page.getByRole('button', { name: '공사 소리 멈추기', exact: true }).tap();
    await expectStopped(page);
    await page.getByRole('button', { name: '공사팀에 약속 전하기' }).tap();
    await expect(page.locator('.coop-result')).toBeVisible();
  } finally {
    await context.close();
  }
});
