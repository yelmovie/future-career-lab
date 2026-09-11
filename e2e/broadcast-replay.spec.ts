import { expect, test, type Page } from '@playwright/test';
import { createDefaultSave } from '../src/state/defaultSave';
import { createBroadcast, type AirLog } from '../src/pages/page08BroadcastModel';

const SAVE_KEY = 'future-career-lab.save.v1';
const aired: AirLog[] = [
  { segmentId: 'opening', title: '첫 인사', source: 'studio', captionId: 'opening-rescue', sourced: true },
  { segmentId: 'scene', title: '현장 보여주기', source: 'drone', captionId: 'photo-stream', sourced: true },
  { segmentId: 'cause', title: '조사 결과', source: 'studio', captionId: 'graph-noise', sourced: true },
  { segmentId: 'correction', title: '정정 방송', source: 'studio', captionId: 'graph-water', sourced: true },
  { segmentId: 'action', title: '시민 부탁', source: 'reporter', captionId: 'action-report', sourced: true },
];

async function openCompletedBroadcast(page: Page, log = aired) {
  const save = createDefaultSave();
  save.playerName = '방송 탐험가';
  save.audio = { bgmVolume: 0, sfxVolume: 0, muted: true };
  save.stageProgress.completedPages = [8];
  save.artifacts.clip = { trust: 100, corrections: 1 };
  save.pageData.p8Broadcast = { ...createBroadcast(42), index: 4, log, corrections: 1 };
  save.pageData.page07Ecology = { trials: [
    { variable: 'noise', from: 9, to: 2, before: 3, after: 8 },
    { variable: 'water', from: 3, to: 8, before: 3, after: 4 },
  ] };
  await page.goto('/#/page/1');
  await page.evaluate(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), { key: SAVE_KEY, save });
  await page.reload();
  await page.goto('/#/page/8');
}

test('completed broadcast advances selections, supports scene navigation and restart, and preserves rewards', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install();
  await openCompletedBroadcast(page);
  const replay = page.getByRole('region', { name: '내가 만든 방송', exact: true });
  await expect(replay).toBeVisible();
  await expect(page.locator('.v4-done')).toHaveCount(0);
  const savedProgress = () => page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key) ?? '{}');
    return { state: saved.pageData.p8Broadcast, clip: saved.artifacts.clip, badges: saved.badges, logs: saved.logs };
  }, SAVE_KEY);
  const initial = await savedProgress();
  await expect(replay.getByRole('heading', { name: '첫 인사', exact: true })).toBeVisible();
  await expect(replay.locator('img.p8-replay__image')).toHaveAttribute('src', '/assets/v8/broadcast-anchor-neutral.png');
  await expect(replay.getByRole('button')).toHaveCount(2);
  await expect(page.getByText(/잠깐 멈/)).toHaveCount(0);
  await page.clock.fastForward(17_000);
  await expect(replay.getByRole('heading', { name: '현장 보여주기', exact: true })).toBeVisible();
  await expect(replay.locator('img.p8-replay__image')).toHaveAttribute('src', '/assets/v8/broadcast-photo-stream-blocked-v2.jpg');
  await replay.getByRole('button', { name: '다음 장면', exact: true }).click();
  await expect(replay.locator('.p8-replay__caption')).toHaveText('비교 실험 결과, 기계 소리를 줄이자 새가 3마리에서 8마리로 늘었습니다.');
  await replay.getByRole('button', { name: '이전 장면', exact: true }).click();
  await expect(replay.getByRole('heading', { name: '현장 보여주기', exact: true })).toBeVisible();
  await page.clock.fastForward(17_000);
  await expect(replay.getByRole('heading', { name: '조사 결과', exact: true })).toBeVisible();
  await page.clock.fastForward(17_000);
  await expect(replay.getByRole('heading', { name: '정정 방송', exact: true })).toBeVisible();
  await expect(replay.locator('.p8-replay__caption')).toContainText('앞서 확인되지 않은 말을 전해 바로잡습니다. 비교 실험 결과, 물을 채우자 새가 3마리에서 4마리로 늘었습니다.');
  await page.clock.fastForward(17_000);
  await expect(replay.getByRole('heading', { name: '시민 부탁', exact: true })).toBeVisible();
  await expect(replay.locator('img.p8-replay__image')).toHaveAttribute('src', '/assets/v8/broadcast-mic-recovered.png');
  await page.clock.fastForward(17_000);
  await expect(replay.getByRole('heading', { name: '내 방송을 모두 봤어!', exact: true })).toBeVisible();
  await replay.getByRole('button', { name: '처음부터 다시 보기', exact: true }).click();
  await expect(replay.getByRole('heading', { name: '첫 인사', exact: true })).toBeVisible();
  expect(await savedProgress()).toEqual(initial);
  await page.reload();
  await expect(replay.getByRole('heading', { name: '첫 인사', exact: true })).toBeVisible();
  expect(await savedProgress()).toEqual(initial);
  await page.getByRole('button', { name: '숲 살리기 작전으로', exact: true }).click();
  await expect(page).toHaveURL(/#\/page\/9$/);
  await page.clock.fastForward(60_000);
  expect(errors).toEqual([]);
});

test('reduced motion keeps scene navigation without a pause button and old saves can continue', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await openCompletedBroadcast(page);
  const replay = page.getByRole('region', { name: '내가 만든 방송', exact: true });
  await expect(replay.getByRole('button')).toHaveCount(2);
  await page.clock.fastForward(17_000);
  await expect(replay.getByRole('heading', { name: '현장 보여주기', exact: true })).toBeVisible();
  await openCompletedBroadcast(page, []);
  await expect(replay).toHaveCount(0);
  await expect(page.locator('.v4-done')).toContainText('방송기술자 배지를 얻었어');
  await page.getByRole('button', { name: '숲 살리기 작전으로', exact: true }).click();
  await expect(page).toHaveURL(/#\/page\/9$/);
});
